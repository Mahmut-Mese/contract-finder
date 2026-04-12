# Phase 2 — Base CV Storage & One-Click Apply

## Overview

Phase 2 adds two capabilities:
1. **CV Upload & Storage** — Users upload their base CV (PDF only for now) which is stored on disk.
2. **One-Click Apply** — Users can apply to matched contracts directly from the dashboard. The app emails the user's CV + a standard intro to the job's application email (or flags it for manual apply if no email is available).
3. **Application Tracking** — Users see all their applications and their status.

## Stack Additions

- **File storage**: Local disk (`uploads/cv/`) for dev. Hostinger disk for prod. No cloud storage yet — keep it simple.
- **File upload**: Native `FormData` via Next.js API route. Max 5MB, PDF only.
- **Email sending**: Existing Nodemailer setup (Gmail SMTP) — reuse `src/lib/email.ts`.

## Database Schema (Phase 2)

### `cv_files`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK AUTO_INCREMENT | |
| user_id | VARCHAR(36) FK → users | One active CV per user |
| original_name | VARCHAR(255) | Original filename |
| stored_path | VARCHAR(500) | Path on disk |
| file_size | INT | Size in bytes |
| mime_type | VARCHAR(100) | application/pdf |
| is_active | BOOLEAN | Only one active CV per user (default: true) |
| created_at | DATETIME | |

### `applications`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK AUTO_INCREMENT | |
| user_id | VARCHAR(36) FK → users | |
| job_id | INT FK → jobs | |
| match_id | INT FK → matched_jobs | |
| cv_file_id | INT FK → cv_files | Which CV was sent |
| status | VARCHAR(30) | draft, sent, failed |
| applied_via | VARCHAR(50) | email, manual, external_link |
| application_email | VARCHAR(255) | Where the CV was sent (if email) |
| error_message | TEXT | If sending failed |
| created_at | DATETIME | |
| updated_at | DATETIME | |

## API Routes

### `POST /api/cv/upload` — Upload CV
- Auth required
- Accepts `multipart/form-data` with a single PDF file
- Validates: PDF only, max 5MB
- Stores to `uploads/cv/{userId}/{timestamp}-{originalName}`
- Deactivates previous CVs (`is_active = false`) then inserts new one
- Returns: `{ cv: { id, originalName, fileSize, createdAt } }`

### `GET /api/cv` — Get active CV info
- Auth required
- Returns active CV metadata (not the file itself)
- Returns: `{ cv: { id, originalName, fileSize, createdAt } | null }`

### `DELETE /api/cv` — Delete active CV
- Auth required
- Deletes file from disk and marks record inactive
- Returns: `{ success: true }`

### `GET /api/cv/download` — Download CV file
- Auth required
- Streams the active CV file back to the client
- Returns: PDF file with correct Content-Type and Content-Disposition headers

### `POST /api/applications` — Apply to a job
- Auth required
- Body: `{ matchId: number }`
- Validates: user has active CV, match exists and belongs to user, not already applied
- Sends email with CV attachment to job application email (if available)
- If no application email on the job, marks as `manual` (user must apply via external link)
- Creates application record
- Updates match status to `applied`
- Returns: `{ application: { id, status, appliedVia } }`

### `GET /api/applications` — List user's applications
- Auth required
- Query params: `limit`, `offset`
- Returns: `{ applications: [...], total: number }`

## UI Changes

### Profile Page (`/profile`)
- Add "Your CV" section below the form
- Upload button (PDF, max 5MB)
- Shows current CV name + upload date if one exists
- Download and Delete buttons

### Dashboard (`/dashboard`)
- Change "Apply" link behaviour:
  - If user has a CV uploaded: clicking "Apply" triggers `POST /api/applications` (one-click apply)
  - If no CV: "Apply" still opens the external link (current behaviour) with a tooltip "Upload your CV to apply directly"
- Show "Applied" badge on matches that have been applied to

### New Page: Applications (`/applications`)
- Table of all applications with: job title, company, date applied, status, applied via
- Link to job listing
- Navbar gets "Applications" link

## Implementation Slices

### Slice 1: Database + Schema
- Create `src/lib/schema-phase2.sql`
- Run migration
- Add `uploads/` to `.gitignore`
- Create `uploads/cv/` directory

### Slice 2: CV Upload API + Profile UI
- `POST /api/cv/upload`, `GET /api/cv`, `DELETE /api/cv`, `GET /api/cv/download`
- CV section on profile page (upload, view, download, delete)

### Slice 3: Applications API + Dashboard Apply Button
- `POST /api/applications`, `GET /api/applications`
- Update dashboard "Apply" button to one-click apply (when CV exists)
- Add `applied` to matched_jobs status enum
- Email sending with CV attachment

### Slice 4: Applications Page
- `/applications` page with table view
- Add to Navbar
- Add to middleware protected routes check

### Slice 5: E2E Tests + Review
- Add Phase 2 routes to E2E smoke tests
- Run full suite
- Code review

## File Changes Summary

```
New files:
  src/lib/schema-phase2.sql
  src/app/api/cv/upload/route.ts
  src/app/api/cv/route.ts
  src/app/api/cv/download/route.ts
  src/app/api/applications/route.ts
  src/app/applications/page.tsx
  uploads/cv/.gitkeep

Modified files:
  src/app/profile/page.tsx          — Add CV upload section
  src/app/dashboard/page.tsx        — One-click apply button
  src/components/Navbar.tsx          — Add Applications link
  src/lib/email.ts                   — Add sendApplicationEmail()
  src/middleware.ts                   — Add /applications to protected
  e2e/smoke.spec.ts                  — Add Phase 2 route tests
  .gitignore                          — Add uploads/cv/*
```

## Success Criteria

- [ ] User can upload a PDF CV (max 5MB)
- [ ] User can view, download, and delete their CV
- [ ] User can one-click apply to a matched job (sends CV via email)
- [ ] Application is tracked with status
- [ ] Applications page shows history
- [ ] Matches show "Applied" badge after applying
- [ ] E2E tests pass for all new routes
- [ ] Build succeeds with zero TypeScript errors
