import { useState } from 'react';
import { Lock, AlertCircle, Fingerprint } from 'lucide-react';

export function PinLogin({
  correctPin,
  onSuccess,
  biometricEnabled
}: {
  correctPin: string;
  onSuccess: () => void;
  biometricEnabled: boolean;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handlePinInput = (value: string) => {
    if (pin.length < 4) {
      const newPin = pin + value;
      setPin(newPin);

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setTimeout(() => onSuccess(), 300);
        } else {
          setError('Code PIN incorrect');
          setAttempts(attempts + 1);
          setTimeout(() => {
            setPin('');
            setError('');
          }, 1500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleBiometricLogin = () => {
    // Simuler la vérification biométrique
    setTimeout(() => {
      onSuccess();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🌙</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Luna
          </h1>
          <p className="text-gray-600">Entrez votre code PIN</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800 font-medium">{error}</span>
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
              className="h-16 bg-purple-50 hover:bg-purple-100 rounded-xl text-2xl font-bold text-purple-900 transition-colors active:scale-95"
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
            className="h-16 bg-purple-50 hover:bg-purple-100 rounded-xl text-2xl font-bold text-purple-900 transition-colors active:scale-95"
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
            <button className="text-purple-600 font-semibold text-sm hover:underline">
              Code PIN oublié ?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
