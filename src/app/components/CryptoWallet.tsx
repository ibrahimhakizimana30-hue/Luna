import { Bitcoin, Coins } from 'lucide-react';

interface CryptoBalance {
  symbol: string;
  name: string;
  balance: number;
  euroValue: number;
  icon: string;
}

export function CryptoWallet() {
  const cryptoBalances: CryptoBalance[] = [
    { symbol: 'BTC', name: 'Bitcoin', balance: 0.0234, euroValue: 1245.50, icon: '₿' },
    { symbol: 'ETH', name: 'Ethereum', balance: 0.5621, euroValue: 890.30, icon: 'Ξ' },
    { symbol: 'USDT', name: 'Tether', balance: 500, euroValue: 500, icon: '₮' },
    { symbol: 'BNB', name: 'Binance Coin', balance: 2.145, euroValue: 456.80, icon: 'BNB' },
  ];

  const totalEuroValue = cryptoBalances.reduce((sum, crypto) => sum + crypto.euroValue, 0);

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-orange-200 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
          <Bitcoin className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-orange-900">Portefeuille Crypto</h3>
          <p className="text-sm text-orange-700">Valeur totale : {totalEuroValue.toFixed(2)} €</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cryptoBalances.map((crypto) => (
          <div
            key={crypto.symbol}
            className="bg-white rounded-lg p-4 border border-orange-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{crypto.icon}</span>
              <span className="text-xs font-semibold text-orange-600">{crypto.symbol}</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">{crypto.name}</p>
            <p className="font-bold text-gray-900">{crypto.balance} {crypto.symbol}</p>
            <p className="text-xs text-gray-500">≈ {crypto.euroValue.toFixed(2)} €</p>
          </div>
        ))}
      </div>
    </div>
  );
}
