import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface FreeTrialBannerProps {
  daysRemaining: number;
  onUpgrade: () => void;
  kycPending?: boolean;
}

export function FreeTrialBanner({ daysRemaining, onUpgrade, kycPending = false }: FreeTrialBannerProps) {
  if (kycPending) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Clock className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-bold">Vérification d'identité en cours d'examen</p>
            <p className="text-sm opacity-90">
              La validation prend en général 24 à 48 h.
              {daysRemaining > 0 && ` Essai gratuit : ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (daysRemaining <= 0) {
    return (
      <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold">Période d'essai expirée</p>
              <p className="text-sm opacity-90">
                Complétez votre vérification KYC pour continuer à utiliser Luna
              </p>
            </div>
          </div>
          <button
            onClick={onUpgrade}
            className="bg-white text-red-600 px-6 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            Vérifier maintenant
          </button>
        </div>
      </div>
    );
  }

  if (daysRemaining <= 2) {
    return (
      <div className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold">
                Plus que {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} d'essai gratuit
              </p>
              <p className="text-sm opacity-90">
                Vérifiez votre compte pour continuer sans interruption
              </p>
            </div>
          </div>
          <button
            onClick={onUpgrade}
            className="bg-white text-orange-600 px-6 py-2 rounded-lg font-semibold hover:bg-orange-50 transition-colors whitespace-nowrap"
          >
            Vérifier mon compte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-bold">
              Essai gratuit actif - {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
            </p>
            <p className="text-sm opacity-90">
              Profitez de toutes les fonctionnalités gratuitement
            </p>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="bg-white/20 backdrop-blur px-6 py-2 rounded-lg font-semibold hover:bg-white/30 transition-colors whitespace-nowrap border border-white/30"
        >
          Vérifier maintenant
        </button>
      </div>
    </div>
  );
}
