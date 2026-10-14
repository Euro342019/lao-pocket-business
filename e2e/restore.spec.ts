import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Backup restore through the browser's real file chooser.
 * Synthetic test data only — never real financial records.
 */

type Tx = Record<string, unknown>;

const tx = (id: string, amount: number, description: string, extra: Tx = {}): Tx => ({
  id,
  type: 'expense',
  amount,
  currency: 'LAK',
  categoryId: 'food',
  date: '2026-10-12',
  description,
  createdAt: '2026-10-12T03:00:00.000Z',
  ...extra,
});

const backup = (transactions: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'lao-pocket-business', version: 1, exportedAt: '2026-10-14T00:00:00.000Z', transactions, ...extra });

const file = (content: string | Buffer, name = 'lao-pocket-backup_test.json') => ({
  name,
  mimeType: 'application/json',
  buffer: typeof content === 'string' ? Buffer.from(content, 'utf8') : content,
});

async function seed(page: Page, transactions: Tx[]) {
  await page.goto('/');
  await page.evaluate((list) => {
    localStorage.clear();
    localStorage.setItem('lpb.v1.settings', JSON.stringify({ language: 'en' }));
    localStorage.setItem('lpb.v1.transactions', JSON.stringify({ version: 1, transactions: list }));
  }, transactions);
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
}

const storage = (page: Page) =>
  page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
const storedTransactions = (page: Page) =>
  page.evaluate(() => (JSON.parse(localStorage.getItem('lpb.v1.transactions') ?? '{"transactions":[]}').transactions as Tx[]));
const byId = (list: Tx[]) => [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));

/** Open the real file chooser from "Restore from backup" and pick a file. */
async function chooseBackup(page: Page, f: ReturnType<typeof file> | string) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore from backup' }).click();
  const chooser = await chooserPromise;
  expect(chooser.isMultiple()).toBe(false);
  await chooser.setFiles(f);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  (page as Page & { __errors?: string[] }).__errors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as Page & { __errors?: string[] }).__errors).toEqual([]);
});

test('round trip: a backup downloaded from the app restores every record exactly', async ({ page }) => {
  const original = [
    tx('t1', 5_000_000, 'Salary (test)', { type: 'income', categoryId: 'salary' }),
    tx('t2', 35_000, 'ເຂົ້າປຽກ (test)', { updatedAt: '2026-10-13T01:00:00.000Z' }),
    tx('t3', 1_500_000, 'Rent, "October" (test)', { categoryId: 'housing' }),
  ];
  await seed(page, original);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup (JSON)' }).click();
  const downloadedPath = (await (await downloadPromise).path())!;

  await page.getByRole('button', { name: 'Delete all data' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByText('0 transactions stored on this device')).toBeVisible();

  await chooseBackup(page, downloadedPath);
  const dialog = page.getByRole('dialog', { name: 'Restore backup' });
  await expect(dialog).toContainText('This backup contains 3 transactions. You currently have 0.');
  await dialog.getByRole('button', { name: 'Add to my data (skip duplicates)' }).click();
  await expect(page.getByText('Imported 3 transactions (0 already existed).')).toBeVisible();
  await expect(page.getByText('3 transactions stored on this device')).toBeVisible();
  expect(byId(await storedTransactions(page))).toEqual(byId(original));

  // The downloaded file itself is the exact data too.
  expect(byId(JSON.parse(await readFile(downloadedPath, 'utf8')).transactions)).toEqual(byId(original));
});

test('merge: new records are added, existing ones are kept unchanged', async ({ page }) => {
  const existing = tx('keep', 50_000, 'Existing (test)');
  await seed(page, [existing]);
  await chooseBackup(page, file(backup([tx('keep', 1, 'Edited elsewhere (test)'), tx('n1', 2_000, 'New 1 (test)'), tx('n2', 3_000, 'New 2 (test)')])));
  const dialog = page.getByRole('dialog', { name: 'Restore backup' });
  await expect(dialog).toContainText('This backup contains 3 transactions. You currently have 1.');
  await dialog.getByRole('button', { name: 'Add to my data (skip duplicates)' }).click();
  await expect(page.getByText(/Imported 2 transactions\. 1 already existed and your copies were kept/)).toBeVisible();
  const stored = await storedTransactions(page);
  expect(stored).toHaveLength(3);
  expect(stored.find((t) => t.id === 'keep')).toEqual(existing);
});

test('replace: needs a second confirmation; cancelling keeps the data', async ({ page }) => {
  const existing = [tx('old1', 10_000, 'Old 1 (test)'), tx('old2', 20_000, 'Old 2 (test)')];
  const incoming = [tx('new1', 99_000, 'Replacement (test)')];
  await seed(page, existing);
  const before = await storage(page);

  await chooseBackup(page, file(backup(incoming)));
  await page.getByRole('dialog').getByRole('button', { name: 'Replace all my data' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Replace all data?' });
  await expect(confirm).toContainText('permanently delete your current 2 transactions');
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  expect(await storage(page)).toEqual(before);

  await chooseBackup(page, file(backup(incoming)));
  await page.getByRole('dialog').getByRole('button', { name: 'Replace all my data' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Replace all my data' }).click();
  await expect(page.getByText('Restored 1 transactions from the backup.')).toBeVisible();
  expect(await storedTransactions(page)).toEqual(incoming);
});

const MAX_AMOUNT = 999_999_999_999_999;
const BROKEN_FILES: [string, () => ReturnType<typeof file>, RegExp][] = [
  ['not JSON', () => file('this is not json {'), /not a valid backup file/],
  ['empty file', () => file(''), /not a valid backup file/],
  ['truncated JSON', () => file(backup([tx('a', 1, 'x')]).slice(0, 60)), /not a valid backup file/],
  ['another app', () => file(JSON.stringify({ app: 'other-app', version: 1, transactions: [] })), /not a Lao Pocket Business backup/],
  ['unsupported version', () => file(backup([], { version: 99 })), /unsupported version/],
  ['an invalid record', () => file(backup([tx('ok', 1_000, 'fine'), tx('bad', -5, 'negative amount')])), /contains 1 invalid records, so nothing was imported/],
  ['duplicate ids', () => file(backup([tx('dup', 1, 'a'), tx('dup', 2, 'b')])), /duplicate records, so nothing was imported/],
  [
    'totals beyond the safe limit',
    () => file(backup(Array.from({ length: 10 }, (_, i) => tx(`max${i}`, MAX_AMOUNT, 'max')))),
    /add up to more than the app can calculate exactly/,
  ],
  ['a file over 10 MB', () => file(Buffer.alloc(10 * 1024 * 1024 + 1, 0x20)), /The file is too large/],
];

for (const [name, make, message] of BROKEN_FILES) {
  test(`a broken backup (${name}) is rejected and existing data is not changed`, async ({ page }) => {
    await seed(page, [tx('keep1', 12_000, 'Keep me (test)'), tx('keep2', 34_000, 'Keep me too (test)')]);
    const before = await storage(page);
    await chooseBackup(page, make());
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByRole('dialog')).toHaveCount(0); // no merge/replace choice offered
    expect(await storage(page)).toEqual(before); // byte-for-byte unchanged
    await expect(page.getByText('2 transactions stored on this device')).toBeVisible();
  });
}

test('a valid backup that cannot be saved (storage really full) leaves existing data unchanged', async ({ page }) => {
  const existing = [tx('keep', 12_000, 'Keep me (test)')];
  await seed(page, existing);
  const beforeTransactions = await page.evaluate(() => localStorage.getItem('lpb.v1.transactions'));
  // Fill the browser's real storage quota to the last byte with filler (synthetic).
  await page.evaluate(() => {
    let i = 0;
    for (let size = 1 << 20; size >= 1; size = Math.floor(size / 2)) {
      const s = 'x'.repeat(size);
      for (;;) {
        try {
          localStorage.setItem(`filler${i++}`, s);
        } catch {
          break;
        }
      }
    }
  });
  const incoming = [tx('n1', 1_000, 'New (test)'), tx('n2', 2_000, 'New 2 (test)')];

  for (const choice of ['merge', 'replace'] as const) {
    await chooseBackup(page, file(backup(incoming)));
    if (choice === 'merge') {
      await page.getByRole('dialog').getByRole('button', { name: 'Add to my data (skip duplicates)' }).click();
    } else {
      await page.getByRole('dialog').getByRole('button', { name: 'Replace all my data' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Replace all my data' }).click();
    }
    await expect(page.getByRole('alert')).toContainText('The backup could not be saved (storage may be full). Your existing data was not changed.');
    await expect(page.getByText(/^Imported|^Restored/)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('lpb.v1.transactions'))).toBe(beforeTransactions);
    await expect(page.getByText('1 transactions stored on this device')).toBeVisible();
  }
});
