import { BalanceDisplay } from './BalanceDisplay';
import { Wallet, MessageCircle, Video, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

export function DashboardStyle1() {
  return (
    <div className="space-y-6">
      {/* En-tête avec solde */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BalanceDisplay variant="card" />

        <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl hover:shadow-md transition-all border border-purple-200">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-purple-900">Envoyer</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl hover:shadow-md transition-all border border-green-200">
              <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl">
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-green-900">Recevoir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Wallet className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">24</span>
          </div>
          <p className="text-sm opacity-90">Transactions ce mois</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MessageCircle className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">156</span>
          </div>
          <p className="text-sm opacity-90">Messages échangés</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Video className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">12</span>
          </div>
          <p className="text-sm opacity-90">Appels cette semaine</p>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-lg">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">Transactions récentes</h3>
        <div className="space-y-3">
          {[
            { name: 'Marie Dubois', amount: -50, time: 'Il y a 2h', type: 'send' },
            { name: 'Jean Martin', amount: +120, time: 'Hier', type: 'receive' },
            { name: 'Sophie Laurent', amount: -30, time: 'Hier', type: 'pending' },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.type === 'receive' ? 'bg-green-200' : tx.type === 'pending' ? 'bg-orange-200' : 'bg-red-200'
                }`}>
                  {tx.type === 'receive' ? (
                    <ArrowDownLeft className="w-5 h-5 text-green-700" />
                  ) : tx.type === 'pending' ? (
                    <Clock className="w-5 h-5 text-orange-700" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-red-700" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{tx.name}</p>
                  <p className="text-sm text-gray-500">{tx.time}</p>
                </div>
              </div>
              <span className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {tx.amount >= 0 ? '+' : ''}{tx.amount} €
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
