"""Admin analytics + public quote."""
from datetime import timedelta

from fastapi import APIRouter, Depends

from core import db, require_roles, now_utc, estimate_price
from schemas import QuoteIn

router = APIRouter()


@router.get("/analytics/overview")
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


@router.post("/quote")
async def get_quote(payload: QuoteIn):
    price = estimate_price(payload.country, payload.shipment_type, payload.service, payload.weight_kg)
    return {"price_inr": price, "currency": "INR"}
