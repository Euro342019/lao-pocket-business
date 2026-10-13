import type { Transaction } from '../../types/transaction';
import { usePreferences } from '../../app/preferences';
import { Modal } from '../../components/Modal';
import { Icon } from '../../components/Icon';
import { formatDate, formatDateTime } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { useCategoryLabel } from './TransactionList';

interface TransactionDetailsProps {
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function TransactionDetails({ transaction: tx, onEdit, onDelete, onClose }: TransactionDetailsProps) {
  const { t, locale } = usePreferences();
  const categoryLabel = useCategoryLabel();
  const signed = tx.type === 'income' ? tx.amount : -tx.amount;

  return (
    <Modal
      title={t('details.title')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button--danger-outline" onClick={onDelete}>
            <Icon name="trash" size={18} /> {t('action.delete')}
          </button>
          <button type="button" className="button button--primary" onClick={onEdit}>
            <Icon name="edit" size={18} /> {t('action.edit')}
          </button>
        </>
      }
    >
      <p className={`details__amount amount--${tx.type}`}>{formatMoney(signed, 'always')}</p>
      <dl className="details">
        <div>
          <dt>{t('type.label')}</dt>
          <dd>{t(tx.type === 'income' ? 'type.income' : 'type.expense')}</dd>
        </div>
        <div>
          <dt>{t('form.category')}</dt>
          <dd>{categoryLabel(tx.categoryId)}</dd>
        </div>
        <div>
          <dt>{t('form.date')}</dt>
          <dd>{formatDate(tx.date, locale)}</dd>
        </div>
        <div>
          <dt>{t('form.description')}</dt>
          <dd>{tx.description || <span className="muted">{t('details.noDescription')}</span>}</dd>
        </div>
        <div>
          <dt>{t('details.createdAt')}</dt>
          <dd>{formatDateTime(tx.createdAt, locale)}</dd>
        </div>
        {tx.updatedAt && (
          <div>
            <dt>{t('details.updatedAt')}</dt>
            <dd>{formatDateTime(tx.updatedAt, locale)}</dd>
          </div>
        )}
      </dl>
    </Modal>
  );
}
