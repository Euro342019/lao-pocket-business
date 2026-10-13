import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('weekly backup reminder downloads a real backup file', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');
  // A user who started 8 days ago and has never downloaded a backup.
  await page.evaluate(() => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    localStorage.setItem('lpb.v1.settings', JSON.stringify({ language: 'en' }));
    localStorage.setItem('lpb.v1.backupReminder', JSON.stringify({ firstSeenAt: eightDaysAgo }));
    localStorage.setItem(
      'lpb.v1.transactions',
      JSON.stringify({
        version: 1,
        transactions: [
          { id: 'x1', type: 'expense', amount: 42000, currency: 'LAK', categoryId: 'food', date: '2026-10-12', description: 'Lunch', createdAt: eightDaysAgo },
        ],
      }),
    );
  });
  await page.reload();

  const card = page.getByRole('region', { name: 'Backup reminder' });
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  const downloadPromise = page.waitForEvent('download');
  await card.getByRole('button', { name: 'Download backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^lao-pocket-backup_.*\.json$/);
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(backup.app).toBe('lao-pocket-business');
  expect(backup.transactions.map((t: { description: string }) => t.description)).toEqual(['Lunch']);

  await expect(card).toBeHidden();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('lpb.v1.backupReminder')!));
  expect(Date.now() - Date.parse(state.lastBackupAt)).toBeLessThan(60_000);

  // A reload in the same session does not show it again.
  await page.reload();
  await expect(page.getByTestId('total-expense')).toBeVisible();
  await expect(page.getByTestId('backup-reminder')).toHaveCount(0);
  expect(errors).toEqual([]);
});
