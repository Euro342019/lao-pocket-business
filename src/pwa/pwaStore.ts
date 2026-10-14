/**
 * Small external store for Progressive Web App state, shared by the
 * service-worker registration (registerServiceWorker.ts) and the UI.
 * Keeping it separate lets the UI be tested without a real service worker.
 */
import { useSyncExternalStore } from 'react';

/** Chromium's install prompt event (not in the standard DOM typings). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** The browser supports service workers (needed for offline access). */
  supported: boolean;
  /** The app shell is cached and the app can open without internet. */
  offlineReady: boolean;
  /** offlineReady just happened for the first time (shown once as a message). */
  offlineReadyIsNew: boolean;
  /** A newer version has been downloaded and is waiting. */
  updateAvailable: boolean;
  /**
   * The new version was activated from another tab. This tab keeps running
   * (so nothing being typed is lost) until the user reloads it.
   */
  reloadNeeded: boolean;
  /** The browser offered an install prompt we can show (Chrome, Edge, Android). */
  canInstall: boolean;
  /** Running as an installed app (standalone window). */
  installed: boolean;
}

let state: PwaState = {
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  offlineReady: false,
  offlineReadyIsNew: false,
  updateAvailable: false,
  reloadNeeded: false,
  canInstall: false,
  installed: false,
};
let updateRequestedHere = false;
let installEvent: BeforeInstallPromptEvent | null = null;
let applyUpdateFn: (() => Promise<void> | void) | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const pwaStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** @param isNew true when the app shell was cached just now (first visit). */
  setOfflineReady(isNew = false) {
    if (!state.offlineReady) setState({ offlineReady: true, offlineReadyIsNew: isNew });
  },
  acknowledgeOfflineReady() {
    if (state.offlineReadyIsNew) setState({ offlineReadyIsNew: false });
  },
  setUpdateAvailable(apply: () => Promise<void> | void) {
    applyUpdateFn = apply;
    setState({ updateAvailable: true });
  },
  /** Activate the waiting version. Only this tab reloads afterwards. */
  async applyUpdate() {
    updateRequestedHere = true;
    await applyUpdateFn?.();
  },
  /**
   * Called when a new version has taken control of this page. Reload only
   * the tab where the user chose "Update now"; other tabs (which may have
   * a half-filled form) show a "reload when ready" message instead.
   */
  handleNewVersionActive(reload: () => void) {
    if (updateRequestedHere) {
      updateRequestedHere = false;
      reload();
    } else {
      setState({ updateAvailable: false, reloadNeeded: true });
    }
  },
  /** Show the browser's install dialog, if available. */
  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!installEvent) return 'unavailable';
    const event = installEvent;
    installEvent = null; // a prompt can only be used once
    setState({ canInstall: false });
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  },
  /** For tests. */
  reset(patch: Partial<PwaState> = {}) {
    installEvent = null;
    applyUpdateFn = null;
    updateRequestedHere = false;
    state = {
      supported: true,
      offlineReady: false,
      offlineReadyIsNew: false,
      updateAvailable: false,
      reloadNeeded: false,
      canInstall: false,
      installed: false,
      ...patch,
    };
    listeners.forEach((l) => l());
  },
};

export function isStandalone(win: Window = window): boolean {
  try {
    return (
      win.matchMedia?.('(display-mode: standalone)').matches === true ||
      (win.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/** Listen for install-related browser events. Returns a cleanup function. */
export function watchInstallEvents(win: Window = window): () => void {
  setState({ installed: isStandalone(win) });
  const onBeforeInstall = (event: Event) => {
    // Keep the event so the app can show its own "Install app" button.
    event.preventDefault();
    installEvent = event as BeforeInstallPromptEvent;
    setState({ canInstall: true });
  };
  const onInstalled = () => {
    installEvent = null;
    setState({ canInstall: false, installed: true });
  };
  win.addEventListener('beforeinstallprompt', onBeforeInstall);
  win.addEventListener('appinstalled', onInstalled);
  return () => {
    win.removeEventListener('beforeinstallprompt', onBeforeInstall);
    win.removeEventListener('appinstalled', onInstalled);
  };
}

export function usePwaState(): PwaState {
  return useSyncExternalStore(pwaStore.subscribe, pwaStore.getState, pwaStore.getState);
}
