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
  const exclude_companies = searchParams.get('exclude_companies');
  const exclude_title_keywords = searchParams.get('exclude_title_keywords');
  const min_score = searchParams.get('min_score');
  const remote_only = searchParams.get('remote_only');
  const date_posted = searchParams.get('date_posted');
  const posted_by = searchParams.get('posted_by');
  const rate_min = searchParams.get('rate_min');
  const rate_max = searchParams.get('rate_max');
  const skills = searchParams.get('skills');
  const location_filter = searchParams.get('location_filter');
  const remote_preference = searchParams.get('remote_preference');
  const contract_length = searchParams.get('contract_length');

  try {
    let whereClause = 'WHERE mj.user_id = ?';
    const params: (string | number)[] = [session.user.id];

    if (status) {
      const validGetStatuses = ['new', 'viewed', 'saved', 'dismissed', 'applied', 'deleted', 'mylist'];
      if (!validGetStatuses.includes(status)) {
        return NextResponse.json({ error: `status must be one of: ${validGetStatuses.join(', ')}` }, { status: 400 });
      }
      if (status === 'mylist') {
        whereClause += " AND mj.status IN ('new', 'viewed')";
      } else {
        whereClause += ' AND mj.status = ?';
        params.push(status);
      }
    } else {
      // Default: exclude dismissed
      whereClause += " AND mj.status NOT IN ('dismissed', 'deleted')";
    }

    if (exclude_companies) {
      const companies = exclude_companies.split(',').map(c => c.trim()).filter(Boolean);
      for (const company of companies) {
        whereClause += ' AND LOWER(j.company) != LOWER(?)';
        params.push(company);
      }
    }

    if (exclude_title_keywords) {
      const keywords = exclude_title_keywords.split(',').map(k => k.trim()).filter(Boolean);
      for (const keyword of keywords) {
        whereClause += ' AND LOWER(j.title) NOT LIKE ?';
        params.push(`%${keyword.toLowerCase()}%`);
      }
    }

    if (min_score) {
      const score = Number(min_score);
      if (!isNaN(score)) {
        whereClause += ' AND mj.score >= ?';
        params.push(score);
      }
    }

    if (remote_only === 'true') {
      whereClause += " AND (LOWER(j.title) LIKE '%remote%' OR LOWER(j.description) LIKE '%remote%')";
    }

    // Date posted filter (days ago)
    if (date_posted) {
      const days = Number(date_posted);
      if (!isNaN(days) && days > 0) {
        whereClause += ' AND j.posted_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
        params.push(days);
      }
    }

    // Posted by (positive company match)
    if (posted_by && posted_by.trim()) {
      whereClause += ' AND LOWER(j.company) LIKE ?';
      params.push(`%${posted_by.trim().toLowerCase()}%`);
    }

    // Contract rate range filter (user enters daily rate, DB stores annual salary)
    // Only show jobs that have salary data AND overlap with the user's desired range.
    if (rate_min) {
      const min = Number(rate_min);
      if (!isNaN(min) && min > 0) {
        // Job's upper bound must be at or above user's minimum daily rate (annual)
        // Exclude jobs with no salary data at all
        whereClause += ' AND j.salary_max IS NOT NULL AND j.salary_max >= ?';
        params.push(min * 220);
      }
    }
    if (rate_max) {
      const max = Number(rate_max);
      if (!isNaN(max) && max > 0) {
        // Job's lower bound must be at or below user's maximum daily rate (annual)
        // Exclude jobs with no salary data at all
        whereClause += ' AND j.salary_min IS NOT NULL AND j.salary_min <= ?';
        params.push(max * 220);
      }
    }

    // Skills filter (comma-separated, match in title or description)
    if (skills && skills.trim()) {
      const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillList.length > 0) {
        const skillConditions = skillList.map(() => "(LOWER(j.title) LIKE ? OR LOWER(j.description) LIKE ?)");
        whereClause += ` AND (${skillConditions.join(' OR ')})`;
        for (const skill of skillList) {
          params.push(`%${skill.toLowerCase()}%`, `%${skill.toLowerCase()}%`);
        }
      }
    }

    // Location filter
    if (location_filter && location_filter.trim()) {
      whereClause += ' AND LOWER(j.location) LIKE ?';
      params.push(`%${location_filter.trim().toLowerCase()}%`);
    }

    // Remote preference filter
    if (remote_preference) {
      if (remote_preference === 'remote') {
        whereClause += " AND (LOWER(j.title) LIKE '%remote%' OR LOWER(j.description) LIKE '%remote%')";
      } else if (remote_preference === 'hybrid') {
        whereClause += " AND (LOWER(j.title) LIKE '%hybrid%' OR LOWER(j.description) LIKE '%hybrid%')";
      } else if (remote_preference === 'onsite') {
        whereClause += " AND (LOWER(j.title) LIKE '%on-site%' OR LOWER(j.title) LIKE '%onsite%' OR LOWER(j.description) LIKE '%on-site%' OR LOWER(j.description) LIKE '%onsite%')";
      }
    }

    // Contract length filter
    if (contract_length && contract_length.trim()) {
      whereClause += ' AND LOWER(j.description) LIKE ?';
      params.push(`%${contract_length.trim().toLowerCase()}%`);
    }

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM matched_jobs mj JOIN jobs j ON j.id = mj.job_id ${whereClause}`,
      params
    );
    const total = (countRows[0]?.total as number) || 0;

    // Get matched jobs with job details
    const rows = await query<RowDataPacket[]>(
      `SELECT mj.id AS match_id, mj.score, mj.matched_skills, mj.status, mj.created_at AS matched_at,
              mj.match_log_id, ml.started_at AS run_started_at,
              j.id AS job_id, j.title, j.company, j.location, j.description,
              j.salary_min, j.salary_max, j.contract_type, j.redirect_url, j.posted_at
       FROM matched_jobs mj
       JOIN jobs j ON j.id = mj.job_id
       LEFT JOIN match_logs ml ON ml.id = mj.match_log_id
       ${whereClause}
       ORDER BY mj.match_log_id DESC, mj.score DESC, mj.created_at DESC
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

    const validStatuses = ['new', 'viewed', 'saved', 'dismissed', 'applied', 'deleted'];
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
