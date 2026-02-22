from fastapi import APIRouter, HTTPException
from db import get_database

router = APIRouter(prefix="/api/v1/menu", tags=["Menu"])

@router.get("/")
async def get_menu():
    """
    Fetch all menu items and normalize their fields.
    Ensures each item has 'category', 'price' (as number), and 'tags' list.
    """
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        menu_items = await db["menu"].find().to_list(1000)
        if not menu_items:
            raise HTTPException(status_code=404, detail="No menu items found")

        # Normalize items
        normalized = []
        for item in menu_items:
            # Ensure category exists
            category = (
                item.get("category")
                or item.get("type")
                or item.get("foodType")
                or "Miscellaneous"
            )

            # Ensure price is numeric
            try:
                price = float(str(item.get("price", 0)).replace("₹", "").strip())
            except Exception:
                price = 0.0

            normalized.append({
                "_id": str(item["_id"]),
                "name": item.get("name", "Unnamed Dish"),
                "description": item.get("description", ""),
                "image": item.get("image", ""),
                "price": price,
                "category": category,
                "tags": item.get("tags", []),
            })

        return normalized

    except Exception as e:
        print("❌ Error fetching menu:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch menu data")
    
@router.get("/categories")
async def get_menu_categories():
    """
    Returns a list of unique categories from the menu collection.
    Useful for building a dynamic category filter in frontend.
    """
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        # Fetch distinct categories (including fallback from 'type')
        categories_from_category = await db["menu"].distinct("category")
        categories_from_type = await db["menu"].distinct("type")

        # Merge, clean, and deduplicate
        all_categories = set()

        for c in categories_from_category + categories_from_type:
            if c and isinstance(c, str) and c.strip():
                all_categories.add(c.strip())

        if not all_categories:
            return {"categories": ["Miscellaneous"]}

        return {"categories": sorted(all_categories)}

    except Exception as e:
        print("❌ Error fetching categories:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch categories")