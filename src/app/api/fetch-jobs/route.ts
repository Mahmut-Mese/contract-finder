import { NextRequest, NextResponse } from 'next/server';
import { runFetchCycle } from '@/lib/pipeline';
import { auth } from '@/lib/auth';

/**
 * POST /api/fetch-jobs
 * 
 * Triggers a fetch cycle to pull jobs from Adzuna, normalize, and store them.
 * Requires admin session OR valid x-fetch-secret header (for cron jobs).
 */
export async function POST(req: NextRequest) {
  // Check cron secret first (for automated/cron calls)
  const fetchSecret = req.headers.get('x-fetch-secret');
  const isValidSecret = fetchSecret && fetchSecret === process.env.FETCH_SECRET;

  if (!isValidSecret) {
    // Fall back to admin session check
    const session = await auth();
    const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
    if (!session?.user?.id || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await runFetchCycle();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/fetch-jobs
 * Returns a simple status message.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/fetch-jobs',
    method: 'POST',
    description: 'Trigger a job fetch cycle. Requires authenticated session.',
  });
}
