import type { Job, AdzunaJob } from '@/types/job';

// ── Job normalization ──

type NormalizedJob = Omit<Job, 'id' | 'fetched_at'>;

/**
 * Normalize a raw Adzuna API job object into our standard Job schema.
 * Handles missing/null fields gracefully.
 */
export function normalizeAdzunaJob(raw: AdzunaJob): NormalizedJob {
  return {
    external_id: String(raw.id),
    source: 'adzuna',
    title: raw.title || 'Untitled',
    company: raw.company?.display_name || null,
    location: raw.location?.display_name || null,
    description: raw.description || null,
    salary_min: raw.salary_min ?? null,
    salary_max: raw.salary_max ?? null,
    salary_currency: 'GBP',
    contract_type: raw.contract_type || null,
    redirect_url: raw.redirect_url || null,
    posted_at: raw.created ? new Date(raw.created) : null,
    raw_json: raw,
  };
}

/**
 * Normalize an array of Adzuna jobs.
 */
export function normalizeAdzunaJobs(rawJobs: AdzunaJob[]): NormalizedJob[] {
  return rawJobs.map(normalizeAdzunaJob);
}
