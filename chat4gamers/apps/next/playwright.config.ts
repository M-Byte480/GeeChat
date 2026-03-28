import { defineConfig, devices } from '@playwright/test'
import { E2E_DB_PATH, E2E_SERVER_URL } from './e2e/global-setup.ts'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    // Next.js frontend
    {
      command: 'yarn dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    // Hono backend — fresh E2E database, separate port so it never conflicts
    // with the dev server running on 4000
    {
      command: 'yarn workspace server test:server',
      url: E2E_SERVER_URL,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        DB_PATH: E2E_DB_PATH,
        PORT: '4001',
      },
    },
  ],
})
