import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { watchInstallEvents } from './pwa/pwaStore';
import './styles/global.css';

// Ask the browser not to evict our data under storage pressure (best effort, no prompt in most browsers).
navigator.storage?.persist?.().catch(() => undefined);

watchInstallEvents();
// Service workers are only used in the production build (offline app shell).
if (import.meta.env.PROD) registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
