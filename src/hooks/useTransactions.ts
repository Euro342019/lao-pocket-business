import { useCallback, useEffect, useRef, useState } from 'react';
import type { Transaction, TransactionInput } from '../types/transaction';
import { createTransaction, updateTransaction } from '../features/transactions/transactions';
import {
  STORAGE_KEYS,
  clearAllData,
  clearUnreadableMainData,
  loadTransactions,
  saveTransactions,
  type KeyValueStore,
  type LoadResult,
  type LoadStatus,
  type RemoveResult,
} from '../services/storage/storage';
import { mergeTransactions } from '../services/export/backup';
import { exceedsSafeTotals } from '../features/transactions/calculations';

/** Why a change was not applied. */
/** amountLimit: total income or expenses would exceed MAX_SAFE_TOTAL (exact calculation no longer possible). */
export type ChangeFailure = 'readOnly' | 'quota' | 'unknown' | 'amountLimit';

export type ChangeResult = { ok: true } | { ok: false; reason: ChangeFailure };

/** Read-only mode protects stored data this version cannot safely rewrite. */
export interface ReadOnlyState {
  reason: Extract<LoadStatus, 'corrupt' | 'newerVersion' | 'quarantineFailed'>;
  /** The untouched stored text, offered as a download. */
  raw: string;
}

export interface TransactionStore {
  transactions: Transaction[];
  /** 'unavailable' means the app works in memory only (no browser storage). */
  storageAvailable: boolean;
  readOnly: ReadOnlyState | null;
  /** Unreadable records currently set aside in this browser. */
  setAsideCount: number;
  add: (input: TransactionInput) => ChangeResult;
  update: (id: string, input: TransactionInput) => ChangeResult;
  remove: (id: string) => ChangeResult;
  merge: (incoming: Transaction[]) => ChangeResult & { added: number; skipped: number };
  replaceAll: (incoming: Transaction[]) => ChangeResult;
  /** Delete everything this app stores. Reports failure if anything remains. */
  deleteAll: () => RemoveResult;
  /** Read-only mode only: delete the unreadable data and start with an empty list. */
  startFresh: () => RemoveResult;
}

const READ_ONLY_STATUSES = new Set<LoadStatus>(['corrupt', 'newerVersion', 'quarantineFailed']);

function readOnlyFrom(result: LoadResult): ReadOnlyState | null {
  return READ_ONLY_STATUSES.has(result.status)
    ? { reason: result.status as ReadOnlyState['reason'], raw: result.raw ?? '' }
    : null;
}

/**
 * Owns the transaction list and keeps it in sync with storage.
 *
 * Every change is written to storage FIRST; the list on screen only changes
 * when that write succeeded. A failed change therefore never shows as saved
 * and never leaves unsaved data that could be lost.
 */
export function useTransactions(store: KeyValueStore | null): TransactionStore {
  const [initial] = useState(() => loadTransactions(store));
  const [transactions, setTransactions] = useState<Transaction[]>(initial.transactions);
  const [readOnly, setReadOnly] = useState<ReadOnlyState | null>(() => readOnlyFrom(initial));
  const [setAsideCount, setSetAsideCount] = useState(initial.setAside);
  const listRef = useRef(transactions);
  listRef.current = transactions;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  const applyLoad = useCallback((result: LoadResult) => {
    const ro = readOnlyFrom(result);
    readOnlyRef.current = ro;
    setReadOnly(ro);
    setSetAsideCount(result.setAside);
    if (result.status === 'ok' || result.status === 'quarantineFailed') {
      listRef.current = result.transactions;
      setTransactions(result.transactions);
    }
  }, []);

  const commit = useCallback(
    (next: Transaction[]): ChangeResult => {
      if (readOnlyRef.current) return { ok: false, reason: 'readOnly' };
      if (exceedsSafeTotals(next, listRef.current)) return { ok: false, reason: 'amountLimit' };
      if (store) {
        const saved = saveTransactions(store, next);
        if (!saved.ok) return { ok: false, reason: saved.reason === 'quota' ? 'quota' : 'unknown' };
      }
      // Without browser storage the app runs in memory only (a warning is shown).
      listRef.current = next;
      setTransactions(next);
      return { ok: true };
    },
    [store],
  );

  // Keep several open tabs in sync: reload when another tab changes the data.
  // With save-first there are no unsaved changes here that a reload could discard.
  useEffect(() => {
    if (!store) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.transactions && event.key !== null) return;
      applyLoad(loadTransactions(store));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store, applyLoad]);

  const add = useCallback((input: TransactionInput) => commit([...listRef.current, createTransaction(input)]), [commit]);

  const update = useCallback(
    (id: string, input: TransactionInput) =>
      commit(listRef.current.map((tx) => (tx.id === id ? updateTransaction(tx, input) : tx))),
    [commit],
  );

  const remove = useCallback((id: string) => commit(listRef.current.filter((tx) => tx.id !== id)), [commit]);

  const merge = useCallback(
    (incoming: Transaction[]) => {
      const merged = mergeTransactions(listRef.current, incoming);
      return { ...commit(merged.transactions), added: merged.added, skipped: merged.skipped };
    },
    [commit],
  );

  const replaceAll = useCallback((incoming: Transaction[]) => commit([...incoming]), [commit]);

  const deleteAll = useCallback(() => {
    if (!store) {
      listRef.current = [];
      setTransactions([]);
      return { ok: true, remaining: [] };
    }
    const removed = clearAllData(store);
    // Show what is really left on the device (everything, nothing, or part).
    applyLoad(loadTransactions(store));
    return removed;
  }, [store, applyLoad]);

  const startFresh = useCallback(() => {
    const removed = clearUnreadableMainData(store);
    if (removed.ok) applyLoad(loadTransactions(store));
    return removed;
  }, [store, applyLoad]);

  return {
    transactions,
    storageAvailable: initial.status !== 'unavailable',
    readOnly,
    setAsideCount,
    add,
    update,
    remove,
    merge,
    replaceAll,
    deleteAll,
    startFresh,
  };
}
