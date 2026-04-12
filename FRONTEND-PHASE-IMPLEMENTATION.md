# Frontend Phase — Implementation Plan

> **Goal**: Transform the dashboard from a flat paginated list into a personal-use-first
> contract management interface with filtering, grouping, status actions, and expandable details.

## Features

1. **Expandable job cards** — click to reveal full job description
2. **"Applied" checkbox** — mark a job as applied (simple toggle, moves to Applied tab)
3. **"Remove" action** — soft-delete a job, exclude from future pipeline runs, visible in Deleted tab
4. **Group by pipeline run** — matches displayed under run-time headers (e.g. "13/04/2026 15:30")
5. **Filter sidebar** — exclude companies, title keywords, locations; positive filters (min score, remote only)
6. **Saved searches** — persist filter config per user; notifications only fire for matching filters

---

## Slice 1 — Schema Migration

**Files**: `src/lib/schema-frontend.sql`, `src/lib/match-pipeline.ts`, `src/lib/matcher.ts`, `src/app/api/matches/route.ts`

### Database changes

```sql
-- 1. Link matches to their pipeline run
ALTER TABLE matched_jobs ADD COLUMN match_log_id INT DEFAULT NULL AFTER notified;
ALTER TABLE matched_jobs ADD INDEX idx_match_log_id (match_log_id);
ALTER TABLE matched_jobs ADD CONSTRAINT fk_matched_jobs_log
  FOREIGN KEY (match_log_id) REFERENCES match_logs(id) ON DELETE SET NULL;

-- Backfill: all existing 196 matches came from log id 11
UPDATE matched_jobs SET match_log_id = 11 WHERE match_log_id IS NULL;

-- 2. Expand valid statuses to include 'applied' and 'deleted'
-- Status is VARCHAR(20), both fit. No ALTER needed — just update app code.

-- 3. Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL,
  name            VARCHAR(255) NOT NULL DEFAULT 'Default',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Active search receives notifications',
  filters         JSON         NOT NULL COMMENT 'Filter configuration object',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Filter JSON shape (stored in `saved_searches.filters`)

```json
{
  "excludeCompanies": ["Accenture", "TCS"],
  "excludeTitleKeywords": ["junior", "graduate"],
  "excludeLocationKeywords": [],
  "minScore": 0,
  "remoteOnly": false,
  "skills": []
}
```

### Pipeline changes

- `storeMatches()` in `match-pipeline.ts`: accept `logId` parameter, include `match_log_id` in INSERT
- `matchForUser()`: pass `logId` down
- `getUnmatchedJobs()` in `matcher.ts`: also exclude jobs where user has status = 'deleted'

### API changes

- `GET /api/matches`: join `match_logs` to return `run_started_at` per match for grouping
- `PATCH /api/matches`: add 'applied' and 'deleted' to valid statuses

---

## Slice 2 — Expandable Cards + Applied Checkbox + Remove Action

**Files**: `src/app/dashboard/page.tsx`

### Expandable cards
- Add `expanded` state (Set of match_ids) in DashboardPage
- Click card header or chevron → toggle expand
- Expanded view shows: full `description` (HTML-safe), `contract_type`, `posted_at` formatted, salary details
- Collapse on second click

### Applied checkbox
- Checkbox in card header row, next to score badge
- Checked → `PATCH /api/matches { matchId, status: 'applied' }`
- Unchecked → `PATCH /api/matches { matchId, status: 'viewed' }` (revert)
- Applied jobs appear in "Applied" filter tab

### Remove action
- Replace "Dismiss" with "Remove" (or keep dismiss for hide, add delete for permanent exclude)
- Remove → `PATCH /api/matches { matchId, status: 'deleted' }`
- Removed from current view immediately
- New filter tab: "Deleted" shows removed jobs (for undo)

### Tab updates
- Tabs: `All` | `New` | `Saved` | `Applied` | `Deleted`
- "All" excludes dismissed AND deleted (default view)
- Each tab sets status filter on the GET request

---

## Slice 3 — Group by Pipeline Run

**Files**: `src/app/api/matches/route.ts`, `src/app/dashboard/page.tsx`

### API change
- `GET /api/matches` now returns `run_started_at` (from `match_logs.started_at` via `match_log_id`)
- Add to SELECT: `ml.started_at AS run_started_at`
- Add JOIN: `LEFT JOIN match_logs ml ON ml.id = mj.match_log_id`
- Change ORDER BY: `ORDER BY mj.match_log_id DESC, mj.score DESC`

### Frontend grouping
- After fetching matches, group by `run_started_at` timestamp
- Render group headers: formatted date/time (e.g. "13 Apr 2026, 15:30")
- Under each header, render match cards sorted by score
- Groups ordered newest-first
- Pagination works across groups (server returns flat list with run info, client groups)

---

## Slice 4 — Filter Sidebar

**Files**: `src/app/dashboard/page.tsx`, `src/app/api/matches/route.ts`

### UI
- Left sidebar (or collapsible panel on mobile) with filter controls:
  - **Exclude companies**: text input + tag list (type company name, press enter, appears as removable tag)
  - **Exclude title keywords**: same tag-input pattern
  - **Min score**: number slider or input (0-100)
  - **Remote only**: checkbox
- "Apply Filters" button sends filter params to API
- "Clear Filters" resets all

### API filtering
- `GET /api/matches` accepts new query params:
  - `exclude_companies` — comma-separated list
  - `exclude_title_keywords` — comma-separated list
  - `min_score` — number
  - `remote_only` — boolean
- SQL WHERE clauses dynamically built:
  - `j.company NOT IN (...)` for excluded companies
  - `j.title NOT LIKE '%keyword%'` for each excluded keyword (AND'ed)
  - `mj.score >= ?` for min_score
  - Remote filter: `(j.title LIKE '%remote%' OR j.description LIKE '%remote%')`

---

## Slice 5 — Saved Searches

**Files**: `src/app/api/saved-searches/route.ts` (new), `src/app/dashboard/page.tsx`, `src/lib/match-pipeline.ts`

### New API: `/api/saved-searches`

- `GET` — list user's saved searches
- `POST` — create a new saved search `{ name, filters }`
- `PUT` — update a saved search `{ id, name?, filters?, is_active? }`
- `DELETE` — delete a saved search `{ id }`

### Dashboard integration
- Dropdown or select at top: "Search: [Default ▾]"
- Selecting a saved search loads its filters into the sidebar and re-fetches matches
- "Save Current Filters" button: creates/updates the active saved search
- Active search is highlighted

### Notification integration
- `matchForUser()` in `match-pipeline.ts`:
  - After scoring, if user has active saved searches, filter results through saved search filters
  - Only notify about matches that pass at least one active saved search
  - Matches are still stored regardless (the filter only affects notifications)

---

## Implementation Order

| Step | Slice | Depends on |
|------|-------|-----------|
| 1 | Slice 1: Schema migration | — |
| 2 | Slice 2: Expandable cards + actions | Slice 1 (needs 'applied'/'deleted' statuses) |
| 3 | Slice 3: Group by run | Slice 1 (needs match_log_id) |
| 4 | Slice 4: Filter sidebar | Slice 1 |
| 5 | Slice 5: Saved searches | Slice 4 (filters must exist first) |

Each slice gets E2E tested before moving to the next.

---

## E2E Test Additions

After all slices, add tests for:
- Dashboard loads with new tab structure (All/New/Saved/Applied/Deleted)
- Filter sidebar renders without errors
- Authenticated dashboard has no console errors with new features
- API: `GET /api/saved-searches` returns 401 unauthenticated
- API: `POST /api/saved-searches` returns 401 unauthenticated

---

## Out of Scope

- AI-powered filter suggestions
- Shared/public saved searches
- Export matched jobs to CSV
- Anything from Phase 3 (AI CV Tailoring)
