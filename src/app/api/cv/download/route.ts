import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * GET /api/cv/download
 * Stream the user's active CV file.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await query<RowDataPacket[]>(
    'SELECT stored_path, original_name, mime_type FROM cv_files WHERE user_id = ? AND is_active = TRUE LIMIT 1',
    [session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No active CV found' }, { status: 404 });
  }

  const cv = rows[0];

  try {
    const fullPath = path.join(process.cwd(), cv.stored_path);
    const fileBuffer = await readFile(fullPath);

    // Sanitize filename for Content-Disposition header
    const safeName = (cv.original_name || 'cv.pdf').replace(/[^\w.\- ]/g, '_');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': cv.mime_type || 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: 'CV file not found on disk' }, { status: 404 });
  }
}
