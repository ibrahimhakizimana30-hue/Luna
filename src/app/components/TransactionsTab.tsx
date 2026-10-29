import { useState } from 'react';
import { Send, Clock, CheckCircle2, Plus, Bitcoin, Smartphone } from 'lucide-react';
import { PaymentMethodSelector, PaymentMethod } from './PaymentMethodSelector';
import { NewTransactionForm, TransactionData } from './NewTransactionForm';
import { CryptoWallet } from './CryptoWallet';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  recipient: string;
  status: 'pending' | 'synced' | 'completed';
  date: Date;
  paymentMethod: PaymentMethod;
  currency: string;
}

export function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'send',
      amount: 50,
      recipient: 'Marie Dubois',
      status: 'completed',
      date: new Date(2026, 4, 14),
      paymentMethod: 'fiat',
      currency: '€',
    },
    {
      id: '2',
      type: 'receive',
      amount: 0.0012,
      recipient: 'Jean Martin',
      status: 'completed',
      date: new Date(2026, 4, 13),
      paymentMethod: 'crypto',
      currency: 'BTC',
    },
    {
      id: '3',
      type: 'send',
      amount: 5000,
      recipient: 'Sophie Laurent',
      status: 'pending',
      date: new Date(),
      paymentMethod: 'mobile-money',
      currency: 'CFA',
    },
  ]);

  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('fiat');

  const handleCreateTransaction = (data: TransactionData) => {
    if (!data.amount || !data.recipient) return;

    const getCurrency = () => {
      switch (data.paymentMethod) {
        case 'crypto': return data.cryptoCurrency || 'BTC';
        case 'mobile-money':
        case 'airtel-money': return 'CFA';
        default: return '€';
      }
    };

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: 'send',
      amount: parseFloat(data.amount),
      recipient: data.recipient,
      status: navigator.onLine ? 'completed' : 'pending',
      date: new Date(),
      paymentMethod: data.paymentMethod,
      currency: getCurrency(),
    };

    setTransactions([transaction, ...transactions]);
    setShowNewTransaction(false);
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'crypto': return <Bitcoin className="w-5 h-5" />;
      case 'mobile-money': return <Smartphone className="w-5 h-5" />;
      case 'airtel-money': return <Smartphone className="w-5 h-5" />;
      default: return <Send className="w-5 h-5" />;
    }
  };

  const getPaymentMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case 'crypto': return 'bg-orange-100';
      case 'mobile-money': return 'bg-blue-100';
      case 'airtel-money': return 'bg-red-100';
      default: return 'bg-green-100';
    }
  };

  const getPaymentMethodTextColor = (method: PaymentMethod) => {
    switch (method) {
      case 'crypto': return 'text-orange-600';
      case 'mobile-money': return 'text-blue-600';
      case 'airtel-money': return 'text-red-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Transactions
        </h2>
        <button
          onClick={() => setShowNewTransaction(!showNewTransaction)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Nouvelle transaction
        </button>
      </div>

      <CryptoWallet />

      {showNewTransaction && (
        <div className="space-y-4">
          <PaymentMethodSelector
            selectedMethod={selectedPaymentMethod}
            onSelectMethod={setSelectedPaymentMethod}
          />
          <NewTransactionForm
            paymentMethod={selectedPaymentMethod}
            onSubmit={handleCreateTransaction}
            onCancel={() => setShowNewTransaction(false)}
          />
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-purple-900 mb-3">Historique</h3>
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white border-2 border-purple-100 rounded-xl p-4 hover:shadow-lg transition-all hover:border-purple-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${getPaymentMethodColor(transaction.paymentMethod)}`}>
                    {transaction.type === 'send' ? (
                      <div className={`${getPaymentMethodTextColor(transaction.paymentMethod)} rotate-45`}>
                        {getPaymentMethodIcon(transaction.paymentMethod)}
                      </div>
                    ) : (
                      <div className={`${getPaymentMethodTextColor(transaction.paymentMethod)} -rotate-45`}>
                        {getPaymentMethodIcon(transaction.paymentMethod)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{transaction.recipient}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">
                        {transaction.date.toLocaleDateString('fr-FR')}
                      </p>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                        {transaction.paymentMethod === 'fiat' && 'Euro'}
                        {transaction.paymentMethod === 'crypto' && 'Crypto'}
                        {transaction.paymentMethod === 'mobile-money' && 'Mobile Money'}
                        {transaction.paymentMethod === 'airtel-money' && 'Airtel Money'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className={`text-lg font-bold ${
                      transaction.type === 'send' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.type === 'send' ? '-' : '+'}{transaction.amount} {transaction.currency}
                    </span>
                  </div>
                  {transaction.status === 'pending' && (
                    <Clock className="w-5 h-5 text-orange-500" title="En attente de synchronisation" />
                  )}
                  {transaction.status === 'synced' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-500" title="Synchronisé" />
                  )}
                  {transaction.status === 'completed' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" title="Complété" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
