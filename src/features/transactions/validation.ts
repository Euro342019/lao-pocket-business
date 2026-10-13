import type { Transaction, TransactionInput, TransactionType } from '../../types/transaction';
import { isValidCategory } from '../categories/categories';
import { isValidAmount } from '../../utils/money';
import { isValidISODate } from '../../utils/date';

export const MAX_DESCRIPTION_LENGTH = 200;

export type FieldErrors = Partial<Record<'type' | 'amount' | 'categoryId' | 'date' | 'description', string>>;

const isType = (v: unknown): v is TransactionType => v === 'income' || v === 'expense';

/** Validate user input. Returns error codes per field (empty object = valid). */
export function validateInput(input: TransactionInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!isType(input.type)) errors.type = 'invalid';
  if (!isValidAmount(input.amount)) errors.amount = 'invalid';
  if (!isType(input.type) || !isValidCategory(input.categoryId, input.type)) errors.categoryId = 'invalid';
  if (!isValidISODate(input.date)) errors.date = 'invalid';
  if (typeof input.description !== 'string' || input.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = 'tooLong';
  }
  return errors;
}

function isIsoTimestamp(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
}

/**
 * Strictly check that an unknown value (e.g. from storage or an imported
 * file) is a well-formed Transaction. Returns a clean copy or null.
 * Unknown extra properties are dropped.
 */
export function sanitizeTransaction(value: unknown): Transaction | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.length === 0 || v.id.length > 100) return null;
  if (!isType(v.type)) return null;
  if (!isValidAmount(v.amount)) return null;
  if (v.currency !== 'LAK') return null;
  if (typeof v.categoryId !== 'string' || !isValidCategory(v.categoryId, v.type)) return null;
  if (!isValidISODate(v.date)) return null;
  const description = v.description === undefined ? '' : v.description;
  if (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH) return null;
  if (!isIsoTimestamp(v.createdAt)) return null;
  if (v.updatedAt !== undefined && !isIsoTimestamp(v.updatedAt)) return null;

  const tx: Transaction = {
    id: v.id,
    type: v.type,
    amount: v.amount,
    currency: 'LAK',
    categoryId: v.categoryId,
    date: v.date,
    description,
    createdAt: v.createdAt,
  };
  if (typeof v.updatedAt === 'string') tx.updatedAt = v.updatedAt;
  return tx;
}

/**
 * Sanitize a list. Returns the valid records, how many were rejected
 * (including duplicate ids) and the rejected values themselves, so callers
 * can keep them instead of discarding them.
 */
export function sanitizeTransactions(values: unknown[]): { valid: Transaction[]; rejected: number; rejectedItems: unknown[] } {
  const valid: Transaction[] = [];
  const rejectedItems: unknown[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const tx = sanitizeTransaction(value);
    if (tx && !seen.has(tx.id)) {
      seen.add(tx.id);
      valid.push(tx);
    } else {
      rejectedItems.push(value);
    }
  }
  return { valid, rejected: rejectedItems.length, rejectedItems };
}
