import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Lock, RefreshCw, Send, Wallet } from 'lucide-react';
import {
  type LunaTransaction,
  type Profile,
  feePercent,
  getBalance,
  getProfile,
  listTransactions,
  transfer,
} from '../backend';
import { MobileMoneyPay } from './MobileMoneyPay';

// Transferts réels entre utilisateurs Luna (mode serveur).
// Le solde, les frais, les limites et le code PIN sont contrôlés par le serveur.
export function LunaTransfers() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<LunaTransaction[]>([]);
  const [loadError, setLoadError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'details' | 'pin'>('details');
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    setLoadError('');
    try {
      const [p, b, h] = await Promise.all([getProfile(), getBalance(), listTransactions()]);
      setProfile(p);
      setBalance(b);
      setHistory(h);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const amountValue = Math.round(Number(amount) || 0);
  const pct = profile ? feePercent(profile.plan) : 2.5;
  const fee = Math.ceil((amountValue * pct) / 100);
  const canContinue = recipient.trim().length > 3 && amountValue >= 100;

  const resetForm = () => {
    setRecipient('');
    setAmount('');
    setPin('');
    setStep('details');
    setFormError('');
    setShowForm(false);
  };

  const handleSend = async () => {
    if (!/^\d{4}$/.test(pin)) return;
    setIsSending(true);
    setFormError('');
    try {
      const result = await transfer(recipient, amountValue, pin);
      if (!result.ok) {
        setPin('');
        setFormError(
          result.pin.locked_until
            ? 'Code PIN incorrect. Trop d\'essais : réessayez plus tard.'
            : `Code PIN incorrect (${result.pin.attempts_left} essai${result.pin.attempts_left > 1 ? 's' : ''} restant${result.pin.attempts_left > 1 ? 's' : ''})`
        );
        setIsSending(false);
        return;
      }
      setSuccess(`${amountValue.toLocaleString('fr-FR')} FCFA envoyés à ${recipient.trim()}`);
      resetForm();
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Transfert impossible');
      setStep('details');
      setPin('');
    }
    setIsSending(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Transactions
        </h2>
        <button
          onClick={() => {
            setSuccess('');
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
        >
          <Send className="w-4 h-4" />
          Envoyer de l'argent
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="text-sm text-red-800 font-medium">{loadError}</span>
          <button onClick={refresh} className="text-sm font-semibold text-red-700 flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      )}

      {/* Solde */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <Wallet className="w-5 h-5" />
          <span className="text-sm font-medium">Solde disponible</span>
        </div>
        <p className="text-4xl font-bold">
          {balance === null ? '…' : `${balance.toLocaleString('fr-FR')} FCFA`}
        </p>
        {profile && (
          <p className="text-xs opacity-80 mt-2">
            Plan {profile.plan === 'free' ? 'Gratuit' : profile.plan === 'premium' ? 'Premium' : 'VIP'} · frais {pct} % par envoi
          </p>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">{success}</span>
        </div>
      )}

      {/* Formulaire d'envoi */}
      {showForm && (
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-lg space-y-4">
          <h3 className="text-xl font-bold text-purple-900">Envoyer à un utilisateur Luna</h3>

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800 font-medium">{formError}</span>
            </div>
          )}

          {step === 'details' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Destinataire (téléphone ou email de son compte Luna)
                </label>
                <input
                  type="text"
                  placeholder="+242 06 123 4567 ou nom@gmail.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Montant (FCFA)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="100"
                  placeholder="Minimum 100 FCFA"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {amountValue >= 100 && (
                <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-900 space-y-1">
                  <div className="flex justify-between"><span>Montant</span><span>{amountValue.toLocaleString('fr-FR')} FCFA</span></div>
                  <div className="flex justify-between"><span>Frais ({pct} %)</span><span>{fee.toLocaleString('fr-FR')} FCFA</span></div>
                  <div className="flex justify-between font-bold"><span>Total débité</span><span>{(amountValue + fee).toLocaleString('fr-FR')} FCFA</span></div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setFormError(''); setStep('pin'); }}
                  disabled={!canContinue}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
                <button onClick={resetForm} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold">
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                Envoyer <strong>{amountValue.toLocaleString('fr-FR')} FCFA</strong> à <strong>{recipient.trim()}</strong>{' '}
                (total débité : {(amountValue + fee).toLocaleString('fr-FR')} FCFA).
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Confirmez avec votre code PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={isSending || pin.length !== 4}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Envoi en cours...' : 'Confirmer l\'envoi'}
                </button>
                <button
                  onClick={() => { setStep('details'); setPin(''); setFormError(''); }}
                  disabled={isSending}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  Retour
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Le solde Luna est un montant de test, sans valeur réelle. Pour envoyer de l'argent réel, utilisez
        « Payer par Mobile Money » ci-dessous : l'argent passe directement par votre opérateur.
      </p>

      <MobileMoneyPay />

      {/* Historique */}
      <div>
        <h3 className="text-lg font-semibold text-purple-900 mb-3">Historique</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune transaction pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {history.map((tx) => (
              <div key={tx.id} className="bg-white border-2 border-purple-100 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-3 rounded-xl ${tx.direction === 'send' ? 'bg-red-100' : 'bg-green-100'}`}>
                    {tx.direction === 'send' ? (
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{tx.counterpart}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      {tx.fee > 0 && ` · frais ${tx.fee.toLocaleString('fr-FR')} FCFA`}
                    </p>
                  </div>
                </div>
                <span className={`text-lg font-bold whitespace-nowrap ${tx.direction === 'send' ? 'text-red-600' : 'text-green-600'}`}>
                  {tx.direction === 'send' ? '-' : '+'}{tx.amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
