/**
 * Weekly backup reminder: pure logic and local persistence.
 *
 * Everything happens in the browser. There is no server, push service or
 * scheduled notification: the reminder is only checked when the app opens.
 */
import { STORAGE_KEYS, type KeyValueStore } from '../../services/storage/storage';

export const DAY_MS = 86_400_000;
/** Remind when the last backup is at least this old. */
export const BACKUP_INTERVAL_DAYS = 7;
/** "Remind me later" hides the reminder for this long. */
export const SNOOZE_DAYS = 1;

export interface ReminderState {
  /** When reminder tracking started on this device (so new users are not reminded on day one). */
  firstSeenAt: string;
  /** When the app last started a JSON backup download. Only set by a real export. */
  lastBackupAt?: string;
  /** When the user said they already have a backup (their own statement, not verified). */
  lastMarkedDoneAt?: string;
  /** The reminder stays hidden until this time ("Remind me later"). */
  snoozedUntil?: string;
}

const isTimestamp = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));

/** Validate stored data; invalid optional fields are dropped. */
export function sanitizeReminderState(value: unknown): ReminderState | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isTimestamp(v.firstSeenAt)) return null;
  const state: ReminderState = { firstSeenAt: v.firstSeenAt };
  if (isTimestamp(v.lastBackupAt)) state.lastBackupAt = v.lastBackupAt;
  if (isTimestamp(v.lastMarkedDoneAt)) state.lastMarkedDoneAt = v.lastMarkedDoneAt;
  if (isTimestamp(v.snoozedUntil)) state.snoozedUntil = v.snoozedUntil;
  return state;
}

/** Load the state, creating (and saving) a fresh one when missing or invalid. */
export function loadReminderState(store: KeyValueStore | null, now: Date): ReminderState {
  let parsed: unknown = null;
  try {
    const raw = store?.getItem(STORAGE_KEYS.backupReminder);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const existing = sanitizeReminderState(parsed);
  if (existing) return existing;
  const fresh: ReminderState = { firstSeenAt: now.toISOString() };
  saveReminderState(store, fresh);
  return fresh;
}

export function saveReminderState(store: KeyValueStore | null, state: ReminderState): void {
  try {
    store?.setItem(STORAGE_KEYS.backupReminder, JSON.stringify(state));
  } catch {
    // Non-critical: the reminder may simply show again next time.
  }
}

/** The most recent of: real backup, user-confirmed backup, start of tracking. */
export function lastSafePoint(state: ReminderState): number {
  return Math.max(
    Date.parse(state.firstSeenAt),
    state.lastBackupAt ? Date.parse(state.lastBackupAt) : 0,
    state.lastMarkedDoneAt ? Date.parse(state.lastMarkedDoneAt) : 0,
  );
}

/** Should the reminder be shown? Only when there is data worth backing up. */
export function isReminderDue(state: ReminderState, now: Date, transactionCount: number): boolean {
  if (transactionCount === 0) return false;
  if (state.snoozedUntil && Date.parse(state.snoozedUntil) > now.getTime()) return false;
  return now.getTime() - lastSafePoint(state) >= BACKUP_INTERVAL_DAYS * DAY_MS;
}

/** Whole days since the last real backup download, or null if there never was one. */
export function daysSinceBackup(state: ReminderState, now: Date): number | null {
  if (!state.lastBackupAt) return null;
  return Math.max(0, Math.floor((now.getTime() - Date.parse(state.lastBackupAt)) / DAY_MS));
}

export const withBackup = (state: ReminderState, now: Date): ReminderState => ({
  ...state,
  lastBackupAt: now.toISOString(),
  snoozedUntil: undefined,
});

export const withMarkedDone = (state: ReminderState, now: Date): ReminderState => ({
  ...state,
  lastMarkedDoneAt: now.toISOString(),
  snoozedUntil: undefined,
});

export const withSnooze = (state: ReminderState, now: Date): ReminderState => ({
  ...state,
  snoozedUntil: new Date(now.getTime() + SNOOZE_DAYS * DAY_MS).toISOString(),
});

// ---- "Already dismissed in this session" (survives a reload of the same tab) ----

const SESSION_KEY = 'lpb.backupReminder.dismissedThisSession';

export function wasDismissedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDismissedThisSession(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Without sessionStorage the in-memory state still hides it for this page.
  }
}
