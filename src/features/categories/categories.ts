import type { TransactionType } from '../../types/transaction';
import type { TranslationKey } from '../../i18n/translations';

export interface Category {
  /** Stable, language-independent id stored on transactions. Never rename. */
  id: string;
  type: TransactionType;
  /** Translation key for the visible label. */
  labelKey: TranslationKey;
  /** Colour used in charts and list markers. */
  color: string;
}

/**
 * Default categories. To add one: append an entry here and add its label
 * to every language in `src/i18n/translations.ts` (TypeScript enforces this).
 */
export const CATEGORIES: readonly Category[] = [
  { id: 'salary', type: 'income', labelKey: 'category.salary', color: '#059669' },
  { id: 'business', type: 'income', labelKey: 'category.business', color: '#0d9488' },
  { id: 'allowance', type: 'income', labelKey: 'category.allowance', color: '#0284c7' },
  { id: 'other-income', type: 'income', labelKey: 'category.otherIncome', color: '#64748b' },

  { id: 'food', type: 'expense', labelKey: 'category.food', color: '#ea580c' },
  { id: 'transport', type: 'expense', labelKey: 'category.transport', color: '#2563eb' },
  { id: 'housing', type: 'expense', labelKey: 'category.housing', color: '#7c3aed' },
  { id: 'utilities', type: 'expense', labelKey: 'category.utilities', color: '#0891b2' },
  { id: 'education', type: 'expense', labelKey: 'category.education', color: '#4f46e5' },
  { id: 'shopping', type: 'expense', labelKey: 'category.shopping', color: '#db2777' },
  { id: 'health', type: 'expense', labelKey: 'category.health', color: '#dc2626' },
  { id: 'entertainment', type: 'expense', labelKey: 'category.entertainment', color: '#ca8a04' },
  { id: 'other-expense', type: 'expense', labelKey: 'category.otherExpense', color: '#78716c' },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category | undefined {
  return BY_ID.get(id);
}

export function categoriesFor(type: TransactionType): Category[] {
  return CATEGORIES.filter((c) => c.type === type);
}

export function isValidCategory(id: string, type: TransactionType): boolean {
  return BY_ID.get(id)?.type === type;
}

export function defaultCategoryFor(type: TransactionType): string {
  return type === 'income' ? 'salary' : 'food';
}
