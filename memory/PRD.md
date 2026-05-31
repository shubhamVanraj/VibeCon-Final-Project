# Rinkosh - Transparent Loan Discovery Platform
**Motto: "No Spam. No Secrets. Just Savings."**

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Recharts
- Backend: FastAPI + MongoDB (Motor async driver)
- AI: Claude Sonnet 4.5 (chatbot/advisor) + OpenAI Whisper (voice)
- Auth: JWT + Emergent Google OAuth (HTTP-only cookies)

## Visual Design System (Feb 2026)
- **Aesthetic**: Dalal Street Light (cream #FFFBF5 + ink #0A1118 + electric amber #FFB347) AND full Dalal Street **Midnight** dark variant (#050810 base + #141C2A glass + amber neon)
- **Tile system**: Bazaar Bismuth — 3-layer translucent brassware stack, shimmering animated amber top on best-value
- **Motion**: Bazaar Snap — spring physics `cubic-bezier(0.34, 1.56, 0.64, 1)`, staggered snap-in entrances, snap-press feedback
- **Typography**: Chivo (headings/numbers, tabular-nums) + DM Sans (body) + IBM Plex Sans Devanagari (Hindi). `<html lang>` mutates on toggle, `[lang="hi"]` selectors swap font.
- **Theme tokens**: CSS variables in `App.css` (`:root` + `.dark`) + Shadcn HSL aliases in `index.css`. Every Bismuth tile, cap, data-large, button auto-flips.

## Pages applying Dalal Light + Dark
- ✅ Landing (Hero, EMI Calculator, Trust, Founder, Browse Loans, CTA, Footer, Compare)
- ✅ Login (Bismuth card, ambient amber glow, tabs Password/OTP, Google button, theme + language toggle)
- ✅ Register (matching treatment)
- ✅ Onboarding
- ✅ Dashboard
- ✅ Bank Onboarding + Bank Dashboard
- ✅ Admin Dashboard
- ✅ Forgot Password
- ✅ Privacy + Terms

## Layout
```
/app/backend/
├── server.py            # FastAPI + middleware + all routes (~1700 lines)
├── seed_data.py         # LOAN_PRODUCTS + PRODUCT_METADATA
├── services/
│   ├── credit_bureau.py        # CIBIL/Experian/Decentro/mock adapters
│   ├── account_aggregator.py   # Finvu sandbox + mock AA adapters
│   └── recommendation.py       # approval probability scoring
└── tests/{test_services_refactor.py, test_rinkosh_iteration16.py}

/app/frontend/src/
├── pages/{LandingPage, LoginPage, RegisterPage, OnboardingPage, DashboardPage, BankOnboardingPage, ...}
├── components/landing/{LandingNavbar, HeroSection, EmiCalculatorSection, TrustAndFounder, BrowseLoans, CtaAndFooter}
├── contexts/{AuthContext, ThemeContext, LanguageContext}
└── App.css + index.css (Dalal Light/Midnight token system)
```

## Key Endpoints
- DELETE /api/auth/delete-account — DPDP compliant
- POST /api/bank/register, POST/GET/PUT /api/bank/products
- GET /api/bank/dashboard, POST/GET /api/applications
- GET /api/credit-score/{check, report} — Pluggable bureau adapter
- POST /api/aa/consent/request, GET /api/aa/consent/status/{handle}
- POST /api/aa/fi-data/fetch, POST /api/aa/consent/revoke
- All previous auth, loan, lead, analytics endpoints

## Compliance
- DPDP Act 2023, RBI Digital Lending, Sahamati AA framework — adapter-ready

## Backlog
### P1
- Top up Emergent Universal Key for live Claude chatbot
- Wire Resend (Email OTP) — deferred by user previous round
- Per-user rate-limit (1/7d) on `/api/credit-score/check`
- Server.py route split into `/backend/routers/*.py` (next refactor)
- Fix Devanagari font specificity for hero-headline in Hindi (font-display: swap / preload)
- Gate cookie banner to public marketing routes only
- Auto-redirect admin to /admin (currently lands on /)

### P2
- Live CIBIL/Experian commercial onboarding (env flip ready)
- Live Finvu/OneMoney FIU registration
- Redis-backed AA store + multi-worker uvicorn scaling
- MongoDB encryption at rest + automated backup cron

## Test Reports
- iteration_15.json — Landing UI polish (25/25 PASS)
- iteration_16.json — Refactor + AA/CIBIL adapters (18/18 PASS)
- iteration_17.json — Dalal Light + Bazaar Bismuth + Snap on Landing (27/28 PASS)
- iteration_18.json — Dalal Light on all pages + Dalal Midnight dark mode (28/28 PASS, 100%)
