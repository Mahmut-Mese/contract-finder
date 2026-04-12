import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProfileByUserId, updateProfile } from '@/lib/auth-db';
import { generateFingerprint } from '@/lib/fingerprint';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getProfileByUserId(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      skills,
      min_rate,
      max_rate,
      location,
      remote_preference,
      contract_length,
      contract_finder_enabled,
    } = body;

    const isNullableString = (value: unknown) =>
      value === undefined || value === null || typeof value === 'string';

    const parseNullableInt = (value: unknown, field: string) => {
      if (value === undefined) return { ok: true as const, value: undefined };
      if (value === null || value === '') return { ok: true as const, value: null };
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return { ok: false as const, error: `${field} must be a non-negative number or null` };
      }
      return { ok: true as const, value: Math.round(value) };
    };

    if (!isNullableString(skills)) {
      return NextResponse.json({ error: 'skills must be a string or null' }, { status: 400 });
    }
    if (!isNullableString(location)) {
      return NextResponse.json({ error: 'location must be a string or null' }, { status: 400 });
    }
    if (!isNullableString(contract_length)) {
      return NextResponse.json({ error: 'contract_length must be a string or null' }, { status: 400 });
    }
    if (contract_finder_enabled !== undefined && typeof contract_finder_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'contract_finder_enabled must be a boolean' },
        { status: 400 }
      );
    }

    const parsedMinRate = parseNullableInt(min_rate, 'min_rate');
    if (!parsedMinRate.ok) {
      return NextResponse.json({ error: parsedMinRate.error }, { status: 400 });
    }

    const parsedMaxRate = parseNullableInt(max_rate, 'max_rate');
    if (!parsedMaxRate.ok) {
      return NextResponse.json({ error: parsedMaxRate.error }, { status: 400 });
    }

    // Validate remote_preference if provided
    const validRemoteOptions = ['remote', 'hybrid', 'onsite', 'any'];
    if (remote_preference !== undefined && remote_preference !== null && !validRemoteOptions.includes(remote_preference)) {
      return NextResponse.json(
        { error: `remote_preference must be one of: ${validRemoteOptions.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, string | number | boolean | null> = {};
    if (skills !== undefined) updateData.skills = skills;
    if (parsedMinRate.value !== undefined) updateData.min_rate = parsedMinRate.value;
    if (parsedMaxRate.value !== undefined) updateData.max_rate = parsedMaxRate.value;
    if (location !== undefined) updateData.location = location;
    if (remote_preference !== undefined) updateData.remote_preference = remote_preference;
    if (contract_length !== undefined) updateData.contract_length = contract_length;
    if (contract_finder_enabled !== undefined) updateData.contract_finder_enabled = contract_finder_enabled;

    // Get current profile to merge with updates for fingerprint
    const currentProfile = await getProfileByUserId(session.user.id);
    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Generate fingerprint from merged data
    const merged = {
      skills: (updateData.skills ?? currentProfile.skills) as string | null,
      min_rate: (updateData.min_rate ?? currentProfile.min_rate) as number | null,
      max_rate: (updateData.max_rate ?? currentProfile.max_rate) as number | null,
      location: (updateData.location ?? currentProfile.location) as string | null,
      remote_preference: (updateData.remote_preference ?? currentProfile.remote_preference) as string | null,
      contract_length: (updateData.contract_length ?? currentProfile.contract_length) as string | null,
    };

    if (
      merged.min_rate !== null &&
      merged.max_rate !== null &&
      merged.min_rate > merged.max_rate
    ) {
      return NextResponse.json(
        { error: 'min_rate cannot be greater than max_rate' },
        { status: 400 }
      );
    }

    updateData.search_fingerprint = generateFingerprint(merged);

    await updateProfile(session.user.id, updateData);

    const updated = await getProfileByUserId(session.user.id);
    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error('PUT /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
