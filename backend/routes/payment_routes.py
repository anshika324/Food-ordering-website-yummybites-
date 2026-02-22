# routes/payment_routes.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import razorpay
import hmac
import hashlib
import json
import os
from dotenv import load_dotenv
from db import get_database
from datetime import datetime

load_dotenv()

router = APIRouter(prefix="/api/v1/payment", tags=["Payment"])

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID",     "rzp_test_RZNXWq4xYzFPoa")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET",  "HbCfjmSliM5K4d2AZBl76vEY")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


class PaymentOrderRequest(BaseModel):
    amount: float


@router.post("/create-order")
async def create_order(request: PaymentOrderRequest):
    """Step 1: Create a Razorpay order."""
    try:
        amount_paise = int(float(request.amount) * 100)
        if amount_paise <= 0:
            raise ValueError("Invalid amount")

        order = client.order.create({
            "amount":          amount_paise,
            "currency":        "INR",
            "payment_capture": 1,
        })

        if not order or "id" not in order:
            raise HTTPException(status_code=500, detail="Failed to create Razorpay order")

        return {
            "order_id": order["id"],
            "amount":   order["amount"],
            "currency": order["currency"],
            "key":      RAZORPAY_KEY_ID,
        }
    except Exception as e:
        print("❌ Razorpay order creation failed:", e)
        raise HTTPException(status_code=500, detail="Failed to create payment order.")


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id:   str
    razorpay_payment_id: str
    razorpay_signature:  str


@router.post("/verify")
async def verify_payment(request: VerifyPaymentRequest):
    """Step 2: Verify Razorpay signature (client-side flow)."""
    try:
        generated = hmac.new(
            key=RAZORPAY_KEY_SECRET.encode(),
            msg=f"{request.razorpay_order_id}|{request.razorpay_payment_id}".encode(),
            digestmod=hashlib.sha256,
        ).hexdigest()

        if generated == request.razorpay_signature:
            return {"status": "success"}

        raise HTTPException(status_code=400, detail="Invalid payment signature")
    except HTTPException:
        raise
    except Exception as e:
        print("❌ Verification error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")


# ══════════════════════════════════════════════
# ✅ RAZORPAY WEBHOOK — production-grade
# Razorpay calls this directly on payment events.
# More secure than client-side verify because the
# client can never fake a Razorpay webhook signature.
# ══════════════════════════════════════════════
@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """
    Razorpay sends POST here on payment.captured / payment.failed events.
    Set this URL in Razorpay Dashboard → Settings → Webhooks:
      https://your-backend.onrender.com/api/v1/payment/webhook
    Secret: same as RAZORPAY_KEY_SECRET
    """
    body      = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # ── Verify webhook signature ──
    expected = hmac.new(
        key=RAZORPAY_KEY_SECRET.encode(),
        msg=body,
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        print("❌ Webhook signature mismatch")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # ── Parse event ──
    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type = event.get("event")
    payment    = event.get("payload", {}).get("payment", {}).get("entity", {})
    order_id   = payment.get("order_id")   # Razorpay order ID (not our MongoDB ID)
    payment_id = payment.get("id")
    amount     = payment.get("amount", 0) / 100  # paise → rupees

    print(f"📨 Webhook event: {event_type} | order: {order_id} | payment: {payment_id}")

    db = get_database()

    if event_type == "payment.captured":
        # Mark payment as verified in DB for audit trail
        await db["payments"].update_one(
            {"razorpay_order_id": order_id},
            {"$set": {
                "razorpay_order_id":   order_id,
                "razorpay_payment_id": payment_id,
                "amount":              amount,
                "status":              "captured",
                "webhook_verified":    True,
                "captured_at":         datetime.utcnow().isoformat(),
            }},
            upsert=True,
        )
        print(f"✅ Payment captured & recorded: ₹{amount}")

    elif event_type == "payment.failed":
        await db["payments"].update_one(
            {"razorpay_order_id": order_id},
            {"$set": {
                "razorpay_order_id": order_id,
                "status":            "failed",
                "failed_at":         datetime.utcnow().isoformat(),
                "error_description": payment.get("error_description", ""),
            }},
            upsert=True,
        )
        print(f"❌ Payment failed for order: {order_id}")

    # Razorpay expects 200 OK quickly — always return success
    return {"status": "webhook received"}
