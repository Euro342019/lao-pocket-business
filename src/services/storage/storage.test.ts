import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  clearAllData,
  clearUnreadableMainData,
  loadSettings,
  loadTransactions,
  saveSetting,
  saveTransactions,
  type KeyValueStore,
} from './storage';
import { SAMPLE, makeTx } from '../../tests/fixtures';

type TestStore = KeyValueStore & {
  data: Map<string, string>;
  writes: string[];
  /** Make setItem throw (QuotaExceededError) for matching keys. */
  failSet: (key: string) => boolean;
  /** Make removeItem throw for matching keys. */
  failRemove: (key: string) => boolean;
  /** Make removeItem silently do nothing for matching keys. */
  ignoreRemove: (key: string) => boolean;
};

function memoryStore(initial: Record<string, string> = {}): TestStore {
  const data = new Map(Object.entries(initial));
  const store: TestStore = {
    data,
    writes: [],
    failSet: () => false,
    failRemove: () => false,
    ignoreRemove: () => false,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (store.failSet(k)) throw new DOMException('full', 'QuotaExceededError');
      store.writes.push(k);
      data.set(k, v);
    },
    removeItem: (k) => {
      if (store.failRemove(k)) throw new Error('removeItem failed');
      if (!store.ignoreRemove(k)) data.delete(k);
    },
  };
  return store;
}

const envelope = (transactions: unknown[], version = 1) => JSON.stringify({ version, transactions });
const mainIds = (store: TestStore) =>
  (JSON.parse(store.data.get(STORAGE_KEYS.transactions)!).transactions as { id: string }[]).map((t) => t.id);
const asideRecords = (store: TestStore) =>
  store.data.has(STORAGE_KEYS.unreadable) ? (JSON.parse(store.data.get(STORAGE_KEYS.unreadable)!).records as { id?: string }[]) : [];
/** A record from a hypothetical newer version (category unknown to this one). */
const future = (id: string) => ({ ...makeTx({ id }), categoryId: 'pets' });

describe('transaction storage', () => {
  const ok = (transactions: unknown[], extra = {}) => ({ transactions, status: 'ok', movedAside: 0, setAside: 0, restored: 0, ...extra });

  it('round-trips transactions', () => {
    const store = memoryStore();
    expect(saveTransactions(store, SAMPLE)).toEqual({ ok: true });
    expect(loadTransactions(store)).toEqual(ok(SAMPLE));
  });

  it('returns an empty list when nothing is stored', () => {
    expect(loadTransactions(memoryStore())).toEqual(ok([]));
  });

  it('reports unavailable storage without throwing', () => {
    expect(loadTransactions(null).status).toBe('unavailable');
    expect(saveTransactions(null, SAMPLE)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('handles storage that throws on access', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {},
    };
    expect(loadTransactions(throwing).status).toBe('unavailable');
    expect(saveTransactions(throwing, SAMPLE)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('reports a full storage quota', () => {
    const full = memoryStore();
    full.failSet = () => true;
    expect(saveTransactions(full, SAMPLE)).toEqual({ ok: false, reason: 'quota' });
  });
});

describe('unreadable stored data is never overwritten (read-only statuses)', () => {
  it('corrupt JSON: status corrupt, raw text returned, nothing written', () => {
    const store = memoryStore({ [STORAGE_KEYS.transactions]: '{not json' });
    const result = loadTransactions(store);
    expect(result.status).toBe('corrupt');
    expect(result.raw).toBe('{not json');
    expect(result.transactions).toEqual([]);
    expect(store.writes).toEqual([]);
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe('{not json');
  });

  it('wrong structure: status corrupt, nothing written', () => {
    const store = memoryStore({ [STORAGE_KEYS.transactions]: JSON.stringify([1, 2, 3]) });
    expect(loadTransactions(store).status).toBe('corrupt');
    expect(store.writes).toEqual([]);
  });

  it('data from a newer app version: status newerVersion, nothing written', () => {
    const raw = envelope([makeTx()], 2);
    const store = memoryStore({ [STORAGE_KEYS.transactions]: raw });
    expect(loadTransactions(store)).toMatchObject({ status: 'newerVersion', raw });
    expect(store.writes).toEqual([]);
  });

  it('a large corrupt value does not need a copy (the regression from the audit: copy failed silently)', () => {
    const raw = '{"version":1,"transactions":[' + 'x'.repeat(100_000);
    const store = memoryStore({ [STORAGE_KEYS.transactions]: raw });
    store.failSet = () => true; // storage full
    expect(loadTransactions(store).status).toBe('corrupt');
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(raw);
  });

  it('clearUnreadableMainData removes only the main data (and the legacy copy)', () => {
    const store = memoryStore({
      [STORAGE_KEYS.transactions]: '{bad',
      [STORAGE_KEYS.corruptBackup]: 'old copy',
      [STORAGE_KEYS.settings]: '{"language":"en"}',
    });
    expect(clearUnreadableMainData(store)).toEqual({ ok: true, remaining: [] });
    expect([...store.data.keys()]).toEqual([STORAGE_KEYS.settings]);
  });
});

describe('unreadable records are set aside, never dropped', () => {
  it('moves them to the set-aside key, then rewrites the main list without them', () => {
    const store = memoryStore({
      [STORAGE_KEYS.transactions]: envelope([makeTx({ id: 'good' }), future('f1'), 'garbage']),
    });
    const result = loadTransactions(store);
    expect(result).toMatchObject({ status: 'ok', movedAside: 2, setAside: 2 });
    expect(result.transactions.map((t) => t.id)).toEqual(['good']);
    expect(mainIds(store)).toEqual(['good']);
    expect(asideRecords(store)).toEqual([future('f1'), 'garbage']);
    // The set-aside copy was written before the main list was changed.
    expect(store.writes).toEqual([STORAGE_KEYS.unreadable, STORAGE_KEYS.transactions, STORAGE_KEYS.unreadable]);
  });

  it('duplicate ids are set aside too, not dropped', () => {
    const store = memoryStore({ [STORAGE_KEYS.transactions]: envelope([makeTx({ id: 'd', amount: 1 }), makeTx({ id: 'd', amount: 2 })]) });
    loadTransactions(store);
    expect(asideRecords(store)).toEqual([makeTx({ id: 'd', amount: 2 })]);
  });

  it('when the set-aside copy cannot be written: quarantineFailed, main data untouched', () => {
    const raw = envelope([makeTx({ id: 'good' }), future('f1')]);
    const store = memoryStore({ [STORAGE_KEYS.transactions]: raw });
    store.failSet = (k) => k === STORAGE_KEYS.unreadable;
    const result = loadTransactions(store);
    expect(result).toMatchObject({ status: 'quarantineFailed', raw });
    expect(result.transactions.map((t) => t.id)).toEqual(['good']);
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(raw);
  });

  it('when the main rewrite fails after the copy, every record is still stored and a reload does not duplicate it', () => {
    const store = memoryStore({ [STORAGE_KEYS.transactions]: envelope([makeTx({ id: 'good' }), future('f1')]) });
    store.failSet = (k) => k === STORAGE_KEYS.transactions;
    loadTransactions(store);
    expect(asideRecords(store)).toEqual([future('f1')]);
    expect(store.data.get(STORAGE_KEYS.transactions)).toContain('"pets"'); // still in main too
    store.failSet = () => false;
    loadTransactions(store);
    expect(asideRecords(store)).toEqual([future('f1')]);
    expect(mainIds(store)).toEqual(['good']);
  });

  it('restores set-aside records that this version can read (e.g. after going back to a newer version)', () => {
    const store = memoryStore({
      [STORAGE_KEYS.transactions]: envelope([makeTx({ id: 'a' })]),
      [STORAGE_KEYS.unreadable]: JSON.stringify({ version: 1, records: [makeTx({ id: 'b' }), future('still-unknown')] }),
    });
    const result = loadTransactions(store);
    expect(result).toMatchObject({ status: 'ok', restored: 1, setAside: 1 });
    expect(mainIds(store)).toEqual(['a', 'b']);
    expect(asideRecords(store)).toEqual([future('still-unknown')]);
  });

  it('drops a set-aside copy only when that id is already in the main list', () => {
    const store = memoryStore({
      [STORAGE_KEYS.transactions]: envelope([makeTx({ id: 'a' })]),
      [STORAGE_KEYS.unreadable]: JSON.stringify({ version: 1, records: [makeTx({ id: 'a' })] }),
    });
    loadTransactions(store);
    expect(store.data.has(STORAGE_KEYS.unreadable)).toBe(false);
    expect(mainIds(store)).toEqual(['a']);
  });

  it('an unreadable set-aside key is never overwritten', () => {
    const store = memoryStore({
      [STORAGE_KEYS.transactions]: envelope([makeTx({ id: 'a' }), future('f')]),
      [STORAGE_KEYS.unreadable]: '{broken',
    });
    expect(loadTransactions(store).status).toBe('quarantineFailed');
    expect(store.data.get(STORAGE_KEYS.unreadable)).toBe('{broken');
    expect(store.writes).toEqual([]);
  });
});

describe('clearAllData', () => {
  function fullStore() {
    const store = memoryStore();
    saveTransactions(store, SAMPLE);
    saveSetting(store, 'language', 'en');
    store.setItem(STORAGE_KEYS.corruptBackup, 'legacy');
    store.setItem(STORAGE_KEYS.unreadable, JSON.stringify({ version: 1, records: [future('x')] }));
    store.setItem(STORAGE_KEYS.backupReminder, '{}');
    store.setItem('unrelated', 'keep');
    return store;
  }

  it('removes every app key and keeps unrelated keys', () => {
    const store = fullStore();
    expect(clearAllData(store)).toEqual({ ok: true, remaining: [] });
    expect([...store.data.keys()]).toEqual(['unrelated']);
  });

  it('when removeItem throws on the first key, still removes the others and reports failure', () => {
    const store = fullStore();
    store.failRemove = (k) => k === STORAGE_KEYS.transactions;
    expect(clearAllData(store)).toEqual({ ok: false, remaining: [STORAGE_KEYS.transactions] });
    expect([...store.data.keys()].sort()).toEqual([STORAGE_KEYS.transactions, 'unrelated'].sort());
  });

  it('when removeItem throws on a key in the middle, the keys after it are still removed', () => {
    const store = fullStore();
    store.failRemove = (k) => k === STORAGE_KEYS.unreadable;
    const result = clearAllData(store);
    expect(result.ok).toBe(false);
    expect(result.remaining).toEqual([STORAGE_KEYS.unreadable]);
    expect(store.data.has(STORAGE_KEYS.settings)).toBe(false);
    expect(store.data.has(STORAGE_KEYS.backupReminder)).toBe(false);
  });

  it('detects a removeItem that silently does nothing (verifies by reading back)', () => {
    const store = fullStore();
    store.ignoreRemove = (k) => k === STORAGE_KEYS.settings;
    expect(clearAllData(store)).toEqual({ ok: false, remaining: [STORAGE_KEYS.settings] });
  });

  it('reports failure without storage', () => {
    expect(clearAllData(null).ok).toBe(false);
  });
});

describe('settings storage', () => {
  it('saves and loads settings, ignoring corrupt values', () => {
    const store = memoryStore();
    saveSetting(store, 'language', 'th');
    saveSetting(store, 'theme', 'dark');
    expect(loadSettings(store)).toEqual({ language: 'th', theme: 'dark' });
    store.setItem(STORAGE_KEYS.settings, '][');
    expect(loadSettings(store)).toEqual({});
    expect(loadSettings(null)).toEqual({});
  });
});
