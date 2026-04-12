# Contract Finder - High-Level Product & Implementation Plan

## 1. Project Overview
**Project**: Contract Finder (first module of the larger Job Ecosystem)  
**Target Users**: IT Developers (software engineers, full-stack, backend, frontend, DevOps, AI/ML, etc.) looking for freelance contracts, remote gigs, and short-term projects.  
**Core 3 Services** (built in phases):  
1. Smart Contract Discovery + Hourly Notifications  
2. One-Click Apply (Standard CV)
3. AI CV Tailoring & Auto-Apply  

**Current Focus**: Notifications-only as Phase 1.  

**Reason for this overview**: Starting narrow (only IT contracts + notifications first) keeps the scope realistic, lets us validate demand quickly, and avoids building features users may not actually need.

## 2. Strategic Decisions & Reasons
- **Focus only on IT Developers + Contracts first**  
  Reason: High-demand niche with tech-savvy users who understand and will adopt AI tools fast. Narrow focus = faster development + better match quality.

- **Notifications-First approach (no auto-apply or CV tailoring in Phase 1)**  
  Reason: Simplest way to prove the core value (finding the right contracts) before adding complex features. Reduces risk and development time.

- **Use your existing Hostinger Cloud account (only 1 Node.js slot for Phases 0–2)**  
  Reason: Already paid for → zero extra hosting cost. Keeps the entire early project truly low-cost.

- **Bootstrap / ultra low-cost philosophy**  
  Reason: Minimize financial risk. We only spend money when we have real users who love the product.

- **API-First data sourcing (instead of heavy custom scraping)**  
  Reason: More stable, legal, and lower maintenance. Avoids getting banned and reduces long-term operational headaches.

## 3. Low-Cost Technical Architecture
- **Frontend + Backend**: Single Next.js 15 fullstack app (App Router + API routes)  
  Reason: Uses only **1 Hostinger Node.js slot**, simplifies deployment, and allows fast fullstack development in TypeScript.

- **Database + Auth + Storage**: Supabase Free Tier  
  Reason: Best free combination of Postgres database, built-in auth, file storage, and Edge Functions. No extra cost for MVP scale.

- **Background Jobs (hourly notifications)**: Supabase Edge Functions + Hostinger Cron  
  Reason: No need for extra Node.js slots or paid queue services in early phases.

- **AI Layer (starting Phase 2)**: Groq (Llama 3.1 8B or equivalent)  
  Reason: One of the cheapest and fastest LLMs in 2026. Keeps CV tailoring cost at pennies per user.

- **Notifications**: In-app + Resend (email)  
  Reason: Free/reliable tiers available and simple to implement.

**Reason for whole architecture**: Everything is chosen to run on your existing Hostinger account + free tiers, keeping total cost near zero until we have users.

## 4. Data Sourcing Strategy
- **Primary Source**: Adzuna API (free tier)  
  Reason: Generous limits (250 calls/day), strong UK coverage, and pulls contract-style jobs from many sources including Indeed/CV Library type listings.

- **Secondary Sources**: Jooble API + DevITjobs (free tiers)  
  Reason: Backup coverage for scattered IT contracts without extra cost.

- **Query Strategy**: Based on user "search fingerprints" (skills + rate + location + contract length)  
  Reason: Only pull data that real users actually need. Similar users share the same queries → dramatically reduces API usage and stays inside free limits.

- **Deduplication**: Handled in Supabase  
  Reason: Users never get the same contract notified twice.

**Reason for this strategy**: Solves the data freshness and volume problem without building expensive scrapers or hitting free-tier walls too early.

## 5. Phased Roadmap

**Initial Phase: Data Validation Spike (2–4 days, ~$0)**  
- Use a single Next.js app on Hostinger  
- Pull UK developer contract jobs from Adzuna only  
- Use one or a few hardcoded search profiles  
- Run hourly fetches  
- Apply basic normalization and deduplication  
- Review results internally only (simple page, log, or email)  
**Reason**: Validates the riskiest part first: whether the hourly job-finding pipeline actually produces useful contract opportunities before investing in user auth and profile UX.

**Phase 0: Foundation (4–7 days, ~$0)**  
- User signup, profile creation (skills, rate, preferences -> search fingerprint)  
- Contract Finder enabled/disabled toggle  
- Basic dashboard  
**Reason**: Creates the essential user base layer after the job pipeline is validated, while still keeping the scope narrow and low-cost.

**Phase 1: Hourly Smart Notifications (3–5 weeks, ~$0–20/month)** ✅ COMPLETE
- Pull new contracts hourly based on fingerprints  
- Deduplication + basic matching/scoring  
- Send in-app + email notifications  
- Dashboard to view matches + history  
- Admin/user role separation: `is_admin` flag, admin-only dashboard at `/admin`, protected admin API routes  
**Reason**: This becomes the first real user-facing MVP once the job discovery engine and user foundation are both proven.

**Phase 2: Base CV Storage & One-Click Apply (2-3 weeks)**
- Store user's base CV (PDF/DOCX upload to local/cloud storage)
- Add "Apply Now" button to matches that sends standard base CV via email/integration
- Track application status (Sent, Delivered, Viewed)
**Reason**: Establishes the core application delivery pipeline and user trust before introducing AI costs and complexity.

**Phase 3: AI CV Tailoring (3–4 weeks, ~$10–30/month)**  
- Generate tailored CV + short cover note for specific matches  
- Introduce user credit/token system for AI cost control (e.g. 5 free tokens per user)
**Reason**: Becomes the memorable "wow" feature, easily monetizable once the basic apply pipeline is proven.

**Phase 4: Full Automation + Monetization (4–6 weeks, ~$50–100/month)**  
- Add "Apply Without Review" mode with safety limits  
- Launch paid Pro subscription  
**Reason**: Only unlock full automation after we have proven demand and some revenue.

**Total time to revenue-ready product**: ~4.5–6 months (solo developer, part-time possible).

## 6. Cost Control
- Goal: Stay under $50/month until we have paying users.  
- Use every free tier aggressively.  
- Only upgrade APIs (e.g. TheirStack paid) when revenue covers it.  

**Reason**: Keeps financial risk extremely low while we validate the idea.

## 7. Risks & Mitigations
- API limits / data coverage → Monitor usage closely, start small, add sources gradually.  
- API changes → Build flexible query system.  
- User adoption → Run beta test after Phase 1.  

**Overall Philosophy**: Validate fast, spend slow, build only what users actually want.

---

**Next Step**:  
Once you review this document, tell me which phase you want to start building first (or if you want any section adjusted). We can then move from high-level to actual file/folder structure and starter code for that phase.
