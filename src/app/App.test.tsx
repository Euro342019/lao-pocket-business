import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEYS, type KeyValueStore } from '../services/storage/storage';
import { makeTx } from '../tests/fixtures';
import { todayISO } from '../utils/date';

function setup(props: { store?: KeyValueStore | null } = {}) {
  const user = userEvent.setup();
  const utils = render(<App {...props} />);
  return { user, ...utils };
}

/** Switch to English so assertions are readable. */
async function useEnglish(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/ພາສາ|Language|ภาษา/), 'en');
}

async function addTransaction(
  user: ReturnType<typeof userEvent.setup>,
  { type = 'Expense', amount, category, note }: { type?: 'Income' | 'Expense'; amount: string; category?: string; note?: string },
) {
  await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
  const dialog = screen.getByRole('dialog', { name: 'Add transaction' });
  await user.click(within(dialog).getByLabelText(type));
  await user.type(within(dialog).getByLabelText('Amount (Kip)'), amount);
  if (category) await user.selectOptions(within(dialog).getByLabelText('Category'), category);
  if (note) await user.type(within(dialog).getByLabelText('Note (optional)'), note);
  await user.click(within(dialog).getByRole('button', { name: 'Save' }));
}

/** Read a Blob's bytes as UTF-8, keeping any BOM (jsdom lacks Blob.text()). */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new TextDecoder('utf-8', { ignoreBOM: true }).decode(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function storedTransactions() {
  const raw = window.localStorage.getItem(STORAGE_KEYS.transactions);
  return raw ? (JSON.parse(raw) as { transactions: { amount: number; type: string; description: string }[] }).transactions : [];
}

describe('App', () => {
  it('starts in Lao with an empty state and no demo data', () => {
    setup();
    expect(document.documentElement.lang).toBe('lo');
    expect(screen.getByText('ຍັງບໍ່ມີລາຍການ')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEYS.transactions)).toBeNull();
  });

  it('adds income and expense transactions and updates the totals', async () => {
    const { user } = setup();
    await useEnglish(user);

    await addTransaction(user, { type: 'Income', amount: '5,000,000', category: 'Salary', note: 'October salary' });
    expect(screen.getByTestId('total-income')).toHaveTextContent('5,000,000 ₭');

    await addTransaction(user, { amount: '45000', category: 'Food', note: 'Lunch' });
    expect(screen.getByTestId('total-expense')).toHaveTextContent('45,000 ₭');
    expect(screen.getByTestId('net-cash-flow')).toHaveTextContent('+4,955,000 ₭');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('2');

    const recent = screen.getByRole('list', { name: 'Recent transactions' });
    expect(within(recent).getByText('Lunch')).toBeInTheDocument();
    expect(within(recent).getByText('October salary')).toBeInTheDocument();
    expect(screen.getByText('Transaction added')).toBeInTheDocument();

    expect(storedTransactions()).toHaveLength(2);
  });

  it('labels net cash flow clearly as not a bank balance', async () => {
    const { user } = setup();
    await useEnglish(user);
    await addTransaction(user, { amount: '1000' });
    expect(screen.getByText(/It is not your bank balance/)).toBeInTheDocument();
  });

  it.each([
    ['0', 'The amount must be greater than zero.'],
    ['-100', 'The amount must be greater than zero.'],
    ['12.5', 'Kip amounts must be whole numbers.'],
    ['abc', 'Please enter a valid number.'],
    ['', 'Please enter an amount.'],
  ])('rejects amount %j with a translated message', async (amount, message) => {
    const { user } = setup();
    await useEnglish(user);
    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    const dialog = screen.getByRole('dialog');
    if (amount) await user.type(within(dialog).getByLabelText('Amount (Kip)'), amount);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(storedTransactions()).toHaveLength(0);
  });

  it('shows validation messages in the selected language', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /ເພີ່ມລາຍການ/ })[0]!);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('ຈຳນວນເງິນ (ກີບ)'), '0');
    await user.click(within(dialog).getByRole('button', { name: 'ບັນທຶກ' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າສູນ.');
  });

  it('prevents double submission', async () => {
    const { user } = setup();
    await useEnglish(user);
    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Amount (Kip)'), '20000');
    const form = dialog.querySelector('form')!;
    // Two submits in the same tick, before React re-renders.
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(storedTransactions()).toHaveLength(1);
  });

  it('shows details, edits and deletes a transaction (with confirmation)', async () => {
    const { user } = setup();
    await useEnglish(user);
    await addTransaction(user, { amount: '30000', category: 'Transport', note: 'Tuk-tuk' });

    // Details
    await user.click(screen.getByRole('button', { name: /Tuk-tuk/ }));
    let dialog = screen.getByRole('dialog', { name: 'Transaction details' });
    expect(within(dialog).getByText('Transport')).toBeInTheDocument();
    expect(within(dialog).getByText('−30,000 ₭')).toBeInTheDocument();

    // Edit
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }));
    dialog = screen.getByRole('dialog', { name: 'Edit transaction' });
    const amount = within(dialog).getByLabelText('Amount (Kip)');
    expect(amount).toHaveValue('30,000');
    await user.clear(amount);
    await user.type(amount, '35000');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('total-expense')).toHaveTextContent('35,000 ₭');
    expect(storedTransactions()[0]!.amount).toBe(35_000);

    // Delete: cancel first, then confirm
    await user.click(screen.getByRole('button', { name: /Tuk-tuk/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    let confirm = screen.getByRole('alertdialog', { name: 'Delete this transaction?' });
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(storedTransactions()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /Tuk-tuk/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    confirm = screen.getByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));
    expect(storedTransactions()).toHaveLength(0);
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('changing type switches to a matching category', async () => {
    const { user } = setup();
    await useEnglish(user);
    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Category')).toHaveValue('food');
    await user.click(within(dialog).getByLabelText('Income'));
    expect(within(dialog).getByLabelText('Category')).toHaveValue('salary');
    expect(within(within(dialog).getByLabelText('Category')).queryByText('Food')).toBeNull();
  });

  it('closes dialogs with Escape', async () => {
    const { user } = setup();
    await useEnglish(user);
    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('persists transactions and preferences across a reload', async () => {
    const { user, unmount } = setup();
    await useEnglish(user);
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    await addTransaction(user, { amount: '77000', note: 'Persist me' });
    unmount();
    document.documentElement.removeAttribute('data-theme');

    setup();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByText('Persist me')).toBeInTheDocument();
    expect(screen.getByTestId('total-expense')).toHaveTextContent('77,000 ₭');
  });

  it('switches language immediately', async () => {
    const { user } = setup();
    const select = screen.getByLabelText('ພາສາ');
    await user.selectOptions(select, 'th');
    expect(screen.getByText('ยังไม่มีรายการ')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('th');
    await user.selectOptions(screen.getByLabelText('ภาษา'), 'en');
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Language'), 'lo');
    expect(screen.getByText('ຍັງບໍ່ມີລາຍການ')).toBeInTheDocument();
  });

  it('toggles the theme', async () => {
    const { user } = setup();
    await useEnglish(user);
    const initial = document.documentElement.dataset.theme;
    expect(initial).toBe('light'); // matchMedia mock reports light
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('works without storage and warns the user', async () => {
    const { user } = setup({ store: null });
    expect(screen.getByRole('alert')).toHaveTextContent('ບໍ່ສາມາດໃຊ້ບ່ອນເກັບຂໍ້ມູນ');
    await useEnglish(user);
    await addTransaction(user, { amount: '1000' });
    expect(screen.getByTestId('total-expense')).toHaveTextContent('1,000 ₭');
  });

  it('does not crash on corrupt stored data', async () => {
    window.localStorage.setItem(STORAGE_KEYS.transactions, '{{{ not json');
    setup();
    expect(screen.getByTestId('read-only-banner')).toHaveTextContent('ອ່ານຂໍ້ມູນທີ່ບັນທຶກໄວ້ບໍ່ໄດ້');
    // The unreadable data is left exactly as it was.
    expect(window.localStorage.getItem(STORAGE_KEYS.transactions)).toBe('{{{ not json');
  });

  it('reports a failed save in the form instead of claiming success', async () => {
    const data = new Map<string, string>();
    let failWrites = false;
    const store: KeyValueStore = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        if (failWrites && k === STORAGE_KEYS.transactions) throw new DOMException('full', 'QuotaExceededError');
        data.set(k, v);
      },
      removeItem: (k) => void data.delete(k),
    };
    const { user } = setup({ store });
    await useEnglish(user);
    failWrites = true;
    await addTransaction(user, { amount: '1000' });
    // The form stays open with an error; no success message.
    expect(screen.getByTestId('form-save-error')).toHaveTextContent('Could not save');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Transaction added')).toBeNull();
  });
});

describe('Dashboard periods and Transactions filters', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 13, 12)); // Tue 13 Oct 2026
    const transactions = [
      makeTx({ id: '1', type: 'income', categoryId: 'salary', amount: 4_000_000, date: '2026-10-01', description: 'Salary' }),
      makeTx({ id: '2', amount: 50_000, date: '2026-10-13', description: 'Noodles' }),
      makeTx({ id: '3', amount: 200_000, categoryId: 'transport', date: '2026-10-12', description: 'Fuel' }),
      makeTx({ id: '4', amount: 900_000, categoryId: 'housing', date: '2026-09-15', description: 'Rent September' }),
    ];
    window.localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify({ version: 1, transactions }));
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ language: 'en' }));
  });
  afterEach(() => vi.useRealTimers());

  it('switches between today, week, month and custom', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Default: this month
    expect(screen.getByTestId('total-income')).toHaveTextContent('4,000,000 ₭');
    expect(screen.getByTestId('total-expense')).toHaveTextContent('250,000 ₭');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByTestId('total-expense')).toHaveTextContent('50,000 ₭');
    expect(screen.getByTestId('total-income')).toHaveTextContent('0 ₭');

    await user.click(screen.getByRole('button', { name: 'This week' }));
    expect(screen.getByTestId('total-expense')).toHaveTextContent('250,000 ₭');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('2');

    await user.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30' } });
    expect(screen.getByTestId('total-expense')).toHaveTextContent('900,000 ₭');
    expect(screen.getByTestId('net-cash-flow')).toHaveTextContent('−900,000 ₭');
  });

  it('shows the expense breakdown by category', () => {
    render(<App />);
    const breakdown = screen.getByRole('region', { name: 'Expenses by category' });
    const items = within(breakdown).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Transport');
    expect(items[0]).toHaveTextContent('200,000 ₭');
    expect(items[0]).toHaveTextContent('80%');
    expect(items[1]).toHaveTextContent('Food');
  });

  it('searches and filters transactions', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.getByText('4 transactions')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search notes'), 'rent');
    expect(screen.getByText('1 transactions')).toBeInTheDocument();
    expect(screen.getByText('Rent September')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'income');
    expect(screen.getByText('1 transactions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salary/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Type'), 'all');
    await user.selectOptions(screen.getByLabelText('Category'), 'transport');
    expect(screen.getByText('1 transactions')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-12' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-13' } });
    expect(screen.getByText('2 transactions')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
  });
});

describe('Settings: export, import, delete', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let blobs: Blob[];

  beforeEach(() => {
    blobs = [];
    createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:test';
    });
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    window.localStorage.setItem(
      STORAGE_KEYS.transactions,
      JSON.stringify({ version: 1, transactions: [makeTx({ id: 'existing', description: 'Existing', date: todayISO() })] }),
    );
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ language: 'en' }));
  });
  afterEach(() => vi.restoreAllMocks());

  async function openSettings() {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    return user;
  }

  it('explains local storage limitations', async () => {
    await openSettings();
    expect(screen.getByText(/stored only in this browser/)).toBeInTheDocument();
    expect(screen.getByText(/not encrypted/)).toBeInTheDocument();
    expect(screen.getByText('1 transactions stored on this device')).toBeInTheDocument();
  });

  it('exports CSV with a UTF-8 BOM', async () => {
    const user = await openSettings();
    await user.click(screen.getByRole('button', { name: 'Export CSV (spreadsheet)' }));
    expect(blobs).toHaveLength(1);
    const text = await readBlob(blobs[0]!);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('date,type,type_label,category');
    expect(text).toContain('Existing');
  });

  it('exports a JSON backup that can be parsed back', async () => {
    const user = await openSettings();
    await user.click(screen.getByRole('button', { name: 'Download backup (JSON)' }));
    const json = JSON.parse(await readBlob(blobs[0]!));
    expect(json.app).toBe('lao-pocket-business');
    expect(json.transactions).toHaveLength(1);
  });

  function backupFile(transactions: unknown[]) {
    const content = JSON.stringify({ app: 'lao-pocket-business', version: 1, exportedAt: new Date().toISOString(), transactions });
    return new File([content], 'backup.json', { type: 'application/json' });
  }

  it('imports a backup by merging, after confirmation', async () => {
    const user = await openSettings();
    const file = backupFile([makeTx({ id: 'existing', amount: 1 }), makeTx({ id: 'new-one', description: 'Imported' })]);
    await user.upload(screen.getByTestId('import-file'), file);
    const dialog = await screen.findByRole('dialog', { name: 'Restore backup' });
    expect(dialog).toHaveTextContent('This backup contains 2 transactions. You currently have 1.');
    // Nothing is imported until the user chooses
    expect(storedTransactions()).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: 'Add to my data (skip duplicates)' }));
    const stored = storedTransactions();
    expect(stored).toHaveLength(2);
    expect(stored.find((t) => t.description === 'Existing')?.amount).toBe(50_000); // not overwritten
    expect(screen.getByText('Imported 1 transactions (1 already existed).')).toBeInTheDocument();
  });

  it('replaces data only after a second confirmation', async () => {
    const user = await openSettings();
    await user.upload(screen.getByTestId('import-file'), backupFile([makeTx({ id: 'r1', description: 'Replacement' })]));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace all my data' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Replace all data?' });
    expect(storedTransactions()[0]!.description).toBe('Existing');
    await user.click(within(confirm).getByRole('button', { name: 'Replace all my data' }));
    expect(storedTransactions().map((t) => t.description)).toEqual(['Replacement']);
  });

  it('rejects invalid backup files without changing data', async () => {
    const user = await openSettings();
    await user.upload(screen.getByTestId('import-file'), backupFile([makeTx({ id: 'x' }), { id: 'bad', amount: -5 }]));
    expect(await screen.findByRole('alert')).toHaveTextContent('The backup contains 1 invalid records, so nothing was imported.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.upload(screen.getByTestId('import-file'), new File(['not json'], 'x.json', { type: 'application/json' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('not a valid backup file'));
    expect(storedTransactions()).toHaveLength(1);
  });

  it('deletes all data after confirmation', async () => {
    const user = await openSettings();
    await user.click(screen.getByRole('button', { name: 'Delete all data' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Delete all data?' });
    await user.click(within(confirm).getByRole('button', { name: 'Delete everything' }));
    expect(window.localStorage.getItem(STORAGE_KEYS.transactions)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.settings)).toBeNull();
    expect(screen.getByText('0 transactions stored on this device')).toBeInTheDocument();
  });
});

describe('Privacy', () => {
  it('makes no network requests while using the app', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const { user } = setup();
    await useEnglish(user);
    await addTransaction(user, { amount: '12345', note: 'private' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
