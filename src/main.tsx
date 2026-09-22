import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts, bundled by Vite: the app still makes no network requests.
import '@fontsource-variable/ibm-plex-sans';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import './index.css';
import App from './App';

// Offline shell (public/sw.js). Dev skips it so edits are never served from cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
