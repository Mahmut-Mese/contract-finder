// ── Job types for Contract Finder ──

/** A job record as stored in our database */
export interface Job {
  id: number;
  external_id: string;
  source: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  contract_type: string | null;
  redirect_url: string | null;
  posted_at: Date | null;
  fetched_at: Date;
  raw_json: unknown;
}

/** A fetch log record tracking each hourly run */
export interface FetchLog {
  id: number;
  started_at: Date;
  finished_at: Date | null;
  source: string;
  jobs_fetched: number;
  jobs_new: number;
  jobs_duplicate: number;
  status: 'running' | 'completed' | 'failed';
  error_message: string | null;
}

// ── Adzuna API response types ──

export interface AdzunaCompany {
  display_name: string;
}

export interface AdzunaLocation {
  display_name: string;
  area: string[];
}

export interface AdzunaCategory {
  label: string;
  tag: string;
}

/** A single job from the Adzuna API response */
export interface AdzunaJob {
  id: string | number;
  title: string;
  company: AdzunaCompany;
  location: AdzunaLocation;
  description: string;
  salary_min: number;
  salary_max: number;
  redirect_url: string;
  created: string;
  contract_type: string;
  category: AdzunaCategory;
}

/** The full Adzuna search API response */
export interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
  mean: number;
  __class__: string;
}
