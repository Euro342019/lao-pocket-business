import { useEffect, useState } from 'react';
import { todayISO } from '../utils/date';

/** Milliseconds until the next local midnight (plus a small margin). */
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(1_000, next.getTime() - now.getTime() + 500);
}

/**
 * Today's local date (YYYY-MM-DD) that stays correct while the app is left
 * open: it changes at local midnight, and is re-checked whenever the page
 * becomes visible or focused again (phones pause timers while asleep).
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => setToday(todayISO());
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextLocalMidnight());
    };
    const onWake = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        schedule();
      }
    };
    schedule();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, []);

  return today;
}
