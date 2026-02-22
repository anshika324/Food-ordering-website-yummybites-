# routes/ai_chat.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import get_database
from datetime import datetime, timezone, timedelta
import re
import asyncio
from gemini_config import gemini_client, GEMINI_MODEL
from typing import Optional

router = APIRouter(prefix="/api/v1/ai", tags=["Foodie AI"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    cart: Optional[list] = None


# ✅ FIX: Removed "hot" from spicy keywords — it matches "Hot Coffee", "Hot Chocolate" etc.
# Only keeping words that genuinely indicate spicy food
SPICY_KEYWORDS = ["spicy", "chilli", "chili", "masala", "fiery", "peri", "spice", "tangy", "zesty"]
VEG_KEYWORDS = ["veg", "vegetarian", "no meat", "plant based"]
NONVEG_KEYWORDS = ["non veg", "chicken", "mutton", "fish", "prawn", "meat", "egg"]
SWEET_KEYWORDS = ["sweet", "dessert", "ice cream", "cake", "kheer", "halwa"]


def clean_price(val) -> float:
    try:
        return float(str(val).replace("₹", "").strip())
    except:
        return 0.0


def menu_to_text(items: list) -> str:
    lines = []
    for i in items:
        price = clean_price(i.get("price", 0))
        cat = f" ({i.get('category','')})" if i.get("category") else ""
        lines.append(f"{i.get('name','?')} ₹{price:.0f}{cat}")
    return "\n".join(lines)


def items_to_cards(items: list) -> list:
    return [{
        "_id": str(i["_id"]),
        "name": i.get("name"),
        "price": clean_price(i.get("price", 0)),
        "image": i.get("image")
    } for i in items]


def is_spicy(item: dict) -> bool:
    """
    ✅ FIX: Smarter spicy detection — checks name, description, tags, category.
    Does NOT match just because item name contains 'hot' (e.g. Hot Coffee).
    An item is spicy if it explicitly mentions spice-related words in description/tags,
    OR if its name contains chilli/masala/spicy (not just 'hot').
    """
    name = item.get("name", "").lower()
    desc = item.get("description", "").lower()
    tags = str(item.get("tags", "")).lower()
    category = item.get("category", "").lower()

    # These words in the NAME strongly indicate spicy
    name_spicy = ["chilli", "chili", "masala", "spicy", "peri", "fiery"]
    if any(k in name for k in name_spicy):
        return True

    # These words anywhere indicate spicy
    all_text = desc + " " + tags
    if any(k in all_text for k in ["spicy", "chilli", "chili", "masala", "fiery", "peri", "hot and spicy"]):
        return True

    # Exclude obvious non-spicy categories
    non_spicy_categories = ["beverage", "drink", "dessert", "sweet", "juice", "coffee", "tea", "shake"]
    if any(k in category for k in non_spicy_categories):
        return False

    return False


def get_relevant_items(user_input: str, all_items: list, max_items: int = 8) -> list:
    lower = user_input.lower()

    # ✅ Spicy: use smart is_spicy() instead of simple keyword match on name
    if any(k in lower for k in SPICY_KEYWORDS) or "spicy" in lower:
        filtered = [i for i in all_items if is_spicy(i)]
        if filtered:
            return filtered[:max_items]

    if any(k in lower for k in VEG_KEYWORDS):
        filtered = [i for i in all_items if "veg" in str(i.get("category","")).lower()]
        if filtered: return filtered[:max_items]

    if any(k in lower for k in NONVEG_KEYWORDS):
        kw = next((k for k in NONVEG_KEYWORDS if k in lower), None)
        filtered = [i for i in all_items if kw and kw in (i.get("name","") + i.get("description","")).lower()]
        if filtered: return filtered[:max_items]

    if any(k in lower for k in SWEET_KEYWORDS):
        filtered = [i for i in all_items if any(k in (i.get("name","") + i.get("category","")).lower() for k in SWEET_KEYWORDS)]
        if filtered: return filtered[:max_items]

    price_match = re.search(r"under (?:₹\s*)?(\d+)|less than (?:₹\s*)?(\d+)", lower)
    if price_match:
        limit = int(price_match.group(1) or price_match.group(2))
        filtered = [i for i in all_items if clean_price(i.get("price", 9999)) <= limit]
        if filtered: return filtered[:max_items]

    return all_items[:max_items]


async def find_dish(db, name: str):
    dish = await db["menu"].find_one({"name": {"$regex": f"^{re.escape(name.strip())}", "$options": "i"}})
    if not dish:
        dish = await db["menu"].find_one({"name": {"$regex": re.escape(name.strip()), "$options": "i"}})
    return dish


@router.post("/chat")
async def foodie_ai(req: ChatRequest):
    user_input = (req.message or "").strip()
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    # INTENT 1: Add one or multiple items to cart
    m = re.search(r"add (.+?) to (cart|card)", user_input, re.IGNORECASE)
    if m:
        raw = m.group(1).strip()
        dish_names = [d.strip() for d in re.split(r"\band\b|,|&", raw, flags=re.IGNORECASE) if d.strip()]
        added = []
        not_found = []
        for name in dish_names:
            dish = await find_dish(db, name)
            if dish:
                added.append({
                    "_id": str(dish["_id"]),
                    "name": dish["name"],
                    "price": clean_price(dish.get("price", 0)),
                    "image": dish.get("image")
                })
            else:
                not_found.append(name)
        if not added:
            return {"reply": f"❌ Couldn't find '{raw}' on the menu. Try browsing the Menu page!"}
        added_names = ", ".join([d["name"] for d in added])
        reply = f"✅ Added {added_names} to your cart!"
        if not_found:
            reply += f"\n⚠️ Couldn't find: {', '.join(not_found)}"
        reply += " Anything else?"
        return {"reply": reply, "action": "add_to_cart", "dishes": added}

    # INTENT 2: Place order
    if re.search(r"place order|checkout|confirm order|order now", user_input, re.IGNORECASE):
        cart = req.cart or []
        if not cart:
            return {"reply": "⚠️ Your cart is empty! Add some dishes first."}
        total = sum(clean_price(item.get("price", 0)) * int(item.get("quantity", 1)) for item in cart)
        IST = timezone(timedelta(hours=5, minutes=30))
        try:
            result = await db["orders"].insert_one({
                "items": cart, "total": total,
                "delivery_details": {"name": "Guest User", "phone": "N/A", "address": "Via Foodie AI"},
                "status": "Pending", "timestamp": datetime.now(IST).isoformat()
            })
            order_id = str(result.inserted_id)
            return {"reply": f"🎉 Order placed! ID: {order_id}. Redirecting...", "action": "place_order", "order_id": order_id}
        except Exception as e:
            raise HTTPException(status_code=500, detail="Could not place order")

    # INTENT 3: View cart
    if re.search(r"view cart|show cart|my cart|what.s in.*cart", user_input, re.IGNORECASE):
        cart = req.cart or []
        if not cart:
            return {"reply": "🛒 Your cart is empty. Browse the menu and add something!"}
        items_text = "\n".join([f"• {i.get('name')} x{i.get('quantity',1)} — ₹{clean_price(i.get('price',0)):.0f}" for i in cart])
        total = sum(clean_price(i.get("price", 0)) * int(i.get("quantity", 1)) for i in cart)
        return {"reply": f"🛒 Your Cart:\n{items_text}\n\nTotal: ₹{total:.2f}\n\nSay 'place order' to checkout!"}

    # INTENT 4: Greetings
    if re.match(r"^(hi|hello|hey|howdy|good morning|good evening|good afternoon)\b", user_input.strip(), re.IGNORECASE):
        return {"reply": "Hey there foodie! 👋 Welcome to YummyBites!\n\nI can help you:\n• Suggest dishes\n• Add to cart — say 'add [dish] to cart'\n• Place orders — say 'place order'\n\nWhat are you craving today?"}

    # INTENT 5: Show full menu
    if re.search(r"show menu|full menu|all dishes|what.s on the menu|what do you (have|serve)", user_input, re.IGNORECASE):
        all_items = await db["menu"].find().to_list(50)
        if not all_items:
            return {"reply": "Menu unavailable right now. Please try again later."}
        return {
            "reply": f"Here's our menu ({len(all_items)} dishes):\n\n{menu_to_text(all_items[:12])}\n\nSay 'add [dish] to cart' to order!",
            "dishes": items_to_cards(all_items[:5])
        }

    # INTENT 6: Gemini AI with minimal tokens
    try:
        all_items = await db["menu"].find().to_list(100)
        relevant = get_relevant_items(user_input, all_items, max_items=8)
        menu_text = menu_to_text(relevant)

        prompt = f"""You are Foodie AI for YummyBites restaurant. Be friendly and brief (max 3 sentences).

Menu:
{menu_text}

Customer: {user_input}

Reply helpfully. Only suggest dishes from the list above. Use Rs for prices."""

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: gemini_client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        )

        reply = response.text.strip() if response.text else "Try asking about specific dishes or say 'show menu'!"
        dishes_to_show = [items_to_cards([i])[0] for i in all_items if i.get("name","").lower() in reply.lower()]
        result = {"reply": reply}
        if dishes_to_show:
            result["dishes"] = dishes_to_show[:5]
        return result

    except Exception as e:
        err = str(e)
        print("AI chat error:", err)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            all_items = await db["menu"].find().to_list(100)
            relevant = get_relevant_items(user_input, all_items, max_items=5)
            if relevant:
                return {
                    "reply": f"Here are some dishes you might enjoy:\n\n{menu_to_text(relevant)}\n\nSay 'add [dish name] to cart' to order!",
                    "dishes": items_to_cards(relevant)
                }
            return {"reply": "Please visit our Menu page to browse all available dishes!"}
        raise HTTPException(status_code=500, detail=f"AI error: {err}")
