# Initial Phase - Data Validation Spike

## Goal
Prove that the core value works before building user accounts: finding relevant UK developer contract jobs consistently enough to justify the rest of the product.

## Why This Phase Comes First
The biggest early risk is not auth or dashboard UX. It is whether the job pipeline can reliably find useful contract opportunities every hour without too much noise, duplication, or cost. This phase reduces that risk first while staying aligned with the low-cost, Hostinger-first approach.

## Scope
- Single Next.js app on Hostinger
- One source only: Adzuna
- One market only: UK
- One target segment only: IT/developer contract roles
- One or a few hardcoded search profiles
- Hourly fetch run
- Basic job normalization
- Basic deduplication
- Internal review output only:
  - simple admin page, or
  - simple stored list/log, or
  - email to you only

## Not Included
- user signup/login
- public user dashboard
- profile editing
- per-user notifications
- CV tailoring
- auto-apply
- multiple data sources

## Success Criteria
- Hourly fetch runs successfully
- Relevant UK developer contract jobs are found
- Duplicates are mostly prevented
- Results are useful enough over several days of testing
- Running cost stays near zero

## Estimated Duration
- 2 to 4 days

## Recommended Output
- A very small internal-only app flow that lets you verify job quality before building the user-facing foundation

## Next Step After Success
- Move to Phase 0: User Foundation
