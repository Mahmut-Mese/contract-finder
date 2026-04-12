import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, execute } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * GET /api/matches
 *
 * Returns matched jobs for the current user, sorted by score descending.
 * Query params:
 *  - status: filter by status (new, viewed, saved, dismissed). Default: all except dismissed.
 *  - limit: number of results (default 50)
 *  - offset: pagination offset (default 0)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit')) || 50, 100));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  try {
    let whereClause = 'WHERE mj.user_id = ?';
    const params: (string | number)[] = [session.user.id];

    if (status) {
      whereClause += ' AND mj.status = ?';
      params.push(status);
    } else {
      // Default: exclude dismissed
      whereClause += " AND mj.status != 'dismissed'";
    }

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM matched_jobs mj ${whereClause}`,
      params
    );
    const total = (countRows[0]?.total as number) || 0;

    // Get matched jobs with job details
    const rows = await query<RowDataPacket[]>(
      `SELECT mj.id AS match_id, mj.score, mj.matched_skills, mj.status, mj.created_at AS matched_at,
              j.id AS job_id, j.title, j.company, j.location, j.description,
              j.salary_min, j.salary_max, j.contract_type, j.redirect_url, j.posted_at
       FROM matched_jobs mj
       JOIN jobs j ON j.id = mj.job_id
       ${whereClause}
       ORDER BY mj.score DESC, mj.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({ matches: rows, total, limit, offset });
  } catch (err) {
    console.error('GET /api/matches error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/matches
 *
 * Update match status (viewed, saved, dismissed).
 * Body: { matchId: number, status: 'viewed' | 'saved' | 'dismissed' }
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { matchId, status } = body;

    const validStatuses = ['new', 'viewed', 'saved', 'dismissed'];
    if (!matchId || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `matchId required, status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Only update if the match belongs to this user
    const result = await execute(
      'UPDATE matched_jobs SET status = ? WHERE id = ? AND user_id = ?',
      [status, matchId, session.user.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, matchId, status });
  } catch (err) {
    console.error('PATCH /api/matches error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
