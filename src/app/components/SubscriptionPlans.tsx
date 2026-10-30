import { Check, Crown, Zap, Star } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
  transactionFee: number;
  transactionLimit: number;
  color: string;
  icon: any;
  popular?: boolean;
}

export function SubscriptionPlans({ onSelectPlan }: { onSelectPlan: (planId: string) => void }) {
  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Gratuit',
      price: 0,
      period: 'month',
      transactionFee: 2.5,
      transactionLimit: 50000,
      color: 'from-gray-400 to-gray-500',
      icon: Star,
      features: [
        'Transactions jusqu\'à 50,000 FCFA/mois',
        'Frais de 2.5% par transaction',
        'Messages et appels basiques',
        'Support par email',
        'Compte d\'épargne limité',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 2500,
      period: 'month',
      transactionFee: 1.5,
      transactionLimit: 500000,
      color: 'from-purple-500 to-blue-600',
      icon: Zap,
      popular: true,
      features: [
        'Transactions jusqu\'à 500,000 FCFA/mois',
        'Frais réduits à 1.5% par transaction',
        'Messages et appels illimités',
        'Support prioritaire 24/7',
        'Compte d\'épargne avec intérêts 3%',
        'Crypto-monnaie incluse',
        'Carte virtuelle Luna',
      ],
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 5000,
      period: 'month',
      transactionFee: 0.5,
      transactionLimit: 999999999,
      color: 'from-yellow-400 to-orange-500',
      icon: Crown,
      features: [
        'Transactions illimitées',
        'Frais minimaux 0.5% par transaction',
        'Tout Premium inclus',
        'Gestionnaire de compte dédié',
        'Compte d\'épargne avec intérêts 5%',
        'Prêts instantanés disponibles',
        'Assurance transactions incluse',
        'Cashback 1% sur toutes les transactions',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="max-w-6xl w-full my-8">
        <div className="text-center mb-8 text-white">
          <h2 className="text-4xl font-bold mb-4">Choisissez votre plan Luna 🌙</h2>
          <p className="text-lg opacity-90">
            Débloquez tout le potentiel de Luna avec nos plans premium
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl overflow-hidden shadow-2xl transition-all hover:scale-105 ${
                  plan.popular ? 'ring-4 ring-yellow-400 relative' : ''
                }`}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-center py-2 font-bold text-sm">
                    ⭐ PLUS POPULAIRE ⭐
                  </div>
                )}

                <div className={`bg-gradient-to-r ${plan.color} text-white p-6 text-center`}>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-5xl font-bold">{plan.price.toLocaleString()}</span>
                    <span className="text-xl"> FCFA</span>
                  </div>
                  <p className="text-sm opacity-90">par mois</p>
                </div>

                <div className="p-6">
                  <div className="bg-blue-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Frais par transaction</span>
                      <span className="text-lg font-bold text-blue-600">{plan.transactionFee}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Limite mensuelle</span>
                      <span className="text-sm font-bold text-blue-600">
                        {plan.transactionLimit === 999999999 ? 'Illimité' : `${(plan.transactionLimit / 1000).toFixed(0)}K FCFA`}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onSelectPlan(plan.id)}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      plan.id === 'free'
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : `bg-gradient-to-r ${plan.color} text-white hover:shadow-lg`
                    }`}
                  >
                    {plan.id === 'free' ? 'Continuer gratuitement' : 'Choisir ce plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center text-white text-sm">
          <p>💳 Paiement sécurisé • 🔄 Résiliation à tout moment • ✅ Garantie 30 jours satisfait ou remboursé</p>
        </div>
      </div>
    </div>
  );
}
