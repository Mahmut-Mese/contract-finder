import { query, execute } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// Use globalThis.crypto for UUID generation (works in both Node and Edge)
function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}

// ── Types ──

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

// ── User queries ──

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const rows = await query<(DbUser & RowDataPacket)[]>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const rows = await query<(DbUser & RowDataPacket)[]>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  return rows[0] ?? null;
}

export async function createUser(email: string, passwordHash: string): Promise<string> {
  const id = randomUUID();
  await execute(
    'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
    [id, email, passwordHash]
  );
  return id;
}

export async function deleteUserById(id: string): Promise<void> {
  await execute('DELETE FROM users WHERE id = ?', [id]);
}

// ── Profile queries ──

export interface DbProfile {
  id: number;
  user_id: string;
  skills: string | null;
  min_rate: number | null;
  max_rate: number | null;
  location: string | null;
  remote_preference: string | null;
  contract_length: string | null;
  search_fingerprint: string | null;
  contract_finder_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getProfileByUserId(userId: string): Promise<DbProfile | null> {
  const rows = await query<(DbProfile & RowDataPacket)[]>(
    'SELECT * FROM profiles WHERE user_id = ?',
    [userId]
  );
  return rows[0] ?? null;
}

export async function createProfile(userId: string): Promise<void> {
  await execute(
    'INSERT INTO profiles (user_id) VALUES (?)',
    [userId]
  );
}

export async function updateProfile(
  userId: string,
  data: {
    skills?: string | null;
    min_rate?: number | null;
    max_rate?: number | null;
    location?: string | null;
    remote_preference?: string | null;
    contract_length?: string | null;
    search_fingerprint?: string | null;
    contract_finder_enabled?: boolean;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (data.skills !== undefined) { fields.push('skills = ?'); values.push(data.skills); }
  if (data.min_rate !== undefined) { fields.push('min_rate = ?'); values.push(data.min_rate); }
  if (data.max_rate !== undefined) { fields.push('max_rate = ?'); values.push(data.max_rate); }
  if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }
  if (data.remote_preference !== undefined) { fields.push('remote_preference = ?'); values.push(data.remote_preference); }
  if (data.contract_length !== undefined) { fields.push('contract_length = ?'); values.push(data.contract_length); }
  if (data.search_fingerprint !== undefined) { fields.push('search_fingerprint = ?'); values.push(data.search_fingerprint); }
  if (data.contract_finder_enabled !== undefined) { fields.push('contract_finder_enabled = ?'); values.push(data.contract_finder_enabled); }

  if (fields.length === 0) return;

  values.push(userId);
  await execute(
    `UPDATE profiles SET ${fields.join(', ')} WHERE user_id = ?`,
    values
  );
}
