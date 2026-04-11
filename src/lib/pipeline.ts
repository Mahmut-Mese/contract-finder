import { fetchAdzunaJobs } from '@/lib/adzuna';
import { normalizeAdzunaJobs } from '@/lib/normalize';
import { execute, query, closePool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// ── Job ingestion pipeline ──

/**
 * Run a single fetch cycle:
 * 1. Create a fetch_log entry (status: running)
 * 2. Fetch jobs from Adzuna
 * 3. Normalize them
 * 4. Insert into DB, skipping duplicates via INSERT IGNORE
 * 5. Update the fetch_log entry with results
 *
 * Returns a summary object.
 */
export async function runFetchCycle(): Promise<{
  logId: number;
  jobsFetched: number;
  jobsNew: number;
  jobsDuplicate: number;
  status: string;
  error?: string;
}> {
  const startedAt = new Date();

  // 1. Create fetch log
  const logResult = await execute(
    'INSERT INTO fetch_logs (started_at, source, status) VALUES (?, ?, ?)',
    [startedAt, 'adzuna', 'running']
  );
  const logId = logResult.insertId;

  try {
    // 2. Fetch from Adzuna
    console.log(`[pipeline] Starting fetch cycle (log #${logId})`);
    const rawJobs = await fetchAdzunaJobs();

    // 3. Normalize
    const normalizedJobs = normalizeAdzunaJobs(rawJobs);
    console.log(`[pipeline] Normalized ${normalizedJobs.length} jobs`);

    // 4. Insert with deduplication (INSERT IGNORE skips duplicate unique key)
    let jobsNew = 0;
    let jobsDuplicate = 0;

    for (const job of normalizedJobs) {
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
      [new Date(), normalizedJobs.length, jobsNew, jobsDuplicate, 'completed', logId]
    );

    return {
      logId,
      jobsFetched: normalizedJobs.length,
      jobsNew,
      jobsDuplicate,
      status: 'completed',
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
