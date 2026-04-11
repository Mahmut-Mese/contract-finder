import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * GET /api/fetch-logs
 * 
 * Returns recent fetch logs for monitoring.
 */
export async function GET() {
  try {
    const logs = await query<RowDataPacket[]>(
      `SELECT * FROM fetch_logs ORDER BY started_at DESC LIMIT 20`
    );

    return NextResponse.json({ logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
