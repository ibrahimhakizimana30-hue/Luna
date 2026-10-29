import { BalanceDisplay } from './BalanceDisplay';
import { Wallet, TrendingUp, Users, Activity } from 'lucide-react';

export function DashboardStyle2() {
  return (
    <div className="space-y-6">
      {/* Solde principal */}
      <BalanceDisplay variant="default" />

      {/* Grille de statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border-2 border-purple-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wallet className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Total envoyé</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">1,245 €</p>
          <p className="text-xs text-green-600 mt-1">+12% vs mois dernier</p>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Total reçu</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">2,489 €</p>
          <p className="text-xs text-green-600 mt-1">+8% vs mois dernier</p>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-green-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Contacts</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">48</p>
          <p className="text-xs text-gray-500 mt-1">+3 ce mois</p>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-orange-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600">Activité</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">192</p>
          <p className="text-xs text-gray-500 mt-1">actions ce mois</p>
        </div>
      </div>

      {/* Graphique et activités */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique simulé */}
        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-lg">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Évolution ce mois</h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-purple-600 to-blue-500 rounded-t-lg transition-all hover:opacity-80"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-400">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activités récentes */}
        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-lg">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Activité récente</h3>
          <div className="space-y-4">
            {[
              { action: 'Transaction envoyée', contact: 'Marie Dubois', time: '2h', color: 'text-red-600' },
              { action: 'Message reçu', contact: 'Jean Martin', time: '3h', color: 'text-blue-600' },
              { action: 'Appel vidéo', contact: 'Sophie Laurent', time: '5h', color: 'text-purple-600' },
              { action: 'Transaction reçue', contact: 'Paul Dupont', time: '1j', color: 'text-green-600' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.contact}</p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
