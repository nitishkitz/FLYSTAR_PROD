"""Shipments: create, list, get, accept, waybill, status updates, admin edits, public track, invoice payment."""
import asyncio
import secrets
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from core import (
    db, doc_to_public, get_token_user, require_roles, now_utc, estimate_price,
)
from schemas import (
    PickupRequestIn, StatusUpdateIn, WaybillFillIn, ShipmentUpdateIn, PayInvoiceIn,
)
from email_service import send_status_email

router = APIRouter()

# Statuses that trigger an email
EMAIL_STATUSES = {
    "requested", "assigned", "picked_up", "dispatched",
    "in_transit", "out_for_delivery", "delivered", "exception", "cancelled",
}


def gen_awb() -> str:
    return "FLY" + secrets.token_hex(4).upper()


def shipment_to_dict(s: dict) -> dict:
    s["id"] = str(s.pop("_id"))
    if s.get("customer_id"):
        s["customer_id"] = str(s["customer_id"])
    if s.get("assigned_employee_id"):
        s["assigned_employee_id"] = str(s["assigned_employee_id"])
    return s


def _route_str(s: dict) -> str:
    p = s.get("pickup", {})
    d = s.get("delivery", {})
    return f"{p.get('city', '?')} → {d.get('city') or d.get('country', '?')}"


def _fire_email(s: dict, status: str, location: str, note: str):
    """Fire-and-forget — does NOT block the request path."""
    if status not in EMAIL_STATUSES:
        return
    try:
        asyncio.create_task(send_status_email(
            awb=s.get("awb", ""),
            customer_email=s.get("customer_email", ""),
            customer_name=s.get("customer_name", ""),
            status=status,
            location=location or "",
            note=note or "",
            route=_route_str(s),
        ))
    except Exception:
        pass


@router.post("/shipments")
async def create_pickup_request(payload: PickupRequestIn,
                                user=Depends(require_roles("customer", "admin"))):
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
        "payment_status": "unpaid",
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
    _fire_email(doc, "requested", payload.pickup.city, "Pickup request created")
    return shipment_to_dict(doc)


@router.get("/shipments")
async def list_shipments(
    status_filter: Optional[str] = Query(None, alias="status"),
    q: Optional[str] = None,
    limit: int = 100,
    user=Depends(get_token_user),
):
    base = []
    if user["role"] == "customer":
        base.append({"customer_id": user["_id"]})
    elif user["role"] == "employee":
        base.append({"$or": [
            {"assigned_employee_id": user["_id"]},
            {"assigned_employee_id": None, "status": "requested"},
        ]})
    if status_filter:
        base.append({"status": status_filter})
    if q:
        base.append({"$or": [
            {"awb": {"$regex": q, "$options": "i"}},
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"customer_email": {"$regex": q, "$options": "i"}},
            {"delivery.city": {"$regex": q, "$options": "i"}},
            {"delivery.country": {"$regex": q, "$options": "i"}},
        ]})
    query = {"$and": base} if base else {}
    cursor = db.shipments.find(query).sort("created_at", -1).limit(limit)
    return [shipment_to_dict(s) async for s in cursor]


@router.get("/shipments/track/{awb}")
async def public_track(awb: str):
    """Public tracking by AWB — no auth required."""
    s = await db.shipments.find_one({"awb": awb.upper()})
    if not s:
        raise HTTPException(404, "Shipment not found")
    return {
        "awb": s["awb"],
        "status": s["status"],
        "shipment_type": s.get("shipment_type"),
        "service": s.get("service"),
        "origin_city": s.get("pickup", {}).get("city"),
        "origin_country": s.get("pickup", {}).get("country"),
        "destination_city": s.get("delivery", {}).get("city"),
        "destination_country": s.get("delivery", {}).get("country"),
        "created_at": s["created_at"],
        "updated_at": s.get("updated_at"),
        "events": [
            {"status": e["status"], "at": e["at"], "note": e.get("note", ""), "location": e.get("location", "")}
            for e in s.get("events", [])
        ],
    }


@router.get("/shipments/{shipment_id}")
async def get_shipment(shipment_id: str, user=Depends(get_token_user)):
    try:
        oid = ObjectId(shipment_id)
        s = await db.shipments.find_one({"_id": oid})
    except Exception:
        s = await db.shipments.find_one({"awb": shipment_id.upper()})
    if not s:
        raise HTTPException(404, "Not found")
    if user["role"] == "customer" and s.get("customer_id") != user["_id"]:
        raise HTTPException(403, "Forbidden")
    if user["role"] == "employee":
        if s.get("assigned_employee_id") not in (None, user["_id"]):
            raise HTTPException(403, "Forbidden")
    return shipment_to_dict(s)


@router.post("/shipments/{shipment_id}/accept")
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
    _fire_email(s, "assigned", s["pickup"].get("city", ""), event["note"])
    return shipment_to_dict(s)


@router.post("/shipments/{shipment_id}/waybill")
async def fill_waybill(shipment_id: str, payload: WaybillFillIn,
                       user=Depends(require_roles("employee", "admin"))):
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not s:
        raise HTTPException(404, "Not found")
    if user["role"] == "employee" and s.get("assigned_employee_id") != user["_id"]:
        raise HTTPException(403, "Not your shipment")
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
    _fire_email(s, "picked_up", payload.sender.city, event["note"])
    return shipment_to_dict(s)


@router.post("/shipments/{shipment_id}/status")
async def update_status(shipment_id: str, payload: StatusUpdateIn,
                        user=Depends(require_roles("employee", "admin"))):
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not s:
        raise HTTPException(404, "Not found")
    if user["role"] == "employee" and s.get("assigned_employee_id") != user["_id"]:
        raise HTTPException(403, "Not your shipment")

    event = {"status": payload.status, "at": now_utc(), "by": doc_to_public(user),
             "note": payload.note or "", "location": payload.location or ""}

    set_doc = {"status": payload.status, "updated_at": now_utc()}

    # POD (proof of delivery) capture on 'delivered'
    if payload.status == "delivered":
        pod = {
            "receiver_name": payload.receiver_name,
            "signature_base64": payload.signature_base64,
            "pod_photo_base64": payload.pod_photo_base64,
            "delivered_at": now_utc(),
        }
        set_doc["pod"] = pod
        event["receiver_name"] = payload.receiver_name
        if payload.signature_base64:
            event["signature_base64"] = payload.signature_base64
        if payload.pod_photo_base64:
            event["pod_photo_base64"] = payload.pod_photo_base64

    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": set_doc, "$push": {"events": event}}
    )
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    _fire_email(s, payload.status, payload.location or "", payload.note or "")
    return shipment_to_dict(s)


@router.patch("/shipments/{shipment_id}")
async def admin_edit(shipment_id: str, payload: ShipmentUpdateIn,
                     user=Depends(require_roles("admin"))):
    update = {}
    for k, v in payload.model_dump().items():
        if v is None:
            continue
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
             "by": doc_to_public(user), "note": "Admin edit", "location": "Admin Panel"}
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": update, "$push": {"events": event}},
    )
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return shipment_to_dict(s)


@router.delete("/shipments/{shipment_id}")
async def delete_shipment(shipment_id: str, user=Depends(require_roles("admin"))):
    await db.shipments.delete_one({"_id": ObjectId(shipment_id)})
    return {"ok": True}


@router.post("/shipments/{shipment_id}/pay")
async def pay_invoice(shipment_id: str, payload: PayInvoiceIn,
                      user=Depends(get_token_user)):
    """Pay Now placeholder — marks invoice paid without real gateway."""
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    if not s:
        raise HTTPException(404, "Not found")
    if user["role"] == "customer" and s.get("customer_id") != user["_id"]:
        raise HTTPException(403, "Forbidden")
    if s.get("payment_status") == "paid":
        raise HTTPException(400, "Invoice already paid")
    receipt = "RCPT-" + secrets.token_hex(4).upper()
    await db.shipments.update_one(
        {"_id": ObjectId(shipment_id)},
        {"$set": {
            "payment_status": "paid",
            "payment_method": payload.method,
            "payment_receipt": receipt,
            "paid_at": now_utc(),
            "paid_amount_inr": s.get("price_inr", 0),
            "payment_note": payload.note or "Pay Now placeholder — no live gateway",
            "updated_at": now_utc(),
        }}
    )
    s = await db.shipments.find_one({"_id": ObjectId(shipment_id)})
    return shipment_to_dict(s)
