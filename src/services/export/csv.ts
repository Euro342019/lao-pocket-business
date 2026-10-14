import type { Transaction } from '../../types/transaction';

export interface CsvLabels {
  /** Returns the translated label for a category id. */
  category: (id: string) => string;
  /** Returns the translated label for a type. */
  type: (type: Transaction['type']) => string;
}

const HEADER = ['date', 'type', 'type_label', 'category', 'category_label', 'amount', 'currency', 'description', 'id', 'created_at', 'updated_at'];

/**
 * Characters a spreadsheet may skip before reading a formula: whitespace
 * (including no-break and full-width spaces), control characters, zero-width
 * characters and the byte-order mark.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the purpose of this pattern
const LEADING_IGNORABLE = /^[\s\u0000-\u001f\u007f\u00a0\u200b-\u200d\u2060\ufeff\u3000]*/;
/** Formula triggers, including their full-width forms (＝ ＋ － ＠). */
const FORMULA_TRIGGER = /^[=+\-@\uff1d\uff0b\uff0d\uff20]/;

/**
 * True if a spreadsheet could treat this text as a formula. Values starting
 * with a tab or carriage return are always treated as risky (OWASP guidance).
 */
export function looksLikeFormula(text: string): boolean {
  return /^[\t\r]/.test(text) || FORMULA_TRIGGER.test(text.replace(LEADING_IGNORABLE, ''));
}

/**
 * Escape one CSV field (RFC 4180). Text that a spreadsheet could treat as a
 * formula, even after leading spaces or control characters, is prefixed with
 * an apostrophe to prevent CSV/formula injection in Excel, Sheets or
 * LibreOffice. Only the exported file changes; stored data is never altered.
 */
export function escapeCsvField(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && looksLikeFormula(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Build a CSV document. Amounts are plain positive integers of whole Kip
 * (no grouping separators) so spreadsheets read them as numbers; the
 * direction is in the `type` column.
 */
export function transactionsToCsv(transactions: readonly Transaction[], labels: CsvLabels): string {
  const rows = transactions.map((tx) =>
    [
      tx.date,
      tx.type,
      labels.type(tx.type),
      tx.categoryId,
      labels.category(tx.categoryId),
      tx.amount,
      tx.currency,
      tx.description,
      tx.id,
      tx.createdAt,
      tx.updatedAt ?? '',
    ]
      .map(escapeCsvField)
      .join(','),
  );
  return [HEADER.join(','), ...rows].join('\r\n') + '\r\n';
}
