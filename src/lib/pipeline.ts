import { fetchAdzunaJobs } from '@/lib/adzuna';
import { fetchLinkedInJobs } from '@/lib/linkedin';
import { normalizeAdzunaJobs, normalizeLinkedInJobs } from '@/lib/normalize';
import { execute, query, closePool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// ── Constants ──

/** Maximum number of search queries per fetch cycle to stay within API limits */
const MAX_QUERIES = 15;

// ── Job ingestion pipeline ──

/**
 * Get the top search queries by looking at the most popular skills
 * across all enabled users. Deduplicates and caps at MAX_QUERIES.
 * Returns queries like "react developer", "python developer", etc.
 */
async function getTopSearchQueries(): Promise<string[]> {
  try {
    // Get all skills from enabled users
    const rows = await query<RowDataPacket[]>(
      `SELECT skills FROM profiles 
       WHERE contract_finder_enabled = TRUE 
         AND skills IS NOT NULL AND skills != ''`
    );

    if (rows.length === 0) return [];

    // Count skill frequency across all users
    const skillCount = new Map<string, number>();
    for (const row of rows) {
      const skills = (row.skills as string)
        .split(',')
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);

      for (const skill of skills) {
        skillCount.set(skill, (skillCount.get(skill) || 0) + 1);
      }
    }

    // Sort by frequency (most common first) and cap at MAX_QUERIES
    const topSkills = [...skillCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_QUERIES)
      .map(([skill]) => `${skill} developer`);

    console.log(`[pipeline] Top ${topSkills.length} search queries from ${rows.length} users:`, topSkills);
    return topSkills;
  } catch (err) {
    console.error('[pipeline] Failed to get user skills, using defaults:', err);
    return [];
  }
}

/**
 * Run a single fetch cycle:
 * 1. Create a fetch_log entry (status: running)
 * 2. Build search queries from active users' top skills
 * 3. Fetch jobs from Adzuna and LinkedIn in parallel
 * 4. Normalize them into the same schema
 * 5. Insert into DB, skipping duplicates via INSERT IGNORE
 * 6. Update the fetch_log entry with results
 *
 * Returns a summary object.
 */
export async function runFetchCycle(): Promise<{
  logId: number;
  jobsFetched: number;
  jobsNew: number;
  jobsDuplicate: number;
  status: string;
  sources: { adzuna: number; linkedin: number };
  error?: string;
}> {
  const startedAt = new Date();

  // 1. Create fetch log
  const logResult = await execute(
    'INSERT INTO fetch_logs (started_at, source, status) VALUES (?, ?, ?)',
    [startedAt, 'adzuna+linkedin', 'running']
  );
  const logId = logResult.insertId;

  try {
    // 2. Build dynamic search queries from user skills
    const searchQueries = await getTopSearchQueries();
    console.log(`[pipeline] Starting fetch cycle (log #${logId}) with ${searchQueries.length || 'default'} queries`);

    // 3. Fetch from both sources in parallel
    const [adzunaRaw, linkedinRaw] = await Promise.allSettled([
      fetchAdzunaJobs(searchQueries.length > 0 ? searchQueries : undefined),
      fetchLinkedInJobs(searchQueries.length > 0 ? searchQueries : undefined),
    ]);

    // Handle partial failures gracefully
    const adzunaJobs = adzunaRaw.status === 'fulfilled' ? adzunaRaw.value : [];
    const linkedinJobs = linkedinRaw.status === 'fulfilled' ? linkedinRaw.value : [];

    if (adzunaRaw.status === 'rejected') {
      console.error('[pipeline] Adzuna fetch failed:', adzunaRaw.reason);
    }
    if (linkedinRaw.status === 'rejected') {
      console.error('[pipeline] LinkedIn fetch failed:', linkedinRaw.reason);
    }

    // 4. Normalize both into the same schema
    const normalizedAdzuna = normalizeAdzunaJobs(adzunaJobs);
    const normalizedLinkedIn = normalizeLinkedInJobs(linkedinJobs);
    const allNormalized = [...normalizedAdzuna, ...normalizedLinkedIn];

    console.log(
      `[pipeline] Normalized ${normalizedAdzuna.length} Adzuna + ${normalizedLinkedIn.length} LinkedIn = ${allNormalized.length} total`
    );

    // 4. Insert with deduplication (INSERT IGNORE skips duplicate unique key)
    let jobsNew = 0;
    let jobsDuplicate = 0;

    for (const job of allNormalized) {
      const result = await execute(
        `INSERT IGNORE INTO jobs 
         (external_id, source, title, company, location, description, 
          salary_min, salary_max, salary_currency, contract_type, 
          redirect_url, posted_at, raw_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          job.external_id,
          job.source,
          job.title,
          job.company,
          job.location,
          job.description,
          job.salary_min,
          job.salary_max,
          job.salary_currency,
          job.contract_type,
          job.redirect_url,
          job.posted_at,
          JSON.stringify(job.raw_json),
        ]
      );

      if (result.affectedRows > 0) {
        jobsNew++;
      } else {
        jobsDuplicate++;
      }
    }

    console.log(`[pipeline] Inserted ${jobsNew} new, skipped ${jobsDuplicate} duplicates`);

    // 5. Update fetch log
    await execute(
      `UPDATE fetch_logs 
       SET finished_at = ?, jobs_fetched = ?, jobs_new = ?, jobs_duplicate = ?, status = ?
       WHERE id = ?`,
      [new Date(), allNormalized.length, jobsNew, jobsDuplicate, 'completed', logId]
    );

    return {
      logId,
      jobsFetched: allNormalized.length,
      jobsNew,
      jobsDuplicate,
      status: 'completed',
      sources: {
        adzuna: normalizedAdzuna.length,
        linkedin: normalizedLinkedIn.length,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] Fetch cycle failed:`, err);

    // Update fetch log with error
    await execute(
      `UPDATE fetch_logs 
       SET finished_at = ?, status = ?, error_message = ?
       WHERE id = ?`,
      [new Date(), 'failed', errorMsg, logId]
    ).catch((e) => console.error('[pipeline] Failed to update log:', e));

    return {
      logId,
      jobsFetched: 0,
      jobsNew: 0,
      jobsDuplicate: 0,
      status: 'failed',
      sources: { adzuna: 0, linkedin: 0 },
      error: errorMsg,
    };
  }
}

/**
 * Run the fetch cycle as a standalone script (for cron/local testing).
 * Call this from a script entry point.
 */
export async function runAndExit(): Promise<void> {
  try {
    const result = await runFetchCycle();
    console.log('[pipeline] Result:', JSON.stringify(result, null, 2));
    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (err) {
    console.error('[pipeline] Fatal error:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}
