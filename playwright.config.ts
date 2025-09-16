import { defineConfig, devices } from '@playwright/test';

const WEB_HOST = process.env.PLAYWRIGHT_WEB_HOST || '127.0.0.1';
const WEB_PORT = Number(process.env.PLAYWRIGHT_WEB_PORT) || 5173;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://${WEB_HOST}:${WEB_PORT}`;
const PREVIEW_COMMAND = `npm run preview -- --port=${WEB_PORT} --host=${WEB_HOST} --strictPort`;

export default defineConfig({
  timeout: 90_000,
  expect: { timeout: 10_000 },
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // give a little more room when running in CI
    actionTimeout: process.env.CI ? 15000 : 10000,
    navigationTimeout: process.env.CI ? 60000 : 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: PREVIEW_COMMAND,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
