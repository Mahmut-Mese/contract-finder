# Phase 0 — Implementation (COMPLETED)

## Stack

- **Auth**: Auth.js v5 (`next-auth@5.0.0-beta.30`) with credentials provider, JWT strategy
- **Database**: MySQL 9.4 (local), raw `mysql2` queries (no ORM)
- **Frontend**: Next.js 16.2.3, App Router, `src/` directory, inline styles
- **Password hashing**: bcryptjs (12 rounds)
- **Session**: JWT (30-day expiry), stored in `authjs.session-token` cookie

## Database Tables (Phase 0)

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID, auto-generated |
| email | VARCHAR(255) UNIQUE | User email (lowercased) |
| password_hash | VARCHAR(255) | bcrypt hash |
| is_admin | BOOLEAN | Admin flag (default: false) |
| created_at | DATETIME | |
| updated_at | DATETIME | Auto-updates |

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | INT PK AUTO_INCREMENT | |
| user_id | VARCHAR(36) FK → users | One profile per user |
| skills | TEXT | Comma-separated tech skills |
| min_rate | INT | Minimum daily rate (GBP) |
| max_rate | INT | Maximum daily rate (GBP) |
| location | VARCHAR(255) | City/country preference |
| remote_preference | VARCHAR(50) | remote, hybrid, onsite, any |
| contract_length | VARCHAR(100) | Preferred contract length |
| search_fingerprint | VARCHAR(64) | SHA256 hash of preferences |
| contract_finder_enabled | BOOLEAN | Toggle on/off (default: true) |
| created_at | DATETIME | |
| updated_at | DATETIME | Auto-updates |

### `sessions` (created but unused — JWT strategy doesn't need it)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # Auth.js route handler
│   │   ├── auth/signup/route.ts          # POST signup endpoint
│   │   ├── profile/route.ts             # GET/PUT profile CRUD
│   │   ├── fetch-jobs/route.ts          # (Initial Phase, admin-only)
│   │   ├── fetch-logs/route.ts          # (Initial Phase)
│   │   └── jobs/route.ts               # (Initial Phase)
│   ├── login/page.tsx                   # Login form
│   ├── signup/page.tsx                  # Signup form
│   ├── dashboard/page.tsx               # User dashboard (matches + toggle)
│   ├── admin/page.tsx                   # Admin UI (admin-only, jobs/logs/pipeline)
│   ├── profile/page.tsx                 # Edit profile form
│   ├── page.tsx                         # Redirect: admin→/admin, user→/dashboard, anon→/login
│   └── layout.tsx                       # SessionProvider + Navbar
├── components/
│   ├── Navbar.tsx                       # Nav with auth state
│   └── SessionProvider.tsx              # next-auth/react wrapper
├── lib/
│   ├── auth.ts                          # Auth.js config (JWT + credentials)
│   ├── auth-db.ts                       # User + profile DB queries
│   ├── fingerprint.ts                   # SHA256 search fingerprint
│   ├── db.ts                            # MySQL pool (Initial Phase)
│   ├── schema.sql                       # Initial Phase schema
│   └── schema-phase0.sql               # Phase 0 schema
├── middleware.ts                        # Route protection (cookie check)
└── types/
    └── job.ts                           # (Initial Phase)
```

## Core Features

1. **Authentication**: Auth.js v5, credentials provider, JWT sessions (includes `isAdmin` flag)
2. **Signup**: `POST /api/auth/signup` — email/password validation, bcrypt, auto-creates profile
3. **Login/Logout**: `signIn`/`signOut` from next-auth/react, redirects to dashboard
4. **Profile CRUD**: `GET/PUT /api/profile` — skills, rate, location, remote, contract length
5. **Search Fingerprint**: SHA256 of normalized preferences, auto-regenerated on save
6. **Contract Finder Toggle**: On/off switch on dashboard, persisted to DB
7. **Route Protection**: Middleware checks for session cookie, redirects to `/login`
8. **Admin Role**: `is_admin` flag on users, admin-only dashboard at `/admin`, admin-only API routes for fetch-jobs and cron/match

## Environment Variables

```
AUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:4000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=contract_finder
MYSQL_USER=root
MYSQL_PASSWORD=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
FETCH_SECRET=dev-secret
```

## Success Criteria

- [x] User can signup with email + password
- [x] User can login/logout
- [x] Profile CRUD works (all fields)
- [x] Search fingerprint auto-generates on profile save
- [x] Contract Finder toggle saves to DB
- [x] Protected routes redirect to /login
- [x] API routes return 401 for unauthenticated requests
- [x] Build succeeds with zero TypeScript errors
- [x] Existing admin APIs still work

## Known Limitations

- Middleware deprecation warning in Next.js 16 (renamed to "proxy", still functional)
- `sessions` table created but unused (JWT strategy doesn't use DB sessions)
- No password reset or email verification (deferred)
- No social login (deferred)
- Turbopack root warning due to extra `package-lock.json` in home dir
