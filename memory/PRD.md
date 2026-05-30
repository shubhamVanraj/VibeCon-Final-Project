# Rinkosh - Transparent Loan Discovery Platform
**Motto: "No Spam. No Secrets. Just Savings."**

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- Backend: FastAPI + MongoDB (Motor async driver)
- AI: Claude Sonnet 4.5 (chatbot/advisor) + OpenAI Whisper (voice)
- Auth: JWT + Emergent Google OAuth (HTTP-only cookies)

## What's Been Implemented
- Full MVP: 72 loan products, 14 categories, 20+ banks
- Browse loans, side-by-side comparison, EMI calculator
- AI chatbot (Claude 4.5) + voice input (Whisper) + EN/HI
- Corporate tie-ups (SAIL/PSU/GCC), location-based filtering
- Bank onboarding portal + self-serve product management
- Digital loan applications (customer → bank pipeline)
- Bank dashboard with lead funnel, conversion rates, region breakdown, platform comparison
- Delete My Account (DPDP Act 2023 compliant)
- Privacy Policy + Terms of Service pages
- UI refresh: Organic warm theme (#FDFBF7), cleaner cards, refined glassmorphism
- Scroll-reveal animations, dark mode, mobile responsive

## Key Endpoints
- DELETE /api/auth/delete-account — DPDP compliant account+data deletion
- POST /api/bank/register — Bank partner onboarding
- POST/GET/PUT /api/bank/products — Bank self-serve products
- GET /api/bank/dashboard — Bank funnel + platform comparison
- POST/GET /api/applications — Digital loan applications
- All previous auth, loan, lead, analytics endpoints

## Compliance
- DPDP Act 2023: Delete Account, consent-based sharing, data minimization
- RBI Digital Lending: Transparent fees, user-controlled leads
- Privacy Policy + Terms of Service pages live

## Backlog
### P1
- Top up Universal Key for live chatbot
- Email/SMS OTP delivery
### P2
- Real CIBIL/Experian API
- Account Aggregator (Sahamati) integration
