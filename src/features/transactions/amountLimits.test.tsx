/**
 * L1 regression: amounts and totals stay exactly computable on every path
 * (calculation, saving, importing, exporting), and anything that would go
 * beyond the safe limit is rejected with a message instead of being rounded.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { STORAGE_KEYS } from '../../services/storage/storage';
import { makeTx } from '../../tests/fixtures';
import { MAX_AMOUNT, MAX_SAFE_TOTAL } from '../../utils/money';
import { calculateTotals, categoryTotals, dailyTotals, exceedsSafeTotals, filterTransactions } from './calculations';
import { createBackup, parseBackup, serializeBackup } from '../../services/export/backup';
import { transactionsToCsv } from '../../services/export/csv';
import type { Transaction } from '../../types/transaction';

/** Nine maximum amounts plus a remainder: expenses add up to exactly MAX_SAFE_TOTAL. */
const REMAINDER = MAX_SAFE_TOTAL - 9 * MAX_AMOUNT; // 7,199,254,741,000
function atLimit(type: 'expense' | 'income' = 'expense'): Transaction[] {
  const categoryId = type === 'income' ? 'salary' : 'food';
  return [
    ...Array.from({ length: 9 }, (_, i) =>
      makeTx({ id: `${type}-${i}`, type, categoryId, amount: MAX_AMOUNT, date: `2026-10-${String(i + 1).padStart(2, '0')}` }),
    ),
    makeTx({ id: `${type}-rest`, type, categoryId, amount: REMAINDER, date: '2026-10-10' }),
  ];
}
const bigSum = (list: Transaction[]) => list.reduce((s, t) => s + BigInt(t.amount), 0n);

afterEach(() => vi.restoreAllMocks());

describe('calculation path', () => {
  it('a total of exactly MAX_SAFE_TOTAL is exact; one Kip more is flagged as not exact', () => {
    const list = atLimit();
    const totals = calculateTotals(list);
    expect(BigInt(totals.expense)).toBe(bigSum(list));
    expect(totals.expense).toBe(MAX_SAFE_TOTAL);
    expect(totals.exact).toBe(true);
    const over = calculateTotals([...list, makeTx({ id: 'one', amount: 1 })]);
    expect(over.exact).toBe(false);
  });

  it('income and expenses are limited independently, and the net stays exact', () => {
    const both = [...atLimit('income'), ...atLimit('expense').slice(0, 9)];
    const totals = calculateTotals(both);
    expect(totals.exact).toBe(true);
    expect(BigInt(totals.net)).toBe(BigInt(MAX_SAFE_TOTAL) - BigInt(9 * MAX_AMOUNT));
  });

  it('every subset total (period, category, day, filter) equals the exact BigInt sum', () => {
    const list = atLimit();
    const firstFive = filterTransactions(list, { range: { from: '2026-10-01', to: '2026-10-05' } });
    expect(BigInt(calculateTotals(firstFive).expense)).toBe(bigSum(firstFive));
    expect(BigInt(categoryTotals(list, 'expense')[0]!.total)).toBe(bigSum(list));
    const days = dailyTotals(list, { from: '2026-10-01', to: '2026-10-10' });
    expect(days.reduce((s, d) => s + BigInt(d.expense), 0n)).toBe(bigSum(list));
  });

  it('exceedsSafeTotals blocks increases past the limit but allows decreases', () => {
    const list = atLimit();
    expect(exceedsSafeTotals(list)).toBe(false);
    const over = [...list, makeTx({ id: 'x', amount: 5 })];
    expect(exceedsSafeTotals(over, list)).toBe(true); // adding past the limit
    expect(exceedsSafeTotals(over.slice(1), over)).toBe(false); // deleting from over-limit data
    const raised = over.map((t) => (t.id === 'x' ? { ...t, amount: 50 } : t));
    expect(exceedsSafeTotals(raised, over)).toBe(true); // editing upwards while over the limit
    // An income entry is fine even when expenses are at the limit.
    expect(exceedsSafeTotals([...list, makeTx({ id: 'inc', type: 'income', categoryId: 'salary', amount: MAX_AMOUNT })], list)).toBe(false);
  });
});

describe('import path', () => {
  it('a backup whose totals exceed the limit is rejected; at the limit it is accepted exactly', () => {
    const list = atLimit();
    const ok = parseBackup(serializeBackup(createBackup(list)));
    expect(ok.ok && BigInt(calculateTotals(ok.transactions).expense)).toBe(bigSum(list));
    const over = parseBackup(serializeBackup(createBackup([...list, makeTx({ id: 'one', amount: 1 })])));
    expect(over).toEqual({ ok: false, error: 'totalsTooLarge' });
  });
});

describe('export path', () => {
  it('CSV and JSON contain every amount exactly (no rounding, no exponent notation)', () => {
    const list = atLimit();
    const csv = transactionsToCsv(list, { category: (x) => x, type: (x) => x });
    expect(csv.match(/,999999999999999,LAK,/g)).toHaveLength(9);
    expect(csv).toContain(`,${REMAINDER},LAK,`);
    expect(csv).not.toMatch(/e\+\d/);
    const json = serializeBackup(createBackup(list));
    expect(json).toContain('"amount": 999999999999999');
    expect(json).toContain(`"amount": ${REMAINDER}`);
  });
});

describe('saving path (UI)', () => {
  // The fixtures are dated October 2026; pin "today" so "This month" covers them on any run date.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  function seed(list: Transaction[]) {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ language: 'en' }));
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify({ version: 1, transactions: list }));
  }
  const stored = () => localStorage.getItem(STORAGE_KEYS.transactions);

  it('adding an expense that would pass the limit is refused with a message; nothing is saved', async () => {
    seed(atLimit());
    const before = stored();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Amount (Kip)'), '1');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByTestId('form-save-error')).toHaveTextContent(
      'Not saved: this would make total income or total expenses larger than the app can calculate exactly (limit 9,007,199,254,740,991 ₭).',
    );
    expect(screen.queryByText('Transaction added')).toBeNull();
    expect(stored()).toBe(before);
  });

  it('editing an amount upwards past the limit is refused', async () => {
    seed(atLimit());
    const before = stored();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Transactions' }));
    const rows = screen.getAllByRole('button', { name: /7,199,254,741,000 ₭/ });
    await user.click(rows[0]!);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit transaction' });
    await user.clear(within(dialog).getByLabelText('Amount (Kip)'));
    await user.type(within(dialog).getByLabelText('Amount (Kip)'), '7199254741001');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByTestId('form-save-error')).toHaveTextContent('Not saved');
    expect(stored()).toBe(before);
  });

  it('merging a backup that would pass the limit is refused; existing data unchanged', async () => {
    seed(atLimit());
    const before = stored();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const file = new File([serializeBackup(createBackup([makeTx({ id: 'extra', amount: 2 })]))], 'b.json', { type: 'application/json' });
    await user.upload(screen.getByTestId('import-file'), file);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Add to my data (skip duplicates)' }));
    expect(screen.getByRole('alert')).toHaveTextContent('add up to more than the app can calculate exactly, so nothing was imported');
    expect(screen.queryByText(/^Imported/)).toBeNull();
    expect(stored()).toBe(before);
  });

  it('a backup file over the limit is rejected before any choice is offered', async () => {
    seed([]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const file = new File([serializeBackup(createBackup([...atLimit(), makeTx({ id: 'one', amount: 1 })]))], 'b.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByTestId('import-file'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent('nothing was imported');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('existing over-limit data (from an older version) is kept as is, clearly flagged, and can be fixed by deleting', async () => {
    const legacy = [...atLimit(), makeTx({ id: 'mistake', amount: 1_000, description: 'Typo amount', date: '2026-10-11' })];
    seed(legacy);
    const before = stored();
    const user = userEvent.setup();
    render(<App />);
    expect(stored()).toBe(before); // not rewritten or set aside on load
    expect(screen.getByTestId('inexact-totals-banner')).toHaveTextContent('totals may be rounded and are not exact');
    expect(screen.getByTestId('summary-inexact')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Typo amount/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Transaction deleted')).toBeInTheDocument();
    expect(screen.queryByTestId('inexact-totals-banner')).toBeNull();
    expect(screen.getByTestId('total-expense')).toHaveTextContent('9,007,199,254,740,991 ₭');
  });
});
