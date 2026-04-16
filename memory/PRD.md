# Rinkosh - Transparent Loan Discovery Platform
**Motto: "No Spam. No Secrets. Just Savings."**

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- Backend: FastAPI + MongoDB (Motor async driver)
- AI: Claude Sonnet 4.5 (suggestions/chatbot/translation) + OpenAI Whisper (voice)
- Auth: JWT email/password + Emergent Google OAuth (HTTP-only cookies)

## What's Been Implemented

### Phase 1-8 (Complete)
- Full MVP: Landing, Auth, Onboarding, Recommendations, Leads, Credit Builder
- AI Advisor (Claude 4.5), Voice (Whisper), EN/HI languages
- Admin dashboard, dark mode, sounds, mobile touch, EMI calculator
- OTP login, Our Story, analytics tracking

### Phase 9 - Exploration-First Flow
- [x] After login → land on Landing Page, not dashboard
- [x] Browse All Loans section with 10 category filters
- [x] Gentle onboarding nudge, location auto-detect

### Phase 10 - Images & Expanded Loans
- [x] AI-generated hero + handshake trust image
- [x] 4 new categories: Gold, 2nd Hand Vehicle, Plot, Loan Against MF
- [x] 52 products, 10 categories, 20 banks

### Phase 11 - Chatbot, Location Picker, Charts (April 16, 2026)
- [x] Chatbot widget (Claude 4.5): floating green bubble, opens panel with quick questions, session-based chat
- [x] LocationPicker: navbar dropdown with search (Nominatim) + 15 popular Indian cities
- [x] Market Insights section: 3 charts (Recharts)
  - Category Distribution donut chart
  - Interest Rate Comparison horizontal bar chart
  - Top Bank Coverage vertical bar chart
- [x] Public API: POST /api/ai/chat-public, GET /api/loans/stats
- [x] EN/HI support for chatbot and all new sections

## Key Endpoints
- POST /api/ai/chat-public — Public chatbot (Claude 4.5, no auth required)
- GET /api/loans/stats — Loan market stats for charts (public)
- GET /api/loans/products — All 52 products (public)
- POST /api/ai/suggest — Auth'd AI advisor
- All other auth, loan, lead, credit, analytics endpoints

## Brand
- Logo: Green shield "R" motif
- Fonts: Sora + DM Sans
- Color: #059669
- Hero: AI-generated (emergentagent CDN)
- Trust: Handshake (Unsplash)

## Prioritized Backlog

### P1
- Email/SMS OTP delivery (currently dev mode, shows OTP in toast)
- LLM budget top-up for chatbot to work live (currently returns fallback)

### P2
- Real CIBIL/Experian API integration (currently MOCKED)
- Whisper voice input end-to-end testing
- Push notifications for lead status changes
