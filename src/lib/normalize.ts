import type { Job, AdzunaJob } from '@/types/job';
import type { LinkedInJob } from '@/lib/linkedin';

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

/**
 * Normalize a LinkedIn job into our standard Job schema.
 * LinkedIn doesn't provide salary info, so those fields are null.
 */
export function normalizeLinkedInJob(raw: LinkedInJob): NormalizedJob {
  return {
    external_id: `li-${raw.id}`,
    source: 'linkedin',
    title: raw.title || 'Untitled',
    company: raw.company || null,
    location: raw.location || null,
    description: raw.description || null,
    salary_min: null,
    salary_max: null,
    salary_currency: 'GBP',
    contract_type: 'contract',  // We only fetch contract jobs from LinkedIn
    redirect_url: raw.url || null,
    posted_at: raw.postedAt ? new Date(raw.postedAt) : null,
    raw_json: raw,
  };
}

/**
 * Normalize an array of LinkedIn jobs.
 */
export function normalizeLinkedInJobs(rawJobs: LinkedInJob[]): NormalizedJob[] {
  return rawJobs.map(normalizeLinkedInJob);
}
