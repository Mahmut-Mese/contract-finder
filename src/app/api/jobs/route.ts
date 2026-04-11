import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * GET /api/jobs
 * 
 * Returns the most recent jobs from the database.
 * Query params:
 *   - limit (default 50, max 200)
 *   - offset (default 0)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
    const offset = Number(url.searchParams.get('offset')) || 0;

    const jobs = await query<RowDataPacket[]>(
      `SELECT id, external_id, source, title, company, location, 
              salary_min, salary_max, salary_currency, contract_type, 
              redirect_url, posted_at, fetched_at
       FROM jobs 
       ORDER BY fetched_at DESC, posted_at DESC
       LIMIT ? OFFSET ?`,
      [String(limit), String(offset)]
    );

    const [countRow] = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM jobs'
    );

    return NextResponse.json({
      jobs,
      total: countRow?.total || 0,
      limit,
      offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
