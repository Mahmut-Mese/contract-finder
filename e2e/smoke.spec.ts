import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4000';

// ─── Page definitions ──────────────────────────────────────────────────────

const PUBLIC_PAGES = ['/', '/login', '/signup'];
const PROTECTED_PAGES = ['/dashboard', '/profile', '/notifications', '/history'];

// API routes — expected status without auth
const API_ROUTES: { path: string; method: 'GET' | 'POST'; expectedStatus: number }[] = [
  { path: '/api/jobs', method: 'GET', expectedStatus: 200 },
  { path: '/api/fetch-logs', method: 'GET', expectedStatus: 200 },
  { path: '/api/match-logs', method: 'GET', expectedStatus: 200 },
  { path: '/api/profile', method: 'GET', expectedStatus: 401 },
  { path: '/api/matches', method: 'GET', expectedStatus: 401 },
  { path: '/api/notifications', method: 'GET', expectedStatus: 401 },
  { path: '/api/cron/match', method: 'GET', expectedStatus: 200 },
  { path: '/api/fetch-jobs', method: 'POST', expectedStatus: 401 },
];

// Console messages to ignore (dev tools, HMR, browser extensions, Fast Refresh, nav-aborted fetches)
const IGNORED_CONSOLE_PATTERNS = [
  /Download the React DevTools/,
  /\[HMR\]/,
  /\[Fast Refresh\]/,
  /cz-shortcut-listen/,
  /dark-reader/i,
  /favicon\.ico/,
  /third-party cookie/i,
  // next-auth SessionProvider aborts its fetch when Playwright navigates mid-request
  /ClientFetchError: Failed to fetch/,
  // Dashboard fetch aborts when navigating away before it completes (Playwright artifact)
  /Failed to load matches:.*Failed to fetch/,
  /Failed to load profile:.*Failed to fetch/,
];

function isIgnored(text: string): boolean {
  return IGNORED_CONSOLE_PATTERNS.some((p) => p.test(text));
}

// ─── Helper: visit a page and collect all errors ───────────────────────────

async function visitAndCollectErrors(page: import('@playwright/test').Page, url: string) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isIgnored(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  page.on('response', (resp) => {
    if (resp.status() >= 500) {
      failedRequests.push(`${resp.status()} ${resp.url()}`);
    }
  });

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  return { response, consoleErrors, pageErrors, failedRequests };
}

/** Assert a page has zero errors */
async function assertPageClean(
  page: import('@playwright/test').Page,
  label: string,
  response: Awaited<ReturnType<typeof page.goto>>,
  consoleErrors: string[],
  pageErrors: string[],
  failedRequests: string[],
  expectedStatus = 200
) {
  expect(response?.status(), `${label} returned ${response?.status()}`).toBe(expectedStatus);
  expect(pageErrors, `${label} uncaught exceptions: ${pageErrors.join('; ')}`).toHaveLength(0);
  expect(consoleErrors, `${label} console errors: ${consoleErrors.join('; ')}`).toHaveLength(0);
  expect(failedRequests, `${label} failed requests: ${failedRequests.join('; ')}`).toHaveLength(0);

  const bodyText = await page.textContent('body') || '';
  expect(bodyText).not.toContain('Internal Server Error');
  expect(bodyText).not.toContain('Application error: a server-side exception has occurred');
  expect(bodyText).not.toContain('Module not found');
  expect(bodyText).not.toContain('Unhandled Runtime Error');

  expect(await page.$('#__next-build-error'), `${label} shows build error`).toBeNull();
  expect(await page.$('[data-nextjs-dialog]'), `${label} shows error dialog`).toBeNull();
}

// ─── Helper: log in and return authenticated page ──────────────────────────

const TEST_USER = { email: 'e2e@test.com', password: 'TestPass123' };

async function loginAndGo(page: import('@playwright/test').Page, targetPath: string) {
  // Collect errors from the moment we start
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isIgnored(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });
  page.on('response', (resp) => {
    if (resp.status() >= 500) {
      failedRequests.push(`${resp.status()} ${resp.url()}`);
    }
  });

  // Log in
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });

  // Wait for dashboard to fully settle (profile + matches fetches) before navigating away
  // This prevents aborted in-flight requests from bleeding errors into the target page
  await page.waitForLoadState('networkidle');

  // Reset error collectors after login (login page errors are tested separately)
  consoleErrors.length = 0;
  pageErrors.length = 0;
  failedRequests.length = 0;

  // Navigate to target page
  const response = await page.goto(`${BASE}${targetPath}`, { waitUntil: 'networkidle', timeout: 15000 });

  return { response, consoleErrors, pageErrors, failedRequests };
}

// ─── Public pages ──────────────────────────────────────────────────────────

test.describe('Public Pages', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} — loads 200, no errors`, async ({ page }) => {
      const { response, consoleErrors, pageErrors, failedRequests } =
        await visitAndCollectErrors(page, `${BASE}${path}`);
      await assertPageClean(page, path, response, consoleErrors, pageErrors, failedRequests);
    });
  }
});

// ─── Protected pages (unauthenticated → redirect) ─────────────────────────

test.describe('Protected Pages (unauthenticated)', () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} — redirects to /login, no errors`, async ({ page }) => {
      const { response, consoleErrors, pageErrors, failedRequests } =
        await visitAndCollectErrors(page, `${BASE}${path}`);

      expect(page.url(), `${path} should redirect to /login`).toContain('/login');
      await assertPageClean(page, `${path} → /login`, response, consoleErrors, pageErrors, failedRequests);
    });
  }
});

// ─── Protected pages (authenticated) ──────────────────────────────────────

test.describe('Protected Pages (authenticated)', () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} — loads with session, no errors`, async ({ page }) => {
      const { response, consoleErrors, pageErrors, failedRequests } =
        await loginAndGo(page, path);
      await assertPageClean(page, `${path} (auth)`, response, consoleErrors, pageErrors, failedRequests);
    });
  }
});

// ─── API routes ────────────────────────────────────────────────────────────

test.describe('API Routes', () => {
  for (const route of API_ROUTES) {
    test(`${route.method} ${route.path} — returns ${route.expectedStatus}, valid JSON`, async ({ request }) => {
      const response = route.method === 'GET'
        ? await request.get(`${BASE}${route.path}`)
        : await request.post(`${BASE}${route.path}`);

      expect(response.status(), `${route.method} ${route.path} returned ${response.status()}`).toBe(route.expectedStatus);

      const text = await response.text();
      expect(text.length, `${route.method} ${route.path} returned empty body`).toBeGreaterThan(0);

      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`${route.method} ${route.path} returned invalid JSON: ${text.substring(0, 200)}`);
      }

      if (route.expectedStatus >= 400) {
        expect((body as Record<string, unknown>).error, `${route.method} ${route.path} error response missing message`).toBeTruthy();
      }
    });
  }
});

// ─── Server health ─────────────────────────────────────────────────────────

test.describe('Server Health', () => {
  test('dev server is responding on port 4000', async ({ request }) => {
    const response = await request.get(`${BASE}/api/jobs`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.jobs).toBeDefined();
    expect(data.jobs.length).toBeGreaterThan(0);
  });
});
