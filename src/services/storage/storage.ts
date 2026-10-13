/**
 * Local persistence using the browser's localStorage.
 *
 * localStorage is used instead of IndexedDB because a personal transaction
 * list is small (≈ 5 MB fits tens of thousands of records), and its
 * synchronous API keeps the code simple. All access goes through this
 * module so the backend can be swapped later.
 *
 * Important: browser storage is NOT encrypted. Anyone who can use this
 * browser profile can read it.
 */
import type { Transaction } from '../../types/transaction';
import { sanitizeTransaction, sanitizeTransactions } from '../../features/transactions/validation';

export const STORAGE_KEYS = {
  transactions: 'lpb.v1.transactions',
  /**
   * Legacy: raw copy of unreadable data written by earlier versions. No longer
   * written (unreadable data is now left untouched), but still removed by
   * "Delete all data".
   */
  corruptBackup: 'lpb.v1.transactions.corrupt',
  /** Records this version cannot read, set aside so they are never lost. */
  unreadable: 'lpb.v1.transactions.unreadable',
  settings: 'lpb.v1.settings',
  /** Weekly backup reminder state (see features/backupReminder). */
  backupReminder: 'lpb.v1.backupReminder',
} as const;

export const DATA_VERSION = 1;

/** The minimal subset of the Web Storage API this module needs. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * - ok: data loaded (possibly after setting unreadable records aside)
 * - unavailable: no browser storage; the app works in memory only
 * - corrupt: stored data cannot be parsed; it is left untouched (read-only mode)
 * - newerVersion: stored by a newer app version; left untouched (read-only mode)
 * - quarantineFailed: some records are unreadable and could not be set aside
 *   (e.g. storage full); nothing is written (read-only mode)
 */
export type LoadStatus = 'ok' | 'unavailable' | 'corrupt' | 'newerVersion' | 'quarantineFailed';

export interface LoadResult {
  transactions: Transaction[];
  status: LoadStatus;
  /** Records moved to the set-aside key during this load. */
  movedAside: number;
  /** Records currently in the set-aside key (after this load). */
  setAside: number;
  /** Set-aside records that this version can read again and were restored. */
  restored: number;
  /** The raw stored text, when the app is in read-only mode (for download). */
  raw?: string;
}

export type SaveResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' | 'unknown' };

/**
 * Return window.localStorage if it can actually be used. Accessing it can
 * throw (privacy modes, disabled cookies, sandboxed iframes).
 */
export function getBrowserStore(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__lpb_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

const result = (status: LoadStatus, extra: Partial<LoadResult> = {}): LoadResult => ({
  transactions: [],
  status,
  movedAside: 0,
  setAside: 0,
  restored: 0,
  ...extra,
});

/** Set-aside records, or null if the set-aside key itself cannot be read. */
function readSetAside(store: KeyValueStore): unknown[] | null {
  const raw = store.getItem(STORAGE_KEYS.unreadable);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; records?: unknown };
    return parsed && parsed.version === DATA_VERSION && Array.isArray(parsed.records) ? parsed.records : null;
  } catch {
    return null;
  }
}

function writeSetAside(store: KeyValueStore, records: unknown[]): boolean {
  try {
    if (records.length === 0) store.removeItem(STORAGE_KEYS.unreadable);
    else store.setItem(STORAGE_KEYS.unreadable, JSON.stringify({ version: DATA_VERSION, records }));
    return true;
  } catch {
    return false;
  }
}

/** Remove exact duplicates (same JSON) so repeated loads never multiply records. */
function dedupe(records: unknown[]): unknown[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    const key = JSON.stringify(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Load transactions. This function never destroys data:
 * - unparseable or newer-version data is left untouched (read-only status);
 * - unreadable records are first copied to the set-aside key, and only after
 *   that copy succeeded is the main list rewritten without them;
 * - set-aside records that this version can read are restored to the list.
 */
export function loadTransactions(store: KeyValueStore | null): LoadResult {
  if (!store) return result('unavailable');

  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEYS.transactions);
  } catch {
    return result('unavailable');
  }

  let list: unknown[] = [];
  if (raw !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return result('corrupt', { raw });
    }
    const envelope = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as { version?: unknown; transactions?: unknown };
    if (typeof envelope.version === 'number' && envelope.version > DATA_VERSION) return result('newerVersion', { raw });
    if (envelope.version !== DATA_VERSION || !Array.isArray(envelope.transactions)) return result('corrupt', { raw });
    list = envelope.transactions;
  }

  const { valid, rejectedItems } = sanitizeTransactions(list);

  let setAside: unknown[] | null;
  try {
    setAside = readSetAside(store);
  } catch {
    setAside = null;
  }
  if (setAside === null) {
    // The set-aside key is unreadable. Only a problem if we would need to add to it.
    if (rejectedItems.length > 0) return result('quarantineFailed', { transactions: valid, raw: raw ?? undefined });
    return result('ok', { transactions: valid });
  }

  // Set-aside records this version understands go back into the list.
  const ids = new Set(valid.map((t) => t.id));
  const restoredTx: Transaction[] = [];
  const stillAside: unknown[] = [];
  let alreadyInList = 0;
  for (const record of setAside) {
    const tx = sanitizeTransaction(record);
    if (tx && ids.has(tx.id)) alreadyInList++; // restored earlier; drop the stale copy
    else if (tx) {
      ids.add(tx.id);
      restoredTx.push(tx);
    } else stillAside.push(record);
  }

  const transactions = [...valid, ...restoredTx];
  const nothingToChange = rejectedItems.length === 0 && restoredTx.length === 0 && alreadyInList === 0;
  if (nothingToChange) return result('ok', { transactions, setAside: setAside.length });

  const finalAside = dedupe([...stillAside, ...rejectedItems]);
  // 1. Keep every record safe in the set-aside key first (restored ones included for now).
  if (rejectedItems.length > 0 && !writeSetAside(store, dedupe([...setAside, ...rejectedItems]))) {
    return result('quarantineFailed', { transactions: valid, raw: raw ?? undefined });
  }
  // 2. Rewrite the main list. If this fails, every record is still in one of the two keys.
  const mainSaved = saveTransactions(store, transactions).ok;
  // 3. Only after the main list holds the restored records, drop them from the set-aside key.
  if (mainSaved) writeSetAside(store, finalAside);

  return result('ok', {
    transactions,
    movedAside: rejectedItems.length,
    setAside: mainSaved ? finalAside.length : dedupe([...setAside, ...rejectedItems]).length,
    restored: restoredTx.length,
  });
}

/** The raw set-aside records (for download), or null when there are none. */
export function readSetAsideRaw(store: KeyValueStore | null): string | null {
  try {
    return store?.getItem(STORAGE_KEYS.unreadable) ?? null;
  } catch {
    return null;
  }
}

export function saveTransactions(store: KeyValueStore | null, transactions: readonly Transaction[]): SaveResult {
  if (!store) return { ok: false, reason: 'unavailable' };
  try {
    store.setItem(STORAGE_KEYS.transactions, JSON.stringify({ version: DATA_VERSION, transactions }));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unknown' };
  }
}

export interface RemoveResult {
  ok: boolean;
  /** Keys that are still present after the attempt. */
  remaining: string[];
}

/**
 * Remove keys one by one (a failure on one key does not stop the others),
 * then read each key back to verify it is really gone.
 */
export function removeKeys(store: KeyValueStore | null, keys: readonly string[]): RemoveResult {
  if (!store) return { ok: false, remaining: [...keys] };
  for (const key of keys) {
    try {
      store.removeItem(key);
    } catch {
      // keep going; verified below
    }
  }
  const remaining = keys.filter((key) => {
    try {
      return store.getItem(key) !== null;
    } catch {
      return true;
    }
  });
  return { ok: remaining.length === 0, remaining };
}

/** Remove every key this app stores, and report whether that really worked. */
export function clearAllData(store: KeyValueStore | null): RemoveResult {
  return removeKeys(store, Object.values(STORAGE_KEYS));
}

/** Delete only the unreadable main data (read-only mode → "Start fresh"). */
export function clearUnreadableMainData(store: KeyValueStore | null): RemoveResult {
  return removeKeys(store, [STORAGE_KEYS.transactions, STORAGE_KEYS.corruptBackup]);
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22)
  );
}

// ---- Settings (language, theme) ----

export function loadSettings(store: KeyValueStore | null): Record<string, unknown> {
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEYS.settings);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function saveSetting(store: KeyValueStore | null, key: string, value: unknown): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEYS.settings, JSON.stringify({ ...loadSettings(store), [key]: value }));
  } catch {
    // Preferences are non-critical; ignore failures.
  }
}
