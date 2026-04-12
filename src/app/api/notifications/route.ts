import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, execute } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * GET /api/notifications
 *
 * Returns notifications for the current user.
 * Query params:
 *  - unread_only: if 'true', only return unread notifications
 *  - limit: number of results (default 20)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread_only') === 'true';
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  try {
    let whereClause = 'WHERE n.user_id = ?';
    const params: (string | number)[] = [session.user.id];

    if (unreadOnly) {
      whereClause += ' AND n.is_read = FALSE';
    }

    // Get notifications
    const rows = await query<RowDataPacket[]>(
      `SELECT n.id, n.type, n.title, n.body, n.link, n.is_read, n.created_at
       FROM notifications n
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    // Get unread count
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [session.user.id]
    );
    const unreadCount = (countRows[0]?.unread_count as number) || 0;

    return NextResponse.json({ notifications: rows, unreadCount });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 *
 * Mark notification(s) as read.
 * Body: { notificationId: number } — mark one as read
 *   OR: { markAllRead: true } — mark all as read
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await execute(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
        [session.user.id]
      );
      return NextResponse.json({ success: true, action: 'marked_all_read' });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId or markAllRead required' },
        { status: 400 }
      );
    }

    const result = await execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, session.user.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, notificationId });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
