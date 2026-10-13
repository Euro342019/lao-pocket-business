import { describe, expect, it } from 'vitest';
import { calculateTotals, categoryTotals, dailyTotals, filterTransactions } from './calculations';
import { SAMPLE, makeTx } from '../../tests/fixtures';

describe('calculateTotals', () => {
  it('sums income, expenses, net and count', () => {
    expect(calculateTotals(SAMPLE)).toEqual({
      income: 5_300_000,
      expense: 1_720_000,
      net: 3_580_000,
      count: 6,
      exact: true,
    });
  });

  it('returns zeros for an empty list', () => {
    expect(calculateTotals([])).toEqual({ income: 0, expense: 0, net: 0, count: 0, exact: true });
  });

  it('net cash flow can be negative', () => {
    const totals = calculateTotals([makeTx({ type: 'income', categoryId: 'salary', amount: 100 }), makeTx({ amount: 250 })]);
    expect(totals.net).toBe(-150);
  });

  it('stays exact with large integer amounts (no floating-point drift)', () => {
    const list = Array.from({ length: 1000 }, (_, i) => makeTx({ id: String(i), amount: 123_456_789 }));
    expect(calculateTotals(list).expense).toBe(123_456_789_000);
  });
});

describe('filterTransactions', () => {
  it('filters by date range (inclusive)', () => {
    const october = filterTransactions(SAMPLE, { range: { from: '2026-10-01', to: '2026-10-31' } });
    expect(october.map((t) => t.id).sort()).toEqual(['a', 'b', 'c', 'd']);
    const oneDay = filterTransactions(SAMPLE, { range: { from: '2026-10-13', to: '2026-10-13' } });
    expect(oneDay.map((t) => t.id).sort()).toEqual(['c', 'd']);
  });

  it('filters by type and category', () => {
    expect(filterTransactions(SAMPLE, { type: 'income' }).map((t) => t.id)).toEqual(['a', 'e']);
    expect(filterTransactions(SAMPLE, { categoryId: 'food' }).map((t) => t.id)).toEqual(['b', 'd']);
    expect(filterTransactions(SAMPLE, { type: 'all', categoryId: 'all' })).toHaveLength(6);
  });

  it('searches descriptions case-insensitively', () => {
    expect(filterTransactions(SAMPLE, { search: 'SALARY' }).map((t) => t.id)).toEqual(['a']);
    expect(filterTransactions(SAMPLE, { search: '  rent ' }).map((t) => t.id)).toEqual(['f']);
    expect(filterTransactions(SAMPLE, { search: 'nothing-matches' })).toEqual([]);
  });

  it('searches Lao text', () => {
    const list = [makeTx({ id: 'x', description: 'ເຂົ້າປຽກ' }), makeTx({ id: 'y', description: 'ກາເຟ' })];
    expect(filterTransactions(list, { search: 'ກາເຟ' }).map((t) => t.id)).toEqual(['y']);
  });

  it('combines filters', () => {
    const result = filterTransactions(SAMPLE, { type: 'expense', categoryId: 'food', range: { from: '2026-10-13', to: '2026-10-13' } });
    expect(result.map((t) => t.id)).toEqual(['d']);
  });
});

describe('categoryTotals', () => {
  it('groups expenses by category, largest first, with percentages', () => {
    const totals = categoryTotals(SAMPLE, 'expense');
    expect(totals).toEqual([
      { categoryId: 'housing', total: 1_500_000, percent: 87.2 },
      { categoryId: 'transport', total: 120_000, percent: 7 },
      { categoryId: 'food', total: 100_000, percent: 5.8 },
    ]);
  });

  it('ignores the other type and handles empty input', () => {
    expect(categoryTotals(SAMPLE, 'income').map((c) => c.categoryId)).toEqual(['salary', 'business']);
    expect(categoryTotals([], 'expense')).toEqual([]);
  });
});

describe('dailyTotals', () => {
  it('returns one entry per day including empty days', () => {
    const days = dailyTotals(SAMPLE, { from: '2026-10-11', to: '2026-10-13' });
    expect(days).toEqual([
      { date: '2026-10-11', income: 0, expense: 0 },
      { date: '2026-10-12', income: 0, expense: 35_000 },
      { date: '2026-10-13', income: 0, expense: 185_000 },
    ]);
  });
});
