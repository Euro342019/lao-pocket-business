import { describe, expect, it } from 'vitest';
import { addDays, daysInRange, formatDate, formatDateTime, getPeriodRange, isInRange, isValidISODate, toISODate } from './date';

// Tuesday 13 October 2026, local time
const NOW = new Date(2026, 9, 13, 15, 30);

describe('getPeriodRange', () => {
  it('today', () => {
    expect(getPeriodRange('today', NOW)).toEqual({ from: '2026-10-13', to: '2026-10-13' });
  });

  it('this week runs Monday to Sunday', () => {
    expect(getPeriodRange('week', NOW)).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    // A Sunday belongs to the week that started the previous Monday
    expect(getPeriodRange('week', new Date(2026, 9, 18, 9))).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    // A Monday starts a new week
    expect(getPeriodRange('week', new Date(2026, 9, 19, 9))).toEqual({ from: '2026-10-19', to: '2026-10-25' });
  });

  it('this month includes all days of the month', () => {
    expect(getPeriodRange('month', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(getPeriodRange('month', new Date(2028, 1, 10))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('custom uses the given range and swaps reversed dates', () => {
    expect(getPeriodRange('custom', NOW, { from: '2026-01-01', to: '2026-03-31' })).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(getPeriodRange('custom', NOW, { from: '2026-03-31', to: '2026-01-01' })).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(getPeriodRange('custom', NOW, { from: 'bad', to: '' })).toEqual({ from: '2026-10-13', to: '2026-10-13' });
  });

  it('handles week ranges across a year boundary', () => {
    expect(getPeriodRange('week', new Date(2027, 0, 1))).toEqual({ from: '2026-12-28', to: '2027-01-03' });
  });
});

describe('date helpers', () => {
  it('isValidISODate', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('13/10/2026')).toBe(false);
    expect(isValidISODate(20261013)).toBe(false);
  });

  it('isInRange is inclusive', () => {
    const range = { from: '2026-10-01', to: '2026-10-31' };
    expect(isInRange('2026-10-01', range)).toBe(true);
    expect(isInRange('2026-10-31', range)).toBe(true);
    expect(isInRange('2026-09-30', range)).toBe(false);
    expect(isInRange('2026-11-01', range)).toBe(false);
  });

  it('addDays and daysInRange', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysInRange({ from: '2026-10-01', to: '2026-10-31' })).toBe(31);
    expect(daysInRange({ from: '2026-10-13', to: '2026-10-13' })).toBe(1);
  });

  it('toISODate uses the local calendar date', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('formats dates with bundled month names and Gregorian years', () => {
    expect(formatDate('2026-10-13', 'en-US')).toBe('13 Oct 2026');
    expect(formatDate('2026-10-13', 'th-TH')).toBe('13 ต.ค. 2026');
    expect(formatDate('2026-10-13', 'lo-LA')).toBe('13 ຕຸລາ 2026');
    expect(formatDate('2026-01-05', 'lo-LA', 'short')).toBe('5 ມັງກອນ');
  });

  it('formats timestamps in local time', () => {
    const local = new Date(2026, 9, 13, 9, 5);
    expect(formatDateTime(local.toISOString(), 'en-US')).toBe('13 Oct 2026, 09:05');
    expect(formatDateTime('not a date', 'en-US')).toBe('');
  });
});
