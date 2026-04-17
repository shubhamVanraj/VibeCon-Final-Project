# Rinkosh - Transparent Loan Discovery Platform
**Motto: "No Spam. No Secrets. Just Savings."**

## Architecture
- Frontend: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- Backend: FastAPI + MongoDB (Motor async driver)
- AI: Claude Sonnet 4.5 (chatbot/advisor) + OpenAI Whisper (voice)
- Auth: JWT + Emergent Google OAuth (HTTP-only cookies)

## What's Been Implemented (Phases 1-14)
- Full MVP: Landing, Auth, Onboarding, Recommendations, Leads, Credit Builder
- AI Advisor + Voice, EN/HI, Admin dashboard, dark mode, EMI Calculator
- Exploration-first flow (login → landing page), Browse Loans (56 products, 10 categories, 20 banks)
- Chatbot widget (Claude 4.5), Location picker, Market insight charts
- Founder LinkedIn + Support email + Talk to Us toggle + Rich footer + Scroll shading
- **Phase 14**: Indian number formatting (lakhs/crores), varied approval probability with reasons, change preferences from dashboard, India loan market stats

## Key Features
- 56 loan products: Personal(13), Home(10), Car(6), Bike(3), Education(3), Gold(5), Used Vehicle(4), Plot(4), Mutual Funds(4), Refinance(4)
- 20 banks including Muthoot Finance, Manappuram Finance
- Approval probability varies per bank based on credit score, income ratio, existing EMI burden, loan amount vs max — with contextual reasons
- Indian number formatting: 5,00,000 (lakhs), 1,00,00,000 (crores)
- "Change Preferences" button on dashboard to re-do onboarding
- India loan stats: 2.8L+ daily applications, 85L+ monthly, 10.2 Cr annual, 38.6L Cr outstanding

## Prioritized Backlog
### P1
- LLM budget top-up for live chatbot
- Email/SMS OTP delivery (dev mode)
### P2
- Real CIBIL/Experian API integration (mocked)
- Whisper voice e2e testing
