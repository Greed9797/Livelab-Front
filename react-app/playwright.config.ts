import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.e2e\.ts/,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5174',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174',
    url: 'http://127.0.0.1:5174/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_API_URL: process.env.VITE_API_URL || '/v1',
      VITE_DEV_API_PROXY_TARGET:
        process.env.VITE_DEV_API_PROXY_TARGET || 'https://liveshop-saas-api-production.up.railway.app',
    },
  },
})
