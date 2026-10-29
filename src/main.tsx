import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { InstallPrompt } from './app/components/InstallPrompt';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <InstallPrompt />
  </StrictMode>
);

// Permet d'installer Luna et de l'ouvrir rapidement (version en ligne uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sans service worker, Luna fonctionne normalement, sans installation
    });
  });
}
