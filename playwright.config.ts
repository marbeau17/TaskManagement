import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://task-management-nine-iota.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
