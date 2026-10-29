import { useEffect, useState } from 'react';
import '../../styles/splash.css';

// Durée totale de l'écran d'ouverture
export const SPLASH_DURATION_MS = 3000;
const FADE_OUT_MS = 500;

function Moon() {
  return (
    <svg className="luna-moon" viewBox="0 0 132 132" aria-hidden="true">
      <defs>
        <linearGradient id="luna-moon-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <mask id="luna-crescent">
          <rect width="132" height="132" fill="#000" />
          <circle cx="66" cy="66" r="58" fill="#fff" />
          <circle cx="92" cy="45" r="52" fill="#000" />
        </mask>
      </defs>
      <rect width="132" height="132" fill="url(#luna-moon-fill)" mask="url(#luna-crescent)" />
    </svg>
  );
}

// Écran d'ouverture « Fierté du Congo » : drapeau, lune dorée, nom, slogan et barre de chargement
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leave = setTimeout(() => setLeaving(true), SPLASH_DURATION_MS - FADE_OUT_MS);
    const done = setTimeout(onDone, SPLASH_DURATION_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={`luna-splash${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-label="Chargement de Luna"
    >
      {/* Couleurs du drapeau du Congo, puis voile pour faire ressortir la lune */}
      <div className="luna-flag" />
      <div className="luna-veil" />

      <div className="luna-content">
        <div className="relative flex items-center justify-center">
          <div className="luna-halo" />
          <Moon />
        </div>

        <h1 className="luna-title">Luna</h1>
        <p className="luna-tagline">Votre argent, en toute sécurité</p>

        <div className="luna-progress">
          <div className="luna-progress-bar" />
        </div>
      </div>

      <p className="luna-footer">Paiements · Messages · Épargne</p>
    </div>
  );
}
