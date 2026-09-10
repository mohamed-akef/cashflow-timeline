import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts, bundled by Vite: the app still makes no network requests.
import '@fontsource-variable/ibm-plex-sans';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
