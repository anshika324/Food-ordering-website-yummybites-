# main.py
import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
import bcrypt
import os
from dotenv import load_dotenv

# Custom imports
from db import connect_to_mongo, close_mongo_connection, get_database
from routes.order_routes     import router as order_router
from routes.payment_routes   import router as payment_router
from routes.menu_routes      import router as menuRouter
from routes.ai_chat          import router as ai_chat_router
from routes.websocket_routes import router as ws_router        # ✅ Real-time order tracking
from routes.ratings_routes   import router as ratings_router   # ✅ Dish ratings & reviews
from keep_alive import keep_alive_loop                         # ✅ Render free tier keep-alive

load_dotenv()

# ===============================
# App & Config
# ===============================
app = FastAPI(title="YummyBites API", version="2.0")

SECRET_KEY                  = os.getenv("SECRET_KEY", "yummybites_super_secret_jwt_key_2024")
ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
ADMIN_EMAIL                 = os.getenv("ADMIN_EMAIL", "admin@yummybites.com")

# ===============================
# CORS
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "https://food-ordering-website-frontend-4gvh.onrender.com",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# DB Events
# ===============================
@app.on_event("startup")
async def startup_db():
    await connect_to_mongo()
    # ✅ Keep-alive pings /health every 10 min to prevent Render spin-down
    asyncio.create_task(keep_alive_loop())

@app.on_event("shutdown")
async def shutdown_db():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"message": "Welcome to YummyBites API v2"}

# ✅ Health endpoint pinged by keep_alive.py
@app.get("/health")
async def health():
    return {"status": "ok"}

# ===============================
# Exception Handlers
# ===============================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("Validation Error:", exc.errors())
    return JSONResponse(status_code=400, content=jsonable_encoder({"message": "Invalid input", "errors": exc.errors()}))

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})

# ===============================
# Schemas
# ===============================
class User(BaseModel):
    email: str
    name: Optional[str] = None
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class Reservation(BaseModel):
    firstName: str
    lastName: str
    tableNo: int
    phone: int
    date: str
    time: str

# ===============================
# Auth Helpers
# ===============================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_email_from_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def get_token_from_request(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ")[1]
    # Also support ?token= query param for /user/me backward compat
    return request.query_params.get("token")

# ===============================
# Auth Routes — MongoDB backed
# ===============================
@app.post("/signup")
async def signup(user: User):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    existing = await db["users"].find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
    await db["users"].insert_one({
        "email":      user.email,
        "name":       user.name or "",
        "password":   hashed_pw,
        "created_at": datetime.utcnow().isoformat(),
        "role":       "user",
    })
    return {"message": "Account created successfully! Please log in."}


@app.post("/login", response_model=Token)
async def login(user: User):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    db_user = await db["users"].find_one({"email": user.email})
    if not db_user or not bcrypt.checkpw(user.password.encode("utf-8"), db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/user/me")
async def read_users_me(request: Request):
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    email = get_email_from_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = get_database()
    db_user = await db["users"].find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"email": email, "name": db_user.get("name", ""), "role": db_user.get("role", "user")}

# ===============================
# Reservation Route
# ===============================
@app.post("/api/v1/reservation/send")
async def send_reservation(reservation: Reservation):
    db = get_database()
    reservations_collection = db["reservations"]

    existing = await reservations_collection.find_one({
        "tableNo": reservation.tableNo,
        "date":    reservation.date,
        "time":    reservation.time,
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Table {reservation.tableNo} is already booked for {reservation.date} at {reservation.time}."
        )

    await reservations_collection.insert_one({
        "firstName": reservation.firstName,
        "lastName":  reservation.lastName,
        "tableNo":   reservation.tableNo,
        "phone":     reservation.phone,
        "date":      reservation.date,
        "time":      reservation.time,
        "createdAt": datetime.utcnow(),
    })
    return {"message": "Reservation booked successfully!"}

# ===============================
# Admin Routes
# ===============================
def require_admin(request: Request) -> str:
    """Validate token and check admin role. Returns email."""
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    email = get_email_from_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    return email


@app.get("/api/v1/admin/orders")
async def admin_get_all_orders(request: Request):
    """Get all orders — admin only."""
    require_admin(request)
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    orders = await db["orders"].find().sort("timestamp", -1).limit(200).to_list(200)
    for o in orders:
        o["_id"] = str(o["_id"])
    return orders


@app.get("/api/v1/admin/stats")
async def admin_get_stats(request: Request):
    """Dashboard summary stats — admin only."""
    require_admin(request)
    db = get_database()

    total_orders   = await db["orders"].count_documents({})
    pending_orders = await db["orders"].count_documents({"status": "Pending"})
    delivered      = await db["orders"].find({"status": "Delivered"}).to_list(1000)
    total_revenue  = sum(o.get("total", 0) for o in delivered)
    total_users    = await db["users"].count_documents({})

    return {
        "total_orders":   total_orders,
        "pending_orders": pending_orders,
        "total_revenue":  total_revenue,
        "total_users":    total_users,
    }


# ===============================
# Include Routers
# ===============================
app.include_router(order_router)
app.include_router(payment_router)
app.include_router(menuRouter)
app.include_router(ai_chat_router)
app.include_router(ws_router)       # ✅ WebSocket: wss://backend/ws/order/{id}
app.include_router(ratings_router)  # ✅ Ratings:   /api/v1/ratings/
