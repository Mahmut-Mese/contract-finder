import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, execute } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * GET /api/jobs/[id]/description
 *
 * Fetches the full job description for a given DB job id.
 * Constructs the canonical Adzuna details URL from external_id (avoids
 * land/ad redirect URLs which point to third-party boards).
 * Extracts description from JSON-LD or .adp-body div, caches to DB.
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

  // Load current description + external_id from DB
  const rows = await query<RowDataPacket[]>(
    'SELECT description, external_id FROM jobs WHERE id = ?',
    [jobId]
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const { description, external_id } = rows[0];

  // If description is already long enough, return it directly
  if (description && description.length >= 600) {
    return NextResponse.json({ description });
  }

  if (!external_id) {
    return NextResponse.json({ description: description || '' });
  }

  // Build canonical Adzuna details URL from external_id — avoids land/ad redirects
  const adzunaUrl = `https://www.adzuna.co.uk/jobs/details/${external_id}?utm_medium=api&utm_source=0801d0da`;

  try {
    const res = await fetch(adzunaUrl, {
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

    // Strategy 1: extract from JSON-LD structured data (JobPosting schema)
    let fullDescription: string | null = null;

    const jsonLdMatches = html.matchAll(
      /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi
    );

    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        // JSON-LD can be a single object or an array of objects
        const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const d = item as Record<string, unknown>;
          if (typeof d.description === 'string' && d.description.length > 100) {
            fullDescription = d.description;
            break;
          }
        }
        if (fullDescription) break;
      } catch {
        // malformed JSON-LD — skip
      }
    }

    // Strategy 2: fall back to scraping the .adp-body div
    if (!fullDescription) {
      const bodyMatch = html.match(/class="[^"]*adp-body[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      if (bodyMatch && bodyMatch[1].length > 100) {
        fullDescription = bodyMatch[1];
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
    await execute(
      'UPDATE jobs SET description = ? WHERE id = ?',
      [plainText, jobId]
    );

    return NextResponse.json({ description: plainText });
  } catch {
    // Network error or timeout — return whatever we have
    return NextResponse.json({ description: description || '' });
  }
}
