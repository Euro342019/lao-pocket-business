/** Guards for the test and lint setup (audit L8). */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
const playwrightConfig = readFileSync(resolve(root, 'playwright.config.ts'), 'utf8');

describe('test tooling (audit L8)', () => {
  it('end-to-end tests always build first, so they never test an old build', () => {
    expect(pkg.scripts['test:e2e']).toMatch(/^npm run build && playwright test/);
  });

  it('Playwright never reuses an already-running server', () => {
    expect(playwrightConfig).toMatch(/reuseExistingServer:\s*false/);
    expect(playwrightConfig).not.toMatch(/reuseExistingServer:\s*true/);
  });

  it('ESLint is configured with the React Hooks rules and has a lint script', () => {
    expect(pkg.scripts.lint).toBe('eslint .');
    const config = readFileSync(resolve(root, 'eslint.config.js'), 'utf8');
    expect(config).toContain('eslint-plugin-react-hooks');
    expect(config).toContain('typescript-eslint');
  });

  it('one command runs every check', () => {
    expect(pkg.scripts.check).toBe('npm run lint && npm run typecheck && npm test && npm run test:e2e');
    expect(existsSync(resolve(root, 'eslint.config.js'))).toBe(true);
  });
});
