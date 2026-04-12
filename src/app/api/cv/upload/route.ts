import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPool } from '@/lib/db';
import type { ResultSetHeader } from 'mysql2/promise';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf'];
const PDF_SIGNATURE = Buffer.from('%PDF-');

/**
 * POST /api/cv/upload
 * Upload a PDF CV. Deactivates any previous CV for this user.
 * Uses a DB transaction so deactivate + insert is atomic.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const formData = await req.formData();
    const file = formData.get('cv') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate actual PDF signature (first 5 bytes: %PDF-)
    if (buffer.length < 5 || buffer.subarray(0, 5).compare(PDF_SIGNATURE) !== 0) {
      return NextResponse.json({ error: 'File is not a valid PDF' }, { status: 400 });
    }

    // Create user upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'cv', userId);
    await mkdir(uploadDir, { recursive: true });

    // Store file on disk
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${timestamp}-${safeName}`;
    const storedPath = path.join('uploads', 'cv', userId, storedFilename);
    const fullPath = path.join(process.cwd(), storedPath);

    await writeFile(fullPath, buffer);

    // Atomic DB update: deactivate old CVs + insert new one in a transaction
    const pool = getPool();
    const conn = await pool.getConnection();
    let insertId: number;

    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE cv_files SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
        [userId]
      );

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO cv_files (user_id, original_name, stored_path, file_size, mime_type, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [userId, file.name, storedPath, file.size, file.type]
      );
      insertId = result.insertId;

      await conn.commit();
    } catch (dbErr) {
      await conn.rollback();
      // Clean up the file we already wrote to disk
      try { await unlink(fullPath); } catch { /* ignore cleanup errors */ }
      throw dbErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      cv: {
        id: insertId,
        originalName: file.name,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('CV upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
