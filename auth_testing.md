# Auth Testing Playbook

## Endpoints
- POST /api/auth/register  (customer self-signup)
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/refresh
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/users (admin only - create employee/admin)

## MongoDB
```
mongosh
use flystar
db.users.find({role: "admin"}).pretty()
```
Verify bcrypt hash starts with `$2b$`.

## API curl
```
curl -c cookies.txt -X POST $REACT_APP_BACKEND_URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@flystar.in","password":"admin123"}'
curl -b cookies.txt $REACT_APP_BACKEND_URL/api/auth/me
```

## Brute force
- 5 failed attempts on same `{ip}:{email}` → 15 min lockout.

## Indexes
- users.email unique
- password_reset_tokens.expires_at TTL
- login_attempts.identifier
