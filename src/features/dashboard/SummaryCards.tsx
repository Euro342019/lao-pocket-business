import { usePreferences } from '../../app/preferences';
import type { Totals } from '../transactions/calculations';
import { formatMoney, formatNumber } from '../../utils/money';

export function SummaryCards({ totals, showNetHelp = true }: { totals: Totals; showNetHelp?: boolean }) {
  const { t } = usePreferences();
  const netClass = totals.net > 0 ? 'amount--income' : totals.net < 0 ? 'amount--expense' : '';
  return (
    <section className="summary" aria-label={t('period.label')}>
      <div className="summary__grid">
        <div className="card summary__card summary__card--income">
          <p className="summary__label">{t('summary.income')}</p>
          <p className="summary__value amount--income" data-testid="total-income">
            {formatMoney(totals.income)}
          </p>
        </div>
        <div className="card summary__card summary__card--expense">
          <p className="summary__label">{t('summary.expense')}</p>
          <p className="summary__value amount--expense" data-testid="total-expense">
            {formatMoney(totals.expense)}
          </p>
        </div>
        <div className="card summary__card summary__card--net">
          <p className="summary__label">{t('summary.net')}</p>
          <p className={`summary__value ${netClass}`} data-testid="net-cash-flow">
            {formatMoney(totals.net, 'always')}
          </p>
        </div>
        <div className="card summary__card">
          <p className="summary__label">{t('summary.count')}</p>
          <p className="summary__value" data-testid="transaction-count">
            {formatNumber(totals.count)}
          </p>
        </div>
      </div>
      {showNetHelp && <p className="summary__help">{t('summary.netHelp')}</p>}
    </section>
  );
}
