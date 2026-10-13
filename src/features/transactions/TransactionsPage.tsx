import { useId, useMemo, useState } from 'react';
import type { Transaction, TransactionType } from '../../types/transaction';
import { usePreferences } from '../../app/preferences';
import { CATEGORIES } from '../categories/categories';
import { calculateTotals, filterTransactions } from './calculations';
import { sortTransactions } from './transactions';
import { TransactionList } from './TransactionList';
import { SummaryCards } from '../dashboard/SummaryCards';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { formatNumber } from '../../utils/money';
import type { DateRange } from '../../utils/date';

interface TransactionsPageProps {
  transactions: readonly Transaction[];
  onSelect: (tx: Transaction) => void;
  onAdd: () => void;
}

export function TransactionsPage({ transactions, onSelect, onAdd }: TransactionsPageProps) {
  const { t } = usePreferences();
  const id = useId();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    // An open-ended range when only one of the dates is set.
    const range: DateRange | undefined = from || to ? { from: from || '0000-01-01', to: to || '9999-12-31' } : undefined;
    return sortTransactions(filterTransactions(transactions, { search, type, categoryId, range }));
  }, [transactions, search, type, categoryId, from, to]);
  const totals = useMemo(() => calculateTotals(filtered), [filtered]);
  const hasFilters = search !== '' || type !== 'all' || categoryId !== 'all' || from !== '' || to !== '';
  const visibleCategories = CATEGORIES.filter((c) => type === 'all' || c.type === type);

  const clearFilters = () => {
    setSearch('');
    setType('all');
    setCategoryId('all');
    setFrom('');
    setTo('');
  };

  if (transactions.length === 0) return <EmptyState onAdd={onAdd} />;

  return (
    <div className="transactions-page">
      <h1 className="page-title">{t('transactions.title')}</h1>
      <section className="card filters" aria-label={t('transactions.filters')}>
        <div className="field filters__search">
          <label htmlFor={`${id}-search`}>{t('transactions.search')}</label>
          <div className="input-icon">
            <Icon name="search" size={18} />
            <input
              id={`${id}-search`}
              className="input"
              type="search"
              placeholder={t('transactions.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${id}-type`}>{t('type.label')}</label>
          <select
            id={`${id}-type`}
            className="input"
            value={type}
            onChange={(e) => {
              const next = e.target.value as TransactionType | 'all';
              setType(next);
              if (next !== 'all' && !CATEGORIES.some((c) => c.id === categoryId && c.type === next)) setCategoryId('all');
            }}
          >
            <option value="all">{t('type.all')}</option>
            <option value="income">{t('type.income')}</option>
            <option value="expense">{t('type.expense')}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-category`}>{t('form.category')}</label>
          <select id={`${id}-category`} className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="all">{t('transactions.allCategories')}</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-from`}>{t('period.from')}</label>
          <input id={`${id}-from`} className="input" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-to`}>{t('period.to')}</label>
          <input id={`${id}-to`} className="input" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        {hasFilters && (
          <button type="button" className="button button--secondary filters__clear" onClick={clearFilters}>
            {t('action.clearFilters')}
          </button>
        )}
      </section>

      {hasFilters && (
        <div className="filtered-totals">
          <h2 className="panel__title">{t('transactions.filteredTotals')}</h2>
          <SummaryCards totals={totals} showNetHelp={false} />
        </div>
      )}

      <section className="card panel" aria-labelledby={`${id}-results`}>
        <h2 id={`${id}-results`} className="panel__title" aria-live="polite">
          {t('transactions.results', { count: formatNumber(filtered.length) })}
        </h2>
        {filtered.length === 0 ? (
          <p className="muted">{t('transactions.noResults')}</p>
        ) : (
          <TransactionList transactions={filtered} onSelect={onSelect} label={t('transactions.title')} />
        )}
      </section>
    </div>
  );
}
