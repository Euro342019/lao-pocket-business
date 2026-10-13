import { usePreferences } from '../../app/preferences';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { pwaStore, usePwaState } from '../../pwa/pwaStore';
import { Icon } from '../../components/Icon';

/** Offline explanation and "new version available" prompt, shown above the page content. */
export function AppStatusBanners() {
  const { t } = usePreferences();
  const online = useOnlineStatus();
  const { updateAvailable } = usePwaState();

  return (
    <>
      {!online && (
        <div className="notice notice--offline" data-testid="offline-banner">
          <Icon name="wifiOff" size={18} />
          <p>{t('offline.banner')}</p>
        </div>
      )}
      {updateAvailable && (
        <div className="notice notice--info notice--action">
          <Icon name="refresh" size={18} />
          <p>{t('pwa.updateAvailable')}</p>
          <button type="button" className="button button--primary" onClick={() => void pwaStore.applyUpdate()}>
            {t('pwa.updateNow')}
          </button>
        </div>
      )}
    </>
  );
}
