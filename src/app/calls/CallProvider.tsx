import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import {
  answerCall,
  endCall,
  getIncomingCall,
  onCallsChanged,
  pollCall,
  sendCallSignal,
  startCall,
  type CallKind,
} from '../backend';

// Serveurs qui aident les deux téléphones à se trouver sur Internet.
// Un serveur TURN (relais) peut être ajouté avec VITE_TURN_URLS / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL
// pour les réseaux mobiles les plus restrictifs.
function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const turn = import.meta.env.VITE_TURN_URLS as string | undefined;
  if (turn) {
    servers.push({
      urls: turn.split(',').map((u) => u.trim()),
      username: import.meta.env.VITE_TURN_USERNAME as string | undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined,
    });
  }
  return servers;
}

type Phase = 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended';

interface CallState {
  id: string;
  contact: string;
  kind: CallKind;
  role: 'caller' | 'callee';
  phase: Phase;
  message?: string;
}

interface CallApi {
  placeCall: (contact: string, kind: CallKind) => Promise<void>;
  inCall: boolean;
  lastError: string;
  onCallEnded: (fn: () => void) => () => void;
}

const CallContext = createContext<CallApi | null>(null);

export function useCalls(): CallApi | null {
  return useContext(CallContext);
}

const END_MESSAGES: Record<string, string> = {
  declined: 'Appel refusé',
  missed: 'Pas de réponse',
  cancelled: 'Appel annulé',
  ended: 'Appel terminé',
};

function mediaError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError') return 'Autorisez le micro (et la caméra) pour Luna dans les réglages du navigateur.';
  if (name === 'NotFoundError') return 'Aucun micro ou caméra trouvé sur cet appareil.';
  return e instanceof Error ? e.message : 'Appel impossible';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Gère les appels de Luna : appel sortant, sonnerie entrante et communication
export function CallProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [call, setCall] = useState<CallState | null>(null);
  const [lastError, setLastError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const callRef = useRef<CallState | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const lastSignalRef = useRef(0);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef(false);
  const endedListeners = useRef(new Set<() => void>());
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const update = useCallback((next: CallState | null) => {
    callRef.current = next;
    setCall(next);
  }, []);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    remoteRef.current = null;
    lastSignalRef.current = 0;
    pendingIceRef.current = [];
    setMuted(false);
    setCameraOff(false);
    setSeconds(0);
  }, []);

  const finish = useCallback(
    (message: string) => {
      const current = callRef.current;
      cleanup();
      if (!current) return;
      update({ ...current, phase: 'ended', message });
      endedListeners.current.forEach((fn) => fn());
      setTimeout(() => {
        if (callRef.current?.phase === 'ended') update(null);
      }, 2500);
    },
    [cleanup, update],
  );

  // Attache les flux audio / vidéo aux éléments de l'écran d'appel
  useEffect(() => {
    const attach = (el: HTMLMediaElement | null, stream: MediaStream | null) => {
      if (el && stream && el.srcObject !== stream) el.srcObject = stream;
    };
    attach(remoteVideoRef.current, remoteRef.current);
    attach(remoteAudioRef.current, remoteRef.current);
    attach(localVideoRef.current, localRef.current);
  });

  // Chronomètre pendant la communication
  useEffect(() => {
    if (call?.phase !== 'active') return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [call?.phase]);

  const createPeer = useCallback(
    (callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      pcRef.current = pc;
      localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current!));
      pc.onicecandidate = (e) => {
        if (e.candidate) void sendCallSignal(callId, 'ice', e.candidate.toJSON()).catch(() => undefined);
      };
      pc.ontrack = (e) => {
        remoteRef.current = e.streams[0] ?? new MediaStream([e.track]);
        setCall((c) => (c ? { ...c } : c)); // rafraîchit l'affichage pour attacher le flux
      };
      pc.onconnectionstatechange = () => {
        const current = callRef.current;
        if (!current || current.id !== callId) return;
        if (pc.connectionState === 'connected' && current.phase !== 'active') {
          update({ ...current, phase: 'active' });
        } else if (pc.connectionState === 'failed') {
          void endCall(callId).catch(() => undefined);
          finish('Connexion impossible : le réseau bloque l’appel. Réessayez en Wi-Fi.');
        }
      };
      return pc;
    },
    [finish, update],
  );

  const flushIce = async (pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const c of queued) await pc.addIceCandidate(c).catch(() => undefined);
  };

  // Suit l'état de l'appel et récupère les signaux de l'autre téléphone
  const poll = useCallback(async () => {
    const current = callRef.current;
    if (!current || current.phase === 'ended' || current.phase === 'incoming' || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const { status, signals } = await pollCall(current.id, lastSignalRef.current);
      if (callRef.current?.id !== current.id) return;
      if (status in END_MESSAGES) {
        finish(END_MESSAGES[status]);
        return;
      }
      if (status === 'accepted' && current.phase === 'outgoing') update({ ...current, phase: 'connecting' });

      const pc = pcRef.current;
      for (const s of signals) {
        lastSignalRef.current = Math.max(lastSignalRef.current, s.id);
        if (!pc) continue;
        if (s.kind === 'offer' && current.role === 'callee') {
          await pc.setRemoteDescription(s.payload as unknown as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendCallSignal(current.id, 'answer', { type: answer.type, sdp: answer.sdp });
          await flushIce(pc);
        } else if (s.kind === 'answer' && current.role === 'caller' && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(s.payload as unknown as RTCSessionDescriptionInit);
          await flushIce(pc);
        } else if (s.kind === 'ice') {
          const candidate = s.payload as RTCIceCandidateInit;
          if (pc.remoteDescription) await pc.addIceCandidate(candidate).catch(() => undefined);
          else pendingIceRef.current.push(candidate);
        }
      }
    } catch {
      // coupure réseau passagère : on réessaie au prochain tour
    } finally {
      pollingRef.current = false;
    }
  }, [finish, update]);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => void poll(), 1000);
    void poll();
  }, [poll]);

  const getMedia = (kind: CallKind) =>
    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: kind === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
    });

  const placeCall = useCallback(
    async (contact: string, kind: CallKind) => {
      if (callRef.current) return;
      setLastError('');
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Ce navigateur ne permet pas les appels.');
        localRef.current = await getMedia(kind);
      } catch (e) {
        setLastError(mediaError(e));
        return;
      }
      let callId: string;
      try {
        callId = await startCall(contact, kind);
      } catch (e) {
        cleanup();
        setLastError(e instanceof Error ? e.message : 'Appel impossible');
        return;
      }
      update({ id: callId, contact, kind, role: 'caller', phase: 'outgoing' });
      try {
        const pc = createPeer(callId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendCallSignal(callId, 'offer', { type: offer.type, sdp: offer.sdp });
        startPolling();
      } catch (e) {
        await endCall(callId).catch(() => undefined);
        finish(e instanceof Error ? e.message : 'Appel impossible');
      }
    },
    [cleanup, createPeer, finish, startPolling, update],
  );

  const accept = async () => {
    const current = callRef.current;
    if (!current || current.phase !== 'incoming') return;
    try {
      localRef.current = await getMedia(current.kind);
    } catch (e) {
      setLastError(mediaError(e));
      await answerCall(current.id, false).catch(() => undefined);
      finish(mediaError(e));
      return;
    }
    try {
      await answerCall(current.id, true);
    } catch (e) {
      finish(e instanceof Error ? e.message : 'Cet appel est terminé');
      return;
    }
    update({ ...current, phase: 'connecting' });
    createPeer(current.id);
    startPolling();
  };

  const decline = async () => {
    const current = callRef.current;
    if (!current) return;
    await answerCall(current.id, false).catch(() => undefined);
    finish('Appel refusé');
  };

  const hangUp = async () => {
    const current = callRef.current;
    if (!current) return;
    await endCall(current.id).catch(() => undefined);
    finish(current.phase === 'outgoing' ? 'Appel annulé' : 'Appel terminé');
  };

  const toggleMute = () => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const toggleCamera = () => {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  };

  // Détecte les appels entrants (en direct, avec une vérification régulière en secours)
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const check = async () => {
      if (callRef.current || stopped) return;
      const incoming = await getIncomingCall();
      if (!incoming || callRef.current || stopped) return;
      update({ id: incoming.id, contact: incoming.contact, kind: incoming.kind, role: 'callee', phase: 'incoming' });
    };
    void check();
    const stop = onCallsChanged(() => void check());
    const timer = setInterval(() => void check(), 4000);
    return () => {
      stopped = true;
      stop();
      clearInterval(timer);
    };
  }, [enabled, update]);

  // Pendant la sonnerie : vibration, et fin de la sonnerie si l'appelant raccroche
  useEffect(() => {
    if (call?.phase !== 'incoming') return;
    const vibrate = () => navigator.vibrate?.([400, 200, 400]);
    vibrate();
    const vib = setInterval(vibrate, 2000);
    const watch = setInterval(async () => {
      const current = callRef.current;
      if (!current || current.phase !== 'incoming') return;
      const { status } = await pollCall(current.id, 0).catch(() => ({ status: 'ringing' as const }));
      if (status !== 'ringing') finish(status === 'missed' || status === 'cancelled' ? 'Appel manqué' : END_MESSAGES[status] ?? 'Appel terminé');
    }, 2000);
    return () => {
      clearInterval(vib);
      clearInterval(watch);
      navigator.vibrate?.(0);
    };
  }, [call?.phase, finish]);

  // Raccroche proprement si la page est fermée pendant un appel
  useEffect(() => {
    const onLeave = () => {
      const current = callRef.current;
      if (current && current.phase !== 'ended') void endCall(current.id).catch(() => undefined);
    };
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, []);

  const api: CallApi = {
    placeCall,
    inCall: !!call && call.phase !== 'ended',
    lastError,
    onCallEnded: (fn) => {
      endedListeners.current.add(fn);
      return () => endedListeners.current.delete(fn);
    },
  };

  const isVideo = call?.kind === 'video';
  const statusText =
    call?.phase === 'outgoing'
      ? 'Appel en cours…'
      : call?.phase === 'incoming'
        ? `Appel ${isVideo ? 'vidéo' : 'audio'} entrant`
        : call?.phase === 'connecting'
          ? 'Connexion…'
          : call?.phase === 'active'
            ? formatDuration(seconds)
            : call?.message;

  return (
    <CallContext.Provider value={api}>
      {children}
      {call && (
        <div className="fixed inset-0 z-[60] bg-gray-950 text-white flex flex-col" role="dialog" aria-label="Appel Luna">
          {isVideo && (call.phase === 'active' || call.phase === 'connecting') && (
            <video ref={remoteVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          )}
          <audio ref={remoteAudioRef} autoPlay />

          <div className="relative flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {!(isVideo && call.phase === 'active') && (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 grid place-items-center text-4xl font-bold">
                {call.contact.replace(/^\+/, '').charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-xl font-semibold break-all drop-shadow">{call.contact}</p>
            <p className="text-white/80 drop-shadow" aria-live="polite">{statusText}</p>
          </div>

          {isVideo && localRef.current && call.phase !== 'ended' && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-4 right-4 w-28 h-40 object-cover rounded-xl border-2 border-white/40 bg-black"
            />
          )}

          <div className="relative flex items-center justify-center gap-6 p-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
            {call.phase === 'incoming' ? (
              <>
                <button onClick={() => void decline()} aria-label="Refuser l'appel" className="w-16 h-16 rounded-full bg-red-600 grid place-items-center">
                  <PhoneOff className="w-7 h-7" />
                </button>
                <button onClick={() => void accept()} aria-label="Décrocher" className="w-16 h-16 rounded-full bg-green-600 grid place-items-center animate-pulse">
                  <Phone className="w-7 h-7" />
                </button>
              </>
            ) : call.phase !== 'ended' ? (
              <>
                <button onClick={toggleMute} aria-label={muted ? 'Réactiver le micro' : 'Couper le micro'} className={`w-14 h-14 rounded-full grid place-items-center ${muted ? 'bg-white text-gray-900' : 'bg-white/20'}`}>
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button onClick={() => void hangUp()} aria-label="Raccrocher" className="w-16 h-16 rounded-full bg-red-600 grid place-items-center">
                  <PhoneOff className="w-7 h-7" />
                </button>
                {isVideo && (
                  <button onClick={toggleCamera} aria-label={cameraOff ? 'Activer la caméra' : 'Couper la caméra'} className={`w-14 h-14 rounded-full grid place-items-center ${cameraOff ? 'bg-white text-gray-900' : 'bg-white/20'}`}>
                    {cameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}
