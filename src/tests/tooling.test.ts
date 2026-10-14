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

describe('GitHub Actions CI', () => {
  const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');

  it('runs on pull requests and on pushes to main', () => {
    expect(ci).toMatch(/^on:\n {2}pull_request:\n {2}push:\n {4}branches: \[main\]/m);
  });

  it('uses Node 22 (matches engines and supports macOS Big Sur) and npm ci', () => {
    expect(ci).toContain("node-version: '22'");
    expect(pkg).toHaveProperty('engines.node', '>=22.12');
    expect(ci).toContain('run: npm ci');
  });

  it('runs lint, typecheck, unit tests, build and e2e', () => {
    for (const step of ['npm run lint', 'npm run typecheck', 'npm test', 'npm run build', 'npm run test:e2e']) {
      expect(ci).toContain(`run: ${step} --if-present`);
    }
  });

  it('has read-only permissions, pins actions to commit SHAs, and never deploys or uses secrets', () => {
    expect(ci).toMatch(/^permissions:\n {2}contents: read$/m);
    const uses = [...ci.matchAll(/uses: (\S+)/g)].map((m) => m[1]!);
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u, u).toMatch(/^actions\/[\w-]+@[0-9a-f]{40}$/);
    const withoutComments = ci.replace(/#.*$/gm, '');
    expect(withoutComments).not.toMatch(/deploy|gh-pages|pages|publish|secrets\.|npm publish/i);
  });
});
