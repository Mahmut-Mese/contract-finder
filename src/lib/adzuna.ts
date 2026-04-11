import type { AdzunaJob, AdzunaResponse } from '@/types/job';

// ── Adzuna API client ──

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';
const COUNTRY = 'gb';
const MAX_PAGES = 3;
const RESULTS_PER_PAGE = 50;

/** Hardcoded search profile for the Initial Phase spike */
const SEARCH_PARAMS = {
  what: 'software developer contract',
  what_or: 'react node typescript fullstack backend frontend devops',
  category: 'it-jobs',
  sort_by: 'date',
  max_days_old: '1',
  results_per_page: String(RESULTS_PER_PAGE),
} as const;

/**
 * Fetch a single page of Adzuna job results.
 * Pages are 1-indexed in the Adzuna API.
 */
async function fetchPage(page: number): Promise<AdzunaResponse> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Missing ADZUNA_APP_ID or ADZUNA_APP_KEY env vars');
  }

  const url = new URL(`${ADZUNA_BASE}/${COUNTRY}/search/${page}`);
  url.searchParams.set('app_id', appId);
  url.searchParams.set('app_key', appKey);

  for (const [key, value] of Object.entries(SEARCH_PARAMS)) {
    url.searchParams.set(key, value);
  }

  console.log(`[adzuna] Fetching page ${page}: ${url.toString().replace(appKey, '***')}`);

  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adzuna API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<AdzunaResponse>;
}

/**
 * Fetch UK developer contract jobs from Adzuna.
 * Fetches up to MAX_PAGES pages (150 jobs max) to stay within free tier limits.
 * Returns the raw AdzunaJob array.
 */
export async function fetchAdzunaJobs(): Promise<AdzunaJob[]> {
  const allJobs: AdzunaJob[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const data = await fetchPage(page);
      const jobs = data.results || [];
      allJobs.push(...jobs);

      console.log(`[adzuna] Page ${page}: ${jobs.length} jobs (total so far: ${allJobs.length})`);

      // Stop if we've received fewer results than a full page (no more pages)
      if (jobs.length < RESULTS_PER_PAGE) {
        console.log('[adzuna] No more pages available');
        break;
      }
    } catch (err) {
      console.error(`[adzuna] Error fetching page ${page}:`, err);
      // If the first page fails, throw. Otherwise return what we have.
      if (page === 1) throw err;
      break;
    }
  }

  console.log(`[adzuna] Total jobs fetched: ${allJobs.length}`);
  return allJobs;
}
