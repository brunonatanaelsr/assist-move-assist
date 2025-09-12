import { defineConfig, devices } from '@playwright/test';

// Dedicated port for Playwright-managed preview server (avoid clashing with backend PORT)
const WEB_PORT = process.env.PLAYWRIGHT_WEB_PORT || '4173';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${WEB_PORT}`;

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
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        isMobile: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        isMobile: true,
      },
    },
  ],

  // Let Playwright manage the frontend preview server on its own port
  webServer: {
    // Force host/port and fail fast if port is taken
    command: `npx vite preview --port ${WEB_PORT} --host 127.0.0.1 --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180000,
  },
});
