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
import { sanitizeTransactions } from '../../features/transactions/validation';

export const STORAGE_KEYS = {
  transactions: 'lpb.v1.transactions',
  /** Raw copy of unreadable data, kept so it is not silently destroyed. */
  corruptBackup: 'lpb.v1.transactions.corrupt',
  settings: 'lpb.v1.settings',
} as const;

export const DATA_VERSION = 1;

/** The minimal subset of the Web Storage API this module needs. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadStatus = 'ok' | 'unavailable' | 'corrupt';

export interface LoadResult {
  transactions: Transaction[];
  status: LoadStatus;
  /** Records that were skipped because they were invalid. */
  skipped: number;
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

export function loadTransactions(store: KeyValueStore | null): LoadResult {
  if (!store) return { transactions: [], status: 'unavailable', skipped: 0 };

  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEYS.transactions);
  } catch {
    return { transactions: [], status: 'unavailable', skipped: 0 };
  }
  if (raw === null) return { transactions: [], status: 'ok', skipped: 0 };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    preserveCorrupt(store, raw);
    return { transactions: [], status: 'corrupt', skipped: 0 };
  }

  const list = extractList(parsed);
  if (!list) {
    preserveCorrupt(store, raw);
    return { transactions: [], status: 'corrupt', skipped: 0 };
  }

  const { valid, rejected } = sanitizeTransactions(list);
  return { transactions: valid, status: 'ok', skipped: rejected };
}

function extractList(parsed: unknown): unknown[] | null {
  if (typeof parsed !== 'object' || parsed === null) return null;
  const envelope = parsed as { version?: unknown; transactions?: unknown };
  if (envelope.version !== DATA_VERSION || !Array.isArray(envelope.transactions)) return null;
  return envelope.transactions;
}

function preserveCorrupt(store: KeyValueStore, raw: string) {
  try {
    store.setItem(STORAGE_KEYS.corruptBackup, raw);
  } catch {
    // Nothing more we can do; the app still starts with an empty list.
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

/** Remove every key this app stores. */
export function clearAllData(store: KeyValueStore | null): boolean {
  if (!store) return false;
  try {
    for (const key of Object.values(STORAGE_KEYS)) store.removeItem(key);
    return true;
  } catch {
    return false;
  }
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
