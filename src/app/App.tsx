import { useCallback, useEffect, useState } from 'react';
import type { Transaction } from '../types/transaction';
import { PreferencesProvider, usePreferences } from './preferences';
import { useTransactions } from '../hooks/useTransactions';
import { getBrowserStore, readSetAsideRaw, type KeyValueStore } from '../services/storage/storage';
import type { ChangeResult, TransactionStore } from '../hooks/useTransactions';
import { downloadFile, timestampForFilename } from '../services/export/download';
import { LANGUAGES, isLanguage } from '../i18n/translations';
import { Dashboard } from '../features/dashboard/Dashboard';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TransactionForm } from '../features/transactions/TransactionForm';
import { TransactionDetails } from '../features/transactions/TransactionDetails';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon, type IconName } from '../components/Icon';
import { Toast } from '../components/Toast';
import { ConnectionStatus } from '../features/offline/ConnectionStatus';
import { AppStatusBanners } from '../features/offline/AppStatusBanners';
import { pwaStore } from '../pwa/pwaStore';
import { useBackupReminder } from '../features/backupReminder/useBackupReminder';
import { BackupReminderCard } from '../features/backupReminder/BackupReminderCard';
import { downloadJsonBackup } from '../services/export/downloadBackup';
import { MAX_SAFE_TOTAL, formatMoney, formatNumber } from '../utils/money';
import { calculateTotals } from '../features/transactions/calculations';
import type { TranslationKey } from '../i18n/translations';

type View = 'dashboard' | 'transactions' | 'settings';

type DialogState =
  | { kind: 'add' }
  | { kind: 'details'; tx: Transaction }
  | { kind: 'edit'; tx: Transaction }
  | { kind: 'confirmDelete'; tx: Transaction }
  | { kind: 'confirmStartFresh' }
  | null;

const NAV: { view: View; icon: IconName; label: TranslationKey }[] = [
  { view: 'dashboard', icon: 'home', label: 'nav.dashboard' },
  { view: 'transactions', icon: 'list', label: 'nav.transactions' },
  { view: 'settings', icon: 'settings', label: 'nav.settings' },
];

/**
 * @param store Storage backend. Defaults to the browser's localStorage;
 *              tests pass their own (or `null` to simulate unavailable storage).
 */
export function App({ store }: { store?: KeyValueStore | null }) {
  const [resolvedStore] = useState(() => (store === undefined ? getBrowserStore() : store));
  return (
    <PreferencesProvider store={resolvedStore}>
      <AppShell store={resolvedStore} />
    </PreferencesProvider>
  );
}

function AppShell({ store }: { store: KeyValueStore | null }) {
  const { t, theme, setTheme, language, setLanguage } = usePreferences();
  const data = useTransactions(store);
  const [initialCount] = useState(data.transactions.length);
  const reminder = useBackupReminder(store, initialCount);
  const [view, setView] = useState<View>('dashboard');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const closeDialog = () => setDialog(null);

  // Tell the user once, the first time the app becomes available offline.
  useEffect(() => {
    const announce = () => {
      if (!pwaStore.getState().offlineReadyIsNew) return;
      pwaStore.acknowledgeOfflineReady();
      setToast(t('pwa.offlineReadyToast'));
    };
    const unsubscribe = pwaStore.subscribe(announce);
    queueMicrotask(announce); // in case it became ready before this effect ran
    return () => {
      unsubscribe();
    };
  }, [t]);

  const openDetails = (tx: Transaction) => setDialog({ kind: 'details', tx });
  const openAdd = () => setDialog({ kind: 'add' });
  const readOnly = data.readOnly !== null;

  /** Message for a change that was not saved (null when it was). */
  const failureMessage = (result: ChangeResult): string | null =>
    result.ok
      ? null
      : result.reason === 'readOnly'
        ? t('storage.saveBlocked')
        : result.reason === 'amountLimit'
          ? t('amount.totalLimit', { max: formatMoney(MAX_SAFE_TOTAL) })
          : result.reason === 'notFound'
            ? t('storage.notFound')
            : t('storage.saveFailed');

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {t('nav.skipToContent')}
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__logo" aria-hidden="true">
              ₭
            </span>
            <span className="brand__text">
              <span className="brand__name">{t('app.name')}</span>
              <span className="brand__tagline">{t('app.tagline')}</span>
            </span>
          </div>

          <nav className="nav" aria-label={t('nav.label')}>
            {NAV.map((item) => (
              <button
                key={item.view}
                type="button"
                className="nav__item"
                aria-current={view === item.view ? 'page' : undefined}
                onClick={() => setView(item.view)}
              >
                <Icon name={item.icon} />
                <span>{t(item.label)}</span>
              </button>
            ))}
          </nav>

          <div className="topbar__actions">
            <ConnectionStatus />
            <label className="visually-hidden" htmlFor="language-select">
              {t('language.label')}
            </label>
            <select
              id="language-select"
              className="input input--compact"
              value={language}
              onChange={(e) => isLanguage(e.target.value) && setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} lang={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
              title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <button type="button" className="button button--primary add-button" onClick={openAdd} disabled={readOnly}>
              <Icon name="plus" />
              <span className="add-button__label">{t('action.addTransaction')}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <AppStatusBanners />
        <StorageBanners data={data} store={store} onStartFresh={() => setDialog({ kind: 'confirmStartFresh' })} />
        {view === 'dashboard' && (
          <Dashboard
            transactions={data.transactions}
            onSelect={openDetails}
            onViewAll={() => setView('transactions')}
            onAdd={openAdd}
            addDisabled={readOnly}
            notice={
              reminder.visible &&
              data.transactions.length > 0 && (
                <BackupReminderCard
                  state={reminder.state}
                  onDownload={() => {
                    downloadJsonBackup(data.transactions);
                    reminder.recordBackup();
                    setToast(t('toast.downloaded'));
                  }}
                  onMarkDone={() => {
                    reminder.markDone();
                    setToast(t('backup.markedToast'));
                  }}
                  onLater={reminder.snooze}
                />
              )
            }
          />
        )}
        {view === 'transactions' && (
          <TransactionsPage transactions={data.transactions} onSelect={openDetails} onAdd={openAdd} addDisabled={readOnly} />
        )}
        {view === 'settings' && (
          <SettingsPage
            transactions={data.transactions}
            onMerge={data.merge}
            onReplace={data.replaceAll}
            readOnly={readOnly}
            onDeleteAll={() => {
              const removed = data.deleteAll();
              if (removed.ok) reminder.reset();
              return removed.ok;
            }}
            notify={setToast}
            backupState={reminder.state}
            onBackupDownloaded={reminder.recordBackup}
          />
        )}
        <p className="footer-note">
          <Icon name="lock" size={14} /> {t('footer.privacy')}
        </p>
      </main>

      {dialog?.kind === 'add' && (
        <TransactionForm
          onClose={closeDialog}
          onSubmit={(input) => {
            const failure = failureMessage(data.add(input));
            if (failure) return failure;
            closeDialog();
            setToast(t('toast.added'));
            return null;
          }}
        />
      )}
      {dialog?.kind === 'edit' && (
        <TransactionForm
          existing={dialog.tx}
          onClose={closeDialog}
          onSubmit={(input) => {
            const failure = failureMessage(data.update(dialog.tx.id, input));
            if (failure) return failure;
            closeDialog();
            setToast(t('toast.updated'));
            return null;
          }}
        />
      )}
      {dialog?.kind === 'details' && (
        <TransactionDetails
          transaction={dialog.tx}
          onClose={closeDialog}
          readOnly={readOnly}
          onEdit={() => setDialog({ kind: 'edit', tx: dialog.tx })}
          onDelete={() => setDialog({ kind: 'confirmDelete', tx: dialog.tx })}
        />
      )}
      {dialog?.kind === 'confirmDelete' && (
        <ConfirmDialog
          title={t('confirm.deleteTitle')}
          message={t('confirm.deleteBody')}
          confirmLabel={t('action.delete')}
          onCancel={closeDialog}
          onConfirm={() => {
            const result = data.remove(dialog.tx.id);
            closeDialog();
            setToast(
              result.ok
                ? t('toast.deleted')
                : result.reason === 'readOnly'
                  ? t('storage.saveBlocked')
                  : result.reason === 'notFound'
                    ? t('storage.alreadyDeleted')
                    : t('storage.deleteFailed'),
            );
          }}
        />
      )}
      {dialog?.kind === 'confirmStartFresh' && (
        <ConfirmDialog
          title={t('readOnly.confirmTitle')}
          message={t('readOnly.confirmBody')}
          confirmLabel={t('readOnly.confirmButton')}
          onCancel={closeDialog}
          onConfirm={() => {
            const removed = data.startFresh();
            closeDialog();
            setToast(removed.ok ? t('readOnly.cleared') : t('storage.deleteAllFailed'));
          }}
        />
      )}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}

function downloadText(prefix: string, content: string) {
  downloadFile(`${prefix}_${timestampForFilename()}.json`, content, 'application/json');
}

function StorageBanners({
  data,
  store,
  onStartFresh,
}: {
  data: TransactionStore;
  store: KeyValueStore | null;
  onStartFresh: () => void;
}) {
  const { t } = usePreferences();
  return (
    <>
      {!data.storageAvailable && (
        <div className="notice notice--warning" role="alert">
          <Icon name="alert" size={18} />
          <p>{t('storage.unavailable')}</p>
        </div>
      )}
      {data.readOnly && (
        <div className="notice notice--warning notice--action" role="alert" data-testid="read-only-banner">
          <Icon name="alert" size={18} />
          <p>{t(`readOnly.${data.readOnly.reason}`)}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => downloadText('lao-pocket-unreadable-data', data.readOnly?.raw ?? '')}
          >
            <Icon name="download" size={18} /> {t('readOnly.download')}
          </button>
          {data.readOnly.reason !== 'quarantineFailed' && (
            <button type="button" className="button button--danger-outline" onClick={onStartFresh}>
              {t('readOnly.startFresh')}
            </button>
          )}
        </div>
      )}
      {!calculateTotals(data.transactions).exact && (
        <div className="notice notice--warning" role="alert" data-testid="inexact-totals-banner">
          <Icon name="alert" size={18} />
          <p>{t('amount.inexactTotals', { max: formatMoney(MAX_SAFE_TOTAL) })}</p>
        </div>
      )}
      {data.setAsideCount > 0 && (
        <div className="notice notice--info notice--action" role="status" data-testid="set-aside-banner">
          <Icon name="alert" size={18} />
          <p>{t('setAside.notice', { count: formatNumber(data.setAsideCount) })}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => downloadText('lao-pocket-set-aside-records', readSetAsideRaw(store) ?? '')}
          >
            <Icon name="download" size={18} /> {t('setAside.download')}
          </button>
        </div>
      )}
    </>
  );
}
