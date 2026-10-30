import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, X, XCircle, RefreshCw } from 'lucide-react';
import { adminListKyc, adminReviewKyc, kycFileUrls, type KycSubmission } from '../backend';

const DOC_LABELS: Record<string, string> = {
  'id-card': "Carte d'identité",
  'niu-card': 'Carte NIU',
  'driver-license': 'Permis de conduire',
  passport: 'Passeport',
};

const FILTERS: { id: KycSubmission['status']; label: string }[] = [
  { id: 'pending', label: 'En attente' },
  { id: 'approved', label: 'Validées' },
  { id: 'rejected', label: 'Refusées' },
];

function Photo({ url, label }: { url?: string; label: string }) {
  return (
    <figure className="flex-1 min-w-[120px]">
      <figcaption className="text-xs font-semibold text-gray-600 mb-1">{label}</figcaption>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" title="Ouvrir en grand">
          <img src={url} alt={label} className="w-full h-36 object-cover rounded-lg border border-gray-200 bg-gray-100" />
        </a>
      ) : (
        <div className="w-full h-36 rounded-lg border border-gray-200 bg-gray-100 grid place-items-center text-xs text-gray-500">
          Photo indisponible
        </div>
      )}
    </figure>
  );
}

// Écran réservé à l'administrateur : valider ou refuser les pièces d'identité
export function AdminKyc({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<KycSubmission['status']>('pending');
  const [items, setItems] = useState<KycSubmission[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    setItems(null);
    try {
      const list = await adminListKyc(filter);
      setItems(list);
      const paths = list.flatMap((k) => [k.recto_path, k.verso_path, k.selfie_path]).filter(Boolean) as string[];
      setUrls(await kycFileUrls(paths));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
      setItems([]);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (item: KycSubmission, approve: boolean) => {
    const question = approve
      ? `Valider l'identité de ${item.contact} ?`
      : `Refuser la demande de ${item.contact} ? La personne devra envoyer de nouvelles photos.`;
    if (!confirm(question)) return;
    setBusyId(item.id);
    setError('');
    try {
      await adminReviewKyc(item.id, approve);
      setItems((prev) => prev?.filter((k) => k.id !== item.id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch md:items-center justify-center md:p-4">
      <div className="bg-white w-full md:max-w-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-full">
        <div className="flex items-center gap-3 p-4 border-b border-purple-100">
          <ShieldCheck className="w-6 h-6 text-purple-600" />
          <h2 className="flex-1 text-lg font-bold text-purple-900">Vérification des identités</h2>
          <button onClick={() => void load()} aria-label="Actualiser" className="p-2 rounded-full hover:bg-purple-50 text-purple-700">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-purple-50 text-purple-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 p-4 pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                filter === f.id
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-purple-200 text-purple-700 hover:bg-purple-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
          )}
          {items === null && <p className="text-gray-500 text-sm">Chargement…</p>}
          {items?.length === 0 && !error && (
            <p className="text-gray-500 text-sm text-center py-8">Aucune demande dans cette liste.</p>
          )}

          {items?.map((item) => (
            <div key={item.id} className="border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-gray-900 break-all">{item.contact}</p>
                <p className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <p className="text-sm text-purple-700 font-semibold">{DOC_LABELS[item.doc_type] ?? item.doc_type}</p>

              <div className="flex flex-wrap gap-3">
                <Photo url={urls[item.recto_path]} label="Recto" />
                {item.verso_path && <Photo url={urls[item.verso_path]} label="Verso" />}
                <Photo url={urls[item.selfie_path]} label="Selfie" />
              </div>

              {item.status === 'pending' ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => void review(item, false)}
                    disabled={busyId === item.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-red-200 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" /> Refuser
                  </button>
                  <button
                    onClick={() => void review(item, true)}
                    disabled={busyId === item.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Valider
                  </button>
                </div>
              ) : (
                <p className={`text-sm font-semibold ${item.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                  {item.status === 'approved' ? 'Identité validée' : 'Demande refusée'}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
