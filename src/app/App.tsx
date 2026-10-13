import { useCallback, useEffect, useState } from 'react';
import type { Transaction } from '../types/transaction';
import { PreferencesProvider, usePreferences } from './preferences';
import { useTransactions } from '../hooks/useTransactions';
import { getBrowserStore, type KeyValueStore, type LoadStatus } from '../services/storage/storage';
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
import { pwaStore, usePwaState } from '../pwa/pwaStore';
import { useBackupReminder } from '../features/backupReminder/useBackupReminder';
import { BackupReminderCard } from '../features/backupReminder/BackupReminderCard';
import { downloadJsonBackup } from '../services/export/downloadBackup';
import { formatNumber } from '../utils/money';
import type { TranslationKey } from '../i18n/translations';

type View = 'dashboard' | 'transactions' | 'settings';

type DialogState =
  | { kind: 'add' }
  | { kind: 'details'; tx: Transaction }
  | { kind: 'edit'; tx: Transaction }
  | { kind: 'confirmDelete'; tx: Transaction }
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

  const { offlineReadyIsNew } = usePwaState();

  // Tell the user once, the first time the app becomes available offline.
  useEffect(() => {
    if (offlineReadyIsNew) {
      setToast(t('pwa.offlineReadyToast'));
      pwaStore.acknowledgeOfflineReady();
    }
  }, [offlineReadyIsNew, t]);

  const openDetails = (tx: Transaction) => setDialog({ kind: 'details', tx });
  const openAdd = () => setDialog({ kind: 'add' });

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
            <button type="button" className="button button--primary add-button" onClick={openAdd}>
              <Icon name="plus" />
              <span className="add-button__label">{t('action.addTransaction')}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <AppStatusBanners />
        <StorageBanners status={data.loadStatus} skipped={data.skipped} saveError={data.saveError} />
        {view === 'dashboard' && (
          <Dashboard
            transactions={data.transactions}
            onSelect={openDetails}
            onViewAll={() => setView('transactions')}
            onAdd={openAdd}
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
        {view === 'transactions' && <TransactionsPage transactions={data.transactions} onSelect={openDetails} onAdd={openAdd} />}
        {view === 'settings' && (
          <SettingsPage
            transactions={data.transactions}
            onMerge={data.merge}
            onReplace={data.replaceAll}
            onDeleteAll={() => {
              data.deleteAll();
              reminder.reset();
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
            data.add(input);
            closeDialog();
            setToast(t('toast.added'));
          }}
        />
      )}
      {dialog?.kind === 'edit' && (
        <TransactionForm
          existing={dialog.tx}
          onClose={closeDialog}
          onSubmit={(input) => {
            data.update(dialog.tx.id, input);
            closeDialog();
            setToast(t('toast.updated'));
          }}
        />
      )}
      {dialog?.kind === 'details' && (
        <TransactionDetails
          transaction={dialog.tx}
          onClose={closeDialog}
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
            data.remove(dialog.tx.id);
            closeDialog();
            setToast(t('toast.deleted'));
          }}
        />
      )}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}

function StorageBanners({ status, skipped, saveError }: { status: LoadStatus; skipped: number; saveError: boolean }) {
  const { t } = usePreferences();
  const messages: string[] = [];
  if (status === 'unavailable') messages.push(t('storage.unavailable'));
  if (status === 'corrupt') messages.push(t('storage.corrupt'));
  if (skipped > 0) messages.push(t('storage.skipped', { count: formatNumber(skipped) }));
  if (saveError) messages.push(t('storage.saveFailed'));
  if (messages.length === 0) return null;
  return (
    <div className="notice notice--warning" role="alert">
      <Icon name="alert" size={18} />
      <div>
        {messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
      </div>
    </div>
  );
}
