import { query, execute } from '@/lib/db';
import { getProfileByUserId, type DbProfile } from '@/lib/auth-db';
import { getUnmatchedJobs, matchJobsForUser, type MatchResult } from '@/lib/matcher';
import type { RowDataPacket } from 'mysql2/promise';

// ── Types ──

interface EnabledUser {
  user_id: string;
  email: string;
}

export interface MatchPipelineResult {
  logId: number;
  usersProcessed: number;
  matchesCreated: number;
  errors: string[];
}

// ── Pipeline ──

/**
 * Run the full match pipeline for all enabled users.
 *
 * 1. Get all users with contract_finder_enabled = true
 * 2. For each user, get their profile and unmatched jobs
 * 3. Score all jobs, store matches with score > 0
 * 4. Create an in-app notification summarizing new matches
 * 5. Return summary with match log ID
 */
export async function runMatchPipeline(): Promise<MatchPipelineResult> {
  const startedAt = new Date();
  const errors: string[] = [];

  // Create a match log entry
  const logResult = await execute(
    'INSERT INTO match_logs (started_at, status) VALUES (?, ?)',
    [startedAt, 'running']
  );
  const logId = logResult.insertId;

  let usersProcessed = 0;
  let totalMatchesCreated = 0;

  try {
    // 1. Get all enabled users
    const enabledUsers = await query<(EnabledUser & RowDataPacket)[]>(
      `SELECT p.user_id, u.email
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.contract_finder_enabled = TRUE
         AND p.skills IS NOT NULL
         AND p.skills != ''`
    );

    // 2. Process each user
    for (const user of enabledUsers) {
      try {
        const matchCount = await matchForUser(user.user_id, logId);
        totalMatchesCreated += matchCount;
        usersProcessed++;
      } catch (err) {
        const msg = `Error matching user ${user.user_id}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    // 3. Update the match log
    await execute(
      `UPDATE match_logs
       SET finished_at = NOW(), users_processed = ?, matches_created = ?, status = ?
       WHERE id = ?`,
      [usersProcessed, totalMatchesCreated, errors.length > 0 ? 'completed_with_errors' : 'completed', logId]
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await execute(
      `UPDATE match_logs
       SET finished_at = NOW(), users_processed = ?, matches_created = ?, status = ?, error_message = ?
       WHERE id = ?`,
      [usersProcessed, totalMatchesCreated, 'failed', msg, logId]
    );
    errors.push(msg);
  }

  return { logId, usersProcessed, matchesCreated: totalMatchesCreated, errors };
}

/**
 * Match all unmatched jobs for a single user.
 * Stores results in matched_jobs and creates an in-app notification.
 * Returns the number of new matches created.
 */
async function matchForUser(userId: string, logId: number): Promise<number> {
  // Get user profile
  const profile = await getProfileByUserId(userId);
  if (!profile) return 0;

  // Get unmatched jobs
  const jobs = await getUnmatchedJobs(userId);
  if (jobs.length === 0) return 0;

  // Score all jobs
  const matches = matchJobsForUser(jobs, profile);
  if (matches.length === 0) return 0;

  // Store matches in database
  const inserted = await storeMatches(userId, matches, logId);

  // Create in-app notification only if new matches were actually inserted
  if (inserted > 0) {
    await createMatchNotification(userId, inserted, matches[0].score);
  }

  return inserted;
}

/**
 * Bulk-insert match results into matched_jobs table.
 * Uses INSERT IGNORE to skip any that already exist (shouldn't happen due to getUnmatchedJobs filter).
 */
async function storeMatches(userId: string, matches: MatchResult[], logId: number): Promise<number> {
  // Build bulk insert — batch in chunks of 50 to avoid huge queries
  const CHUNK_SIZE = 50;
  let totalInserted = 0;

  for (let i = 0; i < matches.length; i += CHUNK_SIZE) {
    const chunk = matches.slice(i, i + CHUNK_SIZE);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const values = chunk.flatMap((m) => [
      userId,
      m.jobId,
      m.score,
      m.matchedSkills.join(', '),
      logId,
    ]);

    const result = await execute(
      `INSERT IGNORE INTO matched_jobs (user_id, job_id, score, matched_skills, match_log_id)
       VALUES ${placeholders}`,
      values
    );
    totalInserted += result.affectedRows;
  }

  return totalInserted;
}

/**
 * Create an in-app notification for new matches.
 */
async function createMatchNotification(
  userId: string,
  matchCount: number,
  topScore: number
): Promise<void> {
  const title = `${matchCount} new contract match${matchCount === 1 ? '' : 'es'} found`;
  const body = matchCount === 1
    ? `We found a contract matching your profile (score: ${topScore}/100).`
    : `We found ${matchCount} contracts matching your profile. Best match score: ${topScore}/100.`;

  await execute(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES (?, 'new_matches', ?, ?, '/dashboard')`,
    [userId, title, body]
  );
}

/**
 * Get users that have unnotified matches (for email sending).
 * Returns users and their match counts.
 */
export async function getUsersWithUnnotifiedMatches(): Promise<
  Array<{ userId: string; email: string; matchCount: number; topScore: number }>
> {
  const rows = await query<RowDataPacket[]>(
    `SELECT mj.user_id AS userId, u.email,
            COUNT(*) AS matchCount,
            MAX(mj.score) AS topScore
     FROM matched_jobs mj
     JOIN users u ON u.id = mj.user_id
     WHERE mj.notified = FALSE
     GROUP BY mj.user_id, u.email`
  );

  return rows.map((r) => ({
    userId: r.userId as string,
    email: r.email as string,
    matchCount: r.matchCount as number,
    topScore: r.topScore as number,
  }));
}

/**
 * Mark all matches for a user as notified (email sent).
 */
export async function markMatchesNotified(userId: string): Promise<void> {
  await execute(
    'UPDATE matched_jobs SET notified = TRUE WHERE user_id = ? AND notified = FALSE',
    [userId]
  );
}
