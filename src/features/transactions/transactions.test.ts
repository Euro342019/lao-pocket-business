import { describe, expect, it } from 'vitest';
import { InvalidTransactionError, createTransaction, sortTransactions, updateTransaction } from './transactions';
import { cleanUserText, sanitizeTransaction, sanitizeTransactions, validateInput } from './validation';
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

describe('createdAt that is not ISO 8601 (audit L2)', () => {
  const iso = makeTx({ id: 'iso', date: '2026-10-13', createdAt: '2026-10-13T09:00:00.000Z' });

  it('sorts by the real moment, not by text (the audit example)', () => {
    // 08:00 UTC is earlier than 09:00 UTC, but as text "Oct…" sorts after "2026…".
    const lax = makeTx({ id: 'lax', date: '2026-10-13', createdAt: 'Tue, 13 Oct 2026 08:00:00 GMT' });
    expect(sortTransactions([lax, iso]).map((t) => t.id)).toEqual(['iso', 'lax']);
    expect(sortTransactions([iso, lax]).map((t) => t.id)).toEqual(['iso', 'lax']);
    const later = makeTx({ id: 'later', date: '2026-10-13', createdAt: 'Tue, 13 Oct 2026 10:00:00 GMT' });
    expect(sortTransactions([iso, later]).map((t) => t.id)).toEqual(['later', 'iso']);
  });

  it('the date still comes first; equal moments get a stable order by id', () => {
    const older = makeTx({ id: 'b', date: '2026-10-12', createdAt: '2030-01-01T00:00:00.000Z' });
    const twinA = makeTx({ id: 'a', date: '2026-10-13', createdAt: '2026-10-13T09:00:00.000Z' });
    expect(sortTransactions([older, twinA, iso]).map((t) => t.id)).toEqual(['a', 'iso', 'b']);
  });

  it('non-ISO values that were accepted before are still accepted and kept unchanged (no data loss)', () => {
    for (const createdAt of ['1', 'Oct 13 2026 08:00', 'Tue, 13 Oct 2026 08:00:00 GMT', '2026-10-13']) {
      const tx = sanitizeTransaction({ ...makeTx(), createdAt });
      expect(tx?.createdAt, createdAt).toBe(createdAt);
    }
  });

  it('unparseable values are still rejected, as before', () => {
    expect(sanitizeTransaction({ ...makeTx(), createdAt: 'yesterday' })).toBeNull();
    expect(sanitizeTransaction({ ...makeTx(), createdAt: '' })).toBeNull();
  });
});

describe('control and bidi-override characters (audit L4)', () => {
  it.each([
    ['RLO (U+202E)', '‮'],
    ['LRO (U+202D)', '‭'],
    ['RLE (U+202B)', '‫'],
    ['PDF (U+202C)', '‬'],
    ['RLI (U+2067)', '⁧'],
    ['PDI (U+2069)', '⁩'],
    ['NUL', '\u0000'],
    ['BEL', '\u0007'],
    ['ESC', '\u001b'],
    ['DEL', '\u007f'],
    ['C1 (U+0085)', '\u0085'],
  ])('cleanUserText removes %s', (_name, ch) => {
    expect(cleanUserText(`Rent${ch} gnp.exe`)).toBe('Rent gnp.exe');
  });

  it('keeps Lao and Thai vowel/tone marks, emoji with ZWJ, and LRM/RLM marks', () => {
    for (const text of ['ເຂົ້າປຽກເສັ້ນ', 'ข้าวมันไก่', '👨‍👩‍👧 family', 'a‎b‏c']) {
      expect(cleanUserText(text)).toBe(text);
    }
  });

  it('new and edited transactions are cleaned', () => {
    const created = createTransaction({ ...validInput, description: 'Rent ‮gnp.exe\u0007' }, NOW, 'c');
    expect(created.description).toBe('Rent gnp.exe');
    expect(updateTransaction(created, { ...validInput, description: '⁧Bonus⁩' }, NOW).description).toBe('Bonus');
  });

  it('stored or imported records are NOT changed (no data loss)', () => {
    const legacy = { ...makeTx(), description: 'Rent ‮gnp.exe', id: 'id\u0007' };
    expect(sanitizeTransaction(legacy)).toMatchObject({ description: 'Rent ‮gnp.exe', id: 'id\u0007' });
  });
});
