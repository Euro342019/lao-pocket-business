import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the production build (`npm run build` first).
// Set PW_CHROMIUM_PATH to use an already-installed Chromium instead of
// running `npx playwright install chromium`.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions: { executablePath } } },
  ],
});
