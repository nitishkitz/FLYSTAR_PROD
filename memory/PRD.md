# Flystar International Courier — PRD

## Original problem statement
Add a Flystar Operations Portal on top of the existing React + Vite marketing site with three role-based logins (Admin, Employee, Customer). Customer raises a pickup request with approx weight, size, from/to addresses, freight service. Employee accepts the order, fills the full waybill at the customer's location and updates status through the courier journey. Admin gets the overview, all details, can edit anything, monitor status, and view graphs. Reuse all existing colors, logos and photos. Make it visually astonishing.

## Architecture
- **Public marketing site** at `/` — original Flystar cinematic experience preserved (StoryExperience, Services, Journey, Quote, Tracking, Calculator, Contact, Footer, FloatingWhatsApp).
- **Operations Portal** at `/login`, `/signup`, `/portal/<role>/*`.
- **Backend** (`/app/backend/server.py`): FastAPI + Motor (async MongoDB) on port 8001. JWT (HS256) with Bearer header + httpOnly cookie. Role-based dependency injection. Brute-force lockout after 5 failed attempts per ip:email.
- **Frontend** (`/app/frontend/`): Vite + React 19, React Router v6, Recharts, Axios, Lucide icons. Vite started via `yarn start` on port 3000 with `envPrefix: ['VITE_', 'REACT_APP_']`.

## Roles & Personas
- **Customer**: self-registers, raises pickups, sees own shipments + tracking + invoice.
- **Employee** (Field Ops): sees pickup queue, accepts requests, fills waybill (verified addresses, actual weight/dimensions, packaging, declared value, restricted flag, base64 proof photo), pushes status updates (dispatched → in_transit → customs → out_for_delivery → delivered / exception).
- **Admin**: command center with KPIs + 4 charts (daily volume line, status donut, top destinations bar, employee performance bar), full shipments CRUD (search/filter/delete/export CSV), staff & customer management (add/disable/delete).

## Core requirements
- 3 logins with role-based dashboards.
- Pickup form: pickup+delivery addresses, type, service, weight, dimensions, contents.
- Auto-generated AWB (`FLY` + 8 hex chars).
- Waybill capture with base64 photo proof (max 2 MB).
- Status timeline with note + location + author on every event.
- Admin overview with live charts and CSV export.
- Invoice placeholder (printable) per shipment.
- Indicative pricing engine mirrors the marketing site's `pricing.js`.

## Tech stack
- FastAPI 0.115, Pydantic v2, Motor 3.6, PyJWT 2.10, bcrypt 4.2.
- React 19, React Router 6, Recharts 2.15, Axios 1.7, Framer Motion 11, Lucide.
- MongoDB collections: `users`, `shipments`, `login_attempts`, `password_reset_tokens`.
- Indexes: `users.email` unique; `shipments.awb` unique; compound indexes on customer/employee/status + created_at.
- Seeded users on startup (admin/employee/customer).

## Implemented (2026-01-25)
- ✅ FastAPI backend with JWT auth, RBAC, 3 seeded users, brute-force lockout.
- ✅ Customer: signup, login, raise pickup, list shipments, view detail + invoice.
- ✅ Employee: queue, accept, waybill form with base64 proof photo, status updates.
- ✅ Admin: KPI dashboard with 4 recharts, shipments CRUD with CSV export, user management.
- ✅ Shared shipment detail with 6-stage visual progress + activity timeline.
- ✅ Existing landing site fully preserved at `/`.
- ✅ Navbar adds Sign-in / Portal link.
- ✅ Backend pytest suite (27 tests) at `/app/backend/tests/backend_test.py` — 100% green.
- ✅ Frontend Playwright E2E coverage — 100% green.

## Backlog
### P0
- (none — MVP complete)

### P1
- Email notifications on status changes (user said "if possible") — add SMTP/Resend integration.
- Bulk shipment import/export (admin).
- Public AWB tracking page accessible from `/` (backend route `/api/shipments/track/{awb}` is ready, needs UI).

### P2
- Stripe/Razorpay payments on the invoice page.
- Real proof-of-delivery photo + signature capture on `delivered` event.
- Notifications panel + WebSocket live status feed.
- Refactor `server.py` into routers (auth/users/shipments/analytics) per testing-agent code review.

## Test credentials
See `/app/memory/test_credentials.md`.
