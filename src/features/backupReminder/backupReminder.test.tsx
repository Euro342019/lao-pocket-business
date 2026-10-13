import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { STORAGE_KEYS } from '../../services/storage/storage';
import { makeTx } from '../../tests/fixtures';
import { DAY_MS } from './reminder';

const NOW = new Date(2026, 9, 13, 10, 0);
const ago = (days: number) => new Date(NOW.getTime() - days * DAY_MS).toISOString();

function seed({ reminder, transactions = 2, language = 'en' }: { reminder?: object; transactions?: number; language?: string }) {
  window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ language }));
  const list = Array.from({ length: transactions }, (_, i) => makeTx({ id: `t${i}`, description: `Record ${i}`, date: '2026-10-12' }));
  window.localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify({ version: 1, transactions: list }));
  if (reminder) window.localStorage.setItem(STORAGE_KEYS.backupReminder, JSON.stringify(reminder));
}

function storedReminder() {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.backupReminder) ?? 'null');
}

let blobs: Blob[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  blobs = [];
  URL.createObjectURL = vi.fn((b: Blob) => {
    blobs.push(b);
    return 'blob:test';
  }) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('when the reminder appears', () => {
  it('does not remind a new user on their first day', () => {
    seed({});
    render(<App />);
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
    expect(storedReminder()).toEqual({ firstSeenAt: NOW.toISOString() });
  });

  it('appears on the Overview when no backup was made for 7 days', () => {
    seed({ reminder: { firstSeenAt: ago(8) } });
    render(<App />);
    const card = screen.getByRole('region', { name: 'Backup reminder' });
    expect(card).toHaveTextContent('Time to back up your data');
    expect(card).toHaveTextContent('You have not downloaded a backup on this device yet.');
  });

  it('shows how many days ago the last backup was', () => {
    seed({ reminder: { firstSeenAt: ago(40), lastBackupAt: ago(10) } });
    render(<App />);
    expect(screen.getByTestId('backup-reminder')).toHaveTextContent('Your last backup download was 10 days ago.');
  });

  it('does not appear after a recent backup', () => {
    seed({ reminder: { firstSeenAt: ago(40), lastBackupAt: ago(3) } });
    render(<App />);
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
  });

  it('does not appear when there is no data to back up', () => {
    seed({ reminder: { firstSeenAt: ago(40) }, transactions: 0 });
    render(<App />);
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
  });

  it('only appears on the Overview, not on other pages', async () => {
    seed({ reminder: { firstSeenAt: ago(8) } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
  });

  it.each([
    ['lo', 'ເຖິງເວລາສຳຮອງຂໍ້ມູນແລ້ວ', 'ດາວໂຫຼດໄຟລ໌ສຳຮອງ'],
    ['th', 'ถึงเวลาสำรองข้อมูลแล้ว', 'ดาวน์โหลดไฟล์สำรอง'],
  ])('is translated (%s)', (language, title, button) => {
    seed({ reminder: { firstSeenAt: ago(8) }, language });
    render(<App />);
    const card = screen.getByTestId('backup-reminder');
    expect(card).toHaveTextContent(title);
    expect(within(card).getByRole('button', { name: button })).toBeInTheDocument();
  });
});

describe('reminder actions', () => {
  it('"Download backup" exports a real JSON file and records the backup time', async () => {
    seed({ reminder: { firstSeenAt: ago(8) } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(screen.getByTestId('backup-reminder')).getByRole('button', { name: 'Download backup' }));

    expect(blobs).toHaveLength(1);
    expect(blobs[0]!.type).toBe('application/json');
    expect(storedReminder().lastBackupAt).toBe(NOW.toISOString());
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
    expect(screen.getByText('File downloaded')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByTestId('backup-status')).toHaveTextContent('Last backup downloaded: 13 Oct 2026, 10:00');
  });

  it('"I already have a backup" hides it without claiming a backup was made', async () => {
    seed({ reminder: { firstSeenAt: ago(8) } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'I already have a backup' }));

    expect(blobs).toHaveLength(0);
    expect(storedReminder().lastMarkedDoneAt).toBe(NOW.toISOString());
    expect(storedReminder().lastBackupAt).toBeUndefined();
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
    expect(screen.getByText('Noted. You will be reminded again in 7 days.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const status = screen.getByTestId('backup-status');
    expect(status).toHaveTextContent('No backup has been downloaded from this device yet.');
    expect(status).toHaveTextContent('You marked a backup as done: 13 Oct 2026, 10:00');
  });

  it('"Remind me later" hides it for the session and snoozes for a day', async () => {
    seed({ reminder: { firstSeenAt: ago(8) } });
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Remind me later' }));
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
    expect(storedReminder().snoozedUntil).toBe(new Date(NOW.getTime() + DAY_MS).toISOString());

    // Reload in the same session: still hidden
    unmount();
    const second = render(<App />);
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
    second.unmount();

    // New session, but the snooze has not ended: hidden
    window.sessionStorage.clear();
    vi.setSystemTime(new Date(NOW.getTime() + 0.5 * DAY_MS));
    const third = render(<App />);
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
    third.unmount();

    // New session after the snooze: shown again
    vi.setSystemTime(new Date(NOW.getTime() + 2 * DAY_MS));
    render(<App />);
    expect(screen.getByTestId('backup-reminder')).toBeInTheDocument();
  });

  it('exporting from Settings also counts and hides the reminder', async () => {
    seed({ reminder: { firstSeenAt: ago(8) } });
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('backup-reminder')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Download backup (JSON)' }));
    expect(storedReminder().lastBackupAt).toBe(NOW.toISOString());
    await user.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
  });

  it('CSV export does not count as a backup', async () => {
    seed({ reminder: { firstSeenAt: ago(8) } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Export CSV (spreadsheet)' }));
    expect(storedReminder().lastBackupAt).toBeUndefined();
  });

  it('"Delete all data" resets the reminder', async () => {
    seed({ reminder: { firstSeenAt: ago(40), lastBackupAt: ago(2) } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Delete all data' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete everything' }));
    expect(storedReminder()).toEqual({ firstSeenAt: NOW.toISOString() });
    expect(screen.getByTestId('backup-status')).toHaveTextContent('No backup has been downloaded');
  });
});

describe('does not interrupt transaction entry', () => {
  it('never pops up during a session, even when data appears after start', async () => {
    seed({ reminder: { firstSeenAt: ago(30) }, transactions: 0 });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Amount (Kip)'), '15000');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    // Due by date, and now there is data, but it was not due when the app started.
    expect(screen.getByTestId('total-expense')).toHaveTextContent('15,000 ₭');
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
  });

  it('is not a dialog and does not take focus from the transaction form', async () => {
    seed({ reminder: { firstSeenAt: ago(8) } });
    const user = userEvent.setup();
    render(<App />);
    const card = screen.getByTestId('backup-reminder');
    expect(card.closest('[role="dialog"], [role="alertdialog"]')).toBeNull();
    expect(card).not.toContainElement(document.activeElement as HTMLElement);

    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Amount (Kip)')).toHaveFocus();
    await user.type(within(dialog).getByLabelText('Amount (Kip)'), '9000');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    // Still exactly one reminder card; it did not reappear or duplicate.
    expect(screen.getAllByTestId('backup-reminder')).toHaveLength(1);
  });
});

describe('without browser storage', () => {
  it('works and never shows the reminder', () => {
    render(<App store={null} />);
    expect(screen.queryByTestId('backup-reminder')).toBeNull();
  });
});
