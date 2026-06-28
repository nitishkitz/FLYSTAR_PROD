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
        # Transition assigned -> en_route_to_pickup -> checked_in
        requests.post(f"{API}/shipments/{created_shipment['id']}/status",
                      headers=_hdr(emp_tok), json={"status": "en_route_to_pickup", "location": "Hyderabad"}, timeout=15)
        requests.post(f"{API}/shipments/{created_shipment['id']}/status",
                      headers=_hdr(emp_tok), json={"status": "checked_in", "location": "Hyderabad"}, timeout=15)
        r = requests.post(f"{API}/shipments/{created_shipment['id']}/waybill",
                          headers=_hdr(emp_tok), json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "picked_up"
        assert d["actual_weight_kg"] == 4.1
        assert d["piece_count"] == 2

    def test_cannot_mark_picked_up_without_final_pickup_form(self, tokens):
        cust_tok, _ = tokens["customer"]
        emp_tok, _ = tokens["employee"]
        admin_tok = tokens["admin"]
        payload = {
            "pickup": {"name": "No Form Sender", "phone": "+911", "line1": "A",
                        "city": "Hyderabad", "country": "India"},
            "delivery": {"name": "No Form Receiver", "phone": "+9712", "line1": "B",
                          "city": "Dubai", "country": "UAE"},
            "shipment_type": "parcel",
            "service": "priority",
            "approx_weight_kg": 1.2,
            "contents": "TEST final pickup form lock",
        }
        r = requests.post(f"{API}/shipments", headers=_hdr(cust_tok), json=payload, timeout=20)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        assert requests.post(f"{API}/shipments/{sid}/accept", headers=_hdr(emp_tok), timeout=15).status_code == 200
        assert requests.post(f"{API}/shipments/{sid}/status",
                             headers=_hdr(emp_tok),
                             json={"status": "en_route_to_pickup", "location": "Hyderabad"},
                             timeout=15).status_code == 200
        assert requests.post(f"{API}/shipments/{sid}/status",
                             headers=_hdr(emp_tok),
                             json={"status": "checked_in", "location": "Hyderabad"},
                             timeout=15).status_code == 200

        direct_pickup = requests.post(f"{API}/shipments/{sid}/status",
                                      headers=_hdr(emp_tok),
                                      json={"status": "picked_up", "location": "Hyderabad"},
                                      timeout=15)
        assert direct_pickup.status_code == 400
        assert "final pickup form" in direct_pickup.text.lower()

        admin_patch = requests.patch(f"{API}/shipments/{sid}",
                                     headers=_hdr(admin_tok),
                                     json={"status": "picked_up"},
                                     timeout=15)
        assert admin_patch.status_code == 400
        assert "final pickup form" in admin_patch.text.lower()

        admin_skip = requests.patch(f"{API}/shipments/{sid}",
                                    headers=_hdr(admin_tok),
                                    json={"status": "at_hub"},
                                    timeout=15)
        assert admin_skip.status_code == 400
        assert "final pickup form" in admin_skip.text.lower()

    def test_employee_updates_status(self, tokens, created_shipment):
        emp_tok, _ = tokens["employee"]
        for st in ["at_hub", "packed", "dispatched", "in_transit", "customs", "out_for_delivery", "delivered"]:
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


# ============================================================
# Iteration 2 — NEW FEATURES: public track, POD, pay invoice
# ============================================================

# ---------------- Public Tracking (unauthenticated) ----------------
class TestPublicTracking:
    def _make_shipment(self, tokens):
        cust_tok, _ = tokens["customer"]
        payload = {
            "pickup": {"name": "PT Sender", "phone": "+919999111133", "line1": "1 PT Lane",
                       "city": "Mumbai", "state": "MH", "country": "India", "postal_code": "400001"},
            "delivery": {"name": "PT Receiver", "phone": "+971500000111", "line1": "2 Marina",
                          "city": "Dubai", "state": "", "country": "UAE", "postal_code": "00000"},
            "shipment_type": "parcel", "service": "express", "approx_weight_kg": 1.0,
            "contents": "TEST public track shipment",
        }
        r = requests.post(f"{API}/shipments", headers=_hdr(cust_tok), json=payload, timeout=20)
        assert r.status_code == 200, r.text
        return r.json()

    def test_public_track_no_auth(self, tokens):
        s = self._make_shipment(tokens)
        # Call WITHOUT Authorization header
        r = requests.get(f"{API}/shipments/track/{s['awb']}", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["awb"] == s["awb"]
        assert data["status"] == "requested"
        assert "events" in data and len(data["events"]) >= 1
        assert data["origin_city"] == "Mumbai"
        assert data["destination_city"] == "Dubai"

    def test_public_track_case_insensitive(self, tokens):
        s = self._make_shipment(tokens)
        # lowercase should also resolve
        r = requests.get(f"{API}/shipments/track/{s['awb'].lower()}", timeout=15)
        assert r.status_code == 200
        assert r.json()["awb"] == s["awb"]

    def test_public_track_invalid_awb(self):
        r = requests.get(f"{API}/shipments/track/FLYNOPE00", timeout=15)
        assert r.status_code == 404

    def test_route_order_track_before_id(self, tokens):
        """Critical: /shipments/track/{awb} must be defined BEFORE /shipments/{id}.
        If route ordering is wrong, the 'track' route would be swallowed by /shipments/{id}
        and require auth. Verify by hitting it with no auth — must return 200, not 401."""
        s = self._make_shipment(tokens)
        r = requests.get(f"{API}/shipments/track/{s['awb']}", timeout=15)
        assert r.status_code == 200, f"public track collided with /shipments/{{id}}: {r.status_code}"


# ---------------- Proof of Delivery (POD) ----------------
@pytest.fixture(scope="module")
def pod_shipment(tokens):
    """Create + accept + waybill a shipment ready for delivery."""
    cust_tok, _ = tokens["customer"]
    emp_tok, _ = tokens["employee"]
    payload = {
        "pickup": {"name": "POD Sender", "phone": "+911", "line1": "A",
                    "city": "Hyderabad", "country": "India"},
        "delivery": {"name": "POD Receiver", "phone": "+9712", "line1": "B",
                      "city": "Dubai", "country": "UAE"},
        "shipment_type": "parcel", "service": "priority", "approx_weight_kg": 2.0,
        "contents": "TEST POD shipment",
    }
    r = requests.post(f"{API}/shipments", headers=_hdr(cust_tok), json=payload, timeout=20)
    assert r.status_code == 200
    sid = r.json()["id"]
    requests.post(f"{API}/shipments/{sid}/accept", headers=_hdr(emp_tok), timeout=15)
    wb = {
        "sender": {"name": "S", "phone": "+911", "line1": "A", "city": "Hyderabad", "country": "India"},
        "receiver": {"name": "R", "phone": "+9712", "line1": "B", "city": "Dubai", "country": "UAE"},
        "actual_weight_kg": 2.0, "length_cm": 20, "width_cm": 15, "height_cm": 10,
        "piece_count": 1, "declared_value_inr": 1000, "packaging": "box",
    }
    requests.post(f"{API}/shipments/{sid}/status", headers=_hdr(emp_tok), json={"status": "en_route_to_pickup", "location": "Hyderabad"}, timeout=15)
    requests.post(f"{API}/shipments/{sid}/status", headers=_hdr(emp_tok), json={"status": "checked_in", "location": "Hyderabad"}, timeout=15)
    requests.post(f"{API}/shipments/{sid}/waybill", headers=_hdr(emp_tok), json=wb, timeout=15)
    return sid


class TestPOD:
    SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    def test_delivered_with_pod_persists(self, tokens, pod_shipment):
        emp_tok, _ = tokens["employee"]
        for st in ["at_hub", "packed", "dispatched", "in_transit", "customs", "out_for_delivery"]:
            requests.post(f"{API}/shipments/{pod_shipment}/status",
                          headers=_hdr(emp_tok), json={"status": st, "location": "Dubai Marina", "note": "transit"},
                          timeout=15)
        body = {
            "status": "delivered",
            "note": "Handed to receiver",
            "location": "Dubai Marina",
            "receiver_name": "Mr. Receiver",
            "signature_base64": self.SIG,
            "pod_photo_base64": self.PHOTO,
        }
        r = requests.post(f"{API}/shipments/{pod_shipment}/status",
                          headers=_hdr(emp_tok), json=body, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "delivered"
        # POD persisted
        assert d.get("pod"), "pod object missing on shipment"
        assert d["pod"]["receiver_name"] == "Mr. Receiver"
        assert d["pod"]["signature_base64"].startswith("data:image/")
        assert d["pod"]["pod_photo_base64"].startswith("data:image/")
        # GET verifies persistence
        cust_tok, _ = tokens["customer"]
        r2 = requests.get(f"{API}/shipments/{pod_shipment}", headers=_hdr(cust_tok), timeout=15)
        assert r2.status_code == 200
        assert r2.json()["pod"]["receiver_name"] == "Mr. Receiver"


# ---------------- Pay Invoice (Pay Now placeholder) ----------------
class TestPayInvoice:
    def _fresh_shipment(self, tokens):
        cust_tok, _ = tokens["customer"]
        payload = {
            "pickup": {"name": "PAY Sender", "phone": "+911", "line1": "A",
                        "city": "Hyderabad", "country": "India"},
            "delivery": {"name": "PAY Receiver", "phone": "+9712", "line1": "B",
                          "city": "Dubai", "country": "UAE"},
            "shipment_type": "parcel", "service": "economy", "approx_weight_kg": 0.7,
            "contents": "TEST pay invoice",
        }
        r = requests.post(f"{API}/shipments", headers=_hdr(cust_tok), json=payload, timeout=20)
        assert r.status_code == 200
        return r.json()

    def test_customer_pays_own(self, tokens):
        cust_tok, _ = tokens["customer"]
        s = self._fresh_shipment(tokens)
        assert s["payment_status"] == "unpaid"
        r = requests.post(f"{API}/shipments/{s['id']}/pay", headers=_hdr(cust_tok),
                          json={"method": "card", "note": "TEST pay"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["payment_status"] == "paid"
        assert d["payment_method"] == "card"
        assert d["payment_receipt"].startswith("RCPT-")
        assert d["paid_amount_inr"] == s["price_inr"]
        # GET persistence
        r2 = requests.get(f"{API}/shipments/{s['id']}", headers=_hdr(cust_tok), timeout=15)
        assert r2.json()["payment_status"] == "paid"

    def test_double_pay_blocked(self, tokens):
        cust_tok, _ = tokens["customer"]
        s = self._fresh_shipment(tokens)
        r1 = requests.post(f"{API}/shipments/{s['id']}/pay", headers=_hdr(cust_tok),
                           json={"method": "upi"}, timeout=15)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/shipments/{s['id']}/pay", headers=_hdr(cust_tok),
                           json={"method": "upi"}, timeout=15)
        assert r2.status_code == 400
        assert "paid" in r2.text.lower()

    def test_other_customer_cannot_pay(self, tokens):
        cust_tok, _ = tokens["customer"]
        s = self._fresh_shipment(tokens)
        # Make another customer
        email = f"TEST_payer_{uuid.uuid4().hex[:6]}@example.com"
        rr = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234", "name": "Other Payer", "phone": "+919998880011"
        }, timeout=15)
        other_tok = rr.json()["access_token"]
        r = requests.post(f"{API}/shipments/{s['id']}/pay", headers=_hdr(other_tok),
                          json={"method": "card"}, timeout=15)
        assert r.status_code == 403

    def test_admin_can_pay_any(self, tokens):
        admin_tok = tokens["admin"]
        s = self._fresh_shipment(tokens)
        r = requests.post(f"{API}/shipments/{s['id']}/pay", headers=_hdr(admin_tok),
                          json={"method": "cash"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["payment_status"] == "paid"


# ---------------- Email Integration (non-blocking) ----------------
class TestEmailNonBlocking:
    def test_status_change_returns_fast_even_if_email_fails(self, tokens):
        """The status endpoint must return 200 fast regardless of Resend outcome."""
        cust_tok, _ = tokens["customer"]
        emp_tok, _ = tokens["employee"]
        # Make + accept + waybill new shipment
        payload = {
            "pickup": {"name": "EMAIL S", "phone": "+911", "line1": "A", "city": "Hyderabad", "country": "India"},
            "delivery": {"name": "EMAIL R", "phone": "+9712", "line1": "B", "city": "Dubai", "country": "UAE"},
            "shipment_type": "parcel", "service": "economy", "approx_weight_kg": 1.0,
            "contents": "TEST email shipment",
        }
        rc = requests.post(f"{API}/shipments", headers=_hdr(cust_tok), json=payload, timeout=20)
        assert rc.status_code == 200
        sid = rc.json()["id"]
        requests.post(f"{API}/shipments/{sid}/accept", headers=_hdr(emp_tok), timeout=15)
        wb = {
            "sender": {"name": "S", "phone": "+911", "line1": "A", "city": "Hyderabad", "country": "India"},
            "receiver": {"name": "R", "phone": "+9712", "line1": "B", "city": "Dubai", "country": "UAE"},
            "actual_weight_kg": 1.0, "length_cm": 10, "width_cm": 10, "height_cm": 10,
            "piece_count": 1, "declared_value_inr": 500, "packaging": "box",
        }
        requests.post(f"{API}/shipments/{sid}/status", headers=_hdr(emp_tok), json={"status": "en_route_to_pickup", "location": "Hyderabad"}, timeout=15)
        requests.post(f"{API}/shipments/{sid}/status", headers=_hdr(emp_tok), json={"status": "checked_in", "location": "Hyderabad"}, timeout=15)
        requests.post(f"{API}/shipments/{sid}/waybill", headers=_hdr(emp_tok), json=wb, timeout=15)
        # Time the status update
        t0 = time.time()
        r = requests.post(f"{API}/shipments/{sid}/status", headers=_hdr(emp_tok),
                          json={"status": "at_hub", "note": "TEST", "location": "Hub"}, timeout=15)
        elapsed = time.time() - t0
        assert r.status_code == 200, r.text
        # Email is fire-and-forget — endpoint shouldn't be slow regardless of Resend result.
        # Allow generous bound (4s) to absorb network jitter to preview proxy.
        assert elapsed < 6.0, f"status endpoint too slow ({elapsed:.2f}s) — email call may be blocking"
