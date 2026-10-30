import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CalendarClock, CheckCircle2, Lock, PiggyBank, Repeat, Target, Unlock } from 'lucide-react';
import {
  getSavings,
  getSavingsHistory,
  savingsDeposit,
  savingsLock,
  savingsSetAuto,
  savingsSetGoal,
  savingsWithdraw,
  type SavingsMovement,
  type SavingsStatus,
} from '../backend';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

type Panel = 'deposit' | 'withdraw' | 'goal' | 'auto' | 'lock' | null;

const inputClass =
  'w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-transparent';

// Épargne réelle : l'argent est pris sur le solde Luna et peut y revenir (sauf pendant un blocage)
export function LunaSavings() {
  const [status, setStatus] = useState<SavingsStatus | null>(null);
  const [history, setHistory] = useState<SavingsMovement[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [amount, setAmount] = useState('');
  const [goalName, setGoalName] = useState('');
  const [autoDay, setAutoDay] = useState(1);
  const [lockDays, setLockDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([getSavings(), getSavingsHistory()]);
      setStatus(s);
      setHistory(h);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (p: Panel) => {
    setError('');
    setSuccess('');
    setPanel(panel === p ? null : p);
    setAmount(p === 'goal' ? String(status?.goal_amount ?? '') : p === 'auto' ? String(status?.auto_amount ?? '') : '');
    setGoalName(status?.goal_name ?? '');
    setAutoDay(status?.auto_day ?? 1);
  };

  const run = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setSuccess(message);
      setPanel(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  };

  const amountValue = Math.round(Number(amount) || 0);

  if (!status) {
    return error ? (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
    ) : (
      <p className="text-sm text-gray-500">Chargement…</p>
    );
  }

  const locked = !!status.locked_until;
  const progress = status.goal_amount ? Math.min(100, Math.round((status.balance / status.goal_amount) * 100)) : 0;

  return (
    <div className="space-y-5">
      {/* Carte principale */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/20">
            <PiggyBank className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm opacity-90">Compte d'épargne</p>
            <p className="text-xs opacity-75">Luna Savings 🌙</p>
          </div>
        </div>
        <p className="text-4xl font-bold">{fcfa(status.balance)}</p>
        <p className="text-sm opacity-90">
          {status.month_change >= 0 ? '+' : ''}
          {fcfa(status.month_change)} ce mois · Solde Luna disponible : {fcfa(status.wallet_balance)}
        </p>

        {status.goal_amount && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4" /> {status.goal_name}
              </span>
              <span>
                {progress} % de {fcfa(status.goal_amount)}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full bg-yellow-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="bg-white/15 rounded-xl p-3 text-sm flex items-center gap-2">
          {locked ? <Lock className="w-5 h-5 flex-shrink-0" /> : <Unlock className="w-5 h-5 flex-shrink-0" />}
          {locked
            ? `Épargne bloquée jusqu'au ${dateFr(status.locked_until!)} : vous pouvez verser, pas retirer.`
            : 'Épargne libre : vous pouvez retirer à tout moment.'}
        </div>
        {status.auto_amount && status.auto_day && (
          <div className="bg-white/15 rounded-xl p-3 text-sm flex items-center gap-2">
            <Repeat className="w-5 h-5 flex-shrink-0" />
            {fcfa(status.auto_amount)} épargnés automatiquement chaque {DAYS[status.auto_day - 1].toLowerCase()}.
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        L'épargne utilise votre solde Luna, qui est pour l'instant un montant de test sans valeur réelle.
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => open('deposit')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold">
          <ArrowDownLeft className="w-5 h-5" /> Épargner
        </button>
        <button
          onClick={() => open('withdraw')}
          disabled={locked}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-green-600 text-green-700 font-semibold disabled:opacity-40"
        >
          <ArrowUpRight className="w-5 h-5" /> Retirer
        </button>
        <button onClick={() => open('goal')} className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-purple-200 text-purple-700 font-semibold">
          <Target className="w-5 h-5" /> Objectif
        </button>
        <button onClick={() => open('auto')} className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-purple-200 text-purple-700 font-semibold">
          <CalendarClock className="w-5 h-5" /> Automatique
        </button>
        <button onClick={() => open('lock')} className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-purple-200 text-purple-700 font-semibold">
          <Lock className="w-5 h-5" /> {locked ? 'Prolonger le blocage' : 'Bloquer mon épargne'}
        </button>
      </div>

      {/* Panneaux */}
      {(panel === 'deposit' || panel === 'withdraw') && (
        <form
          className="bg-white border-2 border-purple-200 rounded-xl p-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (panel === 'deposit') void run(() => savingsDeposit(amountValue), `${fcfa(amountValue)} ajoutés à votre épargne.`);
            else void run(() => savingsWithdraw(amountValue), `${fcfa(amountValue)} remis sur votre solde Luna.`);
          }}
        >
          <label htmlFor="sv-amount" className="block text-sm font-semibold text-gray-700">
            {panel === 'deposit' ? 'Montant à épargner (FCFA)' : 'Montant à retirer (FCFA)'}
          </label>
          <input id="sv-amount" type="number" inputMode="numeric" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Minimum 100 FCFA" className={inputClass} />
          <p className="text-xs text-gray-500">
            {panel === 'deposit' ? `Pris sur votre solde Luna (${fcfa(status.wallet_balance)}).` : `Épargne disponible : ${fcfa(status.balance)}.`}
          </p>
          <div className="flex gap-3">
            <button type="submit" disabled={busy || amountValue < (panel === 'deposit' ? 100 : 1)} className="flex-1 py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50">
              {busy ? 'Patientez…' : 'Valider'}
            </button>
            <button type="button" onClick={() => setPanel(null)} className="px-5 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold">
              Annuler
            </button>
          </div>
        </form>
      )}

      {panel === 'goal' && (
        <form
          className="bg-white border-2 border-purple-200 rounded-xl p-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => savingsSetGoal(goalName, amountValue), goalName.trim() ? 'Objectif enregistré.' : 'Objectif supprimé.');
          }}
        >
          <label htmlFor="sv-goal" className="block text-sm font-semibold text-gray-700">Nom de l'objectif</label>
          <input id="sv-goal" maxLength={60} value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="ex. Moto, rentrée scolaire…" className={inputClass} />
          <label htmlFor="sv-goal-amount" className="block text-sm font-semibold text-gray-700">Montant visé (FCFA)</label>
          <input id="sv-goal-amount" type="number" inputMode="numeric" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          <p className="text-xs text-gray-500">Laissez le nom vide pour supprimer l'objectif.</p>
          <div className="flex gap-3">
            <button type="submit" disabled={busy || (!!goalName.trim() && amountValue < 100)} className="flex-1 py-3 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50">
              Enregistrer
            </button>
            <button type="button" onClick={() => setPanel(null)} className="px-5 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold">
              Annuler
            </button>
          </div>
        </form>
      )}

      {panel === 'auto' && (
        <form
          className="bg-white border-2 border-purple-200 rounded-xl p-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => savingsSetAuto(amountValue, autoDay), `Épargne automatique : ${fcfa(amountValue)} chaque ${DAYS[autoDay - 1].toLowerCase()}.`);
          }}
        >
          <label htmlFor="sv-auto" className="block text-sm font-semibold text-gray-700">Montant chaque semaine (FCFA)</label>
          <input id="sv-auto" type="number" inputMode="numeric" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="ex. 2000" className={inputClass} />
          <label htmlFor="sv-day" className="block text-sm font-semibold text-gray-700">Jour du versement</label>
          <select id="sv-day" value={autoDay} onChange={(e) => setAutoDay(Number(e.target.value))} className={inputClass}>
            {DAYS.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Le versement a lieu vers 8 h (heure de Brazzaville). S'il manque de l'argent sur votre solde ce jour-là, il est sauté.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button type="submit" disabled={busy || amountValue < 100} className="flex-1 py-3 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50">
              Activer
            </button>
            {status.auto_amount && (
              <button type="button" disabled={busy} onClick={() => void run(() => savingsSetAuto(null, null), 'Épargne automatique désactivée.')} className="px-5 py-3 rounded-lg border-2 border-red-200 text-red-700 font-semibold">
                Désactiver
              </button>
            )}
            <button type="button" onClick={() => setPanel(null)} className="px-5 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold">
              Annuler
            </button>
          </div>
        </form>
      )}

      {panel === 'lock' && (
        <form
          className="bg-white border-2 border-purple-200 rounded-xl p-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const days = Number(lockDays);
            if (!confirm(`Bloquer votre épargne ${days} jours de plus ? Vous ne pourrez rien retirer avant la fin, et le blocage ne peut pas être annulé.`)) return;
            void run(() => savingsLock(days), `Épargne bloquée ${days} jours de plus.`);
          }}
        >
          <label htmlFor="sv-lock" className="block text-sm font-semibold text-gray-700">Durée du blocage</label>
          <select id="sv-lock" value={lockDays} onChange={(e) => setLockDays(e.target.value)} className={inputClass}>
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">3 mois</option>
            <option value="180">6 mois</option>
            <option value="365">1 an</option>
          </select>
          <p className="text-xs text-gray-500">
            Pour résister à la tentation : pendant le blocage, vous pouvez continuer à épargner mais pas retirer. Le blocage ne peut
            être que prolongé, jamais annulé.
          </p>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="flex-1 py-3 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50">
              Bloquer
            </button>
            <button type="button" onClick={() => setPanel(null)} className="px-5 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Historique */}
      <div>
        <h3 className="text-lg font-semibold text-purple-900 mb-3">Historique d'épargne</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun mouvement pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {history.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 border border-purple-100 rounded-lg p-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {m.kind === 'deposit' ? 'Versement' : m.kind === 'auto' ? 'Versement automatique' : 'Retrait'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(m.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <span className={`font-bold whitespace-nowrap ${m.kind === 'withdraw' ? 'text-red-600' : 'text-green-600'}`}>
                  {m.kind === 'withdraw' ? '-' : '+'}
                  {fcfa(m.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
