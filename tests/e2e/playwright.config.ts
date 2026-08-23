import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration for SaaS Directory Auto-Publisher E2E Suite
 */
export default defineConfig({
  testDir: './',
  testMatch: /.*\.spec\.ts/,
  timeout: 30000,
  expect: {
    timeout: 7000
  },
  fullyParallel: false, // Run flows deterministically
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 800 }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
