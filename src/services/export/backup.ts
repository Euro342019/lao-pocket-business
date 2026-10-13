import type { Transaction } from '../../types/transaction';
import { sanitizeTransaction } from '../../features/transactions/validation';

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

export type BackupError = 'tooLarge' | 'notJson' | 'wrongFormat' | 'unsupportedVersion' | 'invalidRecords' | 'duplicateIds';

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
  return { ok: true, transactions };
}

export interface MergeResult {
  transactions: Transaction[];
  added: number;
  skipped: number;
}

/** Add imported records whose id is not already present. Existing records are never changed. */
export function mergeTransactions(existing: readonly Transaction[], incoming: readonly Transaction[]): MergeResult {
  const ids = new Set(existing.map((t) => t.id));
  const toAdd = incoming.filter((t) => !ids.has(t.id));
  return { transactions: [...existing, ...toAdd], added: toAdd.length, skipped: incoming.length - toAdd.length };
}
