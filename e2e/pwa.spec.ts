import { expect, test, type Page } from '@playwright/test';

/** Wait until the service worker is installed and activated (app shell precached). */
async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const sw = registration.active!;
    if (sw.state !== 'activated') {
      await new Promise<void>((resolve) => sw.addEventListener('statechange', () => sw.state === 'activated' && resolve()));
    }
  });
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:4173/') && !/^(blob|data):/.test(req.url())) errors.push(`External request: ${req.url()}`);
  });
  (page as Page & { __errors?: string[] }).__errors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { __errors?: string[] }).__errors).toEqual([]);
});

test('Chromium reports the app as installable', async ({ playwright }, testInfo) => {
  // Default Playwright contexts are incognito, where Chrome never allows
  // installation, so use a normal (persistent) browser profile here.
  const context = await playwright.chromium.launchPersistentContext(testInfo.outputPath('profile'), {
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto('http://localhost:4173/');
  await waitForServiceWorker(page);
  const cdp = await context.newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  expect(manifest.errors).toEqual([]);
  expect(manifest.url).toBe('http://localhost:4173/manifest.webmanifest');
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
  await context.close();
});

test('manifest and icons are served correctly', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('./manifest.webmanifest');
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: 'Lao Pocket Business', display: 'standalone', start_url: './', theme_color: '#0f766e' });
  for (const icon of [...manifest.icons, { src: 'apple-touch-icon-180x180.png' }, { src: 'favicon.svg' }]) {
    const iconRes = await request.get(`/${icon.src}`);
    expect(iconRes.ok(), icon.src).toBe(true);
    expect(iconRes.headers()['content-type']).toMatch(/image\/(png|svg\+xml)/);
  }
});

test('service worker precaches only the static app shell', async ({ request }) => {
  const sw = await (await request.get('/sw.js')).text();
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]!);
  expect(urls).toContain('index.html');
  expect(urls.some((u) => /^assets\/index-.*\.js$/.test(u))).toBe(true);
  for (const url of urls) {
    expect(url, url).toMatch(/^[\w./-]+\.(html|js|css|png|svg|webmanifest)$/);
  }
  // The only route is the navigation fallback to the cached index.html; no runtime caching.
  expect(sw.match(/registerRoute\(/g)).toHaveLength(1);
  expect(sw).toContain('NavigationRoute');
  expect(sw).not.toMatch(/NetworkFirst|StaleWhileRevalidate|CacheFirst/);
});

test('works offline after the first visit and keeps local data', async ({ page, context }, testInfo) => {
  await page.goto('/');
  await page.getByLabel('ພາສາ').selectOption('en');
  await waitForServiceWorker(page);

  // Add a transaction while online
  await page.locator('.add-button').click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByLabel('Amount (Kip)', { exact: true }).fill('25000');
  await dialog.getByLabel('Note (optional)', { exact: true }).fill('Coffee before going offline');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('connection-status')).toContainText('Online');

  // Go offline: the indicator and the explanation appear immediately
  await context.setOffline(true);
  await expect(page.getByTestId('connection-status')).toContainText('Offline');
  await expect(page.getByTestId('offline-banner')).toContainText('saved on this device. Nothing is uploaded or synced.');

  // Reload with no network: the page must come from the service worker
  const response = await page.reload();
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(page.getByText('Coffee before going offline')).toBeVisible();
  await expect(page.getByTestId('connection-status')).toContainText('Offline');
  await expect(page.getByTestId('total-expense')).toHaveText('25,000 ₭');
  await testInfo.attach('offline', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  // Add a transaction while offline, reload again, still there
  await page.locator('.add-button').click();
  await page.getByRole('dialog').getByLabel('Amount (Kip)', { exact: true }).fill('5000');
  await page.getByRole('dialog').getByLabel('Note (optional)', { exact: true }).fill('Water while offline');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await page.reload();
  await expect(page.getByText('Water while offline')).toBeVisible();
  await expect(page.getByTestId('total-expense')).toHaveText('30,000 ₭');

  // Settings explain offline access vs. sync
  await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
  const section = page.getByRole('region', { name: 'Offline use & install' });
  await expect(section.getByTestId('offline-access-status')).toHaveText('Ready: the app opens without internet');
  await expect(section).toContainText('It is not syncing');

  // A brand-new tab opened while offline also works
  const second = await context.newPage();
  const secondResponse = await second.goto('/');
  expect(secondResponse?.fromServiceWorker()).toBe(true);
  await expect(second.getByText('Water while offline')).toBeVisible();
  await second.close();

  // Back online
  await context.setOffline(false);
  await expect(page.getByTestId('connection-status')).toContainText('Online');
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
});

test('a page that was never loaded online cannot work offline (documented limitation)', async ({ page, context }) => {
  await context.setOffline(true);
  await expect(page.goto('/')).rejects.toThrow();
});
