/**
 * Money parsing and formatting.
 *
 * Amounts are stored as integers of whole Kip, so calculations are plain
 * integer additions and never suffer floating-point rounding. Formatting is
 * kept separate from calculation and only happens at display time.
 */

/** Largest amount accepted for one transaction: 999 trillion Kip (well inside Number.MAX_SAFE_INTEGER). */
export const MAX_AMOUNT = 999_999_999_999_999;

/**
 * Largest total income, and largest total expenses, the app accepts across
 * all stored transactions. Up to this value every sum (any period, category,
 * day or filter, and the net) is an exact integer. Beyond it, JavaScript
 * numbers would silently round, so changes that go past it are rejected.
 */
export const MAX_SAFE_TOTAL = Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991

export type AmountError = 'required' | 'invalid' | 'notPositive' | 'decimal' | 'tooLarge';

export type ParseAmountResult = { ok: true; value: number } | { ok: false; error: AmountError };

/** Convert Lao (໐-໙) and Thai (๐-๙) digits to ASCII digits. */
export function normalizeDigits(input: string): string {
  return input.replace(/[໐-໙๐-๙]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= 0x0ed0 ? 0x0ed0 : 0x0e50;
    return String(code - base);
  });
}

/**
 * Parse a user-entered whole-Kip amount.
 *
 * Accepts grouping with commas, spaces or dots ("1,500,000", "1 500 000",
 * "1.500.000") and Lao/Thai digits. Rejects zero, negatives, decimals,
 * exponents and anything that is not a plain whole number.
 */
export function parseAmount(raw: string): ParseAmountResult {
  const text = normalizeDigits(raw).trim().replace(/[\s  _']/g, '').replace(/₭|kip|lak|ກີບ|กีบ/gi, '');
  if (text === '') return { ok: false, error: 'required' };
  if (text.startsWith('-')) return { ok: false, error: 'notPositive' };

  let digits: string;
  if (/^\d+$/.test(text)) {
    digits = text;
  } else if (/^\d{1,3}([,.]\d{3})+$/.test(text) && !/,.*\.|\..*,/.test(text)) {
    // Consistent thousands grouping using a single separator.
    digits = text.replace(/[,.]/g, '');
  } else if (/^\d+([.,]\d+)?$/.test(text) || /^\d{1,3}(,\d{3})+\.\d+$/.test(text) || /^\d{1,3}(\.\d{3})+,\d+$/.test(text)) {
    // Looks like a decimal number. Kip amounts are whole numbers only.
    return { ok: false, error: 'decimal' };
  } else {
    return { ok: false, error: 'invalid' };
  }

  const value = Number(digits);
  if (!Number.isFinite(value) || !Number.isInteger(value)) return { ok: false, error: 'invalid' };
  if (value <= 0) return { ok: false, error: 'notPositive' };
  if (value > MAX_AMOUNT) return { ok: false, error: 'tooLarge' };
  return { ok: true, value };
}

/** True if `value` is a valid stored amount: a positive safe integer within range. */
export function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_AMOUNT;
}

/**
 * Digit grouping is the same in every language ("1,500,000"), the form most
 * commonly used for Kip in Laos. Browsers disagree on Lao locale data (some
 * group with dots, some fall back to English), so the locale is not used here.
 */
const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** Format a whole number with thousands separators, e.g. 1,500,000. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export type SignDisplay = 'auto' | 'always';

/**
 * Format a Kip amount, e.g. "1,500,000 ₭" (or "+1,500,000 ₭" / "−1,500,000 ₭").
 *
 * The Intl currency style is not used because browsers render LAK
 * inconsistently ("₭1.500.000" in Lao but "LAK 1,500,000" in Thai/English).
 */
export function formatMoney(value: number, sign: SignDisplay = 'auto'): string {
  const abs = formatNumber(Math.abs(value));
  let prefix = '';
  if (value < 0) prefix = '−';
  else if (sign === 'always' && value > 0) prefix = '+';
  return `${prefix}${abs} ₭`;
}
