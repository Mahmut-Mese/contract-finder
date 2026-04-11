import { NextResponse } from 'next/server';
import { runFetchCycle } from '@/lib/pipeline';

/**
 * POST /api/fetch-jobs
 * 
 * Triggers a fetch cycle to pull jobs from Adzuna, normalize, and store them.
 * Protected by a simple secret token for the spike phase.
 */
export async function POST(request: Request) {
  // Simple auth: check for a secret token in the Authorization header
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.FETCH_SECRET || 'dev-secret';

  if (authHeader !== `Bearer ${expectedToken}`) {
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
 * Returns a simple status message (no auth needed for GET).
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/fetch-jobs',
    method: 'POST',
    description: 'Trigger a job fetch cycle. Requires Authorization: Bearer <FETCH_SECRET>',
  });
}
