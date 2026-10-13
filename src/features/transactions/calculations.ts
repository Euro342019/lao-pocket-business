import type { Transaction, TransactionType } from '../../types/transaction';
import { addDays, isInRange, type DateRange } from '../../utils/date';

export interface Totals {
  income: number;
  expense: number;
  /** Income minus expenses for the same set of transactions. Not a bank balance. */
  net: number;
  count: number;
}

/** Sum totals. Amounts are integers, so the sums are exact. */
export function calculateTotals(list: readonly Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const tx of list) {
    if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;
  }
  return { income, expense, net: income - expense, count: list.length };
}

export interface TransactionFilter {
  range?: DateRange;
  type?: TransactionType | 'all';
  categoryId?: string | 'all';
  search?: string;
}

export function filterTransactions(list: readonly Transaction[], filter: TransactionFilter): Transaction[] {
  const query = filter.search?.trim().toLocaleLowerCase() ?? '';
  return list.filter((tx) => {
    if (filter.range && !isInRange(tx.date, filter.range)) return false;
    if (filter.type && filter.type !== 'all' && tx.type !== filter.type) return false;
    if (filter.categoryId && filter.categoryId !== 'all' && tx.categoryId !== filter.categoryId) return false;
    if (query && !tx.description.toLocaleLowerCase().includes(query)) return false;
    return true;
  });
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
  /** Share of the total for this type, 0–100 (rounded to one decimal). */
  percent: number;
}

/** Totals per category for one transaction type, largest first. */
export function categoryTotals(list: readonly Transaction[], type: TransactionType): CategoryTotal[] {
  const sums = new Map<string, number>();
  let grand = 0;
  for (const tx of list) {
    if (tx.type !== type) continue;
    sums.set(tx.categoryId, (sums.get(tx.categoryId) ?? 0) + tx.amount);
    grand += tx.amount;
  }
  return [...sums.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      total,
      percent: grand === 0 ? 0 : Math.round((total / grand) * 1000) / 10,
    }))
    .sort((a, b) => b.total - a.total || a.categoryId.localeCompare(b.categoryId));
}

export interface DailyTotal {
  date: string;
  income: number;
  expense: number;
}

/** One entry per day in the range (including days with no transactions). */
export function dailyTotals(list: readonly Transaction[], range: DateRange): DailyTotal[] {
  const byDate = new Map<string, DailyTotal>();
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    byDate.set(d, { date: d, income: 0, expense: 0 });
  }
  for (const tx of list) {
    const day = byDate.get(tx.date);
    if (!day) continue;
    if (tx.type === 'income') day.income += tx.amount;
    else day.expense += tx.amount;
  }
  return [...byDate.values()];
}
