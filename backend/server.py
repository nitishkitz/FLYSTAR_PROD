"""Flystar Operations API — main app. Routers live in /routes."""
from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import db, hash_pw, verify_pw, now_utc
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.shipments import router as shipments_router
from routes.analytics import router as analytics_router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("flystar")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.users.create_index("email", unique=True)
    await db.shipments.create_index("awb", unique=True, sparse=True)
    await db.shipments.create_index([("customer_id", 1), ("created_at", -1)])
    await db.shipments.create_index([("assigned_employee_id", 1), ("created_at", -1)])
    await db.shipments.create_index([("status", 1), ("created_at", -1)])
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(shipments_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


@app.get("/api/")
async def root():
    return {"status": "ok", "service": "Flystar Ops API"}
