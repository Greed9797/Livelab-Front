import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL

if (!baseURL) {
  throw new Error('E2E_BASE_URL is required for the production smoke configuration.')
}
if (new URL(baseURL).origin !== 'https://app.grupolivelab.com.br') {
  throw new Error('The production smoke only accepts https://app.grupolivelab.com.br as E2E_BASE_URL.')
}

export default defineConfig({
  testDir: './tests/production-smoke',
  testMatch: /.*\.smoke\.ts/,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
})
