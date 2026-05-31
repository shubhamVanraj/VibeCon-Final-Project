# Rinkosh - Transparent Loan Discovery Platform
**Motto: "No Spam. No Secrets. Just Savings."**

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- Backend: FastAPI + MongoDB (Motor async driver)
- AI: Claude Sonnet 4.5 (chatbot/advisor) + OpenAI Whisper (voice)
- Auth: JWT + Emergent Google OAuth (HTTP-only cookies)

## Visual Design System — Dalal Street Light × Bazaar Bismuth × Snap (Feb 2026)
- **Aesthetic**: Dalal Street Light — warm cream (#FFFBF5) base with deep ink-navy (#0A1118) structure + electric amber (#FFB347) accents + the Bombay-trading-floor energy applied to a light theme.
- **Tile system**: Bazaar Bismuth — 3-layer translucent brassware stack (cream paper top, slate-50 glaze, soft border). Best-value tiles get a shimmering animated amber top border + amber halo.
- **Motion**: Bazaar Snap — spring-physics easing `cubic-bezier(0.34, 1.56, 0.64, 1)`, snap-in entrance staggers, snap-press hover/active feedback, amber-pulse on the primary CTA.
- **Typography**: Chivo (headings & numbers, tabular-nums) + DM Sans (body) + IBM Plex Sans Devanagari (Hindi). All custom fonts strictly loaded from Google Fonts. `<html lang>` mutates on toggle, CSS `[lang="hi"]` overrides swap brand font for Devanagari glyphs.
- **Dark mode**: Reserved for P2 — true Dalal Street Midnight variant.

## Layout (post-Feb-2026 refactor + redesign)
```
/app/backend/
├── server.py            # FastAPI app + middleware + all routes (~1700 lines, was 1973)
├── seed_data.py         # LOAN_PRODUCTS + PRODUCT_METADATA (extracted)
├── services/
│   ├── credit_bureau.py        # CreditBureauProvider ABC + mock/CIBIL/Experian/Decentro
│   ├── account_aggregator.py   # AAProvider ABC + mock + Finvu sandbox stub
│   └── recommendation.py       # calculate_approval_probability + signal helpers
└── tests/
    ├── test_services_refactor.py     # 7 unit tests
    └── test_rinkosh_iteration16.py   # 11 integration tests

/app/frontend/src/
├── pages/LandingPage.js          # 138-line orchestrator
└── components/landing/
    ├── LandingNavbar.js          # Sticky cream-blur nav + scroll-spy + amber-pulse CTA
    ├── HeroSection.js            # Chivo hero w/ amber gradient + best-match Bismuth preview
    ├── EmiCalculatorSection.js   # Layered Bismuth tiles + amber donut
    ├── TrustAndFounder.js        # Ring-glow icon cards + SK avatar w/ heart badge
    ├── BrowseLoans.js            # Bismuth LoanTile w/ collapsible Details expander
    ├── CtaAndFooter.js           # Dark Dalal CTA band + cream footer + Compare sheet
    └── utils.js                  # calcEmi, fmtRs, CATEGORIES
```

## What's Been Implemented
- Full MVP: 72 loan products, 14 categories, 20+ banks
- Browse loans, side-by-side comparison, EMI calculator, AI chatbot (Claude 4.5), voice (Whisper)
- Corporate tie-ups (SAIL/PSU/GCC), location-based filtering
- Bank onboarding portal + self-serve product management
- Digital loan applications (customer → bank pipeline)
- Bank dashboard with lead funnel, conversion rates, region breakdown
- Delete My Account (DPDP Act 2023 compliant)
- Privacy Policy + Terms of Service pages
- **Feb 2026 — Refactor + Adapters**: services/credit_bureau, services/account_aggregator, services/recommendation, seed_data extracted (18/18 tests PASS)
- **Feb 2026 — Sahamati AA pluggable adapter**: 4 endpoints `/api/aa/{consent/request, consent/status/{h}, fi-data/fetch, consent/revoke}`. Mock by default; Finvu sandbox stub ready. Switch via `AA_PROVIDER`.
- **Feb 2026 — CIBIL pluggable adapter**: `/api/credit-score/{check, report}`. Mock by default; CIBIL/Experian/Decentro stubs. Switch via `CREDIT_BUREAU_PROVIDER`.
- **Feb 2026 — World-class redesign**: Dalal Street Light × Bazaar Bismuth × Snap motion applied to Landing. Full Hindi font support (IBM Plex Sans Devanagari). 5 new section-header translation keys. Verified at iteration 17 (27/28 → 28/28 after fixes).

## Key Endpoints
- DELETE /api/auth/delete-account — DPDP compliant account+data deletion
- POST /api/bank/register — Bank partner onboarding
- POST/GET/PUT /api/bank/products — Bank self-serve products
- GET /api/bank/dashboard — Bank funnel + platform comparison
- POST/GET /api/applications — Digital loan applications
- GET /api/credit-score/check — Pluggable CIBIL/Experian/mock pull
- GET /api/credit-score/report — Cached last report
- POST /api/aa/consent/request — Sahamati AA Step 1
- GET /api/aa/consent/status/{handle} — Poll (mock auto-approves)
- POST /api/aa/fi-data/fetch — Pull bank-statement summary post-consent
- POST /api/aa/consent/revoke — User-initiated revocation
- All previous auth, loan, lead, analytics endpoints

## Compliance
- DPDP Act 2023: Delete Account, consent-based sharing, data minimization, AA-consent revocation
- RBI Digital Lending: Transparent fees, user-controlled leads
- Privacy Policy + Terms of Service live
- Sahamati AA framework: Adapter-ready, consent artefacts persisted in db.aa_consents

## Backlog
### P1
- Top up Universal Key for live chatbot
- Wire Resend for Email OTP delivery (deferred by user)
- Add per-user rate-limit (1/7d) on `/api/credit-score/check` before live provider
- Validate `fi_types` in `AAConsentRequest` against the standard FI_TYPES set
- Extract server.py routes into /backend/routers/{auth,loans,credit_score,aa,profile,admin}.py — next refactor pass
- Apply Dalal Street Light to other pages (Dashboard, Onboarding, Login/Register, Bank Portal)
- Build a true Dalal Street Midnight DARK MODE variant (palette already documented)

### P2
- Live CIBIL/Experian commercial onboarding (flip `CREDIT_BUREAU_PROVIDER=cibil`)
- Live Finvu/OneMoney FIU registration (flip `AA_PROVIDER=finvu` + FIU keys + ECDH key-pair)
- Redis-backed AA store before scaling multi-worker uvicorn
- MongoDB encryption at rest + automated backup cron
