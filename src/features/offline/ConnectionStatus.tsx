import { usePreferences } from '../../app/preferences';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Icon } from '../../components/Icon';

/** Small online/offline indicator for the header. */
export function ConnectionStatus() {
  const { t } = usePreferences();
  const online = useOnlineStatus();
  const status = t(online ? 'connection.online' : 'connection.offline');
  return (
    <span
      className={`connection ${online ? 'connection--online' : 'connection--offline'}`}
      role="status"
      title={t('connection.label', { status })}
      data-testid="connection-status"
    >
      <Icon name={online ? 'wifi' : 'wifiOff'} size={16} />
      <span className="connection__text">{status}</span>
    </span>
  );
}
