# Phase 0 - Implementation Plan

## 1. Hosting Setup (Hostinger)
- Use 1 Node.js slot on existing Hostinger Cloud
- Deploy Next.js 15 fullstack app (App Router + Route Handlers)
- Auto-deploy from GitHub

## 2. Database Schema (Supabase)

### Table: profiles
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | FK to auth.users |
| email | text | User email |
| skills | text[] | Array of tech skills |
| min_rate | integer | Minimum daily rate |
| max_rate | integer | Maximum daily rate |
| location | text | City/country preference |
| remote_preference | text | remote/hybrid/onsite |
| contract_length | text | preferred contract length |
| search_fingerprint | text | hash for grouping |
| contract_finder_enabled | boolean | toggle on/off |
| created_at | timestamp | |
| updated_at | timestamp | |

### Table: jobs_cache (prepared, empty)
### Table: notifications (prepared, empty)

## 3. Project Structure
```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── profile/route.ts
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── profile/page.tsx
│   └── layout.tsx
├── components/
│   ├── AuthForm.tsx
│   ├── ProfileForm.tsx
│   ├── Dashboard.tsx
│   └── Navbar.tsx
├── lib/
│   ├── supabase/client.ts
│   └── supabase/server.ts
├── types/
│   └── index.ts
└── .env.local
```

## 4. Core Features
1. **Authentication**: Supabase Auth (email)
2. **Profile Form**: skills, rate, location, remote, contract length
3. **Fingerprint**: SHA256 hash of preferences
4. **Dashboard**: profile summary, toggle status

## 5. Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
```

## 6. Success Criteria
- [ ] User can signup/login
- [ ] Profile CRUD works
- [ ] Fingerprint auto-generates
- [ ] Toggle saves to DB
- [ ] Protected routes
