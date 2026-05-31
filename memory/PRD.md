# Rinkosh - Transparent Loan Discovery Platform
**Motto: "No Spam. No Secrets. Just Savings."**

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- Backend: FastAPI + MongoDB (Motor async driver)
- AI: Claude Sonnet 4.5 (chatbot/advisor) + OpenAI Whisper (voice)
- Auth: JWT + Emergent Google OAuth (HTTP-only cookies)

## Layout (post Feb-2026 refactor)
```
/app/backend/
├── server.py            # FastAPI app + middleware + all routes (1700 lines, was 1973)
├── seed_data.py         # LOAN_PRODUCTS + PRODUCT_METADATA (extracted)
├── services/
│   ├── credit_bureau.py        # CreditBureauProvider ABC + mock/CIBIL/Experian/Decentro adapters
│   ├── account_aggregator.py   # AAProvider ABC + mock + Finvu sandbox stub
│   └── recommendation.py       # calculate_approval_probability + signal helpers
└── tests/
    ├── test_services_refactor.py     # 7 unit tests
    └── test_rinkosh_iteration16.py   # 11 integration tests

/app/frontend/src/
├── pages/LandingPage.js          # 138-line orchestrator (was 670)
└── components/landing/
    ├── LandingNavbar.js          # Sticky nav + scroll-spy
    ├── HeroSection.js            # Hero with amber-border preview card
    ├── EmiCalculatorSection.js   # Sliders + donut chart
    ├── TrustAndFounder.js        # 3-col trust + founder story
    ├── BrowseLoans.js            # Product list + filters + LoanContextModal
    ├── CtaAndFooter.js           # CTA + footer + Compare sheet + Talk-to-us
    └── utils.js                  # calcEmi, fmtRs, CATEGORIES
```

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
- UI refresh + Feb-2026 polish: sticky navbar with scroll-spy, solid CTAs, 3-col trust w/ icon circles, founder story 2-col on cream bg, full Hindi mapping (~60 keys)
- **Feb 2026 — Refactor + Adapters**:
  - LandingPage 670→138 lines + 7 sub-components (<170 lines each)
  - server.py 1973→1700 lines via service extraction + seed_data module
  - New `/api/credit-score/check` and `/api/credit-score/report` powered by pluggable `CreditBureauProvider` (mock by default; CIBIL/Experian/Decentro stubs ready)
  - New 4-step Sahamati AA flow `/api/aa/{consent/request, consent/status/{h}, fi-data/fetch, consent/revoke}` powered by pluggable `AccountAggregatorProvider` (mock by default; Finvu sandbox stub ready)
  - Provider switching via env: `CREDIT_BUREAU_PROVIDER` & `AA_PROVIDER`
  - 18/18 unit + integration tests passing (test_reports/iteration_16.json)

## Key Endpoints
- DELETE /api/auth/delete-account — DPDP compliant account+data deletion
- POST /api/bank/register — Bank partner onboarding
- POST/GET/PUT /api/bank/products — Bank self-serve products
- GET /api/bank/dashboard — Bank funnel + platform comparison
- POST/GET /api/applications — Digital loan applications
- **GET /api/credit-score/check** — Pluggable CIBIL/Experian/mock pull
- **GET /api/credit-score/report** — Cached last report
- **POST /api/aa/consent/request** — Sahamati AA Step 1
- **GET /api/aa/consent/status/{handle}** — Poll, auto-approves on mock
- **POST /api/aa/fi-data/fetch** — Pull bank-statement summary post-consent
- **POST /api/aa/consent/revoke** — User-initiated revocation
- All previous auth, loan, lead, analytics endpoints

## Compliance
- DPDP Act 2023: Delete Account, consent-based sharing, data minimization, AA-consent revocation
- RBI Digital Lending: Transparent fees, user-controlled leads
- Privacy Policy + Terms of Service pages live
- Sahamati AA framework: Adapter-ready, consent artefacts persisted in `db.aa_consents`

## Backlog
### P1
- Top up Universal Key for live chatbot
- Wire Resend for Email OTP delivery (user deferred this round)
- Add per-user rate-limit (1/7d) on `/api/credit-score/check` before turning live provider on
- Validate `fi_types` in `AAConsentRequest` against the standard FI_TYPES set
- Extract server.py routes into /backend/routers/{auth,loans,credit_score,aa,profile,admin}.py — next refactor pass

### P2
- Live CIBIL/Experian commercial onboarding (then flip `CREDIT_BUREAU_PROVIDER=cibil`)
- Live Finvu/OneMoney AA registration (then flip `AA_PROVIDER=finvu` + provide FIU keys + ECDH key-pair)
- Redis-backed AA store before multi-worker uvicorn (current in-memory store fragments across workers)
- MongoDB encryption at rest + automated backup cron
