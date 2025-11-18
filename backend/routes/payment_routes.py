from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import razorpay
import hmac
import hashlib
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/v1/payment", tags=["Payment"])

# ===============================
# 🔑 Razorpay Configuration
# ===============================
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_RZNXWq4xYzFPoa")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "HbCfjmSliM5K4d2AZBl76vEY")

# ✅ Initialize client
client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


# ===============================
# 💰 Create Order Endpoint
# ===============================
class PaymentOrderRequest(BaseModel):
    amount: float  # Amount in rupees


@router.post("/create-order")
async def create_order(request: PaymentOrderRequest):
    """
    ✅ Step 1: Create a Razorpay order.
    Frontend will use this order_id to open Razorpay Checkout.
    """
    try:
        # Razorpay requires amount in paise (1 INR = 100 paise)
        amount_paise = int(float(request.amount) * 100)

        if amount_paise <= 0:
            raise ValueError("Invalid payment amount")

        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1
        })

        if not order or "id" not in order:
            print("❌ Razorpay API Error:", order)
            raise HTTPException(status_code=500, detail="Failed to create order on Razorpay")

        print("✅ Razorpay order created:", order["id"])

        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key": RAZORPAY_KEY_ID
        }

    except Exception as e:
        print("❌ Razorpay order creation failed:", e)
        raise HTTPException(status_code=500, detail="Failed to create payment order.")


# ===============================
# 🔐 Verify Payment Endpoint
# ===============================
class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/verify")
async def verify_payment(request: VerifyPaymentRequest):
    """
    ✅ Step 2: Verify Razorpay signature to confirm payment authenticity.
    This endpoint is called from frontend after successful Razorpay checkout.
    """
    try:
        generated_signature = hmac.new(
            key=RAZORPAY_KEY_SECRET.encode(),
            msg=f"{request.razorpay_order_id}|{request.razorpay_payment_id}".encode(),
            digestmod=hashlib.sha256
        ).hexdigest()

        if generated_signature == request.razorpay_signature:
            return {"status": "success"}
        else:
            print("❌ Signature mismatch!")
            print("Expected:", generated_signature)
            print("Received:", request.razorpay_signature)
            raise HTTPException(status_code=400, detail="Invalid payment signature")

    except Exception as e:
        print("❌ Payment verification error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")