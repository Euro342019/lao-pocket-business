import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { headersFor, parseHeadersFile, pathMatches } from './hostHeaders';

const file = readFileSync(resolve(__dirname, '../../public/_headers'), 'utf8');
const rules = parseHeadersFile(file);

describe('host security headers (audit L7)', () => {
  it('parses the _headers format', () => {
    expect(parseHeadersFile('# c\n/*\n  A: 1\n  B: x: y\n\n/x\n  C: 2\n')).toEqual([
      { path: '/*', headers: { A: '1', B: 'x: y' } },
      { path: '/x', headers: { C: '2' } },
    ]);
    expect(pathMatches('/*', '/anything')).toBe(true);
    expect(pathMatches('/sw.js', '/sw.js')).toBe(true);
    expect(pathMatches('/sw.js', '/sw.js.map')).toBe(false);
  });

  it('every path gets the anti-framing and hardening headers', () => {
    for (const path of ['/', '/index.html', '/assets/index-abc.js', '/sw.js', '/manifest.webmanifest']) {
      expect(headersFor(rules, path)).toMatchObject({
        'Content-Security-Policy': "frame-ancestors 'none'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cross-Origin-Opener-Policy': 'same-origin',
      });
    }
    expect(headersFor(rules, '/sw.js?x=1')['Cache-Control']).toBe('no-cache');
  });

  it('never sends a header CSP that would restrict the service worker (it would break offline use)', () => {
    for (const rule of rules) {
      const csp = rule.headers['Content-Security-Policy'];
      if (!csp) continue;
      const directives = csp.split(';').map((d) => d.trim().split(/\s+/)[0]);
      expect(directives).toEqual(['frame-ancestors']);
    }
  });

  it('does not set headers known to break this PWA or its hosting', () => {
    const names = rules.flatMap((r) => Object.keys(r.headers).map((n) => n.toLowerCase()));
    expect(names).not.toContain('cross-origin-embedder-policy'); // would block the app's own icons/manifest without CORP
    expect(names).not.toContain('clear-site-data'); // would wipe the user's data
  });
});
