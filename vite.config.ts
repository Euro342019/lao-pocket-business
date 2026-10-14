import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './src/pwa/manifest';
import { readFileSync } from 'node:fs';
import { headersFor, parseHeadersFile } from './src/pwa/hostHeaders';

/**
 * Production-only Content-Security-Policy.
 *
 * `connect-src 'none'` means the built app cannot make network requests
 * (fetch, XHR, WebSocket, beacons), so transaction data cannot be sent
 * anywhere even by accident. It is only added to the production build
 * because the Vite dev server needs a WebSocket for hot reloading.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'lpb-content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

/** Serve `vite preview` with the same security headers as the static host (public/_headers). */
function hostHeaders(): Plugin {
  const rules = parseHeadersFile(readFileSync(new URL('./public/_headers', import.meta.url), 'utf8'));
  return {
    name: 'lpb-host-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        for (const [name, value] of Object.entries(headersFor(rules, req.url ?? '/'))) res.setHeader(name, value);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    hostHeaders(),
    react(),
    contentSecurityPolicy(),
    VitePWA({
      // The app shows its own "update available" prompt (src/pwa/), so the
      // new version is only activated when the user agrees.
      registerType: 'prompt',
      injectRegister: false,
      manifest,
      // Icons are already matched by globPatterns below; avoid listing them twice.
      includeManifestIcons: false,
      workbox: {
        // Precache only the static app shell built by Vite. There are no runtime
        // caching rules: the app makes no data requests, and transactions
        // live in localStorage, never in the service worker cache.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  // Relative asset paths let the build be opened from any static host or sub-folder.
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
