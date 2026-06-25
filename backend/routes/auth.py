"""Auth: register, login, logout, me, refresh."""
import os
from datetime import timedelta

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from core import (
    db, hash_pw, verify_pw, secret, make_access, make_refresh,
    doc_to_public, get_token_user, now_utc, JWT_ALG,
)
from schemas import RegisterIn, LoginIn

router = APIRouter()


def _set_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax",
                    max_age=3600, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax",
                    max_age=604800, path="/")


@router.post("/auth/register")
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
    _set_cookies(response, access, refresh)
    return {"user": doc_to_public(doc), "access_token": access, "refresh_token": refresh}


@router.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"
    rec = await db.login_attempts.find_one({"identifier": ident})
    if rec and rec.get("locked_until") and rec["locked_until"] > now_utc():
        raise HTTPException(429, "Too many attempts. Try again later.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(payload.password, user["password_hash"]) or not user.get("active", True):
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
    _set_cookies(response, access, refresh)
    return {"user": doc_to_public(user), "access_token": access, "refresh_token": refresh}


@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@router.get("/auth/me")
async def me(user=Depends(get_token_user)):
    return doc_to_public(user)


@router.post("/auth/refresh")
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
        _set_cookies(response, access, new_refresh)
        return {"access_token": access}
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid refresh")
