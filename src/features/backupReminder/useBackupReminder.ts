import { useCallback, useState } from 'react';
import type { KeyValueStore } from '../../services/storage/storage';
import {
  isReminderDue,
  loadReminderState,
  markDismissedThisSession,
  saveReminderState,
  wasDismissedThisSession,
  withBackup,
  withMarkedDone,
  withSnooze,
  type ReminderState,
} from './reminder';

export interface BackupReminder {
  state: ReminderState;
  /** Whether the reminder card is shown. */
  visible: boolean;
  /** Call after a JSON backup download was actually started. */
  recordBackup: () => void;
  /** The user says they already have a recent backup. */
  markDone: () => void;
  /** Hide for now ("Remind me later"). */
  snooze: () => void;
  /** Forget everything (after "Delete all data"). */
  reset: () => void;
}

/**
 * Whether the reminder is due is decided once, when the app starts. It never
 * appears in the middle of a session (e.g. while entering a transaction),
 * and once hidden it stays hidden until the next session.
 */
export function useBackupReminder(store: KeyValueStore | null, transactionCountAtStart: number): BackupReminder {
  const [state, setState] = useState(() => loadReminderState(store, new Date()));
  const [visible, setVisible] = useState(
    () => !wasDismissedThisSession() && isReminderDue(state, new Date(), transactionCountAtStart),
  );

  const update = useCallback(
    (change: (s: ReminderState, now: Date) => ReminderState) => {
      setState((prev) => {
        const next = change(prev, new Date());
        saveReminderState(store, next);
        return next;
      });
    },
    [store],
  );

  const hide = useCallback(() => {
    setVisible(false);
    markDismissedThisSession();
  }, []);

  return {
    state,
    visible,
    recordBackup: useCallback(() => {
      update(withBackup);
      hide();
    }, [update, hide]),
    markDone: useCallback(() => {
      update(withMarkedDone);
      hide();
    }, [update, hide]),
    snooze: useCallback(() => {
      update(withSnooze);
      hide();
    }, [update, hide]),
    reset: useCallback(() => {
      const fresh = { firstSeenAt: new Date().toISOString() };
      saveReminderState(store, fresh);
      setState(fresh);
      setVisible(false);
    }, [store]),
  };
}
