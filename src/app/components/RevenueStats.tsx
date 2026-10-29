import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

interface RevenueStatsProps {
  totalUsers: number;
  activeUsers: number;
  transactionVolume: number;
  totalRevenue: number;
  transactionFees: number;
  subscriptionRevenue: number;
}

export function RevenueStats({
  totalUsers,
  activeUsers,
  transactionVolume,
  totalRevenue,
  transactionFees,
  subscriptionRevenue,
}: RevenueStatsProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
      <h3 className="text-2xl font-bold text-purple-900 mb-6">
        📊 Statistiques de revenus Luna
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-3xl font-bold mb-1">{totalUsers.toLocaleString()}</p>
          <p className="text-sm opacity-90">Utilisateurs totaux</p>
          <p className="text-xs mt-1 opacity-75">{activeUsers.toLocaleString()} actifs</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-3xl font-bold mb-1">{totalRevenue.toLocaleString()} FCFA</p>
          <p className="text-sm opacity-90">Revenus totaux</p>
          <p className="text-xs mt-1 opacity-75">Ce mois</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-3xl font-bold mb-1">{transactionVolume.toLocaleString()} FCFA</p>
          <p className="text-sm opacity-90">Volume transactions</p>
          <p className="text-xs mt-1 opacity-75">Ce mois</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-3xl font-bold mb-1">{transactionFees.toLocaleString()} FCFA</p>
          <p className="text-sm opacity-90">Frais de transaction</p>
          <p className="text-xs mt-1 opacity-75">Revenus commission</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
          <h4 className="font-semibold text-purple-900 mb-3">Sources de revenus</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Frais de transaction</span>
              <span className="font-bold text-purple-900">{transactionFees.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Abonnements Premium</span>
              <span className="font-bold text-purple-900">{subscriptionRevenue.toLocaleString()} FCFA</span>
            </div>
            <div className="h-px bg-purple-200 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-purple-900">Total</span>
              <span className="text-lg font-bold text-purple-900">{totalRevenue.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
          <h4 className="font-semibold text-green-900 mb-3">Croissance</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Nouveaux utilisateurs</span>
              <span className="font-bold text-green-600">+{Math.floor(totalUsers * 0.15).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Croissance revenus</span>
              <span className="font-bold text-green-600">+23.4%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Taux de conversion</span>
              <span className="font-bold text-green-600">12.8%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900">
          <strong>💡 Conseil :</strong> Chaque transaction génère des frais de commission (0.5% à 2.5% selon le plan).
          Plus vos utilisateurs effectuent de transactions, plus vos revenus augmentent automatiquement !
        </p>
      </div>
    </div>
  );
}
