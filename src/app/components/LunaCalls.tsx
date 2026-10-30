import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react';
import { listCalls, type CallKind, type CallRecord } from '../backend';
import { useCalls } from '../calls/CallProvider';

const STATUS_LABEL: Record<string, string> = {
  ended: 'Terminé',
  accepted: 'En cours',
  declined: 'Refusé',
  cancelled: 'Annulé',
  missed: 'Manqué',
  ringing: 'Sonnerie',
};

function duration(seconds: number | null): string {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  return ` · ${m} min ${String(seconds % 60).padStart(2, '0')} s`;
}

// Appels audio et vidéo entre utilisateurs de Luna
export function LunaCalls() {
  const calls = useCalls();
  const [contact, setContact] = useState('');
  const [history, setHistory] = useState<CallRecord[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setHistory(await listCalls());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void load();
    return calls?.onCallEnded(() => void load());
  }, [load, calls]);

  const call = (who: string, kind: CallKind) => {
    if (!who.trim() || !calls) return;
    void calls.placeCall(who.trim(), kind);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-purple-900">Appels</h2>

      <form
        className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          call(contact, 'audio');
        }}
      >
        <label htmlFor="call-contact" className="block text-sm font-semibold text-gray-700">
          Email ou numéro d'un utilisateur de Luna
        </label>
        <input
          id="call-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="ex. ami@gmail.com ou +242 06 123 4567"
          className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 bg-transparent"
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={!contact.trim() || calls?.inCall}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50"
          >
            <Phone className="w-5 h-5" /> Appel audio
          </button>
          <button
            type="button"
            onClick={() => call(contact, 'video')}
            disabled={!contact.trim() || calls?.inCall}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50"
          >
            <Video className="w-5 h-5" /> Appel vidéo
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Appels gratuits par Internet (ils consomment vos données mobiles). Le son et l'image passent directement entre
          les deux téléphones.
        </p>
      </form>

      {(calls?.lastError || error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> {calls?.lastError || error}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-purple-900 mb-3">Historique</h3>
        {history === null && <p className="text-sm text-gray-500">Chargement…</p>}
        {history?.length === 0 && <p className="text-sm text-gray-500">Aucun appel pour le moment.</p>}
        <div className="space-y-2">
          {history?.map((c) => {
            const Icon = c.status === 'missed' ? PhoneMissed : c.outgoing ? PhoneOutgoing : PhoneIncoming;
            return (
              <div key={c.id} className="flex items-center gap-3 border border-purple-100 rounded-xl p-3">
                <div className={`p-2.5 rounded-full ${c.status === 'missed' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.contact}</p>
                  <p className={`text-xs ${c.status === 'missed' ? 'text-red-600' : 'text-gray-500'}`}>
                    {c.kind === 'video' ? 'Vidéo' : 'Audio'} · {STATUS_LABEL[c.status] ?? c.status}
                    {duration(c.duration_seconds)} ·{' '}
                    {new Date(c.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <button
                  onClick={() => call(c.contact, 'audio')}
                  disabled={calls?.inCall}
                  aria-label={`Appeler ${c.contact}`}
                  className="p-2 rounded-full text-green-700 hover:bg-green-50 disabled:opacity-40"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => call(c.contact, 'video')}
                  disabled={calls?.inCall}
                  aria-label={`Appel vidéo ${c.contact}`}
                  className="p-2 rounded-full text-purple-700 hover:bg-purple-50 disabled:opacity-40"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
