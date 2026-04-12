import { NextResponse } from 'next/server';
import { runFetchCycle } from '@/lib/pipeline';
import { auth } from '@/lib/auth';

/**
 * POST /api/fetch-jobs
 * 
 * Triggers a fetch cycle to pull jobs from Adzuna, normalize, and store them.
 * Requires an authenticated session.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
