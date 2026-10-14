/**
 * M3 regression: the dashboard period follows the local date while the app
 * stays open, in the Asia/Vientiane time zone (UTC+7, no daylight saving).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { STORAGE_KEYS } from '../../services/storage/storage';
import { makeTx } from '../../tests/fixtures';
import { todayISO } from '../../utils/date';
import { msUntilNextLocalMidnight } from '../../hooks/useToday';

const originalTZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Asia/Vientiane';
});
afterAll(() => {
  if (originalTZ === undefined) delete process.env.TZ;
  else process.env.TZ = originalTZ;
});
afterEach(() => vi.useRealTimers());

/** A moment in Vientiane local time. */
const vientiane = (y: number, m: number, d: number, h: number, min: number, s = 0) => new Date(y, m - 1, d, h, min, s);

function seed(transactions: unknown[]) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ language: 'en' }));
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify({ version: 1, transactions }));
}

function start(now: Date) {
  // shouldAdvanceTime lets userEvent's own short delays run; midnight is still reached only via advanceTimersByTime.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(now);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />);
  return user;
}

const expense = () => screen.getByTestId('total-expense');

describe('time zone setup', () => {
  it('runs in Asia/Vientiane (UTC+7)', () => {
    const fivePmUtc = new Date(Date.UTC(2026, 9, 12, 17, 0));
    expect(fivePmUtc.getHours()).toBe(0);
    expect(fivePmUtc.getDate()).toBe(13);
    expect(fivePmUtc.getTimezoneOffset()).toBe(-420);
  });

  it('"today" is the Vientiane date, not the UTC date (06:30 local = 23:30 UTC the day before)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 12, 23, 30)));
    expect(todayISO()).toBe('2026-10-13');
  });

  it('msUntilNextLocalMidnight counts to local, not UTC, midnight', () => {
    expect(msUntilNextLocalMidnight(vientiane(2026, 10, 13, 23, 59, 0))).toBe(60_500);
    expect(msUntilNextLocalMidnight(vientiane(2026, 10, 13, 7, 0, 0))).toBe(17 * 3_600_000 + 500);
  });
});

describe('dashboard periods roll over at local midnight while the app is open', () => {
  it('"Today" switches to the new day by itself', async () => {
    seed([
      makeTx({ id: 'd13', date: '2026-10-13', amount: 1_000 }),
      makeTx({ id: 'd14', date: '2026-10-14', amount: 5_000 }),
    ]);
    const user = start(vientiane(2026, 10, 13, 23, 59, 0));
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(expense()).toHaveTextContent('1,000 ₭');

    act(() => void vi.advanceTimersByTime(61_000)); // 00:00:01 on 14 Oct
    expect(expense()).toHaveTextContent('5,000 ₭');
  });

  it('a transaction added just after midnight is counted in "Today" (the audit scenario)', async () => {
    seed([makeTx({ id: 'y', date: '2026-10-13', amount: 1_000 })]);
    const user = start(vientiane(2026, 10, 13, 23, 58, 0));
    await user.click(screen.getByRole('button', { name: 'Today' }));
    act(() => void vi.advanceTimersByTime(7 * 60_000)); // 00:05
    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Date')).toHaveValue('2026-10-14');
    await user.type(within(dialog).getByLabelText('Amount (Kip)'), '5000');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(expense()).toHaveTextContent('5,000 ₭');
  });

  it('"This week" moves from Sunday to the new Monday-to-Sunday week', async () => {
    seed([
      makeTx({ id: 'sun', date: '2026-10-18', amount: 2_000 }),
      makeTx({ id: 'mon', date: '2026-10-19', amount: 3_000 }),
    ]);
    const user = start(vientiane(2026, 10, 18, 23, 59, 30)); // Sunday
    await user.click(screen.getByRole('button', { name: 'This week' }));
    expect(expense()).toHaveTextContent('2,000 ₭');
    act(() => void vi.advanceTimersByTime(31_000));
    expect(expense()).toHaveTextContent('3,000 ₭');
  });

  it('"This month" moves across the month and year boundary (31 Dec → 1 Jan)', async () => {
    seed([
      makeTx({ id: 'dec', date: '2026-12-31', amount: 4_000 }),
      makeTx({ id: 'jan', date: '2027-01-01', amount: 6_000 }),
    ]);
    start(vientiane(2026, 12, 31, 23, 59, 50)); // "This month" is the default
    expect(expense()).toHaveTextContent('4,000 ₭');
    act(() => void vi.advanceTimersByTime(11_000));
    expect(expense()).toHaveTextContent('6,000 ₭');
  });

  it('after the phone wakes up (timers paused), the date is re-checked when the page becomes visible', async () => {
    seed([
      makeTx({ id: 'a', date: '2026-10-13', amount: 1_000 }),
      makeTx({ id: 'b', date: '2026-10-15', amount: 9_000 }),
    ]);
    const user = start(vientiane(2026, 10, 13, 22, 0));
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(expense()).toHaveTextContent('1,000 ₭');
    // The clock jumps two days without any timer firing (device asleep).
    vi.setSystemTime(vientiane(2026, 10, 15, 8, 0));
    expect(expense()).toHaveTextContent('1,000 ₭');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(expense()).toHaveTextContent('9,000 ₭');
  });

  it('a custom range chosen by the user is not changed at midnight', async () => {
    seed([makeTx({ id: 'a', date: '2026-10-01', amount: 7_000 })]);
    const user = start(vientiane(2026, 10, 13, 23, 59, 0));
    await user.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-01');
    act(() => void vi.advanceTimersByTime(120_000));
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('To')).toHaveValue('2026-10-31');
    expect(expense()).toHaveTextContent('7,000 ₭');
  });
});
