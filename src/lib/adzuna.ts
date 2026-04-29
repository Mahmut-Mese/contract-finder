import type { AdzunaJob, AdzunaResponse } from '@/types/job';

// ── Adzuna API client ──

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';
const COUNTRY = 'gb';
const RESULTS_PER_PAGE = 50;

/**
 * Fallback search queries used when no user skills are available yet.
 */
const DEFAULT_SEARCH_QUERIES = [
  'react developer',
  'node developer',
  'fullstack developer',
  'devops engineer',
  'software engineer',
  'python developer',
  'cloud engineer',
  '.net developer',
];

/** Words in title/description that indicate a genuine contractor/freelance role */
const CONTRACT_SIGNALS = [
  'contract',
  'contractor',
  'freelance',
  'outside ir35',
  'ir35',
  'day rate',
  'per day',
  '/day',
  '6 month',
  '12 month',
  '3 month',
];

/** Words that indicate roles to exclude */
const EXCLUDE_SIGNALS = [
  'fixed term',
  'fixed-term',
  'ftc',
  'inside ir35',
];

/**
 * Check if a job looks like a genuine contractor/freelance role.
 * Excludes fixed-term contracts which are essentially temp employment.
 */
function looksLikeContract(job: AdzunaJob): boolean {
  const text = `${job.title} ${job.description}`.toLowerCase();

  // Exclude fixed-term employment roles
  if (EXCLUDE_SIGNALS.some((signal) => text.includes(signal))) return false;

  // Explicit contract_type from Adzuna
  if (job.contract_type === 'contract') return true;

  // Check title and description for contract signals
  return CONTRACT_SIGNALS.some((signal) => text.includes(signal));
}

/**
 * Fetch a single page of Adzuna job results.
 * Pages are 1-indexed in the Adzuna API.
 */
async function fetchPage(searchQuery: string, page: number): Promise<AdzunaResponse> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Missing ADZUNA_APP_ID or ADZUNA_APP_KEY env vars');
  }

  const url = new URL(`${ADZUNA_BASE}/${COUNTRY}/search/${page}`);
  url.searchParams.set('app_id', appId);
  url.searchParams.set('app_key', appKey);
  url.searchParams.set('results_per_page', String(RESULTS_PER_PAGE));
  url.searchParams.set('what', searchQuery);
  url.searchParams.set('content-type', 'application/json');
  url.searchParams.set('sort_by', 'date');
  url.searchParams.set('max_days_old', '3');

  console.log(`[adzuna] Fetching "${searchQuery}" page ${page}`);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adzuna API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<AdzunaResponse>;
}

/**
 * Fetch UK developer contract jobs from Adzuna.
 *
 * Strategy:
 *  1. Run each search query (page 1 only, capped at 15 queries max)
 *  2. Deduplicate in memory by job ID
 *  3. Filter to jobs that look like genuine contracts
 *  4. Return the filtered list for DB insertion
 *
 * @param searchQueries - Dynamic queries from user skills. Falls back to defaults.
 */
export async function fetchAdzunaJobs(searchQueries?: string[]): Promise<AdzunaJob[]> {
  const queries = searchQueries && searchQueries.length > 0
    ? searchQueries
    : DEFAULT_SEARCH_QUERIES;

  const allJobs: AdzunaJob[] = [];
  const seenIds = new Set<string>();
  let totalRaw = 0;

  for (const searchQuery of queries) {
    try {
      const data = await fetchPage(searchQuery, 1);
      const jobs = data.results || [];
      totalRaw += jobs.length;

      // In-memory dedup
      let added = 0;
      for (const job of jobs) {
        const id = String(job.id);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          allJobs.push(job);
          added++;
        }
      }

      console.log(
        `[adzuna] "${searchQuery}": ${jobs.length} results, ${added} unique new (total unique: ${allJobs.length})`
      );
    } catch (err) {
      console.error(`[adzuna] Error fetching "${searchQuery}":`, err);
      // Continue with other queries even if one fails
    }
  }

  // Filter for contract-looking jobs
  const contracts = allJobs.filter(looksLikeContract);

  console.log(
    `[adzuna] Done: ${totalRaw} raw → ${allJobs.length} unique → ${contracts.length} contracts`
  );
  return contracts;
}
