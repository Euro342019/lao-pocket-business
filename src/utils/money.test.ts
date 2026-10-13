import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT, MAX_SAFE_TOTAL, formatMoney, formatNumber, isValidAmount, normalizeDigits, parseAmount } from './money';

describe('parseAmount', () => {
  it.each([
    ['50000', 50_000],
    ['1,500,000', 1_500_000],
    ['1.500.000', 1_500_000],
    ['1 500 000', 1_500_000],
    ['  25000  ', 25_000],
    ['25,000 ₭', 25_000],
    ['25000 ກີບ', 25_000],
    ['໕໐໐໐໐', 50_000], // Lao digits
    ['๕๐,๐๐๐', 50_000], // Thai digits
    ['1', 1],
  ])('accepts %s', (input, expected) => {
    expect(parseAmount(input)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['0', 'notPositive'],
    ['000', 'notPositive'],
    ['-500', 'notPositive'],
    ['12.5', 'decimal'],
    ['1500.00', 'decimal'],
    ['1,5', 'decimal'],
    ['1,500.50', 'decimal'],
    ['abc', 'invalid'],
    ['1e6', 'invalid'],
    ['Infinity', 'invalid'],
    ['NaN', 'invalid'],
    ['12abc', 'invalid'],
    ['1,50,000', 'invalid'],
    ['1,500.000', 'decimal'],
    ['+500', 'invalid'],
    ['9999999999999999999', 'tooLarge'],
  ])('rejects %j with %s', (input, error) => {
    expect(parseAmount(input)).toEqual({ ok: false, error });
  });

  it('accepts the maximum amount and rejects one above it', () => {
    expect(parseAmount(String(MAX_AMOUNT))).toEqual({ ok: true, value: MAX_AMOUNT });
    expect(parseAmount(String(MAX_AMOUNT + 1))).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('isValidAmount', () => {
  it('only accepts positive safe integers', () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-1)).toBe(false);
    expect(isValidAmount(1.5)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
    expect(isValidAmount(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidAmount('100')).toBe(false);
    expect(isValidAmount(MAX_AMOUNT + 1)).toBe(false);
  });
});

describe('normalizeDigits', () => {
  it('converts Lao and Thai digits', () => {
    expect(normalizeDigits('໐໑໒໓໔໕໖໗໘໙')).toBe('0123456789');
    expect(normalizeDigits('๐๑๒๓๔๕๖๗๘๙')).toBe('0123456789');
  });
});

describe('formatMoney', () => {
  it('formats whole Kip with thousands separators and a ₭ suffix', () => {
    expect(formatMoney(1_500_000)).toBe('1,500,000 ₭');
    expect(formatMoney(999)).toBe('999 ₭');
    expect(formatNumber(1_234_567_890)).toBe('1,234,567,890');
  });

  it('never shows decimals', () => {
    expect(formatMoney(1000)).toBe('1,000 ₭');
    expect(formatMoney(0)).toBe('0 ₭');
  });

  it('shows signs', () => {
    expect(formatMoney(-25_000)).toBe('−25,000 ₭');
    expect(formatMoney(25_000, 'always')).toBe('+25,000 ₭');
    expect(formatMoney(0, 'always')).toBe('0 ₭');
  });
});

describe('MAX_AMOUNT boundaries (regression)', () => {
  it('MAX_AMOUNT itself is a safe integer', () => {
    expect(Number.isSafeInteger(MAX_AMOUNT)).toBe(true);
    expect(MAX_AMOUNT).toBe(999_999_999_999_999);
  });

  it('typed input: MAX_AMOUNT is accepted with any grouping, one more is rejected', () => {
    expect(parseAmount('999,999,999,999,999')).toEqual({ ok: true, value: MAX_AMOUNT });
    expect(parseAmount('999.999.999.999.999')).toEqual({ ok: true, value: MAX_AMOUNT });
    expect(parseAmount('1,000,000,000,000,000')).toEqual({ ok: false, error: 'tooLarge' });
    expect(parseAmount('໙໙໙໙໙໙໙໙໙໙໙໙໙໙໙໙')).toEqual({ ok: false, error: 'tooLarge' });
  });

  it('stored or imported values: MAX_AMOUNT is valid, MAX_AMOUNT + 1 and unsafe integers are not', () => {
    expect(isValidAmount(MAX_AMOUNT)).toBe(true);
    expect(isValidAmount(MAX_AMOUNT + 1)).toBe(false);
    expect(isValidAmount(Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(isValidAmount(Number.MAX_SAFE_INTEGER + 2)).toBe(false);
  });

  it('formats MAX_AMOUNT exactly', () => {
    expect(formatMoney(MAX_AMOUNT)).toBe('999,999,999,999,999 ₭');
    expect(formatMoney(-MAX_AMOUNT)).toBe('−999,999,999,999,999 ₭');
  });

  it('MAX_SAFE_TOTAL is Number.MAX_SAFE_INTEGER and nine maximum amounts fit below it', () => {
    expect(MAX_SAFE_TOTAL).toBe(9_007_199_254_740_991);
    expect(9 * MAX_AMOUNT).toBeLessThan(MAX_SAFE_TOTAL);
    expect(10 * MAX_AMOUNT).toBeGreaterThan(MAX_SAFE_TOTAL); // why a total limit is needed (audit L1)
  });
});
