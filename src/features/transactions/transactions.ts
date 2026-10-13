import type { Transaction, TransactionInput } from '../../types/transaction';
import { validateInput } from './validation';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers / non-secure contexts (e.g. http on a LAN address).
  return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class InvalidTransactionError extends Error {
  constructor(public readonly fields: string[]) {
    super(`Invalid transaction fields: ${fields.join(', ')}`);
  }
}

function assertValid(input: TransactionInput) {
  const errors = validateInput(input);
  const fields = Object.keys(errors);
  if (fields.length > 0) throw new InvalidTransactionError(fields);
}

export function createTransaction(input: TransactionInput, now: Date = new Date(), id: string = generateId()): Transaction {
  assertValid(input);
  return {
    id,
    type: input.type,
    amount: input.amount,
    currency: 'LAK',
    categoryId: input.categoryId,
    date: input.date,
    description: input.description.trim(),
    createdAt: now.toISOString(),
  };
}

export function updateTransaction(existing: Transaction, input: TransactionInput, now: Date = new Date()): Transaction {
  assertValid(input);
  return {
    ...existing,
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId,
    date: input.date,
    description: input.description.trim(),
    updatedAt: now.toISOString(),
  };
}

/** Newest first: by date, then by creation time. */
export function sortTransactions(list: readonly Transaction[]): Transaction[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return 0;
  });
}
