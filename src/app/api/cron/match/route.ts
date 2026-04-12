import { NextRequest, NextResponse } from 'next/server';
import { runMatchPipeline, getUsersWithUnnotifiedMatches, markMatchesNotified } from '@/lib/match-pipeline';
import { sendMatchEmail } from '@/lib/email';
import { execute } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * POST /api/cron/match
 *
 * Triggers the full match + email pipeline.
 * Can be called by:
 *  - An authenticated user (e.g., from the admin UI)
 *  - A cron job with CRON_SECRET header (for local/Hostinger cron)
 */
export async function POST(req: NextRequest) {
  // Auth check: session OR cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await auth();
    const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
    if (!session?.user?.id || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 1. Run matching pipeline
    const pipelineResult = await runMatchPipeline();

    // 2. Send emails for unnotified matches
    let emailsSent = 0;
    const emailErrors: string[] = [];

    const usersToNotify = await getUsersWithUnnotifiedMatches();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:4000';

    for (const user of usersToNotify) {
      try {
        await sendMatchEmail({
          toEmail: user.email,
          matchCount: user.matchCount,
          topScore: user.topScore,
          dashboardUrl: `${baseUrl}/dashboard`,
        });
        await markMatchesNotified(user.userId);
        emailsSent++;
      } catch (err) {
        const msg = `Email failed for ${user.email}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        emailErrors.push(msg);
      }
    }

    // 3. Update match log with email count
    if (pipelineResult.logId) {
      await execute(
        'UPDATE match_logs SET emails_sent = ? WHERE id = ?',
        [emailsSent, pipelineResult.logId]
      );
    }

    return NextResponse.json({
      success: true,
      ...pipelineResult,
      emailsSent,
      emailErrors,
    });
  } catch (err) {
    console.error('Cron match error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/match
 * Returns endpoint info.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/match',
    method: 'POST',
    description: 'Trigger match pipeline + email notifications. Requires session auth or x-cron-secret header.',
  });
}
