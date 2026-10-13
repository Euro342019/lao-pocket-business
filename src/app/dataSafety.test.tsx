/**
 * Regression tests for the pre-release audit findings H1–H5 (data safety):
 * nothing is shown as saved unless it was saved, failed operations never
 * change stored data, unreadable data is never overwritten, and several
 * tabs cannot destroy each other's data. Synthetic data only.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEYS, type KeyValueStore } from '../services/storage/storage';
import { makeTx } from '../tests/fixtures';

type TestStore = KeyValueStore & {
  data: Map<string, string>;
  failSet: (key: string) => boolean;
  failRemove: (key: string) => boolean;
};

function makeStore(transactions: unknown[] | string = [], extra: Record<string, string> = {}): TestStore {
  const data = new Map<string, string>([
    [STORAGE_KEYS.settings, JSON.stringify({ language: 'en' })],
    [STORAGE_KEYS.transactions, typeof transactions === 'string' ? transactions : JSON.stringify({ version: 1, transactions })],
    ...Object.entries(extra),
  ]);
  const store: TestStore = {
    data,
    failSet: () => false,
    failRemove: () => false,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (store.failSet(k)) throw new DOMException('full', 'QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k) => {
      if (store.failRemove(k)) throw new Error('removeItem failed');
      data.delete(k);
    },
  };
  return store;
}

const storedIds = (store: TestStore) =>
  (JSON.parse(store.data.get(STORAGE_KEYS.transactions) ?? '{"transactions":[]}').transactions as { id: string }[]).map((t) => t.id);
const fullStorage = (k: string) => k === STORAGE_KEYS.transactions;
const future = (id: string, description: string) => ({ ...makeTx({ id, description, date: '2026-10-12' }), categoryId: 'pets' });

type User = ReturnType<typeof userEvent.setup>;

async function openAddForm(user: User, amount: string, note: string) {
  await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
  const dialog = screen.getByRole('dialog', { name: 'Add transaction' });
  await user.type(within(dialog).getByLabelText('Amount (Kip)'), amount);
  await user.type(within(dialog).getByLabelText('Note (optional)'), note);
  return dialog;
}

/** Simulate a write made by another tab: change storage, then fire the event browsers send to other tabs. */
function otherTabWrites(store: TestStore, value: string) {
  act(() => {
    store.data.set(STORAGE_KEYS.transactions, value);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.transactions }));
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('H1: a failed save is never shown as saved', () => {
  it('adding: the form stays open with the input, no success toast, list and storage unchanged; retry works once', async () => {
    const store = makeStore([makeTx({ id: 'old', description: 'Existing', date: '2026-10-12' })]);
    const user = userEvent.setup();
    render(<App store={store} />);
    const before = store.data.get(STORAGE_KEYS.transactions);
    store.failSet = fullStorage;

    const dialog = await openAddForm(user, '7000', 'Lunch');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(within(dialog).getByTestId('form-save-error')).toHaveTextContent('Could not save: storage may be full. Nothing was changed.');
    expect(within(dialog).getByLabelText('Amount (Kip)')).toHaveValue('7000');
    expect(within(dialog).getByLabelText('Note (optional)')).toHaveValue('Lunch');
    expect(screen.queryByText('Transaction added')).toBeNull();
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(before);
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');

    // Space is freed: the same form can be saved, exactly once.
    store.failSet = () => false;
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Transaction added')).toBeInTheDocument();
    expect(storedIds(store)).toHaveLength(2);
  });

  it('editing: the record and storage stay unchanged', async () => {
    const store = makeStore([makeTx({ id: 'e', amount: 30_000, description: 'Taxi', date: '2026-10-12' })]);
    const user = userEvent.setup();
    render(<App store={store} />);
    store.failSet = fullStorage;
    await user.click(screen.getByRole('button', { name: /Taxi/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit transaction' });
    await user.clear(within(dialog).getByLabelText('Amount (Kip)'));
    await user.type(within(dialog).getByLabelText('Amount (Kip)'), '99000');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByTestId('form-save-error')).toBeInTheDocument();
    expect(screen.queryByText('Transaction updated')).toBeNull();
    expect(JSON.parse(store.data.get(STORAGE_KEYS.transactions)!).transactions[0].amount).toBe(30_000);
  });

  it('deleting: an error is shown and the record is kept', async () => {
    const store = makeStore([makeTx({ id: 'd', description: 'Keep me', date: '2026-10-12' })]);
    const user = userEvent.setup();
    render(<App store={store} />);
    store.failSet = fullStorage;
    await user.click(screen.getByRole('button', { name: /Keep me/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Could not delete the transaction: storage error. Nothing was changed.')).toBeInTheDocument();
    expect(screen.queryByText('Transaction deleted')).toBeNull();
    expect(screen.getByText('Keep me')).toBeInTheDocument();
    expect(storedIds(store)).toEqual(['d']);
  });
});

describe('H3: restore and merge report a failed save honestly', () => {
  const backup = (txs: unknown[]) =>
    new File([JSON.stringify({ app: 'lao-pocket-business', version: 1, exportedAt: '2026-10-13T00:00:00Z', transactions: txs })], 'b.json', {
      type: 'application/json',
    });

  async function importFile(user: User, store: TestStore, button: string, confirm?: string) {
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    store.failSet = fullStorage;
    await user.upload(screen.getByTestId('import-file'), backup([makeTx({ id: 'n1' }), makeTx({ id: 'n2' })]));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: button }));
    if (confirm) await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: confirm }));
  }

  it('Replace: error shown, no "Restored" message, existing data unchanged on screen and in storage', async () => {
    const store = makeStore([makeTx({ id: 'orig' })]);
    const user = userEvent.setup();
    render(<App store={store} />);
    await importFile(user, store, 'Replace all my data', 'Replace all my data');
    expect(screen.getByRole('alert')).toHaveTextContent('The backup could not be saved (storage may be full). Your existing data was not changed.');
    expect(screen.queryByText(/Restored/)).toBeNull();
    expect(screen.getByText('1 transactions stored on this device')).toBeInTheDocument();
    expect(storedIds(store)).toEqual(['orig']);
  });

  it('Merge: error shown, no "Imported" message, nothing added', async () => {
    const store = makeStore([makeTx({ id: 'orig' })]);
    const user = userEvent.setup();
    render(<App store={store} />);
    await importFile(user, store, 'Add to my data (skip duplicates)');
    expect(screen.getByRole('alert')).toHaveTextContent('The backup could not be saved');
    expect(screen.queryByText(/^Imported/)).toBeNull();
    expect(screen.getByText('1 transactions stored on this device')).toBeInTheDocument();
    expect(storedIds(store)).toEqual(['orig']);
  });
});

describe('H2: "Delete all data" only reports success when everything is gone', () => {
  async function deleteAll(user: User) {
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Delete all data' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete everything' }));
  }

  it('removeItem fails on the transactions key: error, no success toast, the remaining data is still shown', async () => {
    const store = makeStore([makeTx({ id: 'secret' })]);
    const user = userEvent.setup();
    render(<App store={store} />);
    store.failRemove = (k) => k === STORAGE_KEYS.transactions;
    await deleteAll(user);
    expect(screen.getByTestId('delete-all-error')).toHaveTextContent('Some data could not be deleted from this device.');
    expect(screen.queryByText('All data deleted')).toBeNull();
    expect(screen.getByText('1 transactions stored on this device')).toBeInTheDocument();
  });

  it('removeItem fails on a later key: error even though the transactions were removed', async () => {
    const store = makeStore([makeTx({ id: 'a' })], { [STORAGE_KEYS.corruptBackup]: 'legacy raw data' });
    const user = userEvent.setup();
    render(<App store={store} />);
    store.failRemove = (k) => k === STORAGE_KEYS.corruptBackup;
    await deleteAll(user);
    expect(screen.getByTestId('delete-all-error')).toBeInTheDocument();
    expect(screen.queryByText('All data deleted')).toBeNull();
    expect(store.data.has(STORAGE_KEYS.transactions)).toBe(false);
    expect(store.data.has(STORAGE_KEYS.settings)).toBe(false); // keys after the failing one were still removed
  });

  it('success: toast shown and no app keys remain', async () => {
    const store = makeStore([makeTx({ id: 'a' })]);
    const user = userEvent.setup();
    render(<App store={store} />);
    await deleteAll(user);
    expect(screen.getByText('All data deleted')).toBeInTheDocument();
    expect([...store.data.keys()].filter((k) => k.startsWith('lpb.v1.') && k !== STORAGE_KEYS.backupReminder)).toEqual([]);
  });
});

describe('H5: unreadable data is protected in read-only mode', () => {
  let blobs: Blob[];
  function captureDownloads() {
    blobs = [];
    URL.createObjectURL = vi.fn((b: Blob) => {
      blobs.push(b);
      return 'blob:test';
    }) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  }
  const readBlob = (blob: Blob) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blob);
    });

  it('corrupt data: warning, adding disabled, data untouched; download gives the exact raw text', async () => {
    captureDownloads();
    const raw = '{"version":1,"transactions":[{"id":"x" TRUNCATED';
    const store = makeStore(raw);
    const user = userEvent.setup();
    render(<App store={store} />);
    expect(screen.getByTestId('read-only-banner')).toHaveTextContent('Saved data could not be read. To protect it');
    for (const button of screen.getAllByRole('button', { name: /Add transaction/ })) expect(button).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Download unreadable data' }));
    expect(await readBlob(blobs[0]!)).toBe(raw);
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(raw);
  });

  it('"Start fresh" needs confirmation; cancel keeps the data, confirm deletes it and re-enables adding', async () => {
    const raw = '{broken';
    const store = makeStore(raw);
    const user = userEvent.setup();
    render(<App store={store} />);
    await user.click(screen.getByRole('button', { name: 'Start fresh' }));
    await user.click(within(screen.getByRole('alertdialog', { name: 'Delete the unreadable data?' })).getByRole('button', { name: 'Cancel' }));
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(raw);

    await user.click(screen.getByRole('button', { name: 'Start fresh' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete and start fresh' }));
    expect(store.data.has(STORAGE_KEYS.transactions)).toBe(false);
    expect(screen.queryByTestId('read-only-banner')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Add transaction/ })[0]).toBeEnabled();
  });

  it('data from a newer version: read-only, import disabled, storage untouched', async () => {
    const raw = JSON.stringify({ version: 2, transactions: [{ id: 'v2' }] });
    const store = makeStore(raw);
    const user = userEvent.setup();
    render(<App store={store} />);
    expect(screen.getByTestId('read-only-banner')).toHaveTextContent('saved by a newer version of this app');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('button', { name: 'Restore from backup' })).toBeDisabled();
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(raw);
  });

  it('records cannot be set aside (storage full): read-only, records shown but cannot be edited, no "Start fresh"', async () => {
    const store = makeStore([makeTx({ id: 'ok', description: 'Readable', date: '2026-10-12' }), future('f', 'From newer app')]);
    store.failSet = (k) => k === STORAGE_KEYS.unreadable;
    const before = store.data.get(STORAGE_KEYS.transactions);
    const user = userEvent.setup();
    render(<App store={store} />);
    expect(screen.getByTestId('read-only-banner')).toHaveTextContent('not enough storage to set them aside safely');
    expect(screen.queryByRole('button', { name: 'Start fresh' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Readable/ }));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(before);
  });
});

describe('H4: unreadable records are set aside and stay safe through later saves', () => {
  it('sets them aside on load, shows a notice, and a later save never removes them', async () => {
    const store = makeStore([makeTx({ id: 'known', date: '2026-10-12' }), future('pet1', 'Vet bill')]);
    const user = userEvent.setup();
    render(<App store={store} />);
    expect(screen.getByTestId('set-aside-banner')).toHaveTextContent('1 saved records could not be read by this version');
    const dialog = await openAddForm(user, '1000', 'any edit');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(storedIds(store)).not.toContain('pet1');
    expect(JSON.parse(store.data.get(STORAGE_KEYS.unreadable)!).records).toEqual([future('pet1', 'Vet bill')]);
  });
});

describe('several tabs (StorageEvent) with fake timers', () => {
  it('a record added in another tab appears here', async () => {
    const store = makeStore([]);
    render(<App store={store} />);
    otherTabWrites(store, JSON.stringify({ version: 1, transactions: [makeTx({ id: 'b', description: 'From tab B', date: '2026-10-12' })] }));
    expect(screen.getByText('From tab B')).toBeInTheDocument();
  });

  it('a failed save keeps its error and input while another tab writes; nothing is overwritten', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 9, 13, 9, 0));
    const store = makeStore([]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App store={store} />);
    store.failSet = fullStorage;
    const dialog = await openAddForm(user, '3000', 'Typed in tab A');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    const fromB = JSON.stringify({ version: 1, transactions: [makeTx({ id: 'b', description: 'Saved in tab B', date: '2026-10-13' })] });
    otherTabWrites(store, fromB);
    act(() => void vi.advanceTimersByTime(10_000)); // longer than any toast

    expect(within(dialog).getByTestId('form-save-error')).toBeInTheDocument(); // not a vanishing toast
    expect(within(dialog).getByLabelText('Note (optional)')).toHaveValue('Typed in tab A');
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(fromB);
    expect(screen.getByText('Saved in tab B')).toBeInTheDocument();
  });

  it('a success toast disappears on its timer, the change stays saved', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const store = makeStore([]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App store={store} />);
    const dialog = await openAddForm(user, '1500', 'Snack');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Transaction added')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(4_000));
    expect(screen.queryByText('Transaction added')).toBeNull();
    expect(storedIds(store)).toHaveLength(1);
  });

  it('another tab running a newer version writes newer data: this tab becomes read-only and cannot overwrite it', async () => {
    const store = makeStore([makeTx({ id: 'a', date: '2026-10-12' })]);
    const user = userEvent.setup();
    render(<App store={store} />);
    const v2 = JSON.stringify({ version: 2, transactions: [{ id: 'new-format' }] });
    otherTabWrites(store, v2);
    expect(screen.getByTestId('read-only-banner')).toHaveTextContent('newer version');
    expect(screen.getAllByRole('button', { name: /Add transaction/ })[0]).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Delete all data' }));
    expect(store.data.get(STORAGE_KEYS.transactions)).toBe(v2); // only an explicit, confirmed delete could remove it
  });

  it('records with an unknown category written by another tab are set aside, not dropped by this tab', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const store = makeStore([makeTx({ id: 'a', date: '2026-10-12' })]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App store={store} />);
    otherTabWrites(store, JSON.stringify({ version: 1, transactions: [makeTx({ id: 'a', date: '2026-10-12' }), future('pet', 'Cat food')] }));
    act(() => void vi.advanceTimersByTime(1_000));
    const dialog = await openAddForm(user, '2000', 'After sync');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    const everything = [...store.data.values()].join('\n');
    expect(everything).toContain('Cat food');
    expect(storedIds(store)).toContain('a');
    expect(screen.getByTestId('set-aside-banner')).toBeInTheDocument();
  });
});
