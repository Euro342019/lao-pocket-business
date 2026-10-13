import { usePreferences } from '../../app/preferences';
import type { CategoryTotal } from '../transactions/calculations';
import { getCategory } from '../categories/categories';
import { useCategoryLabel } from '../transactions/TransactionList';
import { formatMoney, formatNumber } from '../../utils/money';

export function CategoryBreakdown({ totals }: { totals: CategoryTotal[] }) {
  const { t } = usePreferences();
  const categoryLabel = useCategoryLabel();
  const max = totals[0]?.total ?? 0;

  return (
    <section className="card panel" aria-labelledby="breakdown-title">
      <h2 id="breakdown-title" className="panel__title">
        {t('dashboard.breakdown')}
      </h2>
      {totals.length === 0 ? (
        <p className="muted">{t('dashboard.noExpenses')}</p>
      ) : (
        <ul className="breakdown">
          {totals.map((item) => (
            <li key={item.categoryId} className="breakdown__item">
              <div className="breakdown__row">
                <span className="breakdown__label">{categoryLabel(item.categoryId)}</span>
                <span className="breakdown__value">
                  {formatMoney(item.total)}{' '}
                  <span className="muted">({formatNumber(item.percent)}%)</span>
                </span>
              </div>
              <div className="bar" aria-hidden="true">
                <div
                  className="bar__fill"
                  style={{
                    width: `${max > 0 ? Math.max(2, (item.total / max) * 100) : 0}%`,
                    background: getCategory(item.categoryId)?.color ?? 'var(--muted)',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
