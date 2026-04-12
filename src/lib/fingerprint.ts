import crypto from 'crypto';

/**
 * Generate a search fingerprint from user preferences.
 * This is a SHA256 hash of the normalized preference values.
 * Users with identical preferences will share a fingerprint,
 * enabling future grouped/cached job searches.
 */
export function generateFingerprint(prefs: {
  skills: string | null;
  min_rate: number | null;
  max_rate: number | null;
  location: string | null;
  remote_preference: string | null;
  contract_length: string | null;
}): string {
  // Normalize: lowercase, trim, sort skills
  const skills = (prefs.skills || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(',');

  const parts = [
    skills,
    String(prefs.min_rate ?? ''),
    String(prefs.max_rate ?? ''),
    (prefs.location || '').trim().toLowerCase(),
    (prefs.remote_preference || '').trim().toLowerCase(),
    (prefs.contract_length || '').trim().toLowerCase(),
  ];

  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}
