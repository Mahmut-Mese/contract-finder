import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4000',
    // Don't launch browser for API-only tests
    headless: true,
  },
  // Don't start the dev server — we expect it to already be running
  webServer: undefined,
});
