# routes/ai_chat.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from db import get_database
from datetime import datetime, timezone, timedelta
import re
from gemini_config import gemini_model  # your configured wrapper
from typing import Optional

router = APIRouter(prefix="/api/v1/ai", tags=["Foodie AI"])

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    cart: Optional[list] = None  # frontend can pass cart when requesting place order

@router.post("/chat")
async def foodie_ai(req: ChatRequest):
    user_input = (req.message or "").strip()
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    # 1) INTENT: add <item> to cart
    m = re.search(r"add (.*?) to (cart|card)", user_input, re.IGNORECASE)
    if m:
        dish_name = m.group(1).strip()
        # find dish in menu
        dish = await db["menu"].find_one({"name": {"$regex": f"^{re.escape(dish_name)}", "$options": "i"}})
        if not dish:
            # try fuzzy search
            dish = await db["menu"].find_one({"name": {"$regex": dish_name, "$options": "i"}})
        if not dish:
            return {"reply": f"❌ I couldn't find '{dish_name}' on the menu."}
        dish_data = {
            "_id": str(dish["_id"]),
            "name": dish["name"],
            "price": float(str(dish.get("price", 0)).replace("₹", "").strip()) if dish.get("price") else 0.0,
            "image": dish.get("image")
        }
        return {
            "reply": f"✅ Added **{dish['name']}** to your cart!",
            "action": "add_to_cart",
            "dishes": [dish_data]
        }

    # 2) INTENT: place order / checkout
    if re.search(r"place order|checkout|confirm order|place the order", user_input, re.IGNORECASE):
        # require cart from frontend
        cart = req.cart or []
        if not cart:
            return {"reply": "⚠️ I don't see your cart. Please confirm your cart or open your cart page before placing the order."}
        total = sum(float(item.get("price", 0)) * int(item.get("quantity", 1)) for item in cart)
        IST = timezone(timedelta(hours=5, minutes=30))
        order_doc = {
            "items": cart,
            "total": total,
            "delivery_details": {"name": "Guest User", "phone": "N/A", "address": "Online Order via Foodie AI"},
            "status": "Pending",
            "timestamp": datetime.now(IST).isoformat()
        }
        try:
            result = await db["orders"].insert_one(order_doc)
            order_id = str(result.inserted_id)
            return {
                "reply": f"🎉 Your order was placed successfully! Order ID: {order_id}",
                "action": "place_order",
                "order_id": order_id
            }
        except Exception as e:
            print("Order insert error:", e)
            raise HTTPException(status_code=500, detail="Could not place order")

    # 3) Simple greetings
    if re.match(r"^(hi|hello|hey|foodie ai)\b", user_input.strip(), re.IGNORECASE):
        return {"reply": "Hey there foodie 👋! What would you like today? I can suggest dishes from the menu or help place an order."}

    # 4) Default: ask Gemini for a helpful response, but include menu context for better results
    try:
        # build a small menu summary to give Gemini context (top 20 items)
        menu_items = await db["menu"].find().to_list(50)
        menu_summary = "\n".join([f"{it.get('name','unknown')} - ₹{it.get('price','?')} - {it.get('description','')}" for it in menu_items[:30]])

        prompt = f"""
        You are Foodie AI, a helpful assistant for a restaurant website. The menu (short):\n{menu_summary}\n\nUser: {user_input}\n\nAnswer concisely and, if user asked for dishes, provide up to 5 suggestions in JSON as needed.
        """
        # Try safe model call
        try:
            ai_resp = gemini_model.generate_content(prompt)
            reply = getattr(ai_resp, "text", None) or str(ai_resp)
        except Exception as gerr:
            print("Gemini error:", gerr)
            reply = "Sorry, I'm having trouble connecting to the AI service right now. I can still answer basic menu questions - ask me about dishes."

        return {"reply": reply}
    except Exception as e:
        print("AI chat error:", e)
        raise HTTPException(status_code=500, detail="AI service failed")