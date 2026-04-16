# Rinkosh - Transparent Loan Discovery Platform

## Problem Statement
Build a fintech platform helping Indian users find the best loan transparently without spam or data misuse.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **AI**: Claude Sonnet 4.5 (suggestions/translation) + OpenAI Whisper (voice input)
- **Auth**: JWT email/password + Emergent Google OAuth

## User Personas
1. First-time borrowers (Tier 2/3 cities) - need guidance
2. Experienced borrowers - need comparison tools
3. Credit-building users - need improvement tips

## Core Requirements (Static)
- Transparent loan comparison across banks/NBFCs
- User-controlled lead sharing (no spam)
- AI-powered advice in English + Hindi
- Credit score building guidance
- Privacy-first approach

## What's Been Implemented (April 16, 2026)
- [x] Landing page with trust-first messaging
- [x] JWT + Google OAuth authentication
- [x] 4-step onboarding flow (loan type, employment, credit info, loan details)
- [x] Loan recommendation engine (19 products across 6 categories)
- [x] Lead management with consent tracking
- [x] Credit builder suggestions
- [x] AI advisor with Claude Sonnet 4.5
- [x] Voice input with OpenAI Whisper
- [x] Multi-language support (EN/HI toggle)
- [x] Privacy & trust layer

## Prioritized Backlog
### P0 (Critical)
- None remaining for MVP

### P1 (Important)
- Password reset flow
- User profile editing after onboarding
- Loan comparison side-by-side view
- CIBIL/Experian integration placeholder

### P2 (Nice to have)
- Commission tracking/attribution system
- Email notifications for lead updates
- Admin dashboard for analytics
- More granular loan filters (amount range, tenure)
- User testimonials on landing page

## Next Tasks
1. Add password forgot/reset flow
2. Profile editing capability
3. Side-by-side loan comparison feature
4. Push notification for lead status changes
