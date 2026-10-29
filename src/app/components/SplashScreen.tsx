import { useEffect, useState } from 'react';
import '../../styles/splash.css';

// Durée totale de l'écran d'ouverture
export const SPLASH_DURATION_MS = 3000;
const FADE_OUT_MS = 500;

// Étoiles placées une fois pour toutes (position en %, taille en px, délai en s)
const STARS = [
  [12, 18, 2, 0.1], [82, 12, 3, 0.6], [68, 28, 2, 1.2], [22, 72, 3, 0.4],
  [88, 64, 2, 0.9], [45, 10, 2, 1.5], [8, 46, 2, 0.7], [92, 38, 3, 0.2],
  [30, 88, 2, 1.1], [74, 84, 3, 0.5], [55, 92, 2, 1.7], [16, 32, 3, 1.3],
  [62, 6, 2, 0.3], [38, 24, 2, 1.9], [80, 48, 2, 1.4], [5, 86, 3, 0.8],
];

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

// Écran d'ouverture animé : lune, étoiles, nom, slogan et barre de chargement
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
      {STARS.map(([left, top, size, delay], i) => (
        <span
          key={i}
          className="luna-star"
          style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${delay}s` }}
        />
      ))}

      <div className="relative flex items-center justify-center">
        <div className="luna-halo" />
        <Moon />
      </div>

      <h1 className="luna-title">Luna</h1>
      <p className="luna-tagline">Votre argent, en toute sérénité</p>

      <div className="luna-progress">
        <div className="luna-progress-bar" />
      </div>

      <p className="luna-footer">Paiements · Messages · Épargne</p>
    </div>
  );
}
