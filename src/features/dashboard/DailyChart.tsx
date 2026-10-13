import { usePreferences } from '../../app/preferences';
import type { DailyTotal } from '../transactions/calculations';
import { formatDate } from '../../utils/date';
import { formatMoney } from '../../utils/money';

/** Simple CSS column chart of expenses per day, with an accessible table fallback. */
export function DailyChart({ days }: { days: DailyTotal[] }) {
  const { t, locale } = usePreferences();
  const max = Math.max(0, ...days.map((d) => d.expense));
  const labelEvery = days.length > 16 ? Math.ceil(days.length / 8) : 1;

  return (
    <section className="card panel" aria-labelledby="daily-title">
      <h2 id="daily-title" className="panel__title">
        {t('dashboard.daily')}
      </h2>
      {max === 0 ? (
        <p className="muted">{t('dashboard.noExpenses')}</p>
      ) : (
        <>
          <div className="chart" aria-hidden="true">
            {days.map((day, index) => (
              <div key={day.date} className="chart__col" title={`${formatDate(day.date, locale)}: ${formatMoney(day.expense)}`}>
                <div className="chart__bar-wrap">
                  <div className="chart__bar" style={{ height: `${(day.expense / max) * 100}%` }} />
                </div>
                <span className="chart__label">{index % labelEvery === 0 ? formatDate(day.date, locale, 'short') : ''}</span>
              </div>
            ))}
          </div>
          <table className="visually-hidden">
            <caption>{t('dashboard.dailyTableCaption')}</caption>
            <tbody>
              {days
                .filter((d) => d.expense > 0)
                .map((d) => (
                  <tr key={d.date}>
                    <th scope="row">{formatDate(d.date, locale)}</th>
                    <td>{formatMoney(d.expense)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
