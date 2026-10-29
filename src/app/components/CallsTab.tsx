import { useState } from 'react';
import { Video, Phone, PhoneCall, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';

interface Call {
  id: string;
  contact: string;
  type: 'video' | 'audio';
  direction: 'incoming' | 'outgoing' | 'missed';
  duration?: number;
  timestamp: Date;
}

export function CallsTab() {
  const [calls, setCalls] = useState<Call[]>([
    {
      id: '1',
      contact: 'Marie Dubois',
      type: 'video',
      direction: 'incoming',
      duration: 1245,
      timestamp: new Date(2026, 4, 15, 9, 30),
    },
    {
      id: '2',
      contact: 'Jean Martin',
      type: 'audio',
      direction: 'outgoing',
      duration: 320,
      timestamp: new Date(2026, 4, 14, 18, 15),
    },
    {
      id: '3',
      contact: 'Sophie Laurent',
      type: 'video',
      direction: 'missed',
      timestamp: new Date(2026, 4, 14, 14, 20),
    },
  ]);

  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callContact, setCallContact] = useState('');
  const [callType, setCallType] = useState<'video' | 'audio'>('video');

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = () => {
    if (!callContact.trim()) return;

    if (!navigator.onLine) {
      alert('Impossible de passer un appel en mode hors ligne. Veuillez vous reconnecter.');
      return;
    }

    const newCall: Call = {
      id: Date.now().toString(),
      contact: callContact,
      type: callType,
      direction: 'outgoing',
      timestamp: new Date(),
    };

    setCalls([newCall, ...calls]);
    setCallContact('');
    setShowCallDialog(false);
    alert(`Appel ${callType === 'video' ? 'vidéo' : 'audio'} vers ${callContact}...`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Appels</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCallType('audio');
              setShowCallDialog(true);
            }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Appel audio
          </button>
          <button
            onClick={() => {
              setCallType('video');
              setShowCallDialog(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
          >
            <Video className="w-4 h-4" />
            Appel vidéo
          </button>
        </div>
      </div>

      {showCallDialog && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-3">
            Nouvel appel {callType === 'video' ? 'vidéo' : 'audio'}
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nom du contact"
              value={callContact}
              onChange={(e) => setCallContact(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStartCall()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleStartCall}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
            >
              Appeler
            </button>
            <button
              onClick={() => setShowCallDialog(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
          {!navigator.onLine && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Les appels nécessitent une connexion internet
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {calls.map((call) => (
          <div
            key={call.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  call.type === 'video' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {call.type === 'video' ? (
                    <Video className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Phone className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{call.contact}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {call.direction === 'incoming' && (
                      <PhoneIncoming className="w-3 h-3 text-green-600" />
                    )}
                    {call.direction === 'outgoing' && (
                      <PhoneOutgoing className="w-3 h-3 text-blue-600" />
                    )}
                    {call.direction === 'missed' && (
                      <PhoneMissed className="w-3 h-3 text-red-600" />
                    )}
                    <span>
                      {call.timestamp.toLocaleDateString('fr-FR')} à{' '}
                      {call.timestamp.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                {call.duration ? (
                  <span className="text-sm text-gray-600">
                    {formatDuration(call.duration)}
                  </span>
                ) : (
                  <span className="text-sm text-red-600">Non répondu</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
