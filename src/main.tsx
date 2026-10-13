import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

// Ask the browser not to evict our data under storage pressure (best effort, no prompt in most browsers).
navigator.storage?.persist?.().catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
