import * as cheerio from 'cheerio';

// ── LinkedIn Guest API client ──

const SEARCH_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const JOB_DETAIL_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';

/**
 * Fallback search queries when no user skills are available.
 * LinkedIn's guest API returns ~10 results per page.
 */
const DEFAULT_SEARCH_QUERIES = [
  'react developer contract',
  'node developer contract',
  'fullstack developer contract',
  'devops engineer contract',
  'software engineer contract',
  'python developer contract',
  'cloud engineer contract',
  '.net developer contract',
];

/** Parsed LinkedIn job from the search results HTML */
export interface LinkedInJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  postedAt: string | null;
  description: string | null;
}

/**
 * Extract the LinkedIn job ID from a full job URL.
 * URL format: https://...linkedin.com/jobs/view/some-title-at-company-4407128875?...
 * The ID is the last number before the query string.
 */
function extractJobId(url: string): string | null {
  try {
    // Remove query params
    const cleanUrl = url.split('?')[0];
    // Get the last segment that's a number
    const parts = cleanUrl.split('-');
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      return lastPart;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch a single search page from LinkedIn's guest API.
 * Returns raw HTML that needs to be parsed.
 */
async function fetchSearchPage(keywords: string, start: number = 0): Promise<string> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('keywords', keywords);
  url.searchParams.set('location', 'United Kingdom');
  url.searchParams.set('f_TPR', 'r86400');  // Past 24 hours
  url.searchParams.set('f_JT', 'C');        // Contract jobs only
  url.searchParams.set('start', String(start));

  console.log(`[linkedin] Fetching "${keywords}" start=${start}`);

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
    },
  });

  if (!res.ok) {
    throw new Error(`LinkedIn search error ${res.status}: ${res.statusText}`);
  }

  return res.text();
}

/**
 * Parse job listings from LinkedIn's search results HTML.
 * Uses selectors from the gist: li > div.base-card structure.
 */
function parseSearchResults(html: string): LinkedInJob[] {
  const $ = cheerio.load(html);
  const jobs: LinkedInJob[] = [];

  $('li').each((_, li) => {
    const card = $(li).find('div.base-card, div.base-search-card');
    if (card.length === 0) return;

    // Get the full link (contains job URL with ID)
    const linkEl = card.find('a[class*=full-link]');
    const url = linkEl.attr('href')?.trim() || '';
    const jobId = extractJobId(url);
    if (!jobId) return;

    // Title
    const title = card.find('[class*=_title]').first().text().trim();
    if (!title) return;

    // Company
    const company = card.find('[class*=_subtitle] a').first().text().trim() || null;

    // Location
    const location = card.find('[class*=_location]').first().text().trim() || null;

    // Posted date
    const timeEl = card.find('time[class*=listdate]');
    const postedAt = timeEl.attr('datetime') || null;

    jobs.push({
      id: jobId,
      title,
      company,
      location,
      url: url.split('?')[0], // Clean URL without tracking params
      postedAt,
      description: null, // Filled later from detail page
    });
  });

  return jobs;
}

/**
 * Fetch the description for a single job from its detail page.
 * This is optional — we skip it if it fails or is rate-limited.
 */
export async function fetchJobDescription(jobId: string): Promise<string | null> {
  try {
    const url = `${JOB_DETAIL_URL}/${jobId}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Description is in [class*=description] > section > div
    const description = $('[class*=description] section div').first().text().trim();
    return description || null;
  } catch {
    return null;
  }
}

/**
 * Small delay to avoid hammering LinkedIn's servers.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch UK contract developer jobs from LinkedIn's guest API.
 *
 * Strategy:
 *  1. Run each search query (page 0 only — ~10 results per query)
 *  2. Parse the HTML to extract job data
 *  3. Deduplicate by job ID
 *  4. Optionally fetch descriptions for new jobs (with rate limiting)
 *  5. Return the full list for DB insertion
 */
export async function fetchLinkedInJobs(searchQueries?: string[]): Promise<LinkedInJob[]> {
  const queries = searchQueries && searchQueries.length > 0
    ? searchQueries.map(q => q.includes('contract') ? q : `${q} contract`)
    : DEFAULT_SEARCH_QUERIES;

  const allJobs: LinkedInJob[] = [];
  const seenIds = new Set<string>();
  let totalRaw = 0;

  for (const keywords of queries) {
    try {
      const html = await fetchSearchPage(keywords);
      const jobs = parseSearchResults(html);
      totalRaw += jobs.length;

      // In-memory dedup
      let added = 0;
      for (const job of jobs) {
        if (!seenIds.has(job.id)) {
          seenIds.add(job.id);
          allJobs.push(job);
          added++;
        }
      }

      console.log(
        `[linkedin] "${keywords}": ${jobs.length} results, ${added} unique new (total unique: ${allJobs.length})`
      );

      // Small delay between search queries to be respectful
      await delay(500);
    } catch (err) {
      console.error(`[linkedin] Error fetching "${keywords}":`, err);
      // Continue with other queries even if one fails
    }
  }

  // Fetch descriptions for the first 20 jobs (to stay within reasonable limits)
  // Skip if we have too many — descriptions are nice-to-have, not critical
  const jobsToEnrich = allJobs.slice(0, 20);
  let enriched = 0;

  for (const job of jobsToEnrich) {
    const desc = await fetchJobDescription(job.id);
    if (desc) {
      job.description = desc;
      enriched++;
    }
    await delay(300); // Rate limit
  }

  console.log(
    `[linkedin] Done: ${totalRaw} raw → ${allJobs.length} unique, ${enriched} descriptions fetched`
  );

  return allJobs;
}
