/**
 * Web app manifest. Used by vite-plugin-pwa to generate
 * `manifest.webmanifest` at build time, and checked by unit tests.
 * Paths are relative so the app can be hosted in a sub-folder.
 */
import type { ManifestOptions } from 'vite-plugin-pwa';

export const THEME_COLOR = '#0f766e';
export const BACKGROUND_COLOR = '#f4f6f8';

export const manifest: Partial<ManifestOptions> = {
  id: './',
  name: 'Lao Pocket Business',
  short_name: 'Lao Pocket',
  description: 'ບັນທຶກລາຍຮັບ-ລາຍຈ່າຍສ່ວນຕົວເປັນເງິນກີບ. ຂໍ້ມູນຢູ່ໃນອຸປະກອນຂອງທ່ານເທົ່ານັ້ນ. Personal income and expense tracker in Lao Kip; data stays on your device.',
  lang: 'lo',
  dir: 'ltr',
  start_url: './',
  scope: './',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  orientation: 'any',
  theme_color: THEME_COLOR,
  background_color: BACKGROUND_COLOR,
  categories: ['finance', 'productivity'],
  icons: [
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
