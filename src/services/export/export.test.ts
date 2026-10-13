import { describe, expect, it } from 'vitest';
import { escapeCsvField, transactionsToCsv } from './csv';
import { createBackup, mergeTransactions, parseBackup, serializeBackup } from './backup';
import { SAMPLE, makeTx } from '../../tests/fixtures';

const labels = { category: (id: string) => `cat:${id}`, type: (t: string) => (t === 'income' ? 'Income' : 'Expense') };

describe('CSV export', () => {
  it('writes a header and one row per transaction', () => {
    const csv = transactionsToCsv([SAMPLE[0]!, SAMPLE[1]!], labels);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe('date,type,type_label,category,category_label,amount,currency,description,id,created_at,updated_at');
    expect(lines[1]).toBe('2026-10-01,income,Income,salary,cat:salary,5000000,LAK,October salary,a,2026-10-13T05:00:00.000Z,');
    expect(lines).toHaveLength(3);
  });

  it('escapes commas, quotes and newlines', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises spreadsheet formulas (CSV injection)', () => {
    expect(escapeCsvField('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(escapeCsvField('+1')).toBe("'+1");
    expect(escapeCsvField('@cmd')).toBe("'@cmd");
    // Numbers are not altered
    expect(escapeCsvField(5000)).toBe('5000');
  });

  it('keeps Lao and Thai text intact', () => {
    const csv = transactionsToCsv([makeTx({ description: 'ເຂົ້າປຽກ ข้าว' })], labels);
    expect(csv).toContain('ເຂົ້າປຽກ ข้าว');
  });

  it('produces only a header for no transactions', () => {
    expect(transactionsToCsv([], labels).trimEnd().split('\r\n')).toHaveLength(1);
  });
});

describe('JSON backup', () => {
  it('round-trips through serialize and parse', () => {
    const text = serializeBackup(createBackup(SAMPLE, new Date('2026-10-13T00:00:00Z')));
    const parsed = parseBackup(text);
    expect(parsed).toEqual({ ok: true, transactions: SAMPLE });
    expect(JSON.parse(text)).toMatchObject({ app: 'lao-pocket-business', version: 1, exportedAt: '2026-10-13T00:00:00.000Z' });
  });

  it('rejects non-JSON', () => {
    expect(parseBackup('hello')).toEqual({ ok: false, error: 'notJson' });
  });

  it('rejects files from other apps or with the wrong shape', () => {
    expect(parseBackup('[]')).toEqual({ ok: false, error: 'wrongFormat' });
    expect(parseBackup('{"transactions":[]}')).toEqual({ ok: false, error: 'wrongFormat' });
    expect(parseBackup('{"app":"lao-pocket-business","version":1,"transactions":{}}')).toEqual({ ok: false, error: 'wrongFormat' });
  });

  it('rejects unsupported versions', () => {
    expect(parseBackup('{"app":"lao-pocket-business","version":99,"transactions":[]}')).toEqual({ ok: false, error: 'unsupportedVersion' });
  });

  it('rejects the whole file if any record is invalid', () => {
    const text = JSON.stringify({ ...createBackup(SAMPLE), transactions: [...SAMPLE, { ...makeTx(), amount: 0 }, { ...makeTx(), amount: 'x' }] });
    expect(parseBackup(text)).toEqual({ ok: false, error: 'invalidRecords', invalidCount: 2 });
  });

  it('rejects duplicate ids', () => {
    const text = JSON.stringify(createBackup([makeTx({ id: 'same' }), makeTx({ id: 'same' })]));
    expect(parseBackup(text)).toEqual({ ok: false, error: 'duplicateIds' });
  });

  it('rejects oversized input', () => {
    expect(parseBackup(' '.repeat(10 * 1024 * 1024 + 1))).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('mergeTransactions', () => {
  it('adds new records and never overwrites existing ones', () => {
    const existing = [makeTx({ id: '1', amount: 100 })];
    const incoming = [makeTx({ id: '1', amount: 999 }), makeTx({ id: '2' })];
    const result = mergeTransactions(existing, incoming);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.transactions.find((t) => t.id === '1')?.amount).toBe(100);
    expect(result.transactions).toHaveLength(2);
  });
});
