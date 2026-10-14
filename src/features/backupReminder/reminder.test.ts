import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS, type KeyValueStore } from '../../services/storage/storage';
import {
  DAY_MS,
  daysSinceBackup,
  isReminderDue,
  loadReminderState,
  sanitizeReminderState,
  withBackup,
  withMarkedDone,
  withSnooze,
  type ReminderState,
} from './reminder';

const NOW = new Date('2026-10-13T10:00:00.000Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY_MS).toISOString();
const later = (days: number) => new Date(NOW.getTime() + days * DAY_MS).toISOString();

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('isReminderDue', () => {
  const state = (s: Partial<ReminderState>): ReminderState => ({ firstSeenAt: ago(30), ...s });

  it('is never due without transactions', () => {
    expect(isReminderDue(state({}), NOW, 0)).toBe(false);
  });

  it('waits 7 days after tracking starts before the first reminder', () => {
    expect(isReminderDue(state({ firstSeenAt: ago(6.9) }), NOW, 5)).toBe(false);
    expect(isReminderDue(state({ firstSeenAt: ago(7) }), NOW, 5)).toBe(true);
  });

  it('is due 7 days after the last real backup', () => {
    expect(isReminderDue(state({ lastBackupAt: ago(3) }), NOW, 5)).toBe(false);
    expect(isReminderDue(state({ lastBackupAt: ago(7) }), NOW, 5)).toBe(true);
  });

  it('respects "I already have a backup" for 7 days', () => {
    expect(isReminderDue(state({ lastBackupAt: ago(20), lastMarkedDoneAt: ago(2) }), NOW, 5)).toBe(false);
    expect(isReminderDue(state({ lastMarkedDoneAt: ago(8) }), NOW, 5)).toBe(true);
  });

  it('is hidden while snoozed and returns after the snooze ends', () => {
    expect(isReminderDue(state({ snoozedUntil: later(0.5) }), NOW, 5)).toBe(false);
    expect(isReminderDue(state({ snoozedUntil: ago(0.01) }), NOW, 5)).toBe(true);
  });
});

describe('state changes', () => {
  const base: ReminderState = { firstSeenAt: ago(30), snoozedUntil: later(1) };

  it('withBackup records the download time and clears the snooze', () => {
    expect(withBackup(base, NOW)).toEqual({ firstSeenAt: base.firstSeenAt, lastBackupAt: NOW.toISOString(), snoozedUntil: undefined });
  });

  it('withMarkedDone never sets lastBackupAt (no backup is claimed)', () => {
    const next = withMarkedDone(base, NOW);
    expect(next.lastMarkedDoneAt).toBe(NOW.toISOString());
    expect(next.lastBackupAt).toBeUndefined();
  });

  it('withSnooze hides for one day', () => {
    expect(withSnooze(base, NOW).snoozedUntil).toBe(later(1));
  });

  it('daysSinceBackup counts whole days since a real download only', () => {
    expect(daysSinceBackup({ firstSeenAt: ago(30) }, NOW)).toBeNull();
    expect(daysSinceBackup({ firstSeenAt: ago(30), lastMarkedDoneAt: ago(2) }, NOW)).toBeNull();
    expect(daysSinceBackup({ firstSeenAt: ago(30), lastBackupAt: ago(9.5) }, NOW)).toBe(9);
  });
});

describe('persistence', () => {
  it('creates and saves a fresh state on first use', () => {
    const store = memoryStore();
    const state = loadReminderState(store, NOW);
    expect(state).toEqual({ firstSeenAt: NOW.toISOString() });
    expect(JSON.parse(store.data.get(STORAGE_KEYS.backupReminder)!)).toEqual(state);
  });

  it('loads a saved state', () => {
    const saved = { firstSeenAt: ago(10), lastBackupAt: ago(2) };
    const store = memoryStore({ [STORAGE_KEYS.backupReminder]: JSON.stringify(saved) });
    expect(loadReminderState(store, NOW)).toEqual(saved);
  });

  it('replaces corrupt or invalid data with a fresh state', () => {
    expect(loadReminderState(memoryStore({ [STORAGE_KEYS.backupReminder]: '{oops' }), NOW)).toEqual({ firstSeenAt: NOW.toISOString() });
    expect(loadReminderState(memoryStore({ [STORAGE_KEYS.backupReminder]: '{"firstSeenAt":42}' }), NOW)).toEqual({
      firstSeenAt: NOW.toISOString(),
    });
  });

  it('drops invalid optional fields', () => {
    expect(sanitizeReminderState({ firstSeenAt: ago(1), lastBackupAt: 'yesterday', snoozedUntil: 5 })).toEqual({ firstSeenAt: ago(1) });
  });

  it('works without storage', () => {
    expect(loadReminderState(null, NOW)).toEqual({ firstSeenAt: NOW.toISOString() });
  });
});
