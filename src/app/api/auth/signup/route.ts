import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, createUser, createProfile, deleteUserById } from '@/lib/auth-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    // ── Validate input ──
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // ── Check if user exists ──
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // ── Create user ──
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await createUser(normalizedEmail, passwordHash);

    try {
      // ── Create empty profile ──
      await createProfile(userId);
    } catch (err) {
      await deleteUserById(userId);
      throw err;
    }

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
