import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * GET /api/jobs/[id]/description
 *
 * Fetches the full job description for a given DB job id.
 * First checks if we already have a full description cached in the DB.
 * If the stored description is truncated (<600 chars), fetches the Adzuna
 * job page, extracts the full description from the JSON-LD structured data,
 * caches it back to the DB, and returns it.
 *
 * Requires authentication.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const jobId = parseInt(id, 10);
  if (isNaN(jobId)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  // Load current description + redirect_url from DB
  const rows = await query<RowDataPacket[]>(
    'SELECT description, redirect_url FROM jobs WHERE id = ?',
    [jobId]
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const { description, redirect_url } = rows[0];

  // If description is already long enough, return it directly
  if (description && description.length >= 600) {
    return NextResponse.json({ description });
  }

  // Otherwise try to fetch full description from Adzuna job page
  if (!redirect_url) {
    return NextResponse.json({ description: description || '' });
  }

  try {
    const res = await fetch(redirect_url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ description: description || '' });
    }

    const html = await res.text();

    // Extract JSON-LD blocks
    const jsonLdMatches = html.matchAll(
      /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi
    );

    let fullDescription: string | null = null;

    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        if (data.description && typeof data.description === 'string' && data.description.length > 100) {
          fullDescription = data.description;
          break;
        }
      } catch {
        // malformed JSON-LD — skip
      }
    }

    if (!fullDescription) {
      return NextResponse.json({ description: description || '' });
    }

    // Strip HTML tags for plain-text display
    const plainText = fullDescription
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Cache back to DB so subsequent expands are instant
    await query(
      'UPDATE jobs SET description = ? WHERE id = ?',
      [plainText, jobId]
    );

    return NextResponse.json({ description: plainText });
  } catch {
    // Network error or timeout — return whatever we have
    return NextResponse.json({ description: description || '' });
  }
}
