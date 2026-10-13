import { expect, test, type Page } from '@playwright/test';

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (err) => errors.push(err.message));
  // Fail if the app ever tries to reach the network (other than its own static files).
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:4173/') && !req.url().startsWith('blob:') && !req.url().startsWith('data:')) {
      errors.push(`External request: ${req.url()}`);
    }
  });
  (page as Page & { __errors?: string[] }).__errors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { __errors?: string[] }).__errors).toEqual([]);
});

test('core flow: add, persist after reload, no horizontal scroll', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByText('ຍັງບໍ່ມີລາຍການ')).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);

  await page.getByLabel('ພາສາ').selectOption('en');
  await page.locator('.add-button').click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await expect(dialog).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await testInfo.attach('form', { body: await page.screenshot(), contentType: 'image/png' });

  await dialog.getByRole('radio', { name: 'Income' }).check();
  await dialog.getByLabel('Amount (Kip)').fill('4,500,000');
  await expect(dialog.getByText('4,500,000 ₭')).toBeVisible();
  await dialog.getByLabel('Note (optional)').fill('Salary October');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  await page.locator('.add-button').click();
  const second = page.getByRole('dialog', { name: 'Add transaction' });
  await second.getByLabel('Amount (Kip)', { exact: true }).fill('85000');
  await second.getByLabel('Category', { exact: true }).selectOption('food');
  await second.getByLabel('Note (optional)', { exact: true }).fill('ເຂົ້າປຽກເສັ້ນ ກັບໝູ່');
  await second.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByTestId('net-cash-flow')).toHaveText('+4,415,000 ₭');
  expect(await hasHorizontalOverflow(page)).toBe(false);

  await page.reload();
  await expect(page.getByTestId('net-cash-flow')).toHaveText('+4,415,000 ₭');
  await expect(page.getByText('ເຂົ້າປຽກເສັ້ນ ກັບໝູ່')).toBeVisible();

  // Every view fits without horizontal scrolling, in both themes and in Lao
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    for (const view of ['Transactions', 'Settings', 'Overview']) {
      await page.getByRole('navigation').getByRole('button', { name: view }).click();
      expect(await hasHorizontalOverflow(page), `${view} ${theme}`).toBe(false);
      await testInfo.attach(`${view}-${theme}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  }
  await page.getByLabel('Language').selectOption('lo');
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await testInfo.attach('overview-lo-dark', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('production build sets a Content-Security-Policy that blocks network access', async ({ page }) => {
  await page.goto('/');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'none'");
});

test('touch targets are at least 40px high on the main actions', async ({ page }) => {
  await page.goto('/');
  for (const locator of [page.locator('.add-button'), page.locator('.nav__item').first(), page.locator('.icon-button').first()]) {
    const box = await locator.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  }
});
