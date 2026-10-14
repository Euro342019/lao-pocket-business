/**
 * Minimal parser for the `_headers` file format (Netlify / Cloudflare Pages):
 * a path line, followed by indented `Name: value` lines. Used to apply the
 * same headers in `vite preview` and in tests.
 */
export interface HeaderRule {
  path: string;
  headers: Record<string, string>;
}

export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let current: HeaderRule | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { path: line.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    const colon = line.indexOf(':');
    if (current && colon > 0) current.headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return rules;
}

/** Does a rule path ("/*", "/sw.js", "/assets/*") match a request path? */
export function pathMatches(rulePath: string, requestPath: string): boolean {
  if (rulePath.endsWith('*')) return requestPath.startsWith(rulePath.slice(0, -1));
  return requestPath === rulePath;
}

/** All headers that apply to a request path (later rules override earlier ones). */
export function headersFor(rules: HeaderRule[], requestPath: string): Record<string, string> {
  const path = requestPath.split('?')[0] || '/';
  return Object.assign({}, ...rules.filter((r) => pathMatches(r.path, path)).map((r) => r.headers));
}
