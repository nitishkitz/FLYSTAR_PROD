# Flystar Test Credentials

## Backend
- API base: `${REACT_APP_BACKEND_URL}/api`

## Admin
- Email: `admin@flystar.in`
- Password: `Admin@123`
- Role: `admin`
- Can: see overview dashboard with charts, all shipments (CRUD), all users (create/disable/delete staff)

## Employee
- Email: `employee@flystar.in`
- Password: `Employee@123`
- Role: `employee`
- Can: see pickup queue, accept requests, fill waybill, update statuses

## Customer
- Email: `customer@flystar.in`
- Password: `Customer@123`
- Role: `customer`
- Can: self register, raise pickup, list own shipments, view detail, view invoice

## Endpoints
- POST `/api/auth/login`
- POST `/api/auth/register`
- POST `/api/auth/logout`
- GET  `/api/auth/me`
- GET  `/api/users` (admin)
- POST `/api/users` (admin)
- PATCH/DELETE `/api/users/{id}` (admin)
- POST `/api/shipments` (customer/admin)
- GET  `/api/shipments` (auto-filtered by role)
- GET  `/api/shipments/{id}`
- POST `/api/shipments/{id}/accept` (employee/admin)
- POST `/api/shipments/{id}/waybill` (employee/admin)
- POST `/api/shipments/{id}/status` (employee/admin)
- PATCH/DELETE `/api/shipments/{id}` (admin)
- GET  `/api/shipments/track/{awb}` (public)
- GET  `/api/analytics/overview` (admin)
- POST `/api/quote`
