from dotenv import load_dotenv
load_dotenv()

import os
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal, List
from contextlib import asynccontextmanager

import jwt
import bcrypt
from fastapi import FastAPI, HTTPException, Request, Response, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("flystar")

JWT_ALG = "HS256"
ROLES = ("admin", "employee", "customer")

# -------------------- Mongo --------------------
mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo_client[os.environ["DB_NAME"]]

# -------------------- Helpers --------------------

def now_utc():
    return datetime.now(timezone.utc)

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def secret() -> str:
    return os.environ["JWT_SECRET"]

def make_access(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": now_utc() + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, secret(), algorithm=JWT_ALG)

def make_refresh(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now_utc() + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, secret(), algorithm=JWT_ALG)

def set_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax",
                    max_age=3600, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax",
                    max_age=604800, path="/")

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

# -------------------- Lifespan --------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.users.create_index("email", unique=True)
    await db.shipments.create_index("awb", unique=True, sparse=True)
    await db.shipments.create_index([("customer_id", 1), ("created_at", -1)])
    await db.shipments.create_index([("assigned_employee_id", 1), ("created_at", -1)])
    await db.shipments.create_index([("status", 1), ("created_at", -1)])
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

    # Seed users
    seeds = [
        {"email": os.environ["ADMIN_EMAIL"], "pw": os.environ["ADMIN_PASSWORD"],
         "name": "Flystar Admin", "role": "admin", "phone": "+918125477584"},
        {"email": os.environ["DEMO_EMPLOYEE_EMAIL"], "pw": os.environ["DEMO_EMPLOYEE_PASSWORD"],
         "name": "Ravi Kumar", "role": "employee", "phone": "+919666145766"},
        {"email": os.environ["DEMO_CUSTOMER_EMAIL"], "pw": os.environ["DEMO_CUSTOMER_PASSWORD"],
         "name": "Demo Customer", "role": "customer", "phone": "+919999912345"},
    ]
    for s in seeds:
        ex = await db.users.find_one({"email": s["email"]})
        if not ex:
            await db.users.insert_one({
                "email": s["email"], "password_hash": hash_pw(s["pw"]),
                "name": s["name"], "role": s["role"], "phone": s["phone"],
                "active": True, "created_at": now_utc(),
            })
            log.info(f"Seeded {s['role']}: {s['email']}")
        elif not verify_pw(s["pw"], ex["password_hash"]):
            await db.users.update_one({"_id": ex["_id"]},
                                       {"$set": {"password_hash": hash_pw(s["pw"])}})
    log.info("Startup complete.")
    yield

app = FastAPI(lifespan=lifespan, title="Flystar Ops API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # preview domain is dynamic
    allow_credentials=False,  # using Authorization header primarily
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Schemas --------------------

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    phone: str = Field(min_length=6)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class CreateStaffIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    phone: str = Field(min_length=6)
    role: Literal["admin", "employee"]

class UpdateUserIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    active: Optional[bool] = None
    role: Optional[Literal["admin", "employee", "customer"]] = None

class AddressIn(BaseModel):
    name: str
    phone: str
    line1: str
    city: str
    state: Optional[str] = ""
    country: str
    postal_code: Optional[str] = ""

class PickupRequestIn(BaseModel):
    pickup: AddressIn
    delivery: AddressIn
    shipment_type: Literal["documents", "medicines", "parcel", "commercial"]
    service: Literal["economy", "priority", "express"]
    approx_weight_kg: float = Field(gt=0)
    approx_length_cm: Optional[float] = None
    approx_width_cm: Optional[float] = None
    approx_height_cm: Optional[float] = None
    contents: str
    notes: Optional[str] = ""
    preferred_pickup_at: Optional[datetime] = None

class StatusUpdateIn(BaseModel):
    status: Literal[
        "requested", "assigned", "en_route_to_pickup", "picked_up", "at_hub",
        "packed", "dispatched", "in_transit", "customs", "out_for_delivery",
        "delivered", "exception", "cancelled"
    ]
    note: Optional[str] = ""
    location: Optional[str] = ""

class WaybillFillIn(BaseModel):
    sender: AddressIn
    receiver: AddressIn
    actual_weight_kg: float = Field(gt=0)
    length_cm: float = Field(gt=0)
    width_cm: float = Field(gt=0)
    height_cm: float = Field(gt=0)
    piece_count: int = Field(ge=1, default=1)
    declared_value_inr: float = Field(ge=0, default=0)
    packaging: Literal["box", "envelope", "tube", "pallet", "other"] = "box"
    contains_restricted: bool = False
    proof_photo_base64: Optional[str] = None  # data:image/jpeg;base64,...
    notes: Optional[str] = ""

class ShipmentUpdateIn(BaseModel):
    """Admin can edit any field."""
    pickup: Optional[AddressIn] = None
    delivery: Optional[AddressIn] = None
    shipment_type: Optional[str] = None
    service: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    status: Optional[str] = None
    actual_weight_kg: Optional[float] = None
    declared_value_inr: Optional[float] = None
    price_inr: Optional[float] = None
    notes: Optional[str] = None

# -------------------- Pricing (mirrors frontend pricing.js) --------------------

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
    if c in ("uk", "united kingdom", "england", "germany", "france", "italy", "spain", "netherlands", "ireland", "switzerland", "sweden", "norway", "denmark", "finland", "poland", "europe"):
        return "europe"
    if c in ("india", "singapore", "malaysia", "thailand", "indonesia", "vietnam", "philippines", "japan", "south korea", "china", "hong kong", "australia", "new zealand"):
        return "asia"
    return "restOfWorld"

def estimate_price(country: str, shipment_type: str, service: str, weight: float) -> float:
    w = max(0.5, min(100.0, float(weight or 0.5)))
    cw = max(0.5, w) if shipment_type == "documents" else max(1.0, w)
    z = ZONES[zone_for_country(country)]
    weight_charge = cw * 620 * z["mult"] * TYPE_MULT.get(shipment_type, 1.0)
    subtotal = z["base"] + weight_charge
    return round((subtotal * SVC_MULT.get(service, 1.0)) / 50.0) * 50.0

# -------------------- Auth Endpoints --------------------

@app.post("/api/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email, "password_hash": hash_pw(payload.password),
        "name": payload.name.strip(), "phone": payload.phone.strip(),
        "role": "customer", "active": True, "created_at": now_utc(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    access = make_access(str(doc["_id"]), email, "customer")
    refresh = make_refresh(str(doc["_id"]))
    set_cookies(response, access, refresh)
    return {"user": doc_to_public(doc), "access_token": access, "refresh_token": refresh}

@app.post("/api/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"
    # Brute force check
    rec = await db.login_attempts.find_one({"identifier": ident})
    if rec and rec.get("locked_until") and rec["locked_until"] > now_utc():
        raise HTTPException(429, "Too many attempts. Try again later.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(payload.password, user["password_hash"]) or not user.get("active", True):
        # increment
        attempts = (rec["attempts"] if rec else 0) + 1
        update = {"attempts": attempts, "updated_at": now_utc()}
        if attempts >= 5:
            update["locked_until"] = now_utc() + timedelta(minutes=15)
            update["attempts"] = 0
        await db.login_attempts.update_one({"identifier": ident}, {"$set": update}, upsert=True)
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    access = make_access(str(user["_id"]), user["email"], user["role"])
    refresh = make_refresh(str(user["_id"]))
    set_cookies(response, access, refresh)
    return {"user": doc_to_public(user), "access_token": access, "refresh_token": refresh}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@app.get("/api/auth/me")
async def me(user=Depends(get_token_user)):
    return doc_to_public(user)

@app.post("/api/auth/refresh")
async def refresh_token(request: Request, response: Response):
    tok = request.cookies.get("refresh_token")
    if not tok:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(tok, secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Bad refresh")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User missing")
        access = make_access(str(user["_id"]), user["email"], user["role"])
        new_refresh = make_refresh(str(user["_id"]))
        set_cookies(response, access, new_refresh)
        return {"access_token": access}
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid refresh")

# -------------------- User Management (admin) --------------------

@app.get("/api/users")
async def list_users(
    role: Optional[str] = None,
    user=Depends(require_roles("admin")),
):
    q = {}
    if role:
        q["role"] = role
    cursor = db.users.find(q).sort("created_at", -1)
    return [doc_to_public(u) async for u in cursor]

@app.post("/api/users")
async def create_staff(payload: CreateStaffIn, user=Depends(require_roles("admin"))):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email, "password_hash": hash_pw(payload.password),
        "name": payload.name.strip(), "phone": payload.phone.strip(),
        "role": payload.role, "active": True, "created_at": now_utc(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_to_public(doc)

@app.patch("/api/users/{user_id}")
async def update_user(user_id: str, payload: UpdateUserIn, user=Depends(require_roles("admin"))):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    res = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    return doc_to_public(u)

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_roles("admin"))):
    if str(user["_id"]) == user_id:
        raise HTTPException(400, "Cannot delete yourself")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}

# -------------------- Shipments --------------------

def gen_awb() -> str:
    return "FLY" + secrets.token_hex(4).upper()

def shipment_to_dict(s: dict) -> dict:
    s["id"] = str(s.pop("_id"))
    if s.get("customer_id"): s["customer_id"] = str(s["customer_id"])
    if s.get("assigned_employee_id"): s["assigned_employee_id"] = str(s["assigned_employee_id"])
    return s

@app.post("/api/shipments")
async def create_pickup_request(payload: PickupRequestIn, user=Depends(require_roles("customer", "admin"))):
    price = estimate_price(payload.delivery.country, payload.shipment_type, payload.service, payload.approx_weight_kg)
    now = now_utc()
    awb = gen_awb()
    doc = {
        "awb": awb,
        "customer_id": user["_id"],
        "customer_name": user.get("name"),
        "customer_email": user.get("email"),
        "customer_phone": user.get("phone"),
        "assigned_employee_id": None,
        "status": "requested",
        "pickup": payload.pickup.model_dump(),
        "delivery": payload.delivery.model_dump(),
        "shipment_type": payload.shipment_type,
        "service": payload.service,
        "approx_weight_kg": payload.approx_weight_kg,
        "approx_length_cm": payload.approx_length_cm,
        "approx_width_cm": payload.approx_width_cm,
        "approx_height_cm": payload.approx_height_cm,
        "actual_weight_kg": None,
        "length_cm": None, "width_cm": None, "height_cm": None,
        "piece_count": None,
        "declared_value_inr": None,
        "packaging": None,
        "contains_restricted": False,
        "proof_photo_base64": None,
        "contents": payload.contents,
        "notes": payload.notes or "",
        "preferred_pickup_at": payload.preferred_pickup_at,
        "price_inr": price,
        "invoice_number": f"INV-{awb[-6:]}",
        "events": [{
            "status": "requested",
            "at": now,
            "by": doc_to_public(user),
            "note": "Pickup request created",
            "location": payload.pickup.city,
        }],
        "created_at": now,
        "updated_at": now,
    }
    res = await db.shipments.insert_one(doc)
    doc["_id"] = res.inserted_id
    return shipment_to_dict(doc)

@app.get("/api/shipments")
async def list_shipments(
    status_filter: Optional[str] = Query(None, alias="status"),
    q: Optional[str] = None,
    limit: int = 100,
    user=Depends(get_token_user),
):
    query = {}
    if user["role"] == "customer":
        query["customer_id"] = user["_id"]
    elif user["role"] == "employee":
        # employee sees: unassigned (queue) + own assigned
        query["$or"] = [
            {"assigned_employee_id": user["_id"]},
            {"assigned_employee_id": None, "status": "requested"},
        ]
    if status_filter:
        query["status"] = status_filter
    if q:
        query["$or"] = [
            {"awb": {"$regex": q, "$options": "i"}},
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"customer_email": {"$regex": q, "$options": "i"}},
            {"delivery.city": {"$regex": q, "$options": "i"}},
            {"delivery.country": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.shipments.find(query).sort("created_at", -1).limit(limit)
    return [shipment_to_dict(s) async for s in cursor]

@app.get("/api/shipments/{shipment_id}")
async def get_shipment(shipment_id: str, user=Depends(get_token_user)):
    try:
        oid = ObjectId(shipment_id)
    except Exception:
        s = await db.shipments.find_one({"awb": shipment_id.upper()})
    else:
        s = await db.shipments.find_one({"_id": oid})
    if not s:
        raise HTTPException(404, "Not found")
    if user["role"] == "customer" and s.get("customer_id") != user["_id"]:
        raise HTTPException(403, "Forbidden")
    if user["role"] == "employee":
        if s.get("assigned_employee_id") not in (None, user["_id"]):
            raise HTTPException(403, "Forbidden")
    return shipment_to_dict(s)

@app.get("/api/shipments/track/{awb}")
async def public_track(awb: str):
    """Public tracking by AWB - returns minimal info."""
    s = await db.shipments.find_one({"awb": awb.upper()})
    if not s:
        raise HTTPException(404, "Shipment not found")
    return {
        "awb": s["awb"],
        "status": s["status"],
        "delivery_city": s["delivery"].get("city"),
        "delivery_country": s["delivery"].get("country"),
        "created_at": s["created_at"],
        "events": [
            {"status": e["status"], "at": e["at"], "note": e.get("note", ""), "location": e.get("location", "")}
            for e in s.get("events", [])
        ],
    }

@app.post("/api/shipments/{shipment_id}/accept")
async def accept_shipment(shipment_id: str, user=Depends(require_roles("employee", "admin"))):
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not s:
        raise HTTPException(404, "Not found")
    if s.get("assigned_employee_id") and s["assigned_employee_id"] != user["_id"]:
        raise HTTPException(400, "Already assigned to another employee")
    event = {"status": "assigned", "at": now_utc(),
             "by": doc_to_public(user), "note": f"Accepted by {user.get('name')}",
             "location": s["pickup"].get("city", "")}
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": {"assigned_employee_id": user["_id"], "status": "assigned",
                  "assigned_employee_name": user.get("name"), "updated_at": now_utc()},
         "$push": {"events": event}}
    )
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return shipment_to_dict(s)

@app.post("/api/shipments/{shipment_id}/waybill")
async def fill_waybill(shipment_id: str, payload: WaybillFillIn,
                       user=Depends(require_roles("employee", "admin"))):
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not s:
        raise HTTPException(404, "Not found")
    if user["role"] == "employee" and s.get("assigned_employee_id") != user["_id"]:
        raise HTTPException(403, "Not your shipment")
    # Recompute price based on actual weight
    price = estimate_price(payload.receiver.country, s.get("shipment_type", "parcel"),
                            s.get("service", "priority"), payload.actual_weight_kg)
    event = {"status": "picked_up", "at": now_utc(), "by": doc_to_public(user),
             "note": f"Waybill filled. {payload.piece_count} pcs, {payload.actual_weight_kg}kg",
             "location": payload.sender.city}
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": {
            "sender": payload.sender.model_dump(),
            "receiver": payload.receiver.model_dump(),
            "actual_weight_kg": payload.actual_weight_kg,
            "length_cm": payload.length_cm, "width_cm": payload.width_cm, "height_cm": payload.height_cm,
            "piece_count": payload.piece_count,
            "declared_value_inr": payload.declared_value_inr,
            "packaging": payload.packaging,
            "contains_restricted": payload.contains_restricted,
            "proof_photo_base64": payload.proof_photo_base64,
            "waybill_notes": payload.notes,
            "status": "picked_up",
            "price_inr": price,
            "updated_at": now_utc(),
        },
         "$push": {"events": event}}
    )
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return shipment_to_dict(s)

@app.post("/api/shipments/{shipment_id}/status")
async def update_status(shipment_id: str, payload: StatusUpdateIn,
                        user=Depends(require_roles("employee", "admin"))):
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not s:
        raise HTTPException(404, "Not found")
    if user["role"] == "employee" and s.get("assigned_employee_id") != user["_id"]:
        raise HTTPException(403, "Not your shipment")
    event = {"status": payload.status, "at": now_utc(), "by": doc_to_public(user),
             "note": payload.note or "", "location": payload.location or ""}
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": {"status": payload.status, "updated_at": now_utc()},
         "$push": {"events": event}}
    )
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return shipment_to_dict(s)

@app.patch("/api/shipments/{shipment_id}")
async def admin_edit(shipment_id: str, payload: ShipmentUpdateIn,
                     user=Depends(require_roles("admin"))):
    update = {}
    for k, v in payload.model_dump().items():
        if v is not None:
            if k == "assigned_employee_id":
                try:
                    update[k] = ObjectId(v)
                except Exception:
                    update[k] = None
            elif k in ("pickup", "delivery") and isinstance(v, dict):
                update[k] = v
            else:
                update[k] = v
    if not update:
        raise HTTPException(400, "Nothing to update")
    update["updated_at"] = now_utc()
    event = {"status": update.get("status", "edited"), "at": now_utc(),
             "by": doc_to_public(user), "note": "Admin edit",
             "location": "Admin Panel"}
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": update, "$push": {"events": event}},
    )
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return shipment_to_dict(s)

@app.delete("/api/shipments/{shipment_id}")
async def delete_shipment(shipment_id: str, user=Depends(require_roles("admin"))):
    await db.shipments.delete_one({"_id": ObjectId(shipment_id)})
    return {"ok": True}

# -------------------- Analytics (admin) --------------------

@app.get("/api/analytics/overview")
async def overview(user=Depends(require_roles("admin"))):
    total = await db.shipments.count_documents({})
    delivered = await db.shipments.count_documents({"status": "delivered"})
    in_transit = await db.shipments.count_documents({"status": {"$in": ["in_transit", "dispatched", "customs", "out_for_delivery"]}})
    pending_pickup = await db.shipments.count_documents({"status": {"$in": ["requested", "assigned", "en_route_to_pickup"]}})
    exceptions = await db.shipments.count_documents({"status": "exception"})
    revenue_agg = await db.shipments.aggregate([
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$price_inr"}}}
    ]).to_list(1)
    revenue = revenue_agg[0]["total"] if revenue_agg else 0

    # last 14 days
    since = now_utc() - timedelta(days=14)
    daily = await db.shipments.aggregate([
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}},
    ]).to_list(100)

    status_dist = await db.shipments.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]).to_list(50)

    by_country = await db.shipments.aggregate([
        {"$group": {"_id": "$delivery.country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 6},
    ]).to_list(10)

    by_employee = await db.shipments.aggregate([
        {"$match": {"assigned_employee_id": {"$ne": None}}},
        {"$group": {
            "_id": "$assigned_employee_id",
            "count": {"$sum": 1},
            "delivered": {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, 1, 0]}},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]).to_list(20)
    # enrich employee names
    emp_rows = []
    for row in by_employee:
        u = await db.users.find_one({"_id": row["_id"]})
        emp_rows.append({
            "employee_id": str(row["_id"]),
            "name": u.get("name") if u else "Unknown",
            "total": row["count"],
            "delivered": row["delivered"],
        })

    return {
        "kpis": {
            "total_shipments": total,
            "delivered": delivered,
            "in_transit": in_transit,
            "pending_pickup": pending_pickup,
            "exceptions": exceptions,
            "revenue_inr": revenue,
        },
        "daily_shipments": [{"date": d["_id"], "count": d["count"]} for d in daily],
        "status_distribution": [{"status": s["_id"], "count": s["count"]} for s in status_dist],
        "by_country": [{"country": c["_id"] or "Unknown", "count": c["count"]} for c in by_country],
        "by_employee": emp_rows,
    }

# -------------------- Quote (price estimator) --------------------

class QuoteIn(BaseModel):
    country: str
    shipment_type: Literal["documents", "medicines", "parcel", "commercial"]
    service: Literal["economy", "priority", "express"]
    weight_kg: float

@app.post("/api/quote")
async def get_quote(payload: QuoteIn):
    price = estimate_price(payload.country, payload.shipment_type, payload.service, payload.weight_kg)
    return {"price_inr": price, "currency": "INR"}

# -------------------- Health --------------------

@app.get("/api/")
async def root():
    return {"status": "ok", "service": "Flystar Ops API"}
