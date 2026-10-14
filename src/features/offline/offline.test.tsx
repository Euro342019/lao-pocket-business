import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { STORAGE_KEYS } from '../../services/storage/storage';
import { pwaStore, watchInstallEvents, type BeforeInstallPromptEvent } from '../../pwa/pwaStore';
import { setNavigatorOnline } from '../../tests/setup';
import { makeTx } from '../../tests/fixtures';
import { todayISO } from '../../utils/date';

function goOffline() {
  act(() => {
    setNavigatorOnline(false);
    window.dispatchEvent(new Event('offline'));
  });
}
function goOnline() {
  act(() => {
    setNavigatorOnline(true);
    window.dispatchEvent(new Event('online'));
  });
}

function seedEnglish() {
  window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ language: 'en' }));
}

describe('online/offline indicator', () => {
  it('shows Online, then Offline with an explanation, then Online again', () => {
    seedEnglish();
    render(<App />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Online');
    expect(screen.queryByTestId('offline-banner')).toBeNull();

    goOffline();
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Offline');
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('saved on this device. Nothing is uploaded or synced.');

    goOnline();
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Online');
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('is translated (Lao default)', () => {
    render(<App />);
    goOffline();
    expect(screen.getByTestId('connection-status')).toHaveTextContent('ອອບລາຍ');
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('ທ່ານກຳລັງອອບລາຍ');
  });

  it('keeps stored transactions available and lets the user add more while offline', async () => {
    seedEnglish();
    window.localStorage.setItem(
      STORAGE_KEYS.transactions,
      JSON.stringify({ version: 1, transactions: [makeTx({ id: 'saved', description: 'Saved earlier', date: todayISO() })] }),
    );
    setNavigatorOnline(false);
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    expect(screen.getByText('Saved earlier')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Amount (Kip)'), '12000');
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Added offline');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Added offline')).toBeInTheDocument();

    // "Reload" while still offline: both records come back from local storage.
    unmount();
    render(<App />);
    expect(screen.getByText('Saved earlier')).toBeInTheDocument();
    expect(screen.getByText('Added offline')).toBeInTheDocument();
  });
});

describe('PWA status in the app', () => {
  it('announces offline readiness once', () => {
    seedEnglish();
    render(<App />);
    act(() => pwaStore.setOfflineReady(true));
    expect(screen.getByText('The app is ready to use offline')).toBeInTheDocument();
    expect(pwaStore.getState().offlineReadyIsNew).toBe(false);
  });

  it('shows an update prompt that applies the update on request', async () => {
    seedEnglish();
    const apply = vi.fn();
    render(<App />);
    expect(screen.queryByText('A new version of the app is ready.')).toBeNull();
    act(() => pwaStore.setUpdateAvailable(apply));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update now' }));
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe('update banners (M1)', () => {
  it('a version activated in another tab shows "reload when ready" and keeps the open form', async () => {
    seedEnglish();
    const user = userEvent.setup();
    render(<App />);
    act(() => pwaStore.setUpdateAvailable(vi.fn()));
    expect(screen.getByTestId('update-banner')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /Add transaction/ })[0]!);
    await user.type(within(screen.getByRole('dialog')).getByLabelText('Note (optional)'), 'typing');
    const reload = vi.fn();
    act(() => pwaStore.handleNewVersionActive(reload));
    expect(reload).not.toHaveBeenCalled();
    expect(within(screen.getByRole('dialog')).getByLabelText('Note (optional)')).toHaveValue('typing');
    expect(screen.getByTestId('reload-needed-banner')).toHaveTextContent('The app was updated in another tab.');
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });
});

describe('Settings: offline use & install', () => {
  async function openSettings() {
    seedEnglish();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    return { user, section: screen.getByRole('region', { name: 'Offline use & install' }) };
  }

  it('explains that offline access is not sync', async () => {
    const { section } = await openSettings();
    expect(section).toHaveTextContent('It is not syncing');
    expect(section).toHaveTextContent('never uploaded');
    expect(within(section).getByTestId('offline-access-status')).toHaveTextContent('Not ready yet');
    act(() => pwaStore.setOfflineReady());
    expect(within(section).getByTestId('offline-access-status')).toHaveTextContent('Ready: the app opens without internet');
  });

  it('reports when service workers are unsupported', async () => {
    pwaStore.reset({ supported: false });
    const { section } = await openSettings();
    expect(within(section).getByTestId('offline-access-status')).toHaveTextContent('Not supported by this browser');
  });

  it('shows install instructions for Android, iPhone and desktop', async () => {
    const { section } = await openSettings();
    expect(section).toHaveTextContent('Android (Chrome)');
    expect(section).toHaveTextContent('iPhone / iPad (Safari)');
    expect(section).toHaveTextContent('Computer (Chrome or Edge)');
    expect(section).toHaveTextContent('keeps its own data, separate from Safari');
    expect(within(section).queryByRole('button', { name: 'Install app' })).toBeNull();
  });

  it('offers an Install button when the browser allows it', async () => {
    const stop = watchInstallEvents(window);
    const { user, section } = await openSettings();
    const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
    event.prompt = vi.fn(() => Promise.resolve());
    event.userChoice = Promise.resolve({ outcome: 'accepted' as const });
    act(() => void window.dispatchEvent(event));

    await user.click(within(section).getByRole('button', { name: 'Install app' }));
    expect(event.prompt).toHaveBeenCalledTimes(1);

    act(() => void window.dispatchEvent(new Event('appinstalled')));
    expect(section).toHaveTextContent('Installed as an app on this device');
    stop();
  });
});
