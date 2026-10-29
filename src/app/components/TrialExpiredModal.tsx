import { AlertCircle, Lock } from 'lucide-react';

export function TrialExpiredModal({ onVerify }: { onVerify: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-red-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Période d'essai terminée
        </h2>

        <p className="text-gray-600 mb-6">
          Votre période d'essai gratuite de 7 jours est maintenant terminée. Pour continuer à utiliser toutes les fonctionnalités de Luna, veuillez compléter votre vérification KYC.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 text-left">
              <p className="font-semibold mb-2">Après la vérification KYC :</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Accès complet et permanent</li>
                <li>Limites de transaction augmentées</li>
                <li>Compte 100% sécurisé</li>
                <li>Support prioritaire</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={onVerify}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
        >
          Commencer la vérification KYC
        </button>
      </div>
    </div>
  );
}
