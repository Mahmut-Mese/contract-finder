import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, execute } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await query<RowDataPacket[]>(
      'SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC',
      [session.user.id]
    );

    return NextResponse.json({ searches: rows });
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, filters, is_active } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Invalid or missing name' }, { status: 400 });
    }

    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
      return NextResponse.json({ error: 'Invalid or missing filters' }, { status: 400 });
    }

    const isActive = is_active !== undefined ? Boolean(is_active) : true;

    const result = await execute(
      'INSERT INTO saved_searches (user_id, name, filters, is_active) VALUES (?, ?, ?, ?)',
      [session.user.id, name.trim(), JSON.stringify(filters), isActive]
    ) as ResultSetHeader;

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error creating saved search:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, filters, is_active } = body;

    if (!id || typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Invalid or missing id' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (filters !== undefined) {
      if (typeof filters !== 'object' || Array.isArray(filters)) {
        return NextResponse.json({ error: 'Invalid filters' }, { status: 400 });
      }
      updates.push('filters = ?');
      values.push(JSON.stringify(filters));
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(Boolean(is_active));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id, session.user.id);

    const sql = `UPDATE saved_searches SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;

    const result = await execute(sql, values) as ResultSetHeader;

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating saved search:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Invalid or missing id' }, { status: 400 });
    }

    const result = await execute(
      'DELETE FROM saved_searches WHERE id = ? AND user_id = ?',
      [id, session.user.id]
    ) as ResultSetHeader;

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
