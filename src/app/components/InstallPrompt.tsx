import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

// Événement fourni par Chrome / Android quand l'application peut être installée
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'luna_install_dismissed';

function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari (iPhone)
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

// Bandeau « Installer Luna » : ajoute l'application à l'écran d'accueil
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(() => isInstalled() || wasDismissed());

  useEffect(() => {
    if (hidden) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (isIos()) setShowIosHint(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [hidden]);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // stockage indisponible : le bandeau reviendra à la prochaine visite
    }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setHidden(true);
    setInstallEvent(null);
  };

  if (hidden || (!installEvent && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md bg-white rounded-2xl shadow-2xl border border-purple-200 p-4 flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900">Installer Luna</p>
          {installEvent ? (
            <p className="text-sm text-gray-600">Ajoutez Luna à votre écran d'accueil.</p>
          ) : (
            <p className="text-sm text-gray-600">
              Appuyez sur <Share className="inline w-4 h-4 -mt-1" aria-label="Partager" /> puis
              « Sur l'écran d'accueil ».
            </p>
          )}
        </div>
        {installEvent && (
          <button
            onClick={install}
            className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl font-semibold flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Installer
          </button>
        )}
        <button onClick={dismiss} aria-label="Fermer" className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
