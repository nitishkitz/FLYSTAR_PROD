"""Admin user management."""
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from core import db, hash_pw, doc_to_public, require_roles, now_utc
from schemas import CreateStaffIn, UpdateUserIn

router = APIRouter()


@router.get("/users")
async def list_users(role: Optional[str] = None, user=Depends(require_roles("admin"))):
    q = {}
    if role:
        q["role"] = role
    cursor = db.users.find(q).sort("created_at", -1)
    return [doc_to_public(u) async for u in cursor]


@router.post("/users")
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


@router.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UpdateUserIn, user=Depends(require_roles("admin"))):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    res = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    return doc_to_public(u)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_roles("admin"))):
    if str(user["_id"]) == user_id:
        raise HTTPException(400, "Cannot delete yourself")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}
