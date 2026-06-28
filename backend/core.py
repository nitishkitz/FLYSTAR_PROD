"""Shared core: db client, JWT helpers, password hashing, auth dependencies."""
from datetime import datetime, timezone, timedelta
from typing import Optional
import os

import jwt
import bcrypt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

JWT_ALG = "HS256"

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")


class MissingDatabase:
    def __getattr__(self, name):
        raise HTTPException(
            503,
            "Backend database is not configured. Set MONGO_URL and DB_NAME in Vercel environment variables.",
        )


mongo_client = (
    AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    if MONGO_URL and DB_NAME
    else None
)
db = mongo_client[DB_NAME] if mongo_client is not None else MissingDatabase()
DB_CONFIGURED = mongo_client is not None


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def secret() -> str:
    jwt_secret = os.environ.get("JWT_SECRET")
    if not jwt_secret:
        raise HTTPException(503, "JWT_SECRET is not configured in Vercel environment variables.")
    return jwt_secret


def make_access(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": now_utc() + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, secret(), algorithm=JWT_ALG)


def make_refresh(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now_utc() + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, secret(), algorithm=JWT_ALG)


def doc_to_public(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "phone": u.get("phone", ""),
        "role": u["role"],
        "active": u.get("active", True),
        "created_at": u.get("created_at"),
    }


async def get_token_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or not user.get("active", True):
            raise HTTPException(401, "User not found or disabled")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def require_roles(*allowed):
    async def dep(user=Depends(get_token_user)):
        if user["role"] not in allowed:
            raise HTTPException(403, "Forbidden")
        return user
    return dep


# Pricing (mirrors frontend pricing.js)
ZONES = {
    "gulf": {"base": 1250, "mult": 1.00},
    "asia": {"base": 1450, "mult": 1.15},
    "europe": {"base": 1750, "mult": 1.35},
    "northAmerica": {"base": 2100, "mult": 1.55},
    "restOfWorld": {"base": 2450, "mult": 1.75},
}
TYPE_MULT = {"documents": 0.82, "medicines": 1.12, "parcel": 1.0, "commercial": 1.20}
SVC_MULT = {"economy": 0.82, "priority": 1.00, "express": 1.38}


def zone_for_country(country: str) -> str:
    c = (country or "").strip().lower()
    if c in ("uae", "united arab emirates", "saudi arabia", "qatar", "oman", "bahrain", "kuwait"):
        return "gulf"
    if c in ("usa", "united states", "canada"):
        return "northAmerica"
    if c in ("uk", "united kingdom", "england", "germany", "france", "italy", "spain",
             "netherlands", "ireland", "switzerland", "sweden", "norway", "denmark",
             "finland", "poland", "europe"):
        return "europe"
    if c in ("india", "singapore", "malaysia", "thailand", "indonesia", "vietnam", "philippines",
             "japan", "south korea", "china", "hong kong", "australia", "new zealand"):
        return "asia"
    return "restOfWorld"


def estimate_price(country: str, shipment_type: str, service: str, weight: float) -> float:
    w = max(0.5, min(100.0, float(weight or 0.5)))
    cw = max(0.5, w) if shipment_type == "documents" else max(1.0, w)
    z = ZONES[zone_for_country(country)]
    weight_charge = cw * 620 * z["mult"] * TYPE_MULT.get(shipment_type, 1.0)
    subtotal = z["base"] + weight_charge
    return round((subtotal * SVC_MULT.get(service, 1.0)) / 50.0) * 50.0
