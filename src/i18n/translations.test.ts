import { describe, expect, it } from 'vitest';
import { DICTIONARIES, LANGUAGES, translate } from './translations';
import { CATEGORIES } from '../features/categories/categories';

describe('translations', () => {
  const englishKeys = Object.keys(DICTIONARIES.en).sort();

  it.each(LANGUAGES.map((l) => l.code))('%s has exactly the same keys as English, all non-empty', (code) => {
    const dict = DICTIONARIES[code];
    expect(Object.keys(dict).sort()).toEqual(englishKeys);
    for (const [key, value] of Object.entries(dict)) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it.each(LANGUAGES.map((l) => l.code))('%s keeps the same placeholders as English', (code) => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of englishKeys) {
      const k = key as keyof typeof DICTIONARIES.en;
      expect(placeholders(DICTIONARIES[code][k]), `${code}:${key}`).toEqual(placeholders(DICTIONARIES.en[k]));
    }
  });

  it('Lao and Thai text is actually translated (not left in English)', () => {
    const brandKeys = new Set(['app.name']);
    for (const code of ['lo', 'th'] as const) {
      for (const key of englishKeys) {
        if (brandKeys.has(key)) continue;
        const k = key as keyof typeof DICTIONARIES.en;
        expect(DICTIONARIES[code][k], `${code}:${key}`).not.toBe(DICTIONARIES.en[k]);
      }
    }
  });

  it('every category has a label in every language', () => {
    for (const category of CATEGORIES) {
      for (const { code } of LANGUAGES) {
        expect(DICTIONARIES[code][category.labelKey]).toBeTruthy();
      }
    }
  });

  it('interpolates placeholders', () => {
    expect(translate('en', 'transactions.results', { count: 3 })).toBe('3 transactions');
    expect(translate('lo', 'transactions.results', { count: 3 })).toBe('3 ລາຍການ');
  });
});
