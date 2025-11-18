from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from db import get_database, connect_to_mongo  # ✅ import both helpers

router = APIRouter(prefix="/api/v1/order", tags=["Orders"])


# ===============================
# 🔧 Helper: Serialize MongoDB document
# ===============================
def serialize_doc(doc):
    """Convert MongoDB ObjectId → string for frontend."""
    if not doc:
        return {}
    doc["_id"] = str(doc["_id"])
    return doc


# ===============================
# 📦 Pydantic Models
# ===============================
class OrderItem(BaseModel):
    _id: str
    name: str
    price: float  # ✅ must be numeric
    quantity: int
    image: Optional[str] = None


class DeliveryDetails(BaseModel):
    name: Optional[str] = "Guest User"
    phone: Optional[str] = "N/A"
    address: Optional[str] = "Online Order via Foodie AI"
    instructions: Optional[str] = None


class OrderRequest(BaseModel):
    items: List[OrderItem]
    total: float = Field(..., gt=0)
    deliveryDetails: Optional[DeliveryDetails] = None
    timestamp: Optional[str] = None


# ===============================
# 🚀 POST: Place Order
# ===============================
@router.post("/place")
async def place_order(order: OrderRequest):
    """
    Handles both chatbot and UI-based orders.
    Automatically fills delivery info for AI-driven orders.
    """
    if not order.items or len(order.items) == 0:
        raise HTTPException(status_code=400, detail="Your cart is empty!")

    # ✅ Get live DB connection
    db = get_database()
    if db is None:
        print("⚠️ Lost MongoDB connection — reconnecting...")
        await connect_to_mongo()
        db = get_database()

    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    # 🕒 Use IST timezone
    IST = timezone(timedelta(hours=5, minutes=30))
    delivery_details = order.deliveryDetails or DeliveryDetails()

    # ✅ Clean and format item prices
    cleaned_items = []
    for item in order.items:
        try:
            price_value = float(str(item.price).replace("₹", "").strip())
            cleaned_items.append({**item.dict(), "price": price_value})
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid price format for item: {item.name}"
            )

    order_doc = {
        "items": cleaned_items,
        "total": float(str(order.total).replace("₹", "").strip()),
        "delivery_details": delivery_details.dict(),
        "status": "Pending",
        "timestamp": order.timestamp or datetime.now(IST).isoformat(),
    }

    try:
        result = await db["orders"].insert_one(order_doc)
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to insert order")

        saved_order = await db["orders"].find_one({"_id": result.inserted_id})
        print("✅ Order saved successfully:", saved_order)

        return {
            "message": "Order placed successfully!",
            "order_id": str(result.inserted_id),
            "order": serialize_doc(saved_order),
        }

    except Exception as e:
        print("❌ Order insertion error:", e)
        raise HTTPException(status_code=500, detail="Database insert failed")


# ===============================
# 🔍 GET: Fetch Order by ID
# ===============================
@router.get("/{order_id}")
async def get_order(order_id: str):
    """Fetch an order by its MongoDB ObjectId."""
    try:
        db = get_database()
        if db is None:
            await connect_to_mongo()
            db = get_database()

        order = await db["orders"].find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return serialize_doc(order)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ID or Error: {str(e)}")