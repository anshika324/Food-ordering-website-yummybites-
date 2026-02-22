import motor.motor_asyncio
from dotenv import load_dotenv
import os
import asyncio

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "restaurant_db")

client = None
database = None


async def connect_to_mongo():
    """
    Connect to MongoDB Atlas (async).
    Retries automatically if connection fails.
    """
    global client, database

    if client and database:
        return database

    try:
        print("⏳ Connecting to MongoDB Atlas...")
        if not MONGO_URI:
            raise ValueError("❌ MONGO_URI missing in .env")

        client = motor.motor_asyncio.AsyncIOMotorClient(
            MONGO_URI, serverSelectionTimeoutMS=5000
        )
        await client.server_info()  # Ping server to confirm connection
        database = client[MONGO_DB]

        print(f"✅ Connected to MongoDB Atlas successfully! Database: {MONGO_DB}")
        return database

    except Exception as e:
        print("❌ MongoDB connection failed:", e)
        await asyncio.sleep(5)
        return await connect_to_mongo()  # Retry recursively


def get_database():
    """
    Safely returns the active MongoDB database instance.
    Returns None if not connected yet.
    (FastAPI will auto-connect during startup)
    """
    global database
    if database is None:
        print("⚠️ Database instance not found. Run connect_to_mongo() first.")
    return database


async def close_mongo_connection():
    """Gracefully close MongoDB connection."""
    global client
    if client:
        client.close()
        print("🔒 MongoDB connection closed.")