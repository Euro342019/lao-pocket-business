import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';

/** Security headers from public/_headers, served by `vite preview` like the static host (audit L7). */
test('pages are served with the security headers, and the meta CSP is still present', async ({ request, page }) => {
  for (const path of ['/', '/index.html', '/sw.js', '/manifest.webmanifest']) {
    const headers = (await request.get(path)).headers();
    expect(headers['content-security-policy'], path).toBe("frame-ancestors 'none'");
    expect(headers['x-frame-options'], path).toBe('DENY');
    expect(headers['x-content-type-options'], path).toBe('nosniff');
    expect(headers['referrer-policy'], path).toBe('no-referrer');
    expect(headers['cross-origin-opener-policy'], path).toBe('same-origin');
    expect(headers['permissions-policy'], path).toContain('camera=()');
  }
  expect((await request.get('/sw.js')).headers()['cache-control']).toBe('no-cache');
  await page.goto('/');
  const meta = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(meta).toContain("connect-src 'none'");
});

test('the app cannot be embedded in a frame on another site (clickjacking)', async ({ page }) => {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>other site</title><iframe id="f" src="http://localhost:4173/" width="400" height="400"></iframe>');
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const port = (server.address() as { port: number }).port;
    const blocked: string[] = [];
    page.on('console', (m) => /frame-ancestors|X-Frame-Options|refused to display/i.test(m.text()) && blocked.push(m.text()));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForTimeout(1500);
    const frame = page.frames().find((f) => f !== page.mainFrame());
    const appLoaded = frame ? await frame.locator('#root').count().catch(() => 0) : 0;
    expect(appLoaded).toBe(0);
    expect(blocked.length).toBeGreaterThan(0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
