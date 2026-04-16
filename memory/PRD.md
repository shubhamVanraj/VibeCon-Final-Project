# Rinkosh - Transparent Loan Discovery Platform
**Motto: "No Spam. No Secrets. Just Savings."**

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- Backend: FastAPI + MongoDB (Motor async driver)
- AI: Claude Sonnet 4.5 (suggestions/translation) + OpenAI Whisper (voice input)
- Auth: JWT email/password + Emergent Google OAuth (HTTP-only cookies)

## What's Been Implemented

### Phase 1 - Core MVP
- [x] Landing page with trust-first messaging
- [x] JWT + Google OAuth authentication with brute-force protection
- [x] 4-step onboarding flow (loan type, employment, credit, amount)
- [x] Loan recommendation engine (35 products, 6 categories, 18+ banks)
- [x] Lead management with user-controlled consent tracking
- [x] Credit builder suggestions (7 actionable tips)
- [x] AI advisor with Claude Sonnet 4.5
- [x] Voice input with OpenAI Whisper
- [x] Multi-language support (EN/HI)

### Phase 2 - Enhancements
- [x] Forgot Password / Reset Password (3-step OTP flow)
- [x] Profile editing post-onboarding
- [x] Side-by-side loan comparison (Table + Card views, 2-4 loans)
- [x] Credit Score integration placeholder (CIBIL/Experian/Equifax)
- [x] UI/UX upgrade (hover animations, depth, glassmorphism)

### Phase 3 - Admin & Branding
- [x] Admin analytics dashboard (lead funnel, bank distribution, commission tracking)
- [x] Global language switching (EN/HI with localStorage persistence)
- [x] Custom logo, brand fonts (Sora + DM Sans), motto

### Phase 5 - Visual Overhaul
- [x] Dark mode toggle, mesh gradients, glass-morphism, glow effects
- [x] Micro-interaction sounds, mobile touch refinements

### Phase 7 - Login Redesign, EMI Calculator
- [x] OTP login, tabbed Password/OTP interface
- [x] "Our Story" founder narrative section
- [x] Interactive EMI Calculator on landing + dashboard
- [x] Sticky mobile CTA, step tracker, expandable cards

### Phase 8 - Bug Fixes & Analytics
- [x] Fixed 429 login error (relaxed brute-force)
- [x] User journey analytics tracking (page_view, login events)

### Phase 9 - Exploration-First Flow & Browse Loans (April 16, 2026)
- [x] After login → land on Landing Page (not forced to dashboard/onboarding)
- [x] Browse All Loans section: 35 products across 18+ banks with category filters
- [x] Category filter pills: All, Personal (13), Home (10), Car (6), Bike (3), Education (3)
- [x] Each loan card: bank logo, interest rate, max amount, tenure, processing fee, features badges
- [x] Personalized navbar for logged-in users: Dashboard link, user name, logout
- [x] Dynamic hero CTAs: "Browse Loans" + "Get Personalized Picks" for logged-in users
- [x] Gentle onboarding nudge banner (not forced redirect) for users without profile
- [x] Location sync via browser geolocation + OpenStreetMap Nominatim reverse geocode
- [x] Login/Register/Google Auth all redirect to landing page (/)
- [x] Dashboard still accessible via /dashboard (requires profile for recommendations)

## User Flow (Updated)
1. Visit landing page → read story, browse loans, use EMI calculator
2. Sign up / Login → stay on landing page with personalized nav + Browse Loans
3. Explore 35 loan products by category → see interest rates, fees, features
4. Click "Get Personalized Picks" or "Complete Profile" → 4-step onboarding
5. Complete onboarding → Dashboard with personalized recommendations sorted by total cost
6. Express interest → Lead tracked → Track application status

## Brand Assets
- Logo: Green shield with "R" + transparency motif
- Fonts: Sora (headings) + DM Sans (body)
- Brand Color: #059669 (Emerald Green)

## Prioritized Backlog

### P1
- Chatbot widget ("Ask anything about loans") on landing page
- Email/SMS OTP delivery (currently dev mode, shows OTP in toast)

### P2
- Real CIBIL/Experian API integration (currently MOCKED)
- Voice-based input (Whisper) end-to-end testing
- Push notifications for lead status changes
