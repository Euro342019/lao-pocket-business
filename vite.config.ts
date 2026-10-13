import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

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

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
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
