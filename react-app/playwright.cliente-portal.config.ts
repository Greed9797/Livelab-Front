import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/cliente-portal',
  testMatch: /.*\.e2e\.ts/,
  outputDir: '/tmp/livelab-cliente-portal-playwright',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5176',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'cliente-desktop', grep: /@desktop/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } } },
    { name: 'cliente-mobile', grep: /@mobile/, use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5176',
    url: 'http://127.0.0.1:5176/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_API_URL: '/v1' },
  },
})
