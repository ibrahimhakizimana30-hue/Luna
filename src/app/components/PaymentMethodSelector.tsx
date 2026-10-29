import { Euro, Bitcoin, Smartphone } from 'lucide-react';

export type PaymentMethod = 'fiat' | 'crypto' | 'mobile-money' | 'airtel-money';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ selectedMethod, onSelectMethod }: PaymentMethodSelectorProps) {
  const methods = [
    { id: 'fiat' as PaymentMethod, label: 'Euro (€)', icon: Euro, color: 'from-green-500 to-emerald-600' },
    { id: 'crypto' as PaymentMethod, label: 'Crypto', icon: Bitcoin, color: 'from-yellow-500 to-orange-600' },
    { id: 'mobile-money' as PaymentMethod, label: 'Mobile Money', icon: Smartphone, color: 'from-blue-500 to-cyan-600' },
    { id: 'airtel-money' as PaymentMethod, label: 'Airtel Money', icon: Smartphone, color: 'from-red-500 to-pink-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {methods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;

        return (
          <button
            key={method.id}
            onClick={() => onSelectMethod(method.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg scale-105'
                : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
            }`}
          >
            <div className={`p-3 rounded-lg bg-gradient-to-br ${method.color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <span className={`text-sm font-semibold ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
              {method.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
