import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, getPool } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * POST /api/applications
 *
 * Apply to a matched job. Creates an application record and updates match status to 'applied'.
 * Body: { matchId: number }
 *
 * Since Adzuna jobs don't include employer emails, all applications are 'external_link' type —
 * the user is directed to the external listing to complete their application.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { matchId } = body;

    if (!Number.isInteger(matchId) || matchId <= 0) {
      return NextResponse.json({ error: 'matchId must be a positive integer' }, { status: 400 });
    }

    // 1. Verify match exists and belongs to user
    const matchRows = await query<RowDataPacket[]>(
      `SELECT mj.id, mj.job_id, mj.status, j.title, j.company, j.redirect_url
       FROM matched_jobs mj
       JOIN jobs j ON j.id = mj.job_id
       WHERE mj.id = ? AND mj.user_id = ?`,
      [matchId, userId]
    );

    if (matchRows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const match = matchRows[0];

    // 2. Check if already applied (match status)
    if (match.status === 'applied') {
      return NextResponse.json({ error: 'Already applied to this job' }, { status: 409 });
    }

    // 3. Check user has active CV
    const cvRows = await query<RowDataPacket[]>(
      'SELECT id FROM cv_files WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [userId]
    );

    if (cvRows.length === 0) {
      return NextResponse.json(
        { error: 'No CV uploaded. Please upload your CV on the Profile page first.' },
        { status: 400 }
      );
    }

    const cvFileId = cvRows[0].id;

    // 4. Insert application + update match status in a transaction
    const pool = getPool();
    const conn = await pool.getConnection();
    let insertId: number;

    try {
      await conn.beginTransaction();

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO applications (user_id, job_id, match_id, cv_file_id, status, applied_via)
         VALUES (?, ?, ?, ?, 'sent', 'external_link')`,
        [userId, match.job_id, matchId, cvFileId]
      );
      insertId = result.insertId;

      await conn.query(
        "UPDATE matched_jobs SET status = 'applied' WHERE id = ? AND user_id = ?",
        [matchId, userId]
      );

      await conn.commit();
    } catch (dbErr: unknown) {
      await conn.rollback();
      // Handle duplicate key (user already applied to this job)
      if (dbErr && typeof dbErr === 'object' && 'code' in dbErr && (dbErr as { code: string }).code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ error: 'Already applied to this job' }, { status: 409 });
      }
      throw dbErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      application: {
        id: insertId,
        jobId: match.job_id,
        title: match.title,
        company: match.company,
        status: 'sent',
        appliedVia: 'external_link',
        redirectUrl: match.redirect_url,
      },
    });
  } catch (err) {
    console.error('POST /api/applications error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create application' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/applications
 *
 * List the user's applications with job details.
 * Query params: limit (default 50, max 100), offset (default 0)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit')) || 50, 100));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    // Count total
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM applications WHERE user_id = ?',
      [session.user.id]
    );
    const total = (countRows[0]?.total as number) || 0;

    // Get applications with job info
    const rows = await query<RowDataPacket[]>(
      `SELECT a.id, a.status, a.applied_via, a.application_email, a.error_message,
              a.created_at, a.updated_at,
              j.id AS job_id, j.title, j.company, j.location, j.redirect_url,
              j.salary_min, j.salary_max
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [session.user.id, limit, offset]
    );

    return NextResponse.json({ applications: rows, total, limit, offset });
  } catch (err) {
    console.error('GET /api/applications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
