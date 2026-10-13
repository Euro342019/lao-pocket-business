import type { Transaction } from '../../types/transaction';
import { usePreferences } from '../../app/preferences';
import { getCategory } from '../categories/categories';
import { formatDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';

interface TransactionListProps {
  transactions: readonly Transaction[];
  onSelect: (tx: Transaction) => void;
  label: string;
}

export function useCategoryLabel() {
  const { t } = usePreferences();
  return (id: string) => {
    const category = getCategory(id);
    return category ? t(category.labelKey) : t('category.unknown');
  };
}

export function TransactionList({ transactions, onSelect, label }: TransactionListProps) {
  const { t, locale } = usePreferences();
  const categoryLabel = useCategoryLabel();

  return (
    <ul className="tx-list" aria-label={label}>
      {transactions.map((tx) => {
        const category = getCategory(tx.categoryId);
        const signed = tx.type === 'income' ? tx.amount : -tx.amount;
        const typeLabel = t(tx.type === 'income' ? 'type.income' : 'type.expense');
        return (
          <li key={tx.id}>
            <button type="button" className="tx-row" onClick={() => onSelect(tx)}>
              <span className="tx-row__dot" style={{ background: category?.color ?? 'var(--muted)' }} aria-hidden="true" />
              <span className="tx-row__main">
                <span className="tx-row__category">{categoryLabel(tx.categoryId)}</span>
                {tx.description && <span className="tx-row__description">{tx.description}</span>}
              </span>
              <span className="tx-row__side">
                <span className={`tx-row__amount amount--${tx.type}`}>
                  <span className="visually-hidden">{typeLabel}: </span>
                  {formatMoney(signed, 'always')}
                </span>
                <span className="tx-row__date">{formatDate(tx.date, locale)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
