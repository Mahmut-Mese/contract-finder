import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { execute, query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';
import { unlink } from 'fs/promises';
import path from 'path';

/**
 * GET /api/cv
 * Get the user's active CV metadata.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await query<RowDataPacket[]>(
    'SELECT id, original_name, file_size, mime_type, created_at FROM cv_files WHERE user_id = ? AND is_active = TRUE LIMIT 1',
    [session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ cv: null });
  }

  const cv = rows[0];
  return NextResponse.json({
    cv: {
      id: cv.id,
      originalName: cv.original_name,
      fileSize: cv.file_size,
      mimeType: cv.mime_type,
      createdAt: cv.created_at,
    },
  });
}

/**
 * DELETE /api/cv
 * Delete the user's active CV (file + record).
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await query<RowDataPacket[]>(
    'SELECT id, stored_path FROM cv_files WHERE user_id = ? AND is_active = TRUE LIMIT 1',
    [session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No active CV found' }, { status: 404 });
  }

  const cv = rows[0];

  // Delete file from disk
  try {
    const fullPath = path.join(process.cwd(), cv.stored_path);
    await unlink(fullPath);
  } catch {
    // File might already be deleted — continue with DB cleanup
  }

  // Mark as inactive
  await execute(
    'UPDATE cv_files SET is_active = FALSE WHERE id = ?',
    [cv.id]
  );

  return NextResponse.json({ success: true });
}
