import type { Transaction } from '../../types/transaction';
import { sanitizeTransaction } from '../../features/transactions/validation';
import { calculateTotals } from '../../features/transactions/calculations';

export const BACKUP_APP_ID = 'lao-pocket-business';
export const BACKUP_VERSION = 1;
/** Refuse files larger than this to avoid freezing the browser on bad input. */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  transactions: Transaction[];
}

export function createBackup(transactions: readonly Transaction[], now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP_ID, version: BACKUP_VERSION, exportedAt: now.toISOString(), transactions: [...transactions] };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export type BackupError =
  | 'tooLarge'
  | 'notJson'
  | 'wrongFormat'
  | 'unsupportedVersion'
  | 'invalidRecords'
  | 'duplicateIds'
  | 'totalsTooLarge';

export type ParseBackupResult =
  | { ok: true; transactions: Transaction[] }
  | { ok: false; error: BackupError; invalidCount?: number };

/**
 * Validate an imported backup. The whole file is rejected if any record is
 * invalid, so a damaged file can never partially overwrite good data.
 */
export function parseBackup(text: string): ParseBackupResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'tooLarge' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false, error: 'wrongFormat' };
  const file = parsed as Record<string, unknown>;
  if (file.app !== BACKUP_APP_ID || !Array.isArray(file.transactions)) return { ok: false, error: 'wrongFormat' };
  if (file.version !== BACKUP_VERSION) return { ok: false, error: 'unsupportedVersion' };

  const transactions: Transaction[] = [];
  let invalidCount = 0;
  for (const item of file.transactions) {
    const tx = sanitizeTransaction(item);
    if (tx) transactions.push(tx);
    else invalidCount++;
  }
  if (invalidCount > 0) return { ok: false, error: 'invalidRecords', invalidCount };
  if (new Set(transactions.map((t) => t.id)).size !== transactions.length) return { ok: false, error: 'duplicateIds' };
  // Every amount is valid on its own, but their sum must also stay exactly computable.
  if (!calculateTotals(transactions).exact) return { ok: false, error: 'totalsTooLarge' };
  return { ok: true, transactions };
}

export interface MergeResult {
  transactions: Transaction[];
  added: number;
  /** Records whose id already existed here (the existing copy is kept). */
  skipped: number;
  /** Of the skipped records, how many differ from the copy kept here. */
  conflicts: number;
}

const FIELDS = ['type', 'amount', 'currency', 'categoryId', 'date', 'description', 'createdAt', 'updatedAt'] as const;
const sameContent = (a: Transaction, b: Transaction) => FIELDS.every((f) => a[f] === b[f]);

/**
 * Add imported records whose id is not already present. Existing records are
 * never changed, even if the backup holds a different (possibly newer) copy;
 * those cases are counted in `conflicts` so the user can be told.
 */
export function mergeTransactions(existing: readonly Transaction[], incoming: readonly Transaction[]): MergeResult {
  const byId = new Map(existing.map((t) => [t.id, t]));
  const toAdd: Transaction[] = [];
  let conflicts = 0;
  for (const tx of incoming) {
    const current = byId.get(tx.id);
    if (!current) toAdd.push(tx);
    else if (!sameContent(current, tx)) conflicts++;
  }
  return {
    transactions: [...existing, ...toAdd],
    added: toAdd.length,
    skipped: incoming.length - toAdd.length,
    conflicts,
  };
}
