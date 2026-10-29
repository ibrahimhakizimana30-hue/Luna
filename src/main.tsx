import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { InstallPrompt } from './app/components/InstallPrompt';
import { SplashScreen } from './app/components/SplashScreen';
import './styles/index.css';

// L'écran d'ouverture s'affiche à chaque lancement de Luna (une fois par session)
const SPLASH_SEEN_KEY = 'luna_splash_seen';

function splashAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function Root() {
  const [showSplash, setShowSplash] = useState(() => !splashAlreadySeen());

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, 'true');
    } catch {
      // stockage indisponible : l'écran d'ouverture reviendra au prochain chargement
    }
  }, []);

  return (
    <>
      {/* Luna se charge derrière l'écran d'ouverture */}
      <App />
      {!showSplash && <InstallPrompt />}
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
    </>
  );
}

// Le fond sombre de démarrage n'est plus utile : l'écran d'ouverture prend le relais
document.documentElement.classList.add('luna-ready');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
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
