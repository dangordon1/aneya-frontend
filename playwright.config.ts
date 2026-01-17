import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E integration tests.
 *
 * These tests exercise the full consultation flow with:
 * - Cached LLM/Sarvam API responses (via route interception)
 * - Real Supabase database (development instance)
 * - Automatic test data cleanup
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // Sequential execution for data consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to ensure test data consistency
  reporter: 'html',
  timeout: 120000, // 2 minutes per test (allows for slow operations)

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000, // 30 seconds for individual actions
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
