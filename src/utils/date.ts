/**
 * Date helpers. Transaction dates are stored as local calendar dates
 * (`YYYY-MM-DD`) so a transaction never shifts to another day because of
 * time zones. `YYYY-MM-DD` strings also sort and compare correctly as text.
 */

import { MONTH_NAMES } from '../i18n/monthNames';

export type PeriodKind = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
  /** Inclusive start date, YYYY-MM-DD. */
  from: string;
  /** Inclusive end date, YYYY-MM-DD. */
  to: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Format a Date's local calendar date as YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** True if `value` is a real calendar date in YYYY-MM-DD form. */
export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  if (y < 1900 || y > 2200) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Parse YYYY-MM-DD as a local Date at noon (noon avoids DST edge cases). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Number of calendar days in an inclusive range. */
export function daysInRange(range: DateRange): number {
  const ms = parseISODate(range.to).getTime() - parseISODate(range.from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Inclusive date range for a dashboard period. Weeks start on Monday.
 * For `custom`, the given range is used (and swapped if reversed).
 */
export function getPeriodRange(kind: PeriodKind, now: Date = new Date(), custom?: Partial<DateRange>): DateRange {
  const today = toISODate(now);
  switch (kind) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const mondayOffset = (now.getDay() + 6) % 7; // Sunday=0 -> 6 days after Monday
      const from = addDays(today, -mondayOffset);
      return { from, to: addDays(from, 6) };
    }
    case 'month': {
      const from = toISODate(new Date(now.getFullYear(), now.getMonth(), 1, 12));
      const to = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 12));
      return { from, to };
    }
    case 'custom': {
      const from = custom?.from && isValidISODate(custom.from) ? custom.from : today;
      const to = custom?.to && isValidISODate(custom.to) ? custom.to : today;
      return from <= to ? { from, to } : { from: to, to: from };
    }
  }
}

export function isInRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

function monthNamesFor(locale: string): readonly string[] {
  const lang = locale.slice(0, 2);
  return lang === 'lo' || lang === 'th' ? MONTH_NAMES[lang] : MONTH_NAMES.en;
}

/**
 * Format a stored date for display: "13 ຕຸລາ 2026", "13 ต.ค. 2026", "13 Oct 2026".
 * Always uses the Gregorian year (matching the date picker) and bundled
 * month names, so the result is identical in every browser.
 */
export function formatDate(iso: string, locale: string, style: 'medium' | 'short' = 'medium'): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const month = monthNamesFor(locale)[m - 1] ?? String(m);
  return style === 'medium' ? `${d} ${month} ${y}` : `${d} ${month}`;
}

/** Format a full ISO timestamp (e.g. createdAt) for display, e.g. "13 Oct 2026, 14:05". */
export function formatDateTime(isoTimestamp: string, locale: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDate(toISODate(date), locale)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
