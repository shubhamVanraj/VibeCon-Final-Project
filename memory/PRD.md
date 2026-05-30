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
- **Landing Page UI Polish (Feb 2026)**: Sticky navbar with scroll-spy active highlighting (EMI Calculator / Browse Loans nav links highlight via bg-[#FEF3C7] as user scrolls); Logo click smooth-scrolls to top; all CTAs converted to solid navy/amber with shadows (no more ghost/disabled appearance); Hero preview card has amber left-border (border-l-4 border-l-[#C8860A]); Trust Cards in 3-col grid with colored icon circles (green/amber/navy); Founder Story relocated above Browse Loans context bar with 2-col layout (SK avatar left, quote right) on #FFFBF5 cream bg; Full Hindi translation mapping for all Landing Page strings (hero, CTAs, EMI calc, trust cards, founder, footer, categories) — language persists via localStorage. Verified PASS in test_reports/iteration_15.json (25/25 assertions).

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
