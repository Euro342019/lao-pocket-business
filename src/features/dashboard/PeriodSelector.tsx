import { useId } from 'react';
import { usePreferences } from '../../app/preferences';
import type { DateRange, PeriodKind } from '../../utils/date';

interface PeriodSelectorProps {
  period: PeriodKind;
  onPeriodChange: (period: PeriodKind) => void;
  custom: DateRange;
  onCustomChange: (range: DateRange) => void;
}

const PERIODS = [
  { kind: 'today', key: 'period.today' },
  { kind: 'week', key: 'period.week' },
  { kind: 'month', key: 'period.month' },
  { kind: 'custom', key: 'period.custom' },
] as const;

export function PeriodSelector({ period, onPeriodChange, custom, onCustomChange }: PeriodSelectorProps) {
  const { t } = usePreferences();
  const id = useId();
  return (
    <div className="period">
      <div className="chips" role="group" aria-label={t('period.label')}>
        {PERIODS.map((p) => (
          <button
            key={p.kind}
            type="button"
            className="chip"
            aria-pressed={period === p.kind}
            onClick={() => onPeriodChange(p.kind)}
          >
            {t(p.key)}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="date-range">
          <div className="field field--inline">
            <label htmlFor={`${id}-from`}>{t('period.from')}</label>
            <input
              id={`${id}-from`}
              className="input"
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(e) => e.target.value && onCustomChange({ ...custom, from: e.target.value })}
            />
          </div>
          <div className="field field--inline">
            <label htmlFor={`${id}-to`}>{t('period.to')}</label>
            <input
              id={`${id}-to`}
              className="input"
              type="date"
              value={custom.to}
              min={custom.from}
              onChange={(e) => e.target.value && onCustomChange({ ...custom, to: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
