import type { ReactNode } from 'react';
import { usePreferences } from '../app/preferences';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, danger = true }: ConfirmDialogProps) {
  const { t } = usePreferences();
  return (
    <Modal
      title={title}
      onClose={onCancel}
      role="alertdialog"
      footer={
        <>
          <button type="button" className="button button--secondary" onClick={onCancel} data-autofocus>
            {t('action.cancel')}
          </button>
          <button type="button" className={danger ? 'button button--danger' : 'button button--primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-message">{message}</div>
    </Modal>
  );
}
