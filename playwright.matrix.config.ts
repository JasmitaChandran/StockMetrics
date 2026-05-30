import { defineConfig, devices } from '@playwright/test';

const MATRIX_PORT = Number(process.env.E2E_PORT ?? 3300);
const MATRIX_BASE_URL = `http://127.0.0.1:${MATRIX_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'matrix-smoke.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: MATRIX_BASE_URL,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'desktop-firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'desktop-webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'], channel: 'chrome' },
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${MATRIX_PORT}`,
    url: MATRIX_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
