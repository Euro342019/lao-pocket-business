import { usePreferences } from '../../app/preferences';
import { Icon } from '../../components/Icon';
import { formatNumber } from '../../utils/money';
import { daysSinceBackup, type ReminderState } from './reminder';

interface BackupReminderCardProps {
  state: ReminderState;
  onDownload: () => void;
  onMarkDone: () => void;
  onLater: () => void;
}

/** Inline, non-blocking reminder shown at the top of the Overview. */
export function BackupReminderCard({ state, onDownload, onMarkDone, onLater }: BackupReminderCardProps) {
  const { t } = usePreferences();
  const days = daysSinceBackup(state, new Date());
  return (
    <section className="card backup-reminder" aria-label={t('backup.reminderLabel')} data-testid="backup-reminder">
      <div className="backup-reminder__text">
        <h2 className="panel__title">
          <Icon name="download" size={18} /> {t('backup.reminderTitle')}
        </h2>
        <p>{days === null ? t('backup.reminderNever') : t('backup.reminderLast', { days: formatNumber(days) })}</p>
      </div>
      <div className="backup-reminder__actions">
        <button type="button" className="button button--primary" onClick={onDownload}>
          {t('backup.downloadNow')}
        </button>
        <button type="button" className="button button--secondary" onClick={onMarkDone}>
          {t('backup.alreadyDone')}
        </button>
        <button type="button" className="link-button" onClick={onLater}>
          {t('backup.later')}
        </button>
      </div>
    </section>
  );
}
