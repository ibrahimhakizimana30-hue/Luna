import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, PiggyBank, Send, ShieldCheck, Smartphone } from 'lucide-react';
import '../../styles/splash.css';

// Durée totale de l'écran d'ouverture (le bouton « Passer » permet de l'écourter)
export const SPLASH_DURATION_MS = 15000;
const FADE_OUT_MS = 500;
// Le premier atout apparaît après l'arrivée de la lune, puis un nouveau toutes les 2,6 s
const FIRST_FEATURE_MS = 2000;
const FEATURE_STEP_MS = 2600;

// Atouts de Luna présentés un par un
const FEATURES = [
  { icon: Send, text: 'Envoyez de l’argent en quelques secondes' },
  { icon: Smartphone, text: 'Paiements, messages et appels r\u00e9unis' },
  { icon: PiggyBank, text: 'Épargnez chaque semaine, sans effort' },
  { icon: Fingerprint, text: 'Code PIN et empreinte digitale' },
  { icon: ShieldCheck, text: 'Vos données protégées' },
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

// Écran d'ouverture « Fierté du Congo » : drapeau, lune dorée, nom, slogan,
// présentation des atouts et barre de chargement
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [step, setStep] = useState(-1);

  const finish = useCallback(() => {
    setLeaving(true);
    setTimeout(onDone, FADE_OUT_MS);
  }, [onDone]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    FEATURES.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i), FIRST_FEATURE_MS + i * FEATURE_STEP_MS));
    });
    timers.push(setTimeout(finish, SPLASH_DURATION_MS - FADE_OUT_MS));
    return () => timers.forEach(clearTimeout);
  }, [finish]);

  const feature = step >= 0 ? FEATURES[step] : null;
  const FeatureIcon = feature?.icon;

  return (
    <div
      className={`luna-splash${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-label="Chargement de Luna"
    >
      {/* Couleurs du drapeau du Congo, puis voile pour faire ressortir la lune */}
      <div className="luna-flag" />
      <div className="luna-veil" />

      <button type="button" className="luna-skip" onClick={finish} disabled={leaving}>
        Passer
      </button>

      <div className="luna-content">
        <div className="relative flex items-center justify-center">
          <div className="luna-halo" />
          <Moon />
        </div>

        <h1 className="luna-title">Luna</h1>
        <p className="luna-tagline">Votre argent, en toute sécurité</p>

        <div className="luna-feature" key={step} aria-live="polite">
          {feature && FeatureIcon && (
            <>
              <span className="luna-feature-icon">
                <FeatureIcon className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="luna-feature-text">{feature.text}</span>
            </>
          )}
        </div>

        <div className="luna-dots" aria-hidden="true">
          {FEATURES.map((_, i) => (
            <span key={i} className={`luna-dot${i === step ? ' is-active' : ''}`} />
          ))}
        </div>

        <div className="luna-progress">
          <div className="luna-progress-bar" />
        </div>
      </div>

      <p className="luna-footer">Paiements · Messages · Épargne</p>
    </div>
  );
}
