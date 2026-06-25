# Flystar International Courier — PRD

## Original problem statement
Add a Flystar Operations Portal on top of the existing React + Vite marketing site with three role-based logins (Admin, Employee, Customer). Customer raises a pickup request with weight/size/from-to/freight info. Employee accepts the order, fills the full waybill at the customer's location, and updates status through the courier journey. Admin gets the overview, all details, can edit anything, monitor status, and view graphs. Reuse all existing colors, logos and photos. Make it visually astonishing.

## Architecture
- **Public marketing site** at `/` (Flystar cinematic experience preserved).
- **Public AWB tracking** at `/track` and `/track/:awb` — no login required, real Mongo data, brand-tied light theme.
- **Operations Portal** at `/login`, `/signup`, `/portal/<role>/*`.
- **Backend** (`/app/backend/`) refactored into routers:
  - `server.py` — slim app + lifespan + router mounting (75 lines).
  - `core.py` — db, JWT/bcrypt helpers, role deps, pricing engine.
  - `schemas.py` — Pydantic models.
  - `email_service.py` — Resend integration, branded HTML email templates.
  - `routes/auth.py`, `routes/users.py`, `routes/shipments.py`, `routes/analytics.py`.
- **Frontend** (`/app/frontend/`) — Vite + React 19, React Router v6, Recharts, Axios, Lucide. Started via `yarn start` on port 3000.

## Roles
- **Customer** — self-registers, raises pickups, lists shipments, views tracking timeline, prints invoice, **Pay now** (placeholder).
- **Employee** — pickup queue → accept → waybill (verified addresses, actual dims, base64 proof photo) → status updates → **delivered** captures receiver name + signature + delivery photo (POD).
- **Admin** — KPI dashboard with 4 Recharts panels, full shipment CRUD with search/filter/CSV export, user management (create/disable/delete).

## Integrations
- **Resend** for transactional emails on status changes (fire-and-forget via `asyncio.create_task`; CC admin enabled). Currently uses `onboarding@resend.dev` sandbox — needs a verified domain to deliver to arbitrary customers in production.
- **JWT** custom auth (HS256, Bearer + httpOnly cookie support, brute-force lockout, 60-min access + 7-day refresh).
- **Recharts** for admin analytics.
- **Pay Now** placeholder — no real gateway; marks invoice paid with auto-generated receipt.

## Implemented (2026-01-25)
### Iteration 1
- ✅ FastAPI backend with JWT auth, RBAC, 3 seeded users, brute-force lockout.
- ✅ Customer portal: signup, login, raise pickup, list, detail.
- ✅ Employee portal: queue, accept, waybill with base64 proof photo, status updates.
- ✅ Admin portal: KPIs + 4 charts, CRUD with CSV export, user management.
- ✅ Shipment detail with 6-stage visual progress + activity timeline.
- ✅ Invoice placeholder (printable).
- ✅ Existing marketing site fully preserved.

### Iteration 2 (this session)
- ✅ **White-theme auth pages** — `/login`, `/signup` switched to clean white form panel + dark navy storyboard left panel.
- ✅ **Backend refactor** — `server.py` split into 4 routers + core/schemas/email_service modules. All 37 pytest tests pass.
- ✅ **Public AWB tracking UI** at `/track` and `/track/:awb` — gradient hero, search, 11-stage progress, full timeline; no auth.
- ✅ **POD on delivered** — receiver name + canvas signature pad + delivery photo captured when status set to `delivered`; rendered on shipment detail as a POD card.
- ✅ **Resend email** notifications on status changes (`requested`, `assigned`, `picked_up`, `dispatched`, `in_transit`, `out_for_delivery`, `delivered`, `exception`, `cancelled`) — fire-and-forget via `asyncio.create_task` (status endpoint latency ~120 ms).
- ✅ **Pay Now** placeholder — single-click button on shipment detail + invoice page, generates receipt, shows green "PAID" diagonal stamp.
- ✅ **Landing page tracking panel** now calls real `/api/shipments/track/{awb}` (graceful fallback to demo timeline on 404).
- ✅ **Navbar** — added Track link (desktop + mobile).

## Backlog
### P1
- **Verified Resend sender domain** — today emails are rejected by Resend sandbox; verify a Flystar domain at `https://resend.com/domains` to deliver to real customers.
- **Real payment gateway** — Razorpay (UPI/cards/netbanking, INR-native) or Stripe — wire on top of the existing Pay Now placeholder.
- **Public tracking** — embed search widget directly in landing hero.

### P2
- WebSocket live status feed.
- Bulk shipment import/export (admin).
- Real customs document attachments.
- Move base64 photos to GridFS / S3 to keep documents lean.
- Return-shipment workflow + customer multi-address book.

## Test credentials
See `/app/memory/test_credentials.md`.
