import { useState } from 'react';
import { usePreferences } from '../../app/preferences';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { pwaStore, usePwaState } from '../../pwa/pwaStore';
import { Icon } from '../../components/Icon';

/** Settings section: connection, offline readiness, installation. */
export function OfflineSettings() {
  const { t } = usePreferences();
  const online = useOnlineStatus();
  const pwa = usePwaState();
  const [installing, setInstalling] = useState(false);

  const offlineStatus = !pwa.supported
    ? t('pwa.offlineUnsupported')
    : pwa.offlineReady
      ? t('pwa.offlineReady')
      : t('pwa.offlineNotReady');

  const install = async () => {
    setInstalling(true);
    try {
      await pwaStore.promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <section className="card panel" aria-labelledby="pwa-title">
      <h2 id="pwa-title" className="panel__title">
        {t('pwa.section')}
      </h2>
      <dl className="details details--compact">
        <div>
          <dt>{t('pwa.connection')}</dt>
          <dd>{t(online ? 'connection.online' : 'connection.offline')}</dd>
        </div>
        <div>
          <dt>{t('pwa.offlineAccess')}</dt>
          <dd data-testid="offline-access-status">{offlineStatus}</dd>
        </div>
      </dl>
      <div className="notice notice--info">
        <Icon name="lock" size={18} />
        <p>{t('pwa.noSync')}</p>
      </div>

      {pwa.installed ? (
        <p className="settings__count">{t('pwa.installed')}</p>
      ) : (
        <>
          {pwa.canInstall && (
            <button type="button" className="button button--primary" onClick={install} disabled={installing}>
              <Icon name="download" size={18} /> {t('pwa.install')}
            </button>
          )}
          <details className="install-help">
            <summary>{t('pwa.installHelp')}</summary>
            <ul>
              <li>{t('pwa.installAndroid')}</li>
              <li>{t('pwa.installIos')}</li>
              <li>{t('pwa.installDesktop')}</li>
            </ul>
            <p className="muted">{t('pwa.installIosData')}</p>
          </details>
        </>
      )}
    </section>
  );
}
