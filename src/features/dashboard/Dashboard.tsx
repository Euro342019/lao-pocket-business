import { useMemo, useState, type ReactNode } from 'react';
import type { Transaction } from '../../types/transaction';
import { usePreferences } from '../../app/preferences';
import { calculateTotals, categoryTotals, dailyTotals, filterTransactions } from '../transactions/calculations';
import { sortTransactions } from '../transactions/transactions';
import { TransactionList } from '../transactions/TransactionList';
import { useToday } from '../../hooks/useToday';
import { daysInRange, getPeriodRange, parseISODate, type DateRange, type PeriodKind } from '../../utils/date';
import { PeriodSelector } from './PeriodSelector';
import { SummaryCards } from './SummaryCards';
import { CategoryBreakdown } from './CategoryBreakdown';
import { DailyChart } from './DailyChart';
import { EmptyState } from '../../components/EmptyState';

interface DashboardProps {
  transactions: readonly Transaction[];
  onSelect: (tx: Transaction) => void;
  onViewAll: () => void;
  onAdd: () => void;
  /** Disable adding (read-only mode). */
  addDisabled?: boolean;
  /** Optional non-blocking notice shown above the summary (e.g. backup reminder). */
  notice?: ReactNode;
}

const RECENT_LIMIT = 5;
const MAX_CHART_DAYS = 62;

export function Dashboard({ transactions, onSelect, onViewAll, onAdd, notice, addDisabled }: DashboardProps) {
  const { t } = usePreferences();
  const [period, setPeriod] = useState<PeriodKind>('month');
  const [custom, setCustom] = useState<DateRange>(() => getPeriodRange('month'));

  // "Today", "This week" and "This month" follow the local date, also when the app stays open past midnight.
  const today = useToday();
  const range = useMemo(() => getPeriodRange(period, parseISODate(today), custom), [period, custom, today]);
  const inPeriod = useMemo(() => filterTransactions(transactions, { range }), [transactions, range]);
  const totals = useMemo(() => calculateTotals(inPeriod), [inPeriod]);
  const byCategory = useMemo(() => categoryTotals(inPeriod, 'expense'), [inPeriod]);
  const recent = useMemo(() => sortTransactions(inPeriod).slice(0, RECENT_LIMIT), [inPeriod]);
  const dayCount = daysInRange(range);
  const showChart = dayCount > 1 && dayCount <= MAX_CHART_DAYS;
  const days = useMemo(() => (showChart ? dailyTotals(inPeriod, range) : []), [showChart, inPeriod, range]);

  if (transactions.length === 0) {
    return <EmptyState onAdd={onAdd} addDisabled={addDisabled} />;
  }

  return (
    <div className="dashboard">
      {notice}
      <PeriodSelector
        period={period}
        onPeriodChange={setPeriod}
        custom={custom}
        onCustomChange={(r) => setCustom(r.from <= r.to ? r : { from: r.to, to: r.from })}
      />
      <SummaryCards totals={totals} />
      <div className="dashboard__grid">
        <section className="card panel dashboard__recent" aria-labelledby="recent-title">
          <div className="panel__header">
            <h2 id="recent-title" className="panel__title">
              {t('dashboard.recent')}
            </h2>
            <button type="button" className="link-button" onClick={onViewAll}>
              {t('dashboard.viewAll')}
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="muted">{t('dashboard.noTransactionsPeriod')}</p>
          ) : (
            <TransactionList transactions={recent} onSelect={onSelect} label={t('dashboard.recent')} />
          )}
        </section>
        <CategoryBreakdown totals={byCategory} />
        {showChart && <DailyChart days={days} />}
      </div>
    </div>
  );
}

