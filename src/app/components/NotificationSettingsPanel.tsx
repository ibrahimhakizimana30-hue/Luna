import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { getNotificationSettings, setNotificationSettings, type NotificationSettings } from '../backend';
import { disablePush, enablePush, getPushState, type PushState } from '../notifications/push';

const CATEGORIES: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: 'messages', label: 'Messages', hint: 'Nouveau message reçu' },
  { key: 'calls', label: 'Appels', hint: 'Quelqu’un vous appelle' },
  { key: 'money', label: 'Argent reçu', hint: 'Un transfert arrive sur votre solde' },
  { key: 'kyc', label: 'Vérification d’identité', hint: 'Votre identité est validée ou refusée' },
  { key: 'previews', label: 'Aperçu des messages', hint: 'Afficher le début du message sur l’écran verrouillé' },
];

const STATE_TEXT: Record<PushState, string> = {
  on: 'Activées sur ce téléphone.',
  off: 'Désactivées sur ce téléphone.',
  denied:
    'Bloquées par le navigateur. Pour les autoriser : réglages du navigateur → Paramètres des sites → Notifications → luna-paiement.netlify.app.',
  'ios-install':
    'Sur iPhone, ajoutez d’abord Luna à l’écran d’accueil (bouton Partager → « Sur l’écran d’accueil »), puis ouvrez Luna depuis son icône.',
  unsupported: 'Ce navigateur ne permet pas les notifications. Essayez avec Chrome.',
};

// Réglages des notifications : activation sur ce téléphone et choix des catégories
export function NotificationSettingsPanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<PushState | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void getPushState().then(setState);
    getNotificationSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible'));
  }, []);

  const toggleDevice = async () => {
    setBusy(true);
    setError('');
    try {
      setState(state === 'on' ? await disablePush() : await enablePush());
    } catch (e) {
      // Les erreurs du navigateur sont en anglais : message clair à la place
      setError(
        e instanceof DOMException
          ? 'Activation impossible : vérifiez votre connexion Internet et réessayez.'
          : e instanceof Error
            ? e.message
            : 'Activation impossible',
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleCategory = async (key: keyof NotificationSettings) => {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await setNotificationSettings(next);
    } catch (e) {
      setSettings(settings);
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    }
  };

  const canToggle = state === 'on' || state === 'off';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center md:p-4" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notifications"
      >
        <div className="flex items-center gap-3 p-4 border-b border-purple-100">
          <Bell className="w-6 h-6 text-purple-600" />
          <h2 className="flex-1 text-lg font-bold text-purple-900">Notifications</h2>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-purple-50 text-purple-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-700">
              Recevez une alerte sur ce téléphone, même quand Luna est fermé.
            </p>
            <p className={`text-sm font-semibold ${state === 'on' ? 'text-green-700' : 'text-gray-700'}`} aria-live="polite">
              {state ? STATE_TEXT[state] : 'Vérification…'}
            </p>
            {canToggle && (
              <button
                onClick={() => void toggleDevice()}
                disabled={busy}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold disabled:opacity-50 ${
                  state === 'on' ? 'border-2 border-red-200 text-red-700' : 'bg-purple-600 text-white'
                }`}
              >
                {state === 'on' ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                {busy ? 'Patientez…' : state === 'on' ? 'Désactiver sur ce téléphone' : 'Activer les notifications'}
              </button>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>}

          {settings && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Me prévenir pour :</p>
              <div className="divide-y divide-purple-100 border border-purple-200 rounded-xl">
                {CATEGORIES.map((c) => (
                  <label key={c.key} className="flex items-center gap-3 p-3 cursor-pointer">
                    <span className="flex-1">
                      <span className="block font-semibold text-gray-900">{c.label}</span>
                      <span className="block text-xs text-gray-500">{c.hint}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings[c.key]}
                      onChange={() => void toggleCategory(c.key)}
                      className="w-5 h-5 accent-purple-600"
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Ces choix valent pour tous vos téléphones.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
