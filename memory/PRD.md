# Rinkosh - Transparent Loan Discovery Platform
**Motto: "No Spam. No Secrets. Just Savings."**

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- Backend: FastAPI + MongoDB (Motor async driver)
- AI: Claude Sonnet 4.5 (suggestions/translation) + OpenAI Whisper (voice input)
- Auth: JWT email/password + Emergent Google OAuth (HTTP-only cookies)

## What's Been Implemented

### Phase 1-8 (Complete)
- Landing page, JWT/Google Auth, 4-step onboarding, loan recommendations, lead management
- Credit builder, AI advisor (Claude 4.5), voice input (Whisper), EN/HI languages
- Forgot Password, profile editing, loan comparison, credit score placeholder
- Admin analytics dashboard, dark mode, micro-interactions, mobile touch
- OTP login, EMI Calculator, Our Story section, sticky CTA, step tracker
- Bug fixes: 429 login, frontend compilation, analytics tracking

### Phase 9 - Exploration-First Flow (April 16, 2026)
- [x] After login → land on Landing Page (not forced to dashboard)
- [x] Browse All Loans section with category filters
- [x] Gentle onboarding nudge (not forced redirect)
- [x] Location sync via geolocation + OpenStreetMap Nominatim
- [x] Personalized navbar for logged-in users

### Phase 10 - Images & Expanded Loan Categories (April 16, 2026)
- [x] Hero image: AI-generated Indian professional comparing loans (emergentagent CDN)
- [x] Trust image: Handshake symbolizing trust & transparency (Unsplash)
- [x] 4 new loan categories added: Gold Loan, 2nd Hand Vehicle, Plot Loan, Loan Against MF
- [x] 52 total loan products across 10 categories and 20 banks
- [x] New banks: Muthoot Finance, Manappuram Finance
- [x] Category filter pills: All(52), Personal(13), Home(10), Car(6), Bike(3), Education(3), Gold(5), 2nd Hand Vehicle(4), Plot(4), Loan Against MF(4)
- [x] Onboarding updated with all 10 loan types
- [x] Stats bar: 35+ Banks, 10 Categories
- [x] EN/HI translations for all new types

## Brand Assets
- Hero: AI-generated (emergentagent CDN)
- Trust: Handshake (Unsplash photo-1518135714426)
- Logo: Green shield "R" motif
- Fonts: Sora (headings) + DM Sans (body)
- Brand Color: #059669

## Prioritized Backlog

### P1
- Chatbot widget ("Ask anything about loans") on landing page
- Email/SMS OTP delivery (currently dev mode)

### P2
- Real CIBIL/Experian API integration (currently MOCKED)
- Whisper voice input end-to-end testing
- Push notifications for lead status changes
