import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4321',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { viewport: { width: 1287, height: 749 } } },
    { name: 'chromium-mobile', use: { viewport: { width: 375, height: 812 } } },
    {
      name: 'webkit-desktop',
      use: { browserName: 'webkit', viewport: { width: 1287, height: 749 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
