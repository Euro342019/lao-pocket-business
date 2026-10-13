import type { Transaction } from '../../types/transaction';

export interface CsvLabels {
  /** Returns the translated label for a category id. */
  category: (id: string) => string;
  /** Returns the translated label for a type. */
  type: (type: Transaction['type']) => string;
}

const HEADER = ['date', 'type', 'type_label', 'category', 'category_label', 'amount', 'currency', 'description', 'id', 'created_at', 'updated_at'];

/**
 * Escape one CSV field (RFC 4180). Values that a spreadsheet could treat as
 * a formula (starting with = + - @ tab or CR) are prefixed with an apostrophe
 * to prevent CSV/formula injection when the file is opened in Excel or Sheets.
 */
export function escapeCsvField(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
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
