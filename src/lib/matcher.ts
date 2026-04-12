import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { DbProfile } from '@/lib/auth-db';

// ── Types ──

export interface MatchableJob {
  id: number;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  salary_min: number | null;
  salary_max: number | null;
  contract_type: string | null;
  redirect_url: string | null;
  posted_at: Date | null;
}

export interface MatchResult {
  jobId: number;
  score: number;           // 0-100
  matchedSkills: string[]; // which skills matched
}

// ── Scoring weights ──
// Simple keyword matching for now.
// LATER: NLP, TF-IDF, weighted scoring, skill synonyms

const WEIGHTS = {
  SKILL_IN_TITLE: 15,       // per skill found in title
  SKILL_IN_DESCRIPTION: 8,  // per skill found in description
  RATE_IN_RANGE: 20,        // salary overlaps with user's rate range
  LOCATION_MATCH: 15,       // job location contains user's location
  REMOTE_MATCH: 10,         // job mentions remote and user wants remote
};

const MAX_SCORE = 100;

// ── Matching logic ──

/**
 * Score a single job against a user profile.
 * Returns score (0-100) and list of matched skills.
 */
export function scoreJob(job: MatchableJob, profile: DbProfile): MatchResult {
  let score = 0;
  const matchedSkills: string[] = [];

  // Parse user skills
  const userSkills = (profile.skills || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (userSkills.length === 0) {
    // No skills set — can't match meaningfully
    return { jobId: job.id, score: 0, matchedSkills: [] };
  }

  const titleLower = (job.title || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const locationLower = (job.location || '').toLowerCase();

  // ── Skill matching ──
  for (const skill of userSkills) {
    const inTitle = titleLower.includes(skill);
    const inDesc = descLower.includes(skill);

    if (inTitle) {
      score += WEIGHTS.SKILL_IN_TITLE;
      matchedSkills.push(skill);
    } else if (inDesc) {
      score += WEIGHTS.SKILL_IN_DESCRIPTION;
      matchedSkills.push(skill);
    }
  }

  // ── Rate range overlap ──
  if (profile.min_rate || profile.max_rate) {
    const userMin = profile.min_rate || 0;
    const userMax = profile.max_rate || Infinity;

    // Adzuna salaries are annual — convert user daily rate to annual for comparison
    // Assume ~220 working days/year
    const userMinAnnual = userMin * 220;
    const userMaxAnnual = userMax * 220;

    const jobMin = job.salary_min || 0;
    const jobMax = job.salary_max || Infinity;

    // Check if ranges overlap
    if (jobMin <= userMaxAnnual && jobMax >= userMinAnnual) {
      score += WEIGHTS.RATE_IN_RANGE;
    }
  }

  // ── Location match ──
  if (profile.location) {
    const userLocation = profile.location.toLowerCase().trim();
    // Check if job location contains user's preferred location
    if (locationLower.includes(userLocation)) {
      score += WEIGHTS.LOCATION_MATCH;
    }
  }

  // ── Remote preference match ──
  if (profile.remote_preference === 'remote') {
    const remoteSignals = ['remote', 'work from home', 'wfh', 'fully remote'];
    const isRemote = remoteSignals.some(
      (signal) => titleLower.includes(signal) || descLower.includes(signal)
    );
    if (isRemote) {
      score += WEIGHTS.REMOTE_MATCH;
    }
  }

  // Cap at MAX_SCORE
  score = Math.min(score, MAX_SCORE);

  return { jobId: job.id, score, matchedSkills: [...new Set(matchedSkills)] };
}

/**
 * Get all jobs that haven't been matched to a specific user yet.
 * Only considers jobs fetched in the last 7 days to avoid stale listings.
 */
export async function getUnmatchedJobs(userId: string): Promise<MatchableJob[]> {
  const rows = await query<(MatchableJob & RowDataPacket)[]>(
    `SELECT j.id, j.title, j.company, j.location, j.description,
            j.salary_min, j.salary_max, j.contract_type, j.redirect_url, j.posted_at
     FROM jobs j
     WHERE j.fetched_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND j.id NOT IN (
         SELECT mj.job_id FROM matched_jobs mj WHERE mj.user_id = ?
       )
     ORDER BY j.fetched_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Match all unmatched jobs against a user profile.
 * Returns only jobs with score > 0 (at least one signal matched).
 */
export function matchJobsForUser(jobs: MatchableJob[], profile: DbProfile): MatchResult[] {
  const results: MatchResult[] = [];

  for (const job of jobs) {
    const result = scoreJob(job, profile);
    if (result.score > 0) {
      results.push(result);
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}
