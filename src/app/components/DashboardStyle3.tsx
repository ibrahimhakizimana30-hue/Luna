import { useEffect, useState } from 'react';
import { BalanceDisplay } from './BalanceDisplay';
import { Send, MessageCircle, Video, Plus, Bitcoin, Smartphone, Euro, Wallet } from 'lucide-react';
import { getBalance, isBackendEnabled } from '../backend';

// Solde réel lu sur le serveur Luna
function ServerBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getBalance().then(setBalance).catch(() => setError(true));
  }, []);

  return (
    <div className="flex items-center gap-4 bg-white rounded-xl p-4 border-2 border-purple-200 shadow-md">
      <Wallet className="w-8 h-8 text-purple-600" />
      <div className="flex-1">
        <p className="text-sm text-gray-600">Solde disponible</p>
        <p className="text-2xl font-bold text-purple-900">
          {error ? 'Indisponible' : balance === null ? '…' : `${balance.toLocaleString('fr-FR')} FCFA`}
        </p>
      </div>
    </div>
  );
}

export function DashboardStyle3() {
  return (
    <div className="space-y-6">
      {/* Solde compact */}
      {isBackendEnabled ? <ServerBalance /> : <BalanceDisplay variant="compact" />}

      {/* Menu d'actions coloré */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          <div className="flex flex-col items-center gap-2">
            <Send className="w-8 h-8" />
            <span className="font-semibold">Envoyer</span>
            <span className="text-xs opacity-80">Argent</span>
          </div>
        </button>

        <button className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          <div className="flex flex-col items-center gap-2">
            <MessageCircle className="w-8 h-8" />
            <span className="font-semibold">Messages</span>
            <span className="text-xs opacity-80">3 nouveaux</span>
          </div>
        </button>

        <button className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          <div className="flex flex-col items-center gap-2">
            <Video className="w-8 h-8" />
            <span className="font-semibold">Appels</span>
            <span className="text-xs opacity-80">Vidéo/Audio</span>
          </div>
        </button>

        <button className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          <div className="flex flex-col items-center gap-2">
            <Plus className="w-8 h-8" />
            <span className="font-semibold">Plus</span>
            <span className="text-xs opacity-80">Options</span>
          </div>
        </button>
      </div>

      {/* Méthodes de paiement favorites (montants fictifs : mode démo uniquement) */}
      {!isBackendEnabled && (
      <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">Méthodes de paiement</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Euro className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-green-900">Euro</p>
            <p className="text-xs text-green-600">3,892 €</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Bitcoin className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-orange-900">Crypto</p>
            <p className="text-xs text-orange-600">3,092 €</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-blue-900">Mobile Money</p>
            <p className="text-xs text-blue-600">45,000 CFA</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-red-900">Airtel Money</p>
            <p className="text-xs text-red-600">32,500 CFA</p>
          </div>
        </div>
      </div>
      )}

      {/* Liste compacte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border-2 border-purple-200 shadow-md">
          <h4 className="font-semibold text-purple-900 mb-3">Contacts favoris</h4>
          <div className="space-y-2">
            {['Marie Dubois', 'Jean Martin', 'Sophie Laurent'].map((name, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-900">{name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border-2 border-purple-200 shadow-md">
          <h4 className="font-semibold text-purple-900 mb-3">Raccourcis</h4>
          <div className="space-y-2">
            {[
              { label: 'Recharger Mobile Money', color: 'bg-blue-100 text-blue-700' },
              { label: 'Acheter des cryptos', color: 'bg-orange-100 text-orange-700' },
              { label: 'Historique complet', color: 'bg-purple-100 text-purple-700' },
            ].map((item, i) => (
              <button key={i} className={`w-full text-left px-4 py-2 ${item.color} rounded-lg hover:shadow-md transition-all font-medium text-sm`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
