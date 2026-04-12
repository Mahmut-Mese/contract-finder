import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * GET /api/match-logs
 * Returns recent match pipeline run logs.
 * Public — used by admin page (which has its own session check via middleware).
 */
export async function GET() {
  try {
    const rows = await query<RowDataPacket[]>(
      `SELECT id, started_at, finished_at, users_processed, matches_created,
              emails_sent, status, error_message
       FROM match_logs
       ORDER BY id DESC
       LIMIT 50`
    );
    return NextResponse.json({ logs: rows });
  } catch (err) {
    console.error('GET /api/match-logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
