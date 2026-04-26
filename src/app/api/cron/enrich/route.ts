import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { fetchJobDescription } from '@/lib/linkedin';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * POST /api/cron/enrich
 *
 * Slowly fetches missing descriptions for LinkedIn jobs.
 * Processes a batch per call (default 15) with delays between each.
 * Designed to be called by cron-job.org ~10 min after the main fetch.
 */
export async function POST(req: NextRequest) {
  // Auth check
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const BATCH_SIZE = 15;

  try {
    // Find LinkedIn jobs with no description
    const jobs = await query<RowDataPacket[]>(
      `SELECT id, external_id 
       FROM jobs 
       WHERE source = 'linkedin' 
         AND (description IS NULL OR description = '')
       ORDER BY fetched_at DESC
       LIMIT ?`,
      [BATCH_SIZE]
    );

    if (jobs.length === 0) {
      return NextResponse.json({
        enriched: 0,
        remaining: 0,
        message: 'All LinkedIn jobs already have descriptions',
      });
    }

    let enriched = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        // external_id is stored as "li-{id}", extract the numeric part
        const linkedinId = (job.external_id as string).replace('li-', '');
        const description = await fetchJobDescription(linkedinId);

        if (description) {
          await execute(
            'UPDATE jobs SET description = ? WHERE id = ?',
            [description, job.id]
          );
          enriched++;
        } else {
          // Mark as attempted so we don't retry forever — set empty description
          await execute(
            "UPDATE jobs SET description = '[no description available]' WHERE id = ?",
            [job.id]
          );
          failed++;
        }

        // 1 second delay between requests to be respectful
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`[enrich] Failed for job ${job.id}:`, err);
        failed++;
      }
    }

    // Check how many are still remaining
    const remaining = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM jobs 
       WHERE source = 'linkedin' 
         AND (description IS NULL OR description = '')`
    );

    return NextResponse.json({
      enriched,
      failed,
      remaining: remaining[0]?.cnt ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
