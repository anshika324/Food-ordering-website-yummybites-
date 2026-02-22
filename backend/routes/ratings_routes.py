from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from db import get_database
from jose import jwt, JWTError
import os

router = APIRouter(prefix="/api/v1/ratings", tags=["Ratings"])

SECRET_KEY = os.getenv("SECRET_KEY", "yummybites_super_secret_jwt_key_2024")
ALGORITHM  = "HS256"

def get_email_from_request(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(auth.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc


class RatingRequest(BaseModel):
    dish_id: str
    stars: int = Field(..., ge=1, le=5)
    comment: Optional[str] = ""


@router.post("/")
async def submit_rating(body: RatingRequest, request: Request):
    """Submit or update a rating. One rating per user per dish."""
    email = get_email_from_request(request)
    if not email:
        raise HTTPException(status_code=401, detail="Please log in to rate dishes.")

    db = get_database()

    # Upsert — if user already rated this dish, update it
    await db["ratings"].update_one(
        {"dish_id": body.dish_id, "user_email": email},
        {"$set": {
            "dish_id":    body.dish_id,
            "user_email": email,
            "stars":      body.stars,
            "comment":    body.comment,
            "updated_at": datetime.utcnow().isoformat(),
        }},
        upsert=True
    )
    # Recompute average for this dish
    avg = await _compute_avg(db, body.dish_id)
    return {"message": "Rating saved!", "average": avg, "count": avg["count"]}


@router.get("/{dish_id}")
async def get_ratings(dish_id: str, request: Request):
    """Get all ratings + average for a dish. Also returns current user's rating if logged in."""
    db = get_database()
    cursor = db["ratings"].find({"dish_id": dish_id}).sort("updated_at", -1).limit(20)
    ratings = [serialize(r) async for r in cursor]

    total = len(ratings)
    avg   = round(sum(r["stars"] for r in ratings) / total, 1) if total else 0

    user_rating = None
    email = get_email_from_request(request)
    if email:
        mine = await db["ratings"].find_one({"dish_id": dish_id, "user_email": email})
        if mine:
            user_rating = {"stars": mine["stars"], "comment": mine.get("comment", "")}

    return {
        "dish_id":     dish_id,
        "average":     avg,
        "count":       total,
        "ratings":     ratings,
        "user_rating": user_rating,
    }


async def _compute_avg(db, dish_id: str) -> dict:
    cursor = db["ratings"].find({"dish_id": dish_id})
    all_r  = [r async for r in cursor]
    count  = len(all_r)
    avg    = round(sum(r["stars"] for r in all_r) / count, 1) if count else 0
    return {"average": avg, "count": count}
