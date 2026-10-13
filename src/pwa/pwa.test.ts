import { describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BACKGROUND_COLOR, THEME_COLOR, manifest } from './manifest';
import { pwaStore, watchInstallEvents, type BeforeInstallPromptEvent } from './pwaStore';

const root = resolve(__dirname, '../..');

/** Width and height from a PNG file's IHDR chunk. */
function pngSize(path: string) {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('web app manifest', () => {
  it('has the fields browsers require for installation', () => {
    expect(manifest.name).toBe('Lao Pocket Business');
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.short_name!.length).toBeLessThanOrEqual(12);
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.id).toBe('./');
    expect(manifest.lang).toBe('lo');
    expect(manifest.theme_color).toBe(THEME_COLOR);
    expect(manifest.background_color).toBe(BACKGROUND_COLOR);
  });

  it('lists 192px, 512px and maskable PNG icons that exist with the declared sizes', () => {
    const icons = manifest.icons ?? [];
    expect(icons.some((i) => i.sizes === '192x192' && i.purpose === 'any')).toBe(true);
    expect(icons.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true);
    expect(icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
    for (const icon of icons) {
      expect(icon.src).not.toMatch(/^(\/|https?:)/); // relative, works from a sub-folder
      const file = resolve(root, 'public', icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const [w, h] = icon.sizes!.split('x').map(Number);
      expect(pngSize(file)).toEqual({ width: w, height: h });
    }
  });

  it('index.html links the Apple touch icon and uses the same theme colour', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    expect(html).toContain(`<meta name="theme-color" content="${THEME_COLOR}"`);
    expect(html).toContain('rel="apple-touch-icon" href="./apple-touch-icon-180x180.png"');
    expect(pngSize(resolve(root, 'public/apple-touch-icon-180x180.png'))).toEqual({ width: 180, height: 180 });
    const css = readFileSync(resolve(root, 'src/styles/global.css'), 'utf8');
    expect(css).toContain(`--primary: ${THEME_COLOR};`);
  });

  it('service worker config precaches only static files and has no runtime caching', () => {
    const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf8');
    expect(config).toContain("globPatterns: ['**/*.{js,css,html,svg,png}']");
    expect(config).not.toMatch(/runtimeCaching\s*:/);
    expect(config).toContain("registerType: 'prompt'");
  });
});

function fakeInstallEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  event.prompt = vi.fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('pwaStore', () => {
  it('captures the install prompt and shows it once', async () => {
    const stop = watchInstallEvents(window);
    const event = fakeInstallEvent('accepted');
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(pwaStore.getState().canInstall).toBe(true);

    await expect(pwaStore.promptInstall()).resolves.toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(pwaStore.getState().canInstall).toBe(false);
    await expect(pwaStore.promptInstall()).resolves.toBe('unavailable');
    stop();
  });

  it('marks the app as installed after appinstalled', () => {
    const stop = watchInstallEvents(window);
    window.dispatchEvent(fakeInstallEvent('dismissed'));
    window.dispatchEvent(new Event('appinstalled'));
    expect(pwaStore.getState()).toMatchObject({ installed: true, canInstall: false });
    stop();
  });

  it('detects standalone display mode', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q === '(display-mode: standalone)' }) as MediaQueryList) as typeof window.matchMedia;
    const stop = watchInstallEvents(window);
    expect(pwaStore.getState().installed).toBe(true);
    stop();
    window.matchMedia = original;
  });

  it('tracks offline readiness and only flags the first time as new', () => {
    pwaStore.setOfflineReady(true);
    expect(pwaStore.getState()).toMatchObject({ offlineReady: true, offlineReadyIsNew: true });
    pwaStore.acknowledgeOfflineReady();
    pwaStore.setOfflineReady(true);
    expect(pwaStore.getState().offlineReadyIsNew).toBe(false);
  });

  it('applies a waiting update only when asked', async () => {
    const apply = vi.fn();
    pwaStore.setUpdateAvailable(apply);
    expect(pwaStore.getState().updateAvailable).toBe(true);
    expect(apply).not.toHaveBeenCalled();
    await pwaStore.applyUpdate();
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
