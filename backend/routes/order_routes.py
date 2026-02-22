# routes/order_routes.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from db import get_database, connect_to_mongo
from jose import jwt, JWTError
import os

router = APIRouter(prefix="/api/v1/order", tags=["Orders"])

SECRET_KEY = os.getenv("SECRET_KEY", "yummybites_super_secret_jwt_key_2024")
ALGORITHM = "HS256"


# ===============================
# 🔧 Helpers
# ===============================
def serialize_doc(doc):
    """Convert MongoDB ObjectId → string for frontend."""
    if not doc:
        return {}
    doc["_id"] = str(doc["_id"])
    return doc


def get_email_from_request(request: Request) -> Optional[str]:
    """
    Extract logged-in user's email from Authorization header.
    Returns None if not logged in — orders still work for guests.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")  # "sub" = email
    except JWTError:
        return None


# ===============================
# 📦 Pydantic Models
# ===============================
class OrderItem(BaseModel):
    _id: str
    name: str
    price: float
    quantity: int
    image: Optional[str] = None


class DeliveryDetails(BaseModel):
    name: Optional[str] = "Guest User"
    phone: Optional[str] = "N/A"
    address: Optional[str] = "Online Order"
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
async def place_order(order: OrderRequest, request: Request):
    if not order.items:
        raise HTTPException(status_code=400, detail="Your cart is empty!")

    db = get_database()
    if db is None:
        await connect_to_mongo()
        db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    IST = timezone(timedelta(hours=5, minutes=30))
    delivery_details = order.deliveryDetails or DeliveryDetails()

    # Clean item prices
    cleaned_items = []
    for item in order.items:
        try:
            price_value = float(str(item.price).replace("₹", "").strip())
            cleaned_items.append({**item.dict(), "price": price_value})
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid price for: {item.name}")

    # ✅ Save user_email if logged in, else "guest"
    user_email = get_email_from_request(request)

    order_doc = {
        "items": cleaned_items,
        "total": float(str(order.total).replace("₹", "").strip()),
        "delivery_details": delivery_details.dict(),
        "status": "Pending",
        "timestamp": order.timestamp or datetime.now(IST).isoformat(),
        "user_email": user_email or "guest",  # ✅ links order to user
    }

    try:
        result = await db["orders"].insert_one(order_doc)
        saved_order = await db["orders"].find_one({"_id": result.inserted_id})
        print("✅ Order saved:", saved_order)
        return {
            "message": "Order placed successfully!",
            "order_id": str(result.inserted_id),
            "order": serialize_doc(saved_order),
        }
    except Exception as e:
        print("❌ Order error:", e)
        raise HTTPException(status_code=500, detail="Database insert failed")


# ===============================
# 🔍 GET: Single Order by ID
# ===============================
@router.get("/history")
async def get_order_history(request: Request):
    """
    Returns all orders for the currently logged-in user.
    Requires a valid JWT token in Authorization header.
    """
    user_email = get_email_from_request(request)
    if not user_email:
        raise HTTPException(status_code=401, detail="Please log in to view order history.")

    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    try:
        # ✅ Fetch all orders for this user, newest first
        cursor = db["orders"].find(
            {"user_email": user_email}
        ).sort("timestamp", -1).limit(50)

        orders = await cursor.to_list(50)
        return [serialize_doc(o) for o in orders]

    except Exception as e:
        print("❌ History fetch error:", e)
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


# ===============================
# 🔍 GET: Single Order by ID
# ===============================
@router.get("/{order_id}")
async def get_order(order_id: str):
    """Fetch a single order by its MongoDB ObjectId."""
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
        raise HTTPException(status_code=400, detail=f"Invalid ID or error: {str(e)}")


# ===============================
# 🔄 PATCH: Update Order Status (used by Admin)
# ===============================
@router.patch("/{order_id}/status")
async def update_order_status(order_id: str, request: Request):
    """Update status of an order. Admin only."""
    body = await request.json()
    new_status = body.get("status")

    valid_statuses = ["Pending", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    try:
        result = await db["orders"].update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": new_status}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")

        # ✅ Broadcast via WebSocket — imported inline to avoid circular import issues
        try:
            from routes.websocket_routes import manager as ws_manager
            await ws_manager.broadcast_status(order_id, new_status)
            print(f"📡 WS broadcast sent: order {order_id} → {new_status}")
        except Exception as ws_err:
            # Don't fail the whole request if WS broadcast fails — DB is already updated
            print(f"⚠️  WS broadcast failed (non-fatal): {ws_err}")

        return {"message": f"Order status updated to '{new_status}'"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Update failed: {str(e)}")
