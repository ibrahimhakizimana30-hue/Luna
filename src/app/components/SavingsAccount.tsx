import { useState } from 'react';
import { PiggyBank, Lock, Unlock, Calendar, TrendingUp, Plus, Settings } from 'lucide-react';

interface SavingsConfig {
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  isLocked: boolean;
  unlockDate?: Date;
}

interface SavingsHistory {
  id: string;
  amount: number;
  date: Date;
  type: 'auto' | 'manual';
}

export function SavingsAccount() {
  const [savingsBalance, setSavingsBalance] = useState(125000); // en FCFA
  const [isLocked, setIsLocked] = useState(false);
  const [unlockDate, setUnlockDate] = useState<Date | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showAddManual, setShowAddManual] = useState(false);

  const [config, setConfig] = useState<SavingsConfig>({
    amount: 5000,
    frequency: 'weekly',
    isLocked: false,
  });

  const [manualAmount, setManualAmount] = useState('');
  const [lockDuration, setLockDuration] = useState('30'); // jours

  const [history] = useState<SavingsHistory[]>([
    { id: '1', amount: 5000, date: new Date(2026, 4, 20), type: 'auto' },
    { id: '2', amount: 10000, date: new Date(2026, 4, 18), type: 'manual' },
    { id: '3', amount: 5000, date: new Date(2026, 4, 13), type: 'auto' },
  ]);

  const handleLockSavings = () => {
    const days = parseInt(lockDuration);
    const unlock = new Date();
    unlock.setDate(unlock.getDate() + days);
    setUnlockDate(unlock);
    setIsLocked(true);
  };

  const handleUnlockSavings = () => {
    setIsLocked(false);
    setUnlockDate(null);
  };

  const handleAddManual = () => {
    const amount = parseFloat(manualAmount);
    if (amount >= 800) {
      setSavingsBalance(savingsBalance + amount);
      setManualAmount('');
      setShowAddManual(false);
    }
  };

  const handleWithdraw = () => {
    if (!isLocked) {
      // Logique de retrait
      alert('Fonction de retrait à implémenter');
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'daily': return 'Par jour';
      case 'weekly': return 'Par semaine';
      case 'monthly': return 'Par mois';
      default: return freq;
    }
  };

  const canUnlock = unlockDate ? new Date() >= unlockDate : true;

  return (
    <div className="space-y-6">
      {/* Carte principale d'épargne */}
      <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
              <PiggyBank className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-90">Compte d'épargne</p>
              <p className="text-xs opacity-70">Luna Savings 🌙</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-5xl font-bold mb-2">{savingsBalance.toLocaleString()} FCFA</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-200" />
            <span className="text-sm text-green-200">+15,000 FCFA ce mois</span>
          </div>
        </div>

        {/* Statut de verrouillage */}
        {isLocked ? (
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold">Épargne verrouillée</span>
            </div>
            <p className="text-sm opacity-90">
              Déverrouillage le : {unlockDate?.toLocaleDateString('fr-FR')}
            </p>
            {canUnlock && (
              <button
                onClick={handleUnlockSavings}
                className="mt-3 w-full bg-white/30 hover:bg-white/40 py-2 rounded-lg font-semibold transition-colors"
              >
                Déverrouiller maintenant
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <Unlock className="w-5 h-5 text-green-200" />
              <span className="font-semibold">Épargne déverrouillée</span>
            </div>
            <p className="text-sm opacity-90">Vous pouvez retirer à tout moment</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowAddManual(true)}
            className="bg-white/30 hover:bg-white/40 backdrop-blur py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
          <button
            onClick={handleWithdraw}
            disabled={isLocked}
            className={`py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
              isLocked
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : 'bg-white/30 hover:bg-white/40 backdrop-blur'
            }`}
          >
            <TrendingUp className="w-5 h-5 rotate-180" />
            Retirer
          </button>
        </div>
      </div>

      {/* Configuration épargne automatique */}
      {showConfig && (
        <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-lg">
          <h3 className="text-xl font-bold text-green-900 mb-4">Configuration de l'épargne</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Montant à épargner
              </label>
              <input
                type="number"
                value={config.amount}
                onChange={(e) => setConfig({ ...config, amount: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Minimum 800 FCFA"
                min="800"
              />
              {config.amount < 800 && (
                <p className="text-sm text-red-600 mt-1">⚠️ Le montant minimum est de 800 FCFA</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fréquence d'épargne
              </label>
              <select
                value={config.frequency}
                onChange={(e) => setConfig({ ...config, frequency: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="daily">Par jour</option>
                <option value="weekly">Par semaine</option>
                <option value="monthly">Par mois</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Verrouiller l'épargne
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={lockDuration}
                  onChange={(e) => setLockDuration(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nombre de jours"
                  min="1"
                />
                <button
                  onClick={handleLockSavings}
                  disabled={isLocked}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <Lock className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Verrouiller votre épargne pour une période définie
              </p>
            </div>

            <button
              onClick={() => setShowConfig(false)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Enregistrer la configuration
            </button>
          </div>
        </div>
      )}

      {/* Ajouter manuellement */}
      {showAddManual && (
        <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-lg">
          <h3 className="text-xl font-bold text-green-900 mb-4">Ajouter à l'épargne</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Montant (FCFA)
              </label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Minimum 800 FCFA"
                min="800"
              />
              {manualAmount && parseFloat(manualAmount) < 800 && (
                <p className="text-sm text-red-600 mt-1">⚠️ Le montant minimum est de 800 FCFA</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddManual}
                disabled={!manualAmount || parseFloat(manualAmount) < 800}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
              <button
                onClick={() => setShowAddManual(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-lg">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Historique d'épargne</h3>
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                  {item.type === 'auto' ? (
                    <Calendar className="w-5 h-5 text-green-700" />
                  ) : (
                    <Plus className="w-5 h-5 text-green-700" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {item.type === 'auto' ? 'Épargne automatique' : 'Ajout manuel'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.date.toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <span className="font-bold text-green-600">+{item.amount.toLocaleString()} FCFA</span>
            </div>
          ))}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border-2 border-green-200 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Épargne {getFrequencyLabel(config.frequency)}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{config.amount.toLocaleString()} FCFA</p>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-green-200 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Objectif annuel</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(config.frequency === 'daily' ? config.amount * 365 :
              config.frequency === 'weekly' ? config.amount * 52 :
              config.amount * 12).toLocaleString()} FCFA
          </p>
        </div>
      </div>
    </div>
  );
}
