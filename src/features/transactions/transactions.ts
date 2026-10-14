import type { Transaction, TransactionInput } from '../../types/transaction';
import { cleanUserText, validateInput } from './validation';

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
    description: cleanUserText(input.description).trim(),
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
    description: cleanUserText(input.description).trim(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Newest first: by date, then by the moment the record was created.
 *
 * createdAt is compared as a point in time, not as text: the app writes ISO
 * 8601 (where both orders agree), but records restored from older or edited
 * backups may hold other formats that Date.parse accepts. Those values are
 * kept exactly as stored; only the ordering uses their parsed time.
 */
export function sortTransactions(list: readonly Transaction[]): Transaction[] {
  const time = (tx: Transaction) => {
    const t = Date.parse(tx.createdAt);
    return Number.isNaN(t) ? 0 : t;
  };
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    const diff = time(b) - time(a);
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; // stable, deterministic order for equal times
  });
}
