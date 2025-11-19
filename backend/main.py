from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from db import get_database  
import bcrypt
import razorpay
import os
from dotenv import load_dotenv

# 🧠 Custom imports
from db import connect_to_mongo, close_mongo_connection, get_database
from gemini_config import gemini_model
from routes.order_routes import router as order_router
from routes.payment_routes import router as payment_router
from routes.menu_routes import router as menuRouter
from routes.ai_chat import router as ai_chat

# ✅ Load environment variables
load_dotenv()

# ===============================
# App & Config
# ===============================
app = FastAPI(title="YummyBites API", version="1.0")

SECRET_KEY = "yummybites_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Razorpay credentials
RAZORPAY_KEY_ID = "rzp_test_RZNXWq4xYzFPoa"
RAZORPAY_KEY_SECRET = "HbCfjmSliM5K4d2AZBl76vEY"
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


# ===============================
# Middleware (for React frontend)
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ✅ must match your Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# Database Connection Events
# ===============================
@app.on_event("startup")
async def startup_db():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"message": "Welcome to Food Ordering API"}

# ===============================
# Exception Handlers
# ===============================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("❌ Validation Error:", exc.errors())
    return JSONResponse(
        status_code=400,
        content=jsonable_encoder({"message": "Invalid input", "errors": exc.errors()}),
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    print("⚠️ HTTPException:", exc.detail)
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
# Auth Routes (temporary in-memory store)
# ===============================
users_db = {}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/signup")
def signup(user: User):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
    users_db[user.email] = {"name": user.name, "password": hashed_pw}
    return {"message": "User created successfully"}

@app.post("/login", response_model=Token)
def login(user: User):
    db_user = users_db.get(user.email)
    if not db_user or not bcrypt.checkpw(user.password.encode("utf-8"), db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/user/me")
def read_users_me(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = users_db.get(email)
        return {"email": email, "name": user["name"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ===============================
# Reservation Route
# ===============================
@app.post("/api/v1/reservation/send")
async def send_reservation(reservation: Reservation):
    db = get_database()
    reservations_collection = db["reservations"]

    existing = await reservations_collection.find_one({
        "tableNo": reservation.tableNo,
        "date": reservation.date,
        "time": reservation.time
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Table {reservation.tableNo} is already booked for {reservation.date} at {reservation.time}."
        )

    new_reservation = {
        "firstName": reservation.firstName,
        "lastName": reservation.lastName,
        "tableNo": reservation.tableNo,
        "phone": reservation.phone,
        "date": reservation.date,
        "time": reservation.time,
        "createdAt": datetime.utcnow()
    }

    await reservations_collection.insert_one(new_reservation)
    print("✅ New Reservation:", new_reservation)
    return {"message": "Reservation booked successfully!"}


# ===============================
# Menu Route
# ===============================

@app.get("/api/v1/menu")
async def get_menu():
    db = get_database()
    """Fetch all menu items from MongoDB"""
    try:
        database = get_database()
        menu_collection = database["menu"]
        dishes = await menu_collection.find().to_list(100)
        for dish in dishes:
            dish["_id"] = str(dish["_id"])
        return dishes
    except ConnectionError as e:
        print("⚠️ MongoDB not connected:", e)
        raise HTTPException(status_code=500, detail="Database not connected")
    except Exception as e:
        print("❌ Error fetching menu:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch menu items")

# ===============================
# AI Chat Route (backup fallback)
# ===============================



# ===============================
# Include Modular Routers
# ===============================
app.include_router(order_router)
app.include_router(payment_router)
app.include_router(menuRouter)
app.include_router(ai_chat)