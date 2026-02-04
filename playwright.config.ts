import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Legacy Hafaloha Frontend.
 *
 * Expects:
 *   - API server running on http://localhost:3000
 *   - Frontend dev server running on http://localhost:5173
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests sequentially — they share a single local DB */
  fullyParallel: false,
  /* Fail fast on CI */
  forbidOnly: !!process.env.CI,
  /* No retries locally; 1 on CI */
  retries: process.env.CI ? 1 : 0,
  /* Single worker to keep DB state predictable */
  workers: 1,
  /* HTML report */
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    /* Screenshots on failure */
    screenshot: 'only-on-failure',
    /* Reasonable timeouts */
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  /* Default timeout per test */
  timeout: 30_000,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
