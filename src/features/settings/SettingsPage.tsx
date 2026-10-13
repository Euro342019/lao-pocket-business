import { useRef, useState, type ChangeEvent } from 'react';
import type { Transaction } from '../../types/transaction';
import { usePreferences, type Theme } from '../../app/preferences';
import { LANGUAGES } from '../../i18n/translations';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { transactionsToCsv } from '../../services/export/csv';
import { MAX_BACKUP_BYTES, createBackup, parseBackup, serializeBackup } from '../../services/export/backup';
import { downloadFile, timestampForFilename } from '../../services/export/download';
import { sortTransactions } from '../transactions/transactions';
import { useCategoryLabel } from '../transactions/TransactionList';
import { formatNumber } from '../../utils/money';
import type { TranslationKey } from '../../i18n/translations';

interface SettingsPageProps {
  transactions: readonly Transaction[];
  onMerge: (incoming: Transaction[]) => { added: number; skipped: number };
  onReplace: (incoming: Transaction[]) => void;
  onDeleteAll: () => void;
  notify: (message: string) => void;
}

type ImportStep = { stage: 'choose'; incoming: Transaction[] } | { stage: 'confirmReplace'; incoming: Transaction[] };

export function SettingsPage({ transactions, onMerge, onReplace, onDeleteAll, notify }: SettingsPageProps) {
  const { t, language, setLanguage, theme, setTheme } = usePreferences();
  const categoryLabel = useCategoryLabel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importStep, setImportStep] = useState<ImportStep | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const count = transactions.length;
  const n = (value: number) => formatNumber(value);

  const exportCsv = () => {
    const csv = transactionsToCsv(sortTransactions(transactions), {
      category: categoryLabel,
      type: (type) => t(type === 'income' ? 'type.income' : 'type.expense'),
    });
    // The BOM makes Excel open the file as UTF-8 so Lao and Thai text display correctly.
    downloadFile(`lao-pocket-transactions_${timestampForFilename()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
    notify(t('toast.downloaded'));
  };

  const exportJson = () => {
    downloadFile(
      `lao-pocket-backup_${timestampForFilename()}.json`,
      serializeBackup(createBackup(sortTransactions(transactions))),
      'application/json',
    );
    notify(t('toast.downloaded'));
  };

  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow choosing the same file again
    if (!file) return;
    setImportError(null);
    if (file.size > MAX_BACKUP_BYTES) {
      setImportError(t('import.error.tooLarge'));
      return;
    }
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setImportError(t('import.error.readFailed'));
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) {
      setImportError(t(`import.error.${result.error}` as TranslationKey, { count: n(result.invalidCount ?? 0) }));
      return;
    }
    setImportStep({ stage: 'choose', incoming: result.transactions });
  };

  const doMerge = (incoming: Transaction[]) => {
    const { added, skipped } = onMerge(incoming);
    setImportStep(null);
    notify(t('import.merged', { added: n(added), skipped: n(skipped) }));
  };

  const doReplace = (incoming: Transaction[]) => {
    onReplace(incoming);
    setImportStep(null);
    notify(t('import.replaced', { count: n(incoming.length) }));
  };

  return (
    <div className="settings">
      <h1 className="page-title">{t('settings.title')}</h1>

      <section className="card panel">
        <h2 className="panel__title" id="lang-title">
          {t('language.label')}
        </h2>
        <div className="chips" role="group" aria-labelledby="lang-title">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className="chip"
              lang={l.code}
              aria-pressed={language === l.code}
              onClick={() => setLanguage(l.code)}
            >
              {l.nativeName}
            </button>
          ))}
        </div>

        <h2 className="panel__title panel__title--spaced" id="theme-title">
          {t('theme.label')}
        </h2>
        <div className="chips" role="group" aria-labelledby="theme-title">
          {(['light', 'dark'] as Theme[]).map((option) => (
            <button key={option} type="button" className="chip" aria-pressed={theme === option} onClick={() => setTheme(option)}>
              <Icon name={option === 'light' ? 'sun' : 'moon'} size={16} /> {t(option === 'light' ? 'theme.light' : 'theme.dark')}
            </button>
          ))}
        </div>
      </section>

      <section className="card panel">
        <h2 className="panel__title">{t('settings.data')}</h2>
        <p className="settings__count">{t('settings.recordCount', { count: n(count) })}</p>
        <div className="notice notice--info">
          <Icon name="lock" size={18} />
          <div>
            <p>{t('settings.privacyInfo')}</p>
            <p>{t('settings.securityInfo')}</p>
          </div>
        </div>
      </section>

      <section className="card panel">
        <h2 className="panel__title">{t('settings.backupSection')}</h2>
        <div className="settings__actions">
          <button type="button" className="button button--secondary" onClick={exportCsv} disabled={count === 0}>
            <Icon name="download" size={18} /> {t('settings.exportCsv')}
          </button>
          <button type="button" className="button button--secondary" onClick={exportJson} disabled={count === 0}>
            <Icon name="download" size={18} /> {t('settings.exportJson')}
          </button>
          <button type="button" className="button button--secondary" onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" size={18} /> {t('settings.importJson')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            data-testid="import-file"
            onChange={onFileChosen}
          />
        </div>
        {importError && (
          <p className="notice notice--error" role="alert">
            {importError}
          </p>
        )}
      </section>

      <section className="card panel">
        <h2 className="panel__title">{t('settings.dangerSection')}</h2>
        <button type="button" className="button button--danger-outline" onClick={() => setConfirmDeleteAll(true)}>
          <Icon name="trash" size={18} /> {t('settings.deleteAll')}
        </button>
      </section>

      {importStep?.stage === 'choose' && (
        <Modal
          title={t('import.title')}
          onClose={() => setImportStep(null)}
          footer={
            <>
              <button type="button" className="button button--secondary" onClick={() => setImportStep(null)}>
                {t('action.cancel')}
              </button>
              {count > 0 && (
                <button
                  type="button"
                  className="button button--danger-outline"
                  onClick={() => setImportStep({ stage: 'confirmReplace', incoming: importStep.incoming })}
                >
                  {t('import.replace')}
                </button>
              )}
              <button type="button" className="button button--primary" onClick={() => doMerge(importStep.incoming)}>
                {t('import.merge')}
              </button>
            </>
          }
        >
          <p>{t('import.summary', { count: n(importStep.incoming.length), existing: n(count) })}</p>
        </Modal>
      )}

      {importStep?.stage === 'confirmReplace' && (
        <ConfirmDialog
          title={t('import.confirmReplaceTitle')}
          message={t('import.replaceWarning', { existing: n(count) })}
          confirmLabel={t('import.replace')}
          onConfirm={() => doReplace(importStep.incoming)}
          onCancel={() => setImportStep(null)}
        />
      )}

      {confirmDeleteAll && (
        <ConfirmDialog
          title={t('confirm.deleteAllTitle')}
          message={t('confirm.deleteAllBody', { count: n(count) })}
          confirmLabel={t('confirm.deleteAllButton')}
          onConfirm={() => {
            setConfirmDeleteAll(false);
            onDeleteAll();
            notify(t('toast.allDeleted'));
          }}
          onCancel={() => setConfirmDeleteAll(false)}
        />
      )}
    </div>
  );
}

/** Read a file as UTF-8 text. FileReader works in older mobile browsers that lack Blob.text(). */
function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}
