# Rinkosh — Deployment & Security Guide

## Environment Variables Required

### Backend (`/backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=rinkosh_db
JWT_SECRET=<random-256-bit-secret>
ADMIN_EMAIL=admin@rinkosh.com
ADMIN_PASSWORD=<strong-password>
EMERGENT_LLM_KEY=<key>               # Claude 4.5 + Whisper
```

### Frontend (`/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://yourdomain.com
```

## Quick Start (Local)
```bash
cd backend && pip install -r requirements.txt && uvicorn server:app --host 0.0.0.0 --port 8001
cd frontend && yarn install && yarn start
```

## Deploy (Railway / Render / AWS)
1. Set all env vars above
2. Backend: Python 3.11+, port 8001
3. Frontend: Node 18+, `yarn build && npx serve -s build -l 3000`
4. MongoDB: Atlas or self-hosted

## Security
- bcrypt hashing, JWT HTTP-only cookies
- Rate limiting: login 5/15min, register 10/hr, API 60/min, export 2/day
- Input sanitization: SQL/XSS pattern detection
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- No PII in logs (emails/OTPs replaced with hashes)
- Append-only audit_logs collection

## DPDP Compliance
- Consent banner with timestamp storage
- Data export: GET /api/user/export-data
- Account deletion: DELETE /api/auth/delete-account
- Privacy Policy + Terms of Service pages

## Database (PII Map)
| Collection | PII Fields | Purpose |
|---|---|---|
| users | email, name, password_hash | Auth |
| user_profiles | income, employer, city | Loan matching |
| loan_applications | full_name, phone, income | Applications |
| audit_logs | user_id, ip | Security trail (append-only) |
| consents | user_id, ip | DPDP consent |

## Backup
```bash
mongodump --uri="$MONGO_URL" --out=/backups/$(date +%Y%m%d)
mongorestore --uri="$MONGO_URL" /backups/YYYYMMDD/
```
Retain 30 days in separate cloud bucket.
