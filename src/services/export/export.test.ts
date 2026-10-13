import { describe, expect, it } from 'vitest';
import { escapeCsvField, looksLikeFormula, transactionsToCsv } from './csv';
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

describe('CSV formula injection (regression)', () => {
  const labels = { category: (id: string) => id, type: (t: string) => t };

  it.each(['=', '+', '-', '@', '\t', '\r'])('neutralises a value starting with %j', (prefix) => {
    const escaped = escapeCsvField(`${prefix}SUM(A1:A9)`);
    // The first character a spreadsheet sees (after an optional opening quote) is the apostrophe.
    expect(escaped.replace(/^"/, '').startsWith("'")).toBe(true);
  });

  it.each([
    ['=cmd|\' /C calc\'!A0', "'=cmd|' /C calc'!A0"],
    ['=HYPERLINK("http://example.invalid","click")', `"'=HYPERLINK(""http://example.invalid"",""click"")"`],
    ['@SUM(1+1)*cmd|\' /C calc\'!A0', "'@SUM(1+1)*cmd|' /C calc'!A0"],
    ['+1,2', `"'+1,2"`],
  ])('known payload %j', (payload, expected) => {
    expect(escapeCsvField(payload)).toBe(expected);
  });

  it('protects every user-controlled text column (description and id), not only the note', () => {
    const tx = makeTx({ id: '=id()', description: '-2+3' });
    const row = transactionsToCsv([tx], labels).split('\r\n')[1]!;
    expect(row).toContain(",'-2+3,");
    expect(row).toContain(",'=id(),");
  });

  it('labels from translations are escaped too', () => {
    const row = transactionsToCsv([makeTx()], { category: () => '=evil', type: () => '+evil' }).split('\r\n')[1]!;
    expect(row).toContain(",'+evil,");
    expect(row).toContain(",'=evil,");
  });

  it('safe text and numbers are written unchanged', () => {
    expect(escapeCsvField('Lunch 50%')).toBe('Lunch 50%');
    expect(escapeCsvField('ເຂົ້າປຽກ')).toBe('ເຂົ້າປຽກ');
    expect(escapeCsvField(1_500_000)).toBe('1500000');
  });

  // M4: triggers hidden behind leading whitespace or control characters.
  const LEADING: [string, string][] = [
    ['space', ' '],
    ['several spaces', '   '],
    ['tab', '\t'],
    ['carriage return', '\r'],
    ['line feed', '\n'],
    ['CRLF', '\r\n'],
    ['no-break space', '\u00a0'],
    ['zero-width space', '\u200b'],
    ['byte-order mark', '\ufeff'],
    ['NUL', '\u0000'],
    ['other control (U+0001)', '\u0001'],
    ['DEL', '\u007f'],
    ['full-width space', '\u3000'],
    ['mixed', ' \t\u00a0\u200b'],
  ];
  const TRIGGERS = ['=', '+', '-', '@', '＝', '＋', '－', '＠'];

  it.each(LEADING.flatMap(([name, lead]) => TRIGGERS.map((trigger) => [name, lead, trigger] as const)))(
    'neutralises %s before %j',
    (_name, lead, trigger) => {
      const original = `${lead}${trigger}1+1`;
      expect(looksLikeFormula(original)).toBe(true);
      const cell = unquote(escapeCsvField(original));
      expect(cell).toBe(`'${original}`); // apostrophe first, original text kept exactly after it
    },
  );

  it.each(TRIGGERS)('neutralises a value starting directly with %j (including full-width)', (trigger) => {
    expect(unquote(escapeCsvField(`${trigger}A1`))).toBe(`'${trigger}A1`);
  });

  it.each(['abc =1+1', 'Rent - October', '50% off', 'e-mail', '   ', '', 'ລາວ =', 'line one\n=not a formula start'])(
    'leaves non-formula text %j unchanged',
    (text) => {
      expect(looksLikeFormula(text)).toBe(false);
      expect(unquote(escapeCsvField(text))).toBe(text);
    },
  );

  it('export never changes the transactions it is given, and the JSON backup keeps the original text', () => {
    const tricky = [makeTx({ id: 'a', description: ' =HYPERLINK("x")' }), makeTx({ id: 'b', description: '\u200b@cmd' })];
    const snapshot = JSON.parse(JSON.stringify(tricky));
    const csv = transactionsToCsv(tricky, labels);
    expect(tricky).toEqual(snapshot);
    expect(csv).toContain(`"' =HYPERLINK(""x"")"`);
    const restored = parseBackup(serializeBackup(createBackup(tricky)));
    expect(restored.ok && restored.transactions.map((t) => t.description)).toEqual([' =HYPERLINK("x")', '\u200b@cmd']);
  });
});

/** Remove RFC 4180 quoting from one field. */
function unquote(field: string): string {
  return field.startsWith('"') && field.endsWith('"') ? field.slice(1, -1).replace(/""/g, '"') : field;
}

describe('backup import at the MAX_AMOUNT boundary (regression)', () => {
  it('accepts a record of exactly MAX_AMOUNT and rejects MAX_AMOUNT + 1', async () => {
    const { MAX_AMOUNT } = await import('../../utils/money');
    expect(parseBackup(serializeBackup(createBackup([makeTx({ id: 'max', amount: MAX_AMOUNT })]))).ok).toBe(true);
    const over = JSON.stringify({ ...createBackup([]), transactions: [{ ...makeTx({ id: 'over' }), amount: MAX_AMOUNT + 1 }] });
    expect(parseBackup(over)).toEqual({ ok: false, error: 'invalidRecords', invalidCount: 1 });
  });
});
