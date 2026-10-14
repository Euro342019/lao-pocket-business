import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { appendFileSync, cpSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { headersFor, parseHeadersFile } from '../src/pwa/hostHeaders';

/**
 * Real two-version update test. Each test serves its own copy of dist/ from
 * a small static server, then "deploys" a new version by changing sw.js in
 * that copy. The project's dist/ folder is never modified.
 */
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

async function serveCopy(dir: string): Promise<{ url: string; server: Server }> {
  cpSync('dist', dir, { recursive: true });
  const rules = parseHeadersFile(readFileSync('public/_headers', 'utf8')); // same headers as the real host
  const server = createServer((req, res) => {
    for (const [name, value] of Object.entries(headersFor(rules, req.url ?? '/'))) res.setHeader(name, value);
    let path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)).replace(/^\/+/, '');
    if (path === '' || path.includes('..')) path = 'index.html';
    try {
      const body = readFileSync(join(dir, path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  return { url: `http://localhost:${port}/`, server };
}

const deployNewVersion = (dir: string, tag: string) => appendFileSync(join(dir, 'sw.js'), `\n// new version ${tag}\n`);
const hasWaiting = (page: Page) => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);

async function openControlled(context: BrowserContext, url: string) {
  const page = await context.newPage();
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem('lpb.v1.settings', JSON.stringify({ language: 'en' })));
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForLoadState('load');
  return page;
}

test.describe('app updates (two real versions)', () => {
  let server: Server;
  let dir: string;
  let url: string;

  test.beforeEach(async ({}, testInfo) => {
    dir = testInfo.outputPath('site');
    ({ url, server } = await serveCopy(dir));
  });
  test.afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  test('a new version is offered with "Update now", never activated without consent, and applied on tap', async ({ context }) => {
    const page = await openControlled(context, url);
    deployNewVersion(dir, 'v2');
    await page.reload(); // the user opens the app again after a deploy
    await expect(page.getByTestId('update-banner')).toContainText('A new version of the app is ready.', { timeout: 20_000 });

    await page.waitForTimeout(3_000);
    expect(await hasWaiting(page)).toBe(true); // still waiting: nothing changed by itself

    const reloaded = page.waitForEvent('framenavigated');
    await page.getByRole('button', { name: 'Update now' }).click();
    await reloaded;
    await page.waitForLoadState('load');
    await expect.poll(() => hasWaiting(page)).toBe(false);
    await expect(page.getByTestId('update-banner')).toHaveCount(0);
  });

  test('a second tab opened while a version is waiting also shows "Update now"', async ({ context }) => {
    const first = await openControlled(context, url);
    deployNewVersion(dir, 'v2');
    await first.reload();
    await expect.poll(() => hasWaiting(first), { timeout: 20_000 }).toBe(true);
    const second = await context.newPage();
    await second.goto(url);
    await expect(second.getByTestId('update-banner')).toBeVisible({ timeout: 20_000 });
  });

  test('updating in one tab does not reload another tab with a half-filled form', async ({ context }) => {
    const first = await openControlled(context, url);
    deployNewVersion(dir, 'v2');
    await first.reload();
    await expect(first.getByTestId('update-banner')).toBeVisible({ timeout: 20_000 });

    const second = await context.newPage();
    await second.goto(url);
    await expect(second.getByTestId('update-banner')).toBeVisible({ timeout: 20_000 });
    await second.locator('.add-button').click();
    const note = second.getByRole('dialog').getByLabel('Note (optional)', { exact: true });
    await note.fill('half-typed note');
    let secondNavigated = false;
    second.on('framenavigated', () => (secondNavigated = true));

    const firstReloaded = first.waitForEvent('framenavigated');
    await first.getByRole('button', { name: 'Update now' }).click();
    await firstReloaded;

    await expect(second.getByTestId('reload-needed-banner')).toBeVisible({ timeout: 10_000 });
    expect(secondNavigated).toBe(false);
    await expect(note).toHaveValue('half-typed note');
  });
});
