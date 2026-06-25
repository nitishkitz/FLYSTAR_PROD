"""Flystar Ops backend API tests (pytest)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://1a77cddc-3bc0-4afa-8d8d-b90334e892f9.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@flystar.in", "password": "Admin@123"}
EMPLOYEE = {"email": "employee@flystar.in", "password": "Employee@123"}
CUSTOMER = {"email": "customer@flystar.in", "password": "Customer@123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    data = r.json()
    return data["access_token"], data["user"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------------- Health ----------------
class TestHealth:
    def test_root_ok(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login(self):
        tok, u = _login(ADMIN)
        assert u["role"] == "admin"
        assert u["email"] == ADMIN["email"]
        assert isinstance(tok, str) and len(tok) > 20

    def test_employee_login(self):
        _, u = _login(EMPLOYEE)
        assert u["role"] == "employee"

    def test_customer_login(self):
        _, u = _login(CUSTOMER)
        assert u["role"] == "customer"

    def test_bad_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=15)
        assert r.status_code in (401, 429)

    def test_me_with_bearer(self):
        tok, _ = _login(ADMIN)
        r = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_customer_self_register(self):
        email = f"TEST_signup_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234", "name": "Test Signup", "phone": "+919999999999"
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "customer"
        assert data["user"]["email"] == email.lower()
        assert "access_token" in data


# ---------------- Quote ----------------
class TestQuote:
    def test_quote(self):
        r = requests.post(f"{API}/quote", json={
            "country": "UAE", "shipment_type": "parcel", "service": "priority", "weight_kg": 2.5
        }, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["currency"] == "INR"
        assert isinstance(data["price_inr"], (int, float))
        assert data["price_inr"] > 0


# ---------------- Shipments E2E ----------------
@pytest.fixture(scope="module")
def tokens():
    a, _ = _login(ADMIN)
    e, eu = _login(EMPLOYEE)
    c, cu = _login(CUSTOMER)
    return {"admin": a, "employee": (e, eu), "customer": (c, cu)}


@pytest.fixture(scope="module")
def created_shipment(tokens):
    cust_tok, _ = tokens["customer"]
    payload = {
        "pickup": {"name": "Test Sender", "phone": "+919999111122", "line1": "1 Test St",
                    "city": "Hyderabad", "state": "TS", "country": "India", "postal_code": "500001"},
        "delivery": {"name": "Test Receiver", "phone": "+971500000000", "line1": "10 Marina",
                      "city": "Dubai", "state": "", "country": "UAE", "postal_code": "00000"},
        "shipment_type": "parcel",
        "service": "priority",
        "approx_weight_kg": 3.2,
        "contents": "Test sample goods",
        "notes": "TEST shipment created by pytest",
    }
    r = requests.post(f"{API}/shipments", headers=_hdr(cust_tok), json=payload, timeout=20)
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["status"] == "requested"
    assert s["awb"].startswith("FLY")
    assert s["price_inr"] > 0
    return s


class TestShipments:
    def test_customer_creates_shipment(self, created_shipment):
        assert created_shipment["id"]
        assert created_shipment["awb"]

    def test_customer_can_list_only_own(self, tokens, created_shipment):
        cust_tok, _ = tokens["customer"]
        r = requests.get(f"{API}/shipments", headers=_hdr(cust_tok), timeout=15)
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert created_shipment["id"] in ids

    def test_get_shipment_by_id(self, tokens, created_shipment):
        cust_tok, _ = tokens["customer"]
        r = requests.get(f"{API}/shipments/{created_shipment['id']}", headers=_hdr(cust_tok), timeout=15)
        assert r.status_code == 200
        assert r.json()["awb"] == created_shipment["awb"]

    def test_public_track(self, created_shipment):
        r = requests.get(f"{API}/shipments/track/{created_shipment['awb']}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["awb"] == created_shipment["awb"]
        assert d["status"] == "requested"

    def test_customer_cannot_accept(self, tokens, created_shipment):
        cust_tok, _ = tokens["customer"]
        r = requests.post(f"{API}/shipments/{created_shipment['id']}/accept", headers=_hdr(cust_tok), timeout=15)
        assert r.status_code == 403

    def test_employee_sees_queue(self, tokens, created_shipment):
        emp_tok, _ = tokens["employee"]
        r = requests.get(f"{API}/shipments", headers=_hdr(emp_tok), timeout=15)
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert created_shipment["id"] in ids

    def test_employee_accepts(self, tokens, created_shipment):
        emp_tok, _ = tokens["employee"]
        r = requests.post(f"{API}/shipments/{created_shipment['id']}/accept", headers=_hdr(emp_tok), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "assigned"
        assert d["assigned_employee_id"]

    def test_employee_fills_waybill(self, tokens, created_shipment):
        emp_tok, _ = tokens["employee"]
        payload = {
            "sender": {"name": "S1", "phone": "+911", "line1": "A", "city": "Hyderabad",
                       "country": "India"},
            "receiver": {"name": "R1", "phone": "+9712", "line1": "B", "city": "Dubai",
                          "country": "UAE"},
            "actual_weight_kg": 4.1,
            "length_cm": 30, "width_cm": 20, "height_cm": 15,
            "piece_count": 2, "declared_value_inr": 5000,
            "packaging": "box", "contains_restricted": False,
        }
        r = requests.post(f"{API}/shipments/{created_shipment['id']}/waybill",
                          headers=_hdr(emp_tok), json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "picked_up"
        assert d["actual_weight_kg"] == 4.1
        assert d["piece_count"] == 2

    def test_employee_updates_status(self, tokens, created_shipment):
        emp_tok, _ = tokens["employee"]
        for st in ["dispatched", "in_transit", "out_for_delivery", "delivered"]:
            r = requests.post(f"{API}/shipments/{created_shipment['id']}/status",
                              headers=_hdr(emp_tok),
                              json={"status": st, "note": f"now {st}", "location": "Hub"},
                              timeout=15)
            assert r.status_code == 200, r.text
            assert r.json()["status"] == st

    def test_employee_cannot_delete(self, tokens, created_shipment):
        emp_tok, _ = tokens["employee"]
        r = requests.delete(f"{API}/shipments/{created_shipment['id']}", headers=_hdr(emp_tok), timeout=15)
        assert r.status_code == 403

    def test_customer_cannot_see_others(self, tokens):
        # Create a shipment via admin login impersonating? Instead, create via customer and check second customer perspective
        cust_tok, _ = tokens["customer"]
        # Make a 2nd customer
        email = f"TEST_other_{uuid.uuid4().hex[:6]}@example.com"
        rr = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234", "name": "Other Cust", "phone": "+919998887776"
        }, timeout=15)
        assert rr.status_code == 200
        other_tok = rr.json()["access_token"]
        r = requests.get(f"{API}/shipments", headers=_hdr(other_tok), timeout=15)
        assert r.status_code == 200
        # The original customer's shipment must NOT be visible
        assert all(s.get("customer_email") != "customer@flystar.in" for s in r.json())


# ---------------- Admin ----------------
class TestAdmin:
    def test_analytics_overview(self, tokens):
        admin_tok = tokens["admin"]
        r = requests.get(f"{API}/analytics/overview", headers=_hdr(admin_tok), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "kpis" in d
        for key in ("total_shipments", "delivered", "in_transit", "pending_pickup", "exceptions", "revenue_inr"):
            assert key in d["kpis"]
        assert isinstance(d["daily_shipments"], list)
        assert isinstance(d["status_distribution"], list)
        assert isinstance(d["by_country"], list)
        assert isinstance(d["by_employee"], list)

    def test_customer_cannot_hit_analytics(self, tokens):
        cust_tok, _ = tokens["customer"]
        r = requests.get(f"{API}/analytics/overview", headers=_hdr(cust_tok), timeout=15)
        assert r.status_code == 403

    def test_admin_list_users(self, tokens):
        admin_tok = tokens["admin"]
        r = requests.get(f"{API}/users", headers=_hdr(admin_tok), timeout=15)
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert ADMIN["email"] in emails

    def test_customer_cannot_list_users(self, tokens):
        cust_tok, _ = tokens["customer"]
        r = requests.get(f"{API}/users", headers=_hdr(cust_tok), timeout=15)
        assert r.status_code == 403

    def test_admin_create_and_delete_staff(self, tokens):
        admin_tok = tokens["admin"]
        email = f"TEST_emp_{uuid.uuid4().hex[:6]}@flystar.in"
        r = requests.post(f"{API}/users", headers=_hdr(admin_tok), json={
            "email": email, "password": "Emp@1234", "name": "Test Emp", "phone": "+919998880000", "role": "employee"
        }, timeout=15)
        assert r.status_code == 200, r.text
        user_id = r.json()["id"]
        # toggle inactive
        r2 = requests.patch(f"{API}/users/{user_id}", headers=_hdr(admin_tok), json={"active": False}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["active"] is False
        # delete
        r3 = requests.delete(f"{API}/users/{user_id}", headers=_hdr(admin_tok), timeout=15)
        assert r3.status_code == 200

    def test_admin_patch_shipment(self, tokens, created_shipment):
        admin_tok = tokens["admin"]
        r = requests.patch(f"{API}/shipments/{created_shipment['id']}", headers=_hdr(admin_tok),
                           json={"notes": "Edited by admin in test"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["notes"] == "Edited by admin in test"

    def test_admin_delete_shipment(self, tokens):
        # Create a throwaway shipment via admin posting (admin allowed), then delete
        admin_tok = tokens["admin"]
        payload = {
            "pickup": {"name": "X", "phone": "+911", "line1": "A", "city": "Hyderabad", "country": "India"},
            "delivery": {"name": "Y", "phone": "+9712", "line1": "B", "city": "Dubai", "country": "UAE"},
            "shipment_type": "documents", "service": "economy", "approx_weight_kg": 0.5,
            "contents": "TEST docs",
        }
        r = requests.post(f"{API}/shipments", headers=_hdr(admin_tok), json=payload, timeout=15)
        assert r.status_code == 200
        sid = r.json()["id"]
        r2 = requests.delete(f"{API}/shipments/{sid}", headers=_hdr(admin_tok), timeout=15)
        assert r2.status_code == 200
        r3 = requests.get(f"{API}/shipments/{sid}", headers=_hdr(admin_tok), timeout=15)
        assert r3.status_code == 404
