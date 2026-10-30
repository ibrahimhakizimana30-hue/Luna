import { useState } from 'react';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export function PinSetup({ onComplete }: { onComplete: (pin: string) => void }) {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handlePinInput = (value: string) => {
    if (step === 'create') {
      if (pin.length < 4) {
        setPin(pin + value);
        if (pin.length === 3) {
          setTimeout(() => setStep('confirm'), 300);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + value;
        setConfirmPin(newConfirm);

        if (newConfirm.length === 4) {
          if (newConfirm === pin) {
            setTimeout(() => onComplete(pin), 500);
          } else {
            setError('Les codes PIN ne correspondent pas');
            setTimeout(() => {
              setPin('');
              setConfirmPin('');
              setError('');
              setStep('create');
            }, 1500);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'create') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const currentPin = step === 'create' ? pin : confirmPin;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="my-auto bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'create' ? 'Créer votre code PIN' : 'Confirmer votre code PIN'}
          </h2>
          <p className="text-gray-600">
            {step === 'create'
              ? 'Choisissez un code PIN à 4 chiffres'
              : 'Saisissez à nouveau votre code PIN'}
          </p>
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
                currentPin.length > index
                  ? 'bg-purple-600 border-purple-600 text-white scale-110'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
            >
              {currentPin.length > index ? '●' : ''}
            </div>
          ))}
        </div>

        {/* Clavier numérique */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePinInput(num.toString())}
              className="h-16 bg-purple-50 hover:bg-purple-100 rounded-xl text-2xl font-bold text-purple-900 transition-colors active:scale-95"
            >
              {num}
            </button>
          ))}
          <button className="h-16 rounded-xl"></button>
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

        <div className="mt-6 text-center text-sm text-gray-500">
          Votre code PIN sécurise l'accès à Luna
        </div>
      </div>
    </div>
  );
}
