import { Eye, EyeOff, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface BalanceDisplayProps {
  variant?: 'default' | 'card' | 'compact';
}

export function BalanceDisplay({ variant = 'default' }: BalanceDisplayProps) {
  const [showBalance, setShowBalance] = useState(true);

  const totalBalance = 3892.50;
  const monthlyChange = +245.30;
  const changePercent = +6.7;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 bg-white rounded-xl p-4 border-2 border-purple-200 shadow-md">
        <Wallet className="w-8 h-8 text-purple-600" />
        <div className="flex-1">
          <p className="text-sm text-gray-600">Solde total</p>
          <p className="text-2xl font-bold text-purple-900">
            {showBalance ? `${totalBalance.toFixed(2)} €` : '••••••'}
          </p>
        </div>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
        >
          {showBalance ? (
            <EyeOff className="w-5 h-5 text-gray-500" />
          ) : (
            <Eye className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">Solde disponible</span>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            {showBalance ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="mb-4">
          <p className="text-4xl font-bold mb-2">
            {showBalance ? `${totalBalance.toFixed(2)} €` : '•••••••'}
          </p>
          <div className="flex items-center gap-2 text-sm">
            {monthlyChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-300" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-300" />
            )}
            <span className={monthlyChange >= 0 ? 'text-green-300' : 'text-red-300'}>
              {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(2)} € ({changePercent >= 0 ? '+' : ''}{changePercent}%)
            </span>
            <span className="opacity-70">ce mois</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-xs opacity-70 mb-1">Revenus</p>
            <p className="text-lg font-semibold">+ 1,245 €</p>
          </div>
          <div>
            <p className="text-xs opacity-70 mb-1">Dépenses</p>
            <p className="text-lg font-semibold">- 999 €</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-purple-900">Solde total</h3>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
        >
          {showBalance ? (
            <EyeOff className="w-5 h-5 text-gray-500" />
          ) : (
            <Eye className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>
      <p className="text-4xl font-bold text-purple-900 mb-2">
        {showBalance ? `${totalBalance.toFixed(2)} €` : '••••••'}
      </p>
      <div className="flex items-center gap-2">
        {monthlyChange >= 0 ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
        <span className={`text-sm font-medium ${monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(2)} € ce mois
        </span>
      </div>
    </div>
  );
}
