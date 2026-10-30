import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Copy, Phone, Smartphone } from 'lucide-react';
import {
  declareMobileMoneyPayment,
  listMobileMoneyPayments,
  type MobileMoneyPayment,
  type MobileOperator,
} from '../backend';

// Menus officiels des opérateurs au Congo-Brazzaville.
// MTN : vérifié sur mtn.cg (*105#, puis 1 « Envoyer de l'argent », puis 2 « Abonné MoMo »).
// Airtel : *128# (menu Airtel Money) — le chemin exact du menu n'est pas précisé ici.
const OPERATORS: Record<MobileOperator, { name: string; ussd: string; color: string; steps: string }> = {
  mtn: {
    name: 'MTN MoMo',
    ussd: '*105#',
    color: 'bg-yellow-400 text-gray-900',
    steps: 'Choisissez 1 « Envoyer de l’argent », puis 2 « Abonné Mobile Money ».',
  },
  airtel: {
    name: 'Airtel Money',
    ussd: '*128#',
    color: 'bg-red-600 text-white',
    steps: 'Choisissez « Envoyer de l’argent » dans le menu Airtel Money.',
  },
};

// Numéro local à 9 chiffres (ex. 061234567), ou null s'il est invalide
function localNumber(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+242')) digits = digits.slice(4);
  else if (digits.startsWith('00242')) digits = digits.slice(5);
  else if (digits.startsWith('242') && digits.length === 12) digits = digits.slice(3);
  return /^\d{9}$/.test(digits) ? digits : null;
}

// Opérateur probable d'après le début du numéro (l'utilisateur peut le changer)
function guessOperator(local: string | null): MobileOperator | null {
  if (!local) return null;
  if (local.startsWith('06')) return 'mtn';
  if (local.startsWith('05') || local.startsWith('04')) return 'airtel';
  return null;
}

function formatLocal(local: string): string {
  return `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // presse-papiers indisponible : la valeur reste affichée à l'écran
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`Copier ${label}`}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-purple-200 text-purple-700 text-xs font-semibold hover:bg-purple-50"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  );
}

// Paiement direct : Luna ouvre le menu de l'opérateur, l'argent ne passe jamais par Luna
export function MobileMoneyPay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'details' | 'guide'>('details');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [operator, setOperator] = useState<MobileOperator | null>(null);
  const [operatorTouched, setOperatorTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState<MobileMoneyPayment[]>([]);

  const local = localNumber(phone);
  const amountValue = Math.round(Number(amount) || 0);
  const canContinue = !!local && amountValue >= 1 && amountValue <= 10000000 && !!operator;
  const op = operator ? OPERATORS[operator] : null;

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listMobileMoneyPayments());
    } catch {
      // l'historique n'est pas indispensable pour payer
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Propose l'opérateur d'après le numéro, tant que l'utilisateur ne l'a pas choisi
  useEffect(() => {
    if (!operatorTouched) setOperator(guessOperator(local));
  }, [local, operatorTouched]);

  const reset = () => {
    setPhone('');
    setAmount('');
    setNote('');
    setOperator(null);
    setOperatorTouched(false);
    setStep('details');
    setError('');
    setOpen(false);
  };

  const confirmPaid = async () => {
    if (!local || !operator) return;
    setSaving(true);
    setError('');
    try {
      await declareMobileMoneyPayment(operator, local, amountValue, note);
      setSuccess(`Paiement de ${amountValue.toLocaleString('fr-FR')} FCFA au ${formatLocal(local)} noté dans votre historique.`);
      reset();
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-purple-200 rounded-xl p-5 shadow-md space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100">
            <Smartphone className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-purple-900">Payer par Mobile Money</h3>
            <p className="text-sm text-gray-600">Argent réel, envoyé directement par MTN MoMo ou Airtel Money.</p>
          </div>
        </div>
        {!open && (
          <button
            onClick={() => {
              setSuccess('');
              setOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold"
          >
            Payer
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> {success}
        </div>
      )}

      {open && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> {error}
        </div>
      )}

      {open && step === 'details' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="mm-phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Numéro Mobile Money du destinataire
            </label>
            <input
              id="mm-phone"
              type="tel"
              inputMode="tel"
              placeholder="06 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-transparent"
            />
            {phone && !local && (
              <p className="text-sm text-red-600 mt-1">Numéro du Congo à 9 chiffres, par exemple 06 123 4567.</p>
            )}
          </div>

          <div>
            <p className="block text-sm font-semibold text-gray-700 mb-2">Opérateur</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(OPERATORS) as MobileOperator[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={operator === id}
                  onClick={() => {
                    setOperator(id);
                    setOperatorTouched(true);
                  }}
                  className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                    operator === id ? 'border-purple-600 bg-purple-50 text-purple-900' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {OPERATORS[id].name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="mm-amount" className="block text-sm font-semibold text-gray-700 mb-2">
              Montant (FCFA)
            </label>
            <input
              id="mm-amount"
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="ex. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-transparent"
            />
          </div>

          <div>
            <label htmlFor="mm-note" className="block text-sm font-semibold text-gray-700 mb-2">
              Note pour vous (facultatif)
            </label>
            <input
              id="mm-note"
              maxLength={140}
              placeholder="ex. Loyer d'octobre"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setError('');
                setStep('guide');
              }}
              disabled={!canContinue}
              className="flex-1 py-3 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50"
            >
              Continuer
            </button>
            <button onClick={reset} className="px-5 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold">
              Annuler
            </button>
          </div>
        </div>
      )}

      {open && step === 'guide' && op && local && (
        <div className="space-y-4">
          <a
            href={`tel:${op.ussd.replace('#', '%23')}`}
            className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-lg shadow-md ${op.color}`}
          >
            <Phone className="w-5 h-5" /> Ouvrir {op.name} ({op.ussd})
          </a>

          <ol className="space-y-3 text-sm text-gray-700 list-decimal pl-5">
            <li>Appuyez sur le bouton ci-dessus : le téléphone compose {op.ussd}. Lancez l'appel.</li>
            <li>{op.steps}</li>
            <li>
              <span className="flex items-center justify-between gap-2 flex-wrap">
                <span>
                  Numéro : <strong className="text-gray-900">{formatLocal(local)}</strong>
                </span>
                <CopyButton value={local} label="le numéro" />
              </span>
            </li>
            <li>
              <span className="flex items-center justify-between gap-2 flex-wrap">
                <span>
                  Montant : <strong className="text-gray-900">{amountValue.toLocaleString('fr-FR')} FCFA</strong>
                </span>
                <CopyButton value={String(amountValue)} label="le montant" />
              </span>
            </li>
            <li>Vérifiez le nom du destinataire affiché par {op.name}, puis validez avec votre code secret.</li>
          </ol>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p>
              Luna ne voit pas et ne touche pas votre argent : le paiement se fait uniquement chez {op.name}, avec ses
              frais. Ne donnez jamais votre code secret Mobile Money, même à Luna.
            </p>
            <p>Si le bouton ne compose pas le code (iPhone notamment), tapez {op.ussd} vous-même dans le téléphone.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => void confirmPaid()}
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'J’ai payé'}
            </button>
            <button
              onClick={() => setStep('details')}
              disabled={saving}
              className="px-5 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold"
            >
              Retour
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-purple-900 mb-2">Vos paiements Mobile Money</h4>
          <div className="space-y-2">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 border border-purple-100 rounded-lg p-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {formatLocal(p.recipient_phone.replace(/^\+242/, ''))}
                    <span className="ml-2 text-xs font-medium text-gray-500">{OPERATORS[p.operator].name}</span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {new Date(p.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    {p.note ? ` · ${p.note}` : ''} · déclaré par vous
                  </p>
                </div>
                <span className="font-bold text-gray-900 whitespace-nowrap">
                  -{p.amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
