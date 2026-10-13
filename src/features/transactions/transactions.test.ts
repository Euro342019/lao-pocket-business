import { describe, expect, it } from 'vitest';
import { InvalidTransactionError, createTransaction, sortTransactions, updateTransaction } from './transactions';
import { sanitizeTransaction, sanitizeTransactions, validateInput } from './validation';
import { makeTx } from '../../tests/fixtures';
import type { TransactionInput } from '../../types/transaction';

const NOW = new Date('2026-10-13T08:00:00.000Z');
const validInput: TransactionInput = { type: 'expense', amount: 45_000, categoryId: 'food', date: '2026-10-13', description: '  Lunch ' };

describe('createTransaction', () => {
  it('creates an expense with id, currency and timestamp', () => {
    const tx = createTransaction(validInput, NOW, 'id-1');
    expect(tx).toEqual({
      id: 'id-1',
      type: 'expense',
      amount: 45_000,
      currency: 'LAK',
      categoryId: 'food',
      date: '2026-10-13',
      description: 'Lunch',
      createdAt: '2026-10-13T08:00:00.000Z',
    });
  });

  it('creates an income', () => {
    const tx = createTransaction({ ...validInput, type: 'income', categoryId: 'salary', amount: 4_000_000 }, NOW);
    expect(tx.type).toBe('income');
    expect(tx.id).toBeTruthy();
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createTransaction(validInput).id));
    expect(ids.size).toBe(50);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1e20])('rejects amount %s', (amount) => {
    expect(() => createTransaction({ ...validInput, amount })).toThrow(InvalidTransactionError);
  });

  it('rejects a category that does not match the type', () => {
    expect(validateInput({ ...validInput, categoryId: 'salary' })).toHaveProperty('categoryId');
    expect(() => createTransaction({ ...validInput, categoryId: 'salary' })).toThrow(InvalidTransactionError);
  });

  it('rejects an invalid date', () => {
    expect(() => createTransaction({ ...validInput, date: '2026-02-30' })).toThrow(InvalidTransactionError);
  });
});

describe('updateTransaction', () => {
  it('changes fields, keeps id and createdAt, sets updatedAt', () => {
    const original = createTransaction(validInput, NOW, 'keep-me');
    const later = new Date('2026-10-14T00:00:00.000Z');
    const updated = updateTransaction(original, { ...validInput, type: 'income', categoryId: 'allowance', amount: 200_000 }, later);
    expect(updated.id).toBe('keep-me');
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).toBe('2026-10-14T00:00:00.000Z');
    expect(updated.amount).toBe(200_000);
    expect(updated.type).toBe('income');
  });

  it('rejects invalid edits', () => {
    expect(() => updateTransaction(makeTx(), { ...validInput, amount: -5 })).toThrow(InvalidTransactionError);
  });
});

describe('sortTransactions', () => {
  it('sorts newest date first, then newest created first', () => {
    const list = [
      makeTx({ id: 'old', date: '2026-10-01' }),
      makeTx({ id: 'new-early', date: '2026-10-13', createdAt: '2026-10-13T01:00:00.000Z' }),
      makeTx({ id: 'new-late', date: '2026-10-13', createdAt: '2026-10-13T09:00:00.000Z' }),
    ];
    expect(sortTransactions(list).map((t) => t.id)).toEqual(['new-late', 'new-early', 'old']);
  });
});

describe('sanitizeTransaction', () => {
  it('accepts a valid record and drops unknown fields', () => {
    const tx = sanitizeTransaction({ ...makeTx({ id: 'ok' }), extra: '<script>' });
    expect(tx).not.toBeNull();
    expect(tx).not.toHaveProperty('extra');
  });

  it.each([
    ['null', null],
    ['array', []],
    ['missing id', { ...makeTx(), id: '' }],
    ['bad type', { ...makeTx(), type: 'transfer' }],
    ['string amount', { ...makeTx(), amount: '5000' }],
    ['float amount', { ...makeTx(), amount: 10.5 }],
    ['zero amount', { ...makeTx(), amount: 0 }],
    ['other currency', { ...makeTx(), currency: 'USD' }],
    ['unknown category', { ...makeTx(), categoryId: 'casino' }],
    ['bad date', { ...makeTx(), date: '2026-13-40' }],
    ['bad createdAt', { ...makeTx(), createdAt: 'yesterday' }],
    ['long description', { ...makeTx(), description: 'x'.repeat(201) }],
  ])('rejects %s', (_label, value) => {
    expect(sanitizeTransaction(value)).toBeNull();
  });

  it('sanitizeTransactions reports rejected and duplicate records', () => {
    const result = sanitizeTransactions([makeTx({ id: '1' }), makeTx({ id: '1' }), { bad: true }, makeTx({ id: '2' })]);
    expect(result.valid.map((t) => t.id)).toEqual(['1', '2']);
    expect(result.rejected).toBe(2);
  });
});
