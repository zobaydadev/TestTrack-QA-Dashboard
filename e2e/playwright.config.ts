import { defineConfig, devices } from '@playwright/test';

// The app and API are started by the CI job (or by hand) before the tests run.
export default defineConfig({
  testDir: './tests',
  // The screenshot script only runs when SCREENSHOTS is set (see the Screenshots workflow)
  testIgnore: process.env.SCREENSHOTS ? [] : ['**/screenshots.spec.ts'],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
