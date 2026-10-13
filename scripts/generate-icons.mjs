/**
 * Regenerates the PWA icons in public/ from the SVG below.
 * Usage: node scripts/generate-icons.mjs   (needs Playwright's Chromium;
 * set PW_CHROMIUM_PATH to use an existing Chromium binary)
 *
 * The ₭ symbol is drawn with paths, so the result does not depend on fonts.
 */
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const COLOR = '#0f766e';

/** ₭ drawn in a 512×512 box. `scale` shrinks it toward the centre (for maskable safe zones). */
function symbol(scale) {
  return `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)"
    fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round">
    <path d="M186 132v248"/>
    <path d="M336 132L196 256l140 124"/>
    <path d="M136 256h240"/>
  </g>`;
}

function svg({ maskable }) {
  return maskable
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${COLOR}"/>${symbol(0.72)}</svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${COLOR}"/>${symbol(1)}</svg>`;
}

const ICONS = [
  { file: 'pwa-192x192.png', size: 192, maskable: false },
  { file: 'pwa-512x512.png', size: 512, maskable: false },
  { file: 'maskable-icon-512x512.png', size: 512, maskable: true },
  // iOS ignores transparency and adds its own rounded corners, so use the full-bleed version.
  { file: 'apple-touch-icon-180x180.png', size: 180, maskable: true },
];

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
for (const icon of ICONS) {
  const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${icon.size}px;height:${icon.size}px}</style>${svg(icon)}`,
  );
  await writeFile(new URL(`../public/${icon.file}`, import.meta.url), await page.screenshot({ omitBackground: true }));
  await page.close();
  console.log(`public/${icon.file}`);
}
await writeFile(new URL('../public/favicon.svg', import.meta.url), svg({ maskable: false }) + '\n');
console.log('public/favicon.svg');
await browser.close();
