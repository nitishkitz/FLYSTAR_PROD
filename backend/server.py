"""Flystar Operations API — main app. Routers live in /routes."""
from dotenv import load_dotenv
load_dotenv()

import os
import logging
from datetime import timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import DB_CONFIGURED, db, doc_to_public, estimate_price, hash_pw, verify_pw, now_utc
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.shipments import router as shipments_router
from routes.analytics import router as analytics_router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("flystar")


async def _ensure_seed_user(seed: dict) -> dict:
    existing = await db.users.find_one({"email": seed["email"]})
    if existing:
        if not verify_pw(seed["pw"], existing["password_hash"]):
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"password_hash": hash_pw(seed["pw"])}},
            )
            existing = await db.users.find_one({"email": seed["email"]})
        return existing

    doc = {
        "email": seed["email"],
        "password_hash": hash_pw(seed["pw"]),
        "name": seed["name"],
        "role": seed["role"],
        "phone": seed["phone"],
        "active": True,
        "created_at": seed.get("created_at", now_utc()),
        "mock_source": seed.get("mock_source", False),
    }
    await db.users.insert_one(doc)
    log.info(f"Seeded {seed['role']}: {seed['email']}")
    return doc


def _address(name, phone, city, state, country, line1, postal_code=""):
    return {
        "name": name,
        "phone": phone,
        "line1": line1,
        "city": city,
        "state": state,
        "country": country,
        "postal_code": postal_code,
    }


def _shipment_doc(
    *,
    awb,
    customer,
    employee=None,
    status,
    pickup,
    delivery,
    shipment_type,
    service,
    weight,
    contents,
    created_delta_days,
    events,
    payment_status="unpaid",
    notes="",
    declared_value=0,
):
    created_at = now_utc() - timedelta(days=created_delta_days)
    price = estimate_price(delivery["country"], shipment_type, service, weight)
    doc = {
        "awb": awb,
        "customer_id": customer["_id"],
        "customer_name": customer.get("name"),
        "customer_email": customer.get("email"),
        "customer_phone": customer.get("phone"),
        "assigned_employee_id": employee["_id"] if employee else None,
        "assigned_employee_name": employee.get("name") if employee else None,
        "status": status,
        "pickup": pickup,
        "delivery": delivery,
        "sender": pickup,
        "receiver": delivery,
        "shipment_type": shipment_type,
        "service": service,
        "approx_weight_kg": weight,
        "approx_length_cm": 32,
        "approx_width_cm": 24,
        "approx_height_cm": 12,
        "actual_weight_kg": weight,
        "length_cm": 32,
        "width_cm": 24,
        "height_cm": 12,
        "piece_count": 1,
        "declared_value_inr": declared_value,
        "packaging": "box" if shipment_type != "documents" else "envelope",
        "contains_restricted": False,
        "proof_photo_base64": None,
        "contents": contents,
        "notes": notes,
        "preferred_pickup_at": created_at + timedelta(hours=6),
        "price_inr": price,
        "invoice_number": f"INV-{awb[-6:]}",
        "payment_status": payment_status,
        "paid_amount_inr": price if payment_status == "paid" else None,
        "paid_at": created_at + timedelta(days=1) if payment_status == "paid" else None,
        "payment_method": "upi" if payment_status == "paid" else None,
        "events": events,
        "created_at": created_at,
        "updated_at": events[-1]["at"] if events else created_at,
        "mock_source": True,
    }
    if status == "delivered":
        doc["pod"] = {
            "receiver_name": delivery["name"],
            "signature_base64": None,
            "pod_photo_base64": None,
            "delivered_at": events[-1]["at"],
        }
    return doc


async def seed_mock_data():
    if await db.shipments.count_documents({"mock_source": True}):
        return

    base_users = [
        {"email": "priya@flystarcourier.com", "pw": "Employee123!", "name": "Priya Menon", "role": "employee", "phone": "+919700112233", "mock_source": True},
        {"email": "suresh@flystarcourier.com", "pw": "Employee123!", "name": "Suresh Reddy", "role": "employee", "phone": "+919701445566", "mock_source": True},
        {"email": "naina@example.com", "pw": "Customer123!", "name": "Naina Reddy", "role": "customer", "phone": "+919876543210", "mock_source": True},
        {"email": "arjun@example.com", "pw": "Customer123!", "name": "Arjun Rao", "role": "customer", "phone": "+919812345678", "mock_source": True},
        {"email": "meera@example.com", "pw": "Customer123!", "name": "Meera Shah", "role": "customer", "phone": "+919900776655", "mock_source": True},
    ]
    users = {u["email"]: await _ensure_seed_user(u) for u in base_users}

    demo_employee = await db.users.find_one({"email": os.environ.get("DEMO_EMPLOYEE_EMAIL", "employee@flystarcourier.com")})
    demo_customer = await db.users.find_one({"email": os.environ.get("DEMO_CUSTOMER_EMAIL", "customer@flystarcourier.com")})
    admin = await db.users.find_one({"email": os.environ.get("ADMIN_EMAIL", "admin@flystarcourier.com")})

    ravi = demo_employee or users["priya@flystarcourier.com"]
    priya = users["priya@flystarcourier.com"]
    suresh = users["suresh@flystarcourier.com"]
    customers = [demo_customer, users["naina@example.com"], users["arjun@example.com"], users["meera@example.com"]]
    customers = [c for c in customers if c]

    def event(status, days, by, note, location):
        return {
            "status": status,
            "at": now_utc() - timedelta(days=days),
            "by": doc_to_public(by),
            "note": note,
            "location": location,
        }

    sample_shipments = [
        _shipment_doc(
            awb="FLYMOCK001",
            customer=customers[0],
            employee=None,
            status="requested",
            pickup=_address(customers[0]["name"], customers[0]["phone"], "Tirupati", "Andhra Pradesh", "India", "18-2-45, Air Bypass Road", "517501"),
            delivery=_address("Khalid Ahmed", "+971501112233", "Dubai", "Dubai", "UAE", "Business Bay Tower 12", "00000"),
            shipment_type="documents",
            service="priority",
            weight=0.8,
            contents="University transcripts",
            created_delta_days=0,
            events=[event("requested", 0, customers[0], "Pickup request created", "Tirupati")],
            notes="Customer asked for evening pickup.",
            declared_value=2500,
        ),
        _shipment_doc(
            awb="FLYMOCK002",
            customer=users["naina@example.com"],
            employee=ravi,
            status="assigned",
            pickup=_address("Naina Reddy", "+919876543210", "Tirupati", "Andhra Pradesh", "India", "KT Road, near Passport Office", "517501"),
            delivery=_address("Anil Reddy", "+97455112233", "Doha", "Doha", "Qatar", "Al Sadd Street", "00000"),
            shipment_type="medicines",
            service="express",
            weight=1.2,
            contents="Prescription medicines",
            created_delta_days=1,
            events=[
                event("requested", 1, users["naina@example.com"], "Pickup request created", "Tirupati"),
                event("assigned", 1, ravi, "Accepted by Ravi Kumar", "Tirupati"),
            ],
            declared_value=4200,
        ),
        _shipment_doc(
            awb="FLYMOCK003",
            customer=users["arjun@example.com"],
            employee=priya,
            status="in_transit",
            pickup=_address("Arjun Rao", "+919812345678", "Tirupati", "Andhra Pradesh", "India", "Renigunta Road", "517501"),
            delivery=_address("Lena Fischer", "+4915112345678", "Berlin", "Berlin", "Germany", "Mitte 24", "10115"),
            shipment_type="parcel",
            service="priority",
            weight=3.5,
            contents="Handicraft gifts",
            created_delta_days=3,
            events=[
                event("requested", 3, users["arjun@example.com"], "Pickup request created", "Tirupati"),
                event("assigned", 3, priya, "Accepted by Priya Menon", "Tirupati"),
                event("picked_up", 2, priya, "Package picked up and measured", "Tirupati"),
                event("dispatched", 2, priya, "Dispatched from Chennai gateway", "Chennai"),
                event("in_transit", 1, priya, "Departed international hub", "Dubai"),
            ],
            declared_value=18000,
        ),
        _shipment_doc(
            awb="FLYMOCK004",
            customer=users["meera@example.com"],
            employee=suresh,
            status="out_for_delivery",
            pickup=_address("Meera Shah", "+919900776655", "Tirupati", "Andhra Pradesh", "India", "Leela Mahal Circle", "517501"),
            delivery=_address("Rohan Shah", "+447700900123", "London", "England", "UK", "Canary Wharf", "E14 5AB"),
            shipment_type="commercial",
            service="express",
            weight=6.8,
            contents="Sample garments",
            created_delta_days=5,
            events=[
                event("requested", 5, users["meera@example.com"], "Pickup request created", "Tirupati"),
                event("assigned", 5, suresh, "Accepted by Suresh Reddy", "Tirupati"),
                event("picked_up", 4, suresh, "Commercial invoice verified", "Tirupati"),
                event("customs", 2, suresh, "Cleared customs", "London"),
                event("out_for_delivery", 0, suresh, "With destination courier", "London"),
            ],
            payment_status="paid",
            declared_value=52000,
        ),
        _shipment_doc(
            awb="FLYMOCK005",
            customer=customers[0],
            employee=ravi,
            status="delivered",
            pickup=_address(customers[0]["name"], customers[0]["phone"], "Tirupati", "Andhra Pradesh", "India", "18-2-45, Air Bypass Road", "517501"),
            delivery=_address("Sonia Patel", "+16505550123", "San Jose", "California", "USA", "North 1st Street", "95112"),
            shipment_type="parcel",
            service="economy",
            weight=2.4,
            contents="Books and personal items",
            created_delta_days=9,
            events=[
                event("requested", 9, customers[0], "Pickup request created", "Tirupati"),
                event("assigned", 9, ravi, "Accepted by Ravi Kumar", "Tirupati"),
                event("picked_up", 8, ravi, "Picked up from customer", "Tirupati"),
                event("in_transit", 6, ravi, "In transit to destination country", "Singapore"),
                event("out_for_delivery", 3, ravi, "Out for delivery", "San Jose"),
                event("delivered", 3, ravi, "Delivered to receiver", "San Jose"),
            ],
            payment_status="paid",
            declared_value=9000,
        ),
        _shipment_doc(
            awb="FLYMOCK006",
            customer=users["naina@example.com"],
            employee=priya,
            status="exception",
            pickup=_address("Naina Reddy", "+919876543210", "Tirupati", "Andhra Pradesh", "India", "KT Road, near Passport Office", "517501"),
            delivery=_address("Farah Ali", "+60123456789", "Kuala Lumpur", "Selangor", "Malaysia", "Bukit Bintang", "55100"),
            shipment_type="commercial",
            service="priority",
            weight=4.1,
            contents="Retail samples",
            created_delta_days=6,
            events=[
                event("requested", 6, users["naina@example.com"], "Pickup request created", "Tirupati"),
                event("assigned", 6, priya, "Accepted by Priya Menon", "Tirupati"),
                event("picked_up", 5, priya, "Picked up and packed", "Tirupati"),
                event("exception", 1, priya, "Invoice value mismatch, customer contacted", "Chennai Hub"),
            ],
            declared_value=36000,
        ),
    ]
    await db.shipments.insert_many(sample_shipments)
    log.info(f"Seeded {len(base_users)} mock users and {len(sample_shipments)} mock shipments.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not DB_CONFIGURED:
        log.warning("MongoDB is not configured; API routes that require data will return 503.")
        yield
        return

    try:
        await db.users.create_index("email", unique=True)
        await db.shipments.create_index("awb", unique=True, sparse=True)
        await db.shipments.create_index([("customer_id", 1), ("created_at", -1)])
        await db.shipments.create_index([("assigned_employee_id", 1), ("created_at", -1)])
        await db.shipments.create_index([("status", 1), ("created_at", -1)])
        await db.login_attempts.create_index("identifier")
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

        seeds = [
            {"email": os.environ.get("ADMIN_EMAIL", "admin@flystarcourier.com"),
             "pw": os.environ.get("ADMIN_PASSWORD", "Admin123!"),
             "name": "Flystar Admin", "role": "admin", "phone": "+918125477584"},
            {"email": os.environ.get("DEMO_EMPLOYEE_EMAIL", "employee@flystarcourier.com"),
             "pw": os.environ.get("DEMO_EMPLOYEE_PASSWORD", "Employee123!"),
             "name": "Ravi Kumar", "role": "employee", "phone": "+919666145766"},
            {"email": os.environ.get("DEMO_CUSTOMER_EMAIL", "customer@flystarcourier.com"),
             "pw": os.environ.get("DEMO_CUSTOMER_PASSWORD", "Customer123!"),
             "name": "Demo Customer", "role": "customer", "phone": "+919999912345"},
        ]
        for s in seeds:
            await _ensure_seed_user(s)
        await seed_mock_data()
        log.info("Startup complete.")
    except Exception:
        log.exception("Startup database initialization failed; continuing so health checks can report status.")
    yield


app = FastAPI(lifespan=lifespan, title="Flystar Ops API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(shipments_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


@app.get("/api/")
async def root():
    return {
        "status": "ok" if DB_CONFIGURED else "configuration_required",
        "service": "Flystar Ops API",
        "database_configured": DB_CONFIGURED,
        "jwt_configured": bool(os.environ.get("JWT_SECRET")),
    }
