import { useCallback, useEffect, useRef, useState } from 'react';
import type { Transaction, TransactionInput } from '../types/transaction';
import { createTransaction, updateTransaction } from '../features/transactions/transactions';
import {
  STORAGE_KEYS,
  clearAllData,
  loadTransactions,
  saveTransactions,
  type KeyValueStore,
  type LoadStatus,
  type SaveResult,
} from '../services/storage/storage';
import { mergeTransactions } from '../services/export/backup';

export interface TransactionStore {
  transactions: Transaction[];
  loadStatus: LoadStatus;
  /** Number of stored records skipped on load because they were invalid. */
  skipped: number;
  /** Set when the most recent save failed. */
  saveError: boolean;
  add: (input: TransactionInput) => Transaction;
  update: (id: string, input: TransactionInput) => void;
  remove: (id: string) => void;
  merge: (incoming: Transaction[]) => { added: number; skipped: number };
  replaceAll: (incoming: Transaction[]) => void;
  deleteAll: () => void;
}

/**
 * Owns the transaction list and keeps it in sync with storage.
 * Every change is saved immediately; failures are reported via `saveError`.
 */
export function useTransactions(store: KeyValueStore | null): TransactionStore {
  const [initial] = useState(() => loadTransactions(store));
  const [transactions, setTransactions] = useState<Transaction[]>(initial.transactions);
  const [saveError, setSaveError] = useState(false);
  const listRef = useRef(transactions);
  listRef.current = transactions;

  const commit = useCallback(
    (next: Transaction[]) => {
      listRef.current = next;
      setTransactions(next);
      const result: SaveResult = saveTransactions(store, next);
      setSaveError(!result.ok && store !== null);
    },
    [store],
  );

  // Keep several open tabs in sync: reload when another tab changes the data.
  useEffect(() => {
    if (!store) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.transactions && event.key !== null) return;
      const result = loadTransactions(store);
      if (result.status === 'ok') {
        listRef.current = result.transactions;
        setTransactions(result.transactions);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store]);

  const add = useCallback(
    (input: TransactionInput) => {
      const tx = createTransaction(input);
      commit([...listRef.current, tx]);
      return tx;
    },
    [commit],
  );

  const update = useCallback(
    (id: string, input: TransactionInput) => {
      commit(listRef.current.map((tx) => (tx.id === id ? updateTransaction(tx, input) : tx)));
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => {
      commit(listRef.current.filter((tx) => tx.id !== id));
    },
    [commit],
  );

  const merge = useCallback(
    (incoming: Transaction[]) => {
      const result = mergeTransactions(listRef.current, incoming);
      commit(result.transactions);
      return { added: result.added, skipped: result.skipped };
    },
    [commit],
  );

  const replaceAll = useCallback((incoming: Transaction[]) => commit([...incoming]), [commit]);

  const deleteAll = useCallback(() => {
    clearAllData(store);
    listRef.current = [];
    setTransactions([]);
    setSaveError(false);
  }, [store]);

  return {
    transactions,
    loadStatus: initial.status,
    skipped: initial.skipped,
    saveError,
    add,
    update,
    remove,
    merge,
    replaceAll,
    deleteAll,
  };
}
