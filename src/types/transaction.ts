export type TransactionType = 'income' | 'expense';

/** Only Lao Kip is supported in this release. Kept as a field so other currencies can be added later. */
export type CurrencyCode = 'LAK';

export interface Transaction {
  /** Unique identifier (UUID when available). */
  id: string;
  type: TransactionType;
  /**
   * Amount in whole integer units of `currency` (for LAK: whole Kip).
   * Always a positive safe integer; the sign comes from `type`.
   */
  amount: number;
  currency: CurrencyCode;
  /** Language-independent category id, e.g. `food`. */
  categoryId: string;
  /** Local calendar date in `YYYY-MM-DD` form. */
  date: string;
  description: string;
  /** ISO 8601 timestamp of when the record was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last edit, if any. */
  updatedAt?: string;
}

/** The fields a user provides when creating or editing a transaction. */
export interface TransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string;
  description: string;
}
