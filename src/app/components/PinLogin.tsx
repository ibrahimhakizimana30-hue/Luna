import { useEffect, useState } from 'react';
import { AlertCircle, Fingerprint } from 'lucide-react';
import {
  MAX_PIN_ATTEMPTS,
  checkPin,
  getFailedAttempts,
  getLockoutUntil,
  recordFailedAttempt,
  resetFailedAttempts,
} from '../security/pin';
import { verifyBiometric } from '../security/biometric';
import { isBackendEnabled, verifyRemotePin } from '../backend';

// Vérifie le PIN : sur le serveur s'il est configuré, sinon sur l'appareil.
async function attemptPin(pin: string): Promise<{ ok: boolean; attemptsLeft: number; lockoutUntil: number }> {
  if (isBackendEnabled) {
    const result = await verifyRemotePin(pin);
    return {
      ok: result.ok,
      attemptsLeft: result.attempts_left,
      lockoutUntil: result.locked_until ? Date.parse(result.locked_until) : 0,
    };
  }

  if (await checkPin(pin)) {
    resetFailedAttempts();
    return { ok: true, attemptsLeft: MAX_PIN_ATTEMPTS, lockoutUntil: 0 };
  }
  const failed = recordFailedAttempt();
  return {
    ok: false,
    attemptsLeft: MAX_PIN_ATTEMPTS - (failed.attempts % MAX_PIN_ATTEMPTS),
    lockoutUntil: failed.lockoutUntil,
  };
}

export function PinLogin({
  onSuccess,
  biometricEnabled,
  onForgotPin,
}: {
  onSuccess: () => void;
  biometricEnabled: boolean;
  onForgotPin: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(() => (isBackendEnabled ? 0 : getFailedAttempts()));
  const [lockoutUntil, setLockoutUntil] = useState(() => (isBackendEnabled ? 0 : getLockoutUntil()));
  const [now, setNow] = useState(Date.now());
  const [isChecking, setIsChecking] = useState(false);

  const isLocked = lockoutUntil > now;
  const secondsLeft = Math.ceil((lockoutUntil - now) / 1000);

  // Compte à rebours pendant le blocage
  useEffect(() => {
    if (lockoutUntil <= Date.now()) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockoutUntil) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handlePinInput = async (value: string) => {
    if (isLocked || isChecking || pin.length >= 4) return;

    const newPin = pin + value;
    setPin(newPin);
    if (newPin.length < 4) return;

    setIsChecking(true);
    let result;
    try {
      result = await attemptPin(newPin);
    } catch {
      setError('Connexion au serveur impossible. Vérifiez votre connexion internet.');
      setTimeout(() => {
        setPin('');
        setError('');
        setIsChecking(false);
      }, 2500);
      return;
    }

    if (result.ok) {
      setTimeout(() => onSuccess(), 300);
      return;
    }

    setAttempts((count) => count + 1);
    setLockoutUntil(result.lockoutUntil);
    setNow(Date.now());

    const remaining = result.attemptsLeft;
    setError(
      result.lockoutUntil > Date.now()
        ? 'Code PIN incorrect'
        : `Code PIN incorrect (${remaining} essai${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''})`
    );
    setTimeout(() => {
      setPin('');
      setError('');
      setIsChecking(false);
    }, 1500);
  };

  const handleDelete = () => {
    if (isChecking) return;
    setPin(pin.slice(0, -1));
  };

  const handleBiometricLogin = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setError('');

    const isValid = await verifyBiometric();
    if (isValid) {
      if (!isBackendEnabled) resetFailedAttempts();
      onSuccess();
      return;
    }

    setError('Empreinte non reconnue. Utilisez votre code PIN.');
    setIsChecking(false);
  };

  const handleForgotPin = () => {
    const confirmed = confirm(
      isBackendEnabled
        ? 'Pour choisir un nouveau code PIN, vous allez recevoir un code de vérification par SMS ou email.\n\nContinuer ?'
        : 'Pour réinitialiser votre code PIN, vous devez vous réinscrire.\n\n' +
          'Toutes les données Luna enregistrées sur cet appareil seront effacées.\n\n' +
          'Continuer ?'
    );
    if (confirmed) onForgotPin();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="my-auto bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🌙</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Luna
          </h1>
          <p className="text-gray-600">Entrez votre code PIN</p>
        </div>

        {(error || isLocked) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800 font-medium">
              {isLocked
                ? `Trop d'essais. Réessayez dans ${secondsLeft} s.`
                : error}
            </span>
          </div>
        )}

        {/* Affichage du PIN */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                pin.length > index
                  ? error
                    ? 'bg-red-100 border-red-300 text-red-600'
                    : 'bg-purple-600 border-purple-600 text-white scale-110'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
            >
              {pin.length > index ? '●' : ''}
            </div>
          ))}
        </div>

        {/* Clavier numérique */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePinInput(num.toString())}
              disabled={isLocked}
              className="h-16 bg-purple-50 hover:bg-purple-100 rounded-xl text-2xl font-bold text-purple-900 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}
          {biometricEnabled ? (
            <button
              onClick={handleBiometricLogin}
              className="h-16 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors active:scale-95"
            >
              <Fingerprint className="w-8 h-8 text-blue-600" />
            </button>
          ) : (
            <button className="h-16 rounded-xl"></button>
          )}
          <button
            onClick={() => handlePinInput('0')}
            disabled={isLocked}
            className="h-16 bg-purple-50 hover:bg-purple-100 rounded-xl text-2xl font-bold text-purple-900 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 bg-red-50 hover:bg-red-100 rounded-xl text-red-600 font-bold transition-colors active:scale-95"
          >
            ←
          </button>
        </div>

        {attempts >= 3 && (
          <div className="text-center">
            <button
              onClick={handleForgotPin}
              className="text-purple-600 font-semibold text-sm hover:underline"
            >
              Code PIN oublié ?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
