import { usePreferences } from '../app/preferences';
import { Icon } from './Icon';

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = usePreferences();
  return (
    <section className="empty card">
      <div className="empty__icon" aria-hidden="true">
        ₭
      </div>
      <h2 className="empty__title">{t('empty.title')}</h2>
      <p className="empty__body">{t('empty.body')}</p>
      <button type="button" className="button button--primary" onClick={onAdd}>
        <Icon name="plus" size={18} /> {t('action.addTransaction')}
      </button>
    </section>
  );
}
