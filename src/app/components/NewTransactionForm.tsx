import { useState } from 'react';
import { PaymentMethod } from './PaymentMethodSelector';

interface NewTransactionFormProps {
  paymentMethod: PaymentMethod;
  onSubmit: (data: TransactionData) => void;
  onCancel: () => void;
}

export interface TransactionData {
  recipient: string;
  amount: string;
  paymentMethod: PaymentMethod;
  cryptoCurrency?: string;
  phoneNumber?: string;
  walletAddress?: string;
}

export function NewTransactionForm({ paymentMethod, onSubmit, onCancel }: NewTransactionFormProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const handleSubmit = () => {
    const amountValue = parseFloat(amount);

    // Validation du montant minimum pour Mobile Money et Airtel Money
    if ((paymentMethod === 'mobile-money' || paymentMethod === 'airtel-money') && amountValue < 800) {
      alert('Le montant minimum pour Mobile Money et Airtel Money est de 800 FCFA');
      return;
    }

    // Calculer les frais de transaction (2.5% pour compte gratuit, 1.5% Premium, 0.5% VIP)
    const userPlan = localStorage.getItem('luna_subscription_plan') || 'free';
    let feePercentage = 2.5;
    if (userPlan === 'premium') feePercentage = 1.5;
    if (userPlan === 'vip') feePercentage = 0.5;

    const transactionFee = (amountValue * feePercentage) / 100;
    const totalAmount = amountValue + transactionFee;

    // Afficher les frais à l'utilisateur
    const confirmed = confirm(
      `Transaction de ${amountValue.toLocaleString()} FCFA\n` +
      `Frais de service (${feePercentage}%): ${transactionFee.toLocaleString()} FCFA\n` +
      `Montant total: ${totalAmount.toLocaleString()} FCFA\n\n` +
      `Confirmer la transaction ?`
    );

    if (!confirmed) return;

    const data: TransactionData = {
      recipient,
      amount,
      paymentMethod,
      ...(paymentMethod === 'crypto' && { cryptoCurrency, walletAddress }),
      ...(paymentMethod === 'mobile-money' && { phoneNumber }),
      ...(paymentMethod === 'airtel-money' && { phoneNumber }),
    };
    onSubmit(data);
  };

  const getAmountLabel = () => {
    switch (paymentMethod) {
      case 'crypto':
        return `Montant (${cryptoCurrency})`;
      case 'mobile-money':
      case 'airtel-money':
        return 'Montant (Francs CFA)';
      default:
        return 'Montant (€)';
    }
  };

  return (
    <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-purple-900">Nouvelle transaction</h3>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Destinataire
          </label>
          <input
            type="text"
            placeholder="Nom du destinataire"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {paymentMethod === 'crypto' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Crypto-monnaie
              </label>
              <select
                value={cryptoCurrency}
                onChange={(e) => setCryptoCurrency(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
                <option value="BNB">Binance Coin (BNB)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adresse du portefeuille
              </label>
              <input
                type="text"
                placeholder="0x... ou bc1..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </>
        )}

        {(paymentMethod === 'mobile-money' || paymentMethod === 'airtel-money') && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              placeholder="+242 XXX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {getAmountLabel()}
          </label>
          <input
            type="number"
            placeholder={(paymentMethod === 'mobile-money' || paymentMethod === 'airtel-money') ? 'Minimum 800 FCFA' : '0.00'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            min={(paymentMethod === 'mobile-money' || paymentMethod === 'airtel-money') ? '800' : '0'}
          />
          {paymentMethod === 'crypto' && amount && (
            <p className="text-sm text-gray-500 mt-1">
              ≈ {(parseFloat(amount) * 53240).toFixed(2)} € (estimation)
            </p>
          )}
          {(paymentMethod === 'mobile-money' || paymentMethod === 'airtel-money') && amount && parseFloat(amount) < 800 && (
            <p className="text-sm text-red-600 mt-1">
              ⚠️ Le montant minimum est de 800 FCFA
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={handleSubmit}
            disabled={!recipient || !amount}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Envoyer
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Annuler
          </button>
        </div>

        {!navigator.onLine && (
          <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
            ⚠️ Transaction sera synchronisée lors de la reconnexion
          </p>
        )}
      </div>
    </div>
  );
}
