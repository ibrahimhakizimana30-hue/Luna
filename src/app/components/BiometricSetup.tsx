import { useEffect, useState } from 'react';
import { Fingerprint, CheckCircle2, AlertCircle } from 'lucide-react';
import { isBiometricAvailable, registerBiometric } from '../security/biometric';

export function BiometricSetup({
  userLabel,
  onComplete,
  onSkip,
}: {
  userLabel: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    isBiometricAvailable().then(setIsAvailable);
  }, []);

  const handleEnableBiometric = async () => {
    setIsScanning(true);
    setError('');

    try {
      // L'appareil affiche sa propre demande d'empreinte
      await registerBiometric(userLabel);
      setIsScanning(false);
      onComplete();
    } catch {
      setIsScanning(false);
      setError("L'empreinte n'a pas pu être enregistrée. Réessayez ou passez cette étape.");
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="my-auto bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 transition-all ${
            isScanning
              ? 'bg-purple-600 animate-pulse'
              : 'bg-purple-100'
          }`}>
            <Fingerprint className={`w-14 h-14 ${isScanning ? 'text-white' : 'text-purple-600'}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sécurité biométrique
          </h2>
          <p className="text-gray-600">
            Utilisez votre empreinte digitale pour un accès rapide et sécurisé à Luna
          </p>
        </div>

        {isAvailable === false && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <span className="text-sm text-orange-800 font-medium">
              Cet appareil ou ce navigateur ne permet pas d'utiliser l'empreinte digitale.
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800 font-medium">{error}</span>
          </div>
        )}

        {isScanning && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-purple-900 font-semibold mb-2">Positionnez votre doigt</p>
            <p className="text-sm text-purple-700">
              Placez votre doigt sur le capteur d'empreintes
            </p>
            <div className="mt-4 flex justify-center gap-1">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Avantages de l'empreinte digitale :</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Connexion rapide en une seconde</li>
                <li>Sécurité maximale</li>
                <li>Pas besoin de mémoriser un code</li>
                <li>Validation des transactions</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleEnableBiometric}
            disabled={isScanning || !isAvailable}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? 'Configuration en cours...' : 'Activer l\'empreinte digitale'}
          </button>

          <button
            onClick={onSkip}
            disabled={isScanning}
            className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Passer cette étape
          </button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          Vous pourrez activer cette fonctionnalité plus tard dans les paramètres
        </p>
      </div>
    </div>
  );
}
