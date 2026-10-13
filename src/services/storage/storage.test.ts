import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  clearAllData,
  loadSettings,
  loadTransactions,
  saveSetting,
  saveTransactions,
  type KeyValueStore,
} from './storage';
import { SAMPLE, makeTx } from '../../tests/fixtures';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('transaction storage', () => {
  it('round-trips transactions', () => {
    const store = memoryStore();
    expect(saveTransactions(store, SAMPLE)).toEqual({ ok: true });
    expect(loadTransactions(store)).toEqual({ transactions: SAMPLE, status: 'ok', skipped: 0 });
  });

  it('returns an empty list when nothing is stored', () => {
    expect(loadTransactions(memoryStore())).toEqual({ transactions: [], status: 'ok', skipped: 0 });
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
    full.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    expect(saveTransactions(full, SAMPLE)).toEqual({ ok: false, reason: 'quota' });
  });

  it('keeps a copy of unreadable (corrupt) data and starts empty', () => {
    const store = memoryStore({ [STORAGE_KEYS.transactions]: '{not json' });
    const result = loadTransactions(store);
    expect(result).toEqual({ transactions: [], status: 'corrupt', skipped: 0 });
    expect(store.data.get(STORAGE_KEYS.corruptBackup)).toBe('{not json');
  });

  it('treats a wrong structure as corrupt', () => {
    const store = memoryStore({ [STORAGE_KEYS.transactions]: JSON.stringify([1, 2, 3]) });
    expect(loadTransactions(store).status).toBe('corrupt');
  });

  it('skips individual invalid records but keeps valid ones', () => {
    const store = memoryStore({
      [STORAGE_KEYS.transactions]: JSON.stringify({
        version: 1,
        transactions: [makeTx({ id: 'good' }), { id: 'bad', amount: -1 }, 'garbage'],
      }),
    });
    const result = loadTransactions(store);
    expect(result.transactions.map((t) => t.id)).toEqual(['good']);
    expect(result.skipped).toBe(2);
    expect(result.status).toBe('ok');
  });

  it('clearAllData removes every app key', () => {
    const store = memoryStore();
    saveTransactions(store, SAMPLE);
    saveSetting(store, 'language', 'en');
    store.setItem('unrelated', 'keep');
    expect(clearAllData(store)).toBe(true);
    expect([...store.data.keys()]).toEqual(['unrelated']);
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
