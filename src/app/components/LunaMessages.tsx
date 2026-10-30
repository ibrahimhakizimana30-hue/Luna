import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Phone, Plus, Send, Video } from 'lucide-react';
import { useCalls } from '../calls/CallProvider';
import {
  getConversation,
  listConversations,
  onMessagesChanged,
  sendMessage,
  type ChatMessage,
  type Conversation,
} from '../backend';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// Discussion avec un contact
function Chat({ contact, onBack }: { contact: string; onBack: () => void }) {
  const calls = useCalls();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await getConversation(contact));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
      setMessages([]);
    }
  }, [contact]);

  useEffect(() => {
    void load();
    const stop = onMessagesChanged(() => void load());
    // Filet de sécurité si la connexion en direct est coupée
    const timer = setInterval(() => void load(), 20000);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      await sendMessage(contact, body);
      setText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[60vh] min-h-[380px] border border-purple-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-purple-100 bg-purple-50">
        <button onClick={onBack} aria-label="Retour aux conversations" className="p-1.5 rounded-full hover:bg-purple-100 text-purple-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="flex-1 font-semibold text-purple-900 break-all">{contact}</p>
        {calls && (
          <>
            <button
              onClick={() => void calls.placeCall(contact, 'audio')}
              disabled={calls.inCall}
              aria-label={`Appeler ${contact}`}
              className="p-2 rounded-full text-green-700 hover:bg-green-50 disabled:opacity-40"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={() => void calls.placeCall(contact, 'video')}
              disabled={calls.inCall}
              aria-label={`Appel vidéo ${contact}`}
              className="p-2 rounded-full text-purple-700 hover:bg-purple-50 disabled:opacity-40"
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      {calls?.lastError && <p className="px-3 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200">{calls.lastError}</p>}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages === null && <p className="text-sm text-gray-500">Chargement…</p>}
        {messages?.length === 0 && !error && (
          <p className="text-sm text-gray-500 text-center py-6">Écrivez votre premier message à {contact}.</p>
        )}
        {messages?.map((m) => (
          <div key={m.id} className={`flex ${m.from_me ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                m.from_me ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`text-[11px] mt-0.5 text-right ${m.from_me ? 'text-white/75' : 'text-gray-500'}`}>
                {formatTime(m.created_at)}
                {m.from_me && (m.read_at ? ' · Lu' : ' · Envoyé')}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <p className="px-3 py-2 text-sm text-red-700 bg-red-50 border-t border-red-200">{error}</p>}

      <form
        className="flex gap-2 p-3 border-t border-purple-100"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Votre message…"
          aria-label="Votre message"
          className="flex-1 min-w-0 px-3 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 bg-transparent"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Envoyer"
          className="px-4 rounded-lg bg-purple-600 text-white disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

// Messagerie réelle entre utilisateurs de Luna
export function LunaMessages() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [openContact, setOpenContact] = useState<string | null>(null);
  const [newContact, setNewContact] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setConversations(await listConversations());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    if (openContact) return;
    void load();
    const stop = onMessagesChanged(() => void load());
    const timer = setInterval(() => void load(), 20000);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [openContact, load]);

  if (openContact) {
    return <Chat contact={openContact} onBack={() => setOpenContact(null)} />;
  }

  const startConversation = () => {
    const contact = newContact.trim();
    if (!contact) return;
    setOpenContact(contact.includes('@') ? contact.toLowerCase() : contact.replace(/[\s.-]/g, ''));
    setNewContact('');
    setShowNew(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-purple-900">Messages</h2>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold"
        >
          <Plus className="w-5 h-5" /> Nouveau
        </button>
      </div>

      {showNew && (
        <form
          className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startConversation();
          }}
        >
          <label className="block text-sm font-semibold text-gray-700" htmlFor="luna-new-contact">
            Email ou numéro d'un utilisateur de Luna
          </label>
          <input
            id="luna-new-contact"
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            placeholder="ex. ami@gmail.com ou +242 06 123 4567"
            className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 bg-transparent"
          />
          <button type="submit" disabled={!newContact.trim()} className="w-full py-2 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50">
            Écrire
          </button>
        </form>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>}

      {conversations === null && <p className="text-sm text-gray-500">Chargement…</p>}
      {conversations?.length === 0 && !error && (
        <div className="text-center py-10 text-gray-500">
          <MessageCircle className="w-10 h-10 mx-auto mb-2 text-purple-300" />
          <p>Aucune conversation pour le moment.</p>
          <p className="text-sm">Appuyez sur « Nouveau » pour écrire à un utilisateur de Luna.</p>
        </div>
      )}

      <div className="divide-y divide-purple-100 border border-purple-200 rounded-xl overflow-hidden empty:hidden">
        {conversations?.map((c) => (
          <button
            key={c.contact}
            onClick={() => setOpenContact(c.contact)}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-purple-50 transition-colors"
          >
            <span className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white grid place-items-center font-bold flex-shrink-0">
              {c.contact.replace(/^\+/, '').charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex justify-between gap-2">
                <span className="font-semibold text-gray-900 truncate">{c.contact}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">{formatTime(c.last_at)}</span>
              </span>
              <span className="flex justify-between gap-2">
                <span className={`text-sm truncate ${c.unread > 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                  {c.last_from_me ? 'Vous : ' : ''}
                  {c.last_body}
                </span>
                {c.unread > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-purple-600 text-white text-xs grid place-items-center flex-shrink-0">
                    {c.unread}
                  </span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
