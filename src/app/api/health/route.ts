import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/health
 * Quick diagnostic endpoint to check DB connectivity and env vars.
 * Returns non-sensitive status info.
 */
export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars are present (not their values)
  checks.AUTH_SECRET = process.env.AUTH_SECRET ? '✅ set' : '❌ missing';
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL || '❌ missing';
  checks.MYSQL_HOST = process.env.MYSQL_HOST ? '✅ set' : '❌ missing';
  checks.MYSQL_DATABASE = process.env.MYSQL_DATABASE || '❌ missing';
  checks.MYSQL_USER = process.env.MYSQL_USER ? '✅ set' : '❌ missing';
  checks.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ? '✅ set' : '❌ missing';
  checks.ADZUNA_APP_ID = process.env.ADZUNA_APP_ID ? '✅ set' : '❌ missing';
  checks.SMTP_HOST = process.env.SMTP_HOST ? '✅ set' : '❌ missing';

  // Test DB connection
  try {
    const rows = await query('SELECT 1 as ok');
    checks.database = '✅ connected';

    // Check if tables exist
    const tables = await query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [process.env.MYSQL_DATABASE || 'contract_finder']
    );
    checks.tables = (tables as { TABLE_NAME: string }[]).map(t => t.TABLE_NAME).join(', ') || '❌ no tables found';
  } catch (err) {
    checks.database = `❌ ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({ status: 'ok', checks });
}
