import type { Transaction } from '../types/transaction';

/** Sample data for tests only. Never loaded into the real app. */
export function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? `tx-${Math.random().toString(36).slice(2)}`,
    type: 'expense',
    amount: 50_000,
    currency: 'LAK',
    categoryId: 'food',
    date: '2026-10-13',
    description: '',
    createdAt: '2026-10-13T05:00:00.000Z',
    ...overrides,
  };
}

export const SAMPLE: Transaction[] = [
  makeTx({ id: 'a', type: 'income', amount: 5_000_000, categoryId: 'salary', date: '2026-10-01', description: 'October salary' }),
  makeTx({ id: 'b', type: 'expense', amount: 35_000, categoryId: 'food', date: '2026-10-12', description: 'Khao piak' }),
  makeTx({ id: 'c', type: 'expense', amount: 120_000, categoryId: 'transport', date: '2026-10-13', description: 'Fuel' }),
  makeTx({ id: 'd', type: 'expense', amount: 65_000, categoryId: 'food', date: '2026-10-13', description: 'Dinner' }),
  makeTx({ id: 'e', type: 'income', amount: 300_000, categoryId: 'business', date: '2026-09-28', description: 'Sold old phone' }),
  makeTx({ id: 'f', type: 'expense', amount: 1_500_000, categoryId: 'housing', date: '2026-09-30', description: 'Rent' }),
];
