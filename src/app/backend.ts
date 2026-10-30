// Connexion au serveur Luna (Supabase).
//
// Si les clés VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ne sont pas
// définies, l'application reste en « mode démo » (données simulées).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isBackendEnabled = supabase !== null;

function client(): SupabaseClient {
  if (!supabase) throw new Error('Serveur Luna non configuré');
  return supabase;
}

// Traduit les erreurs du serveur en messages clairs
function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || 'Erreur inconnue, réessayez');
}

export type AuthMethod = 'phone' | 'email';

export interface Profile {
  id: string;
  contact: string;
  plan: 'free' | 'premium' | 'vip';
  kyc_status: 'none' | 'pending' | 'approved' | 'rejected';
  trial_started_at: string;
}

export interface LunaTransaction {
  id: string;
  direction: 'send' | 'receive';
  counterpart: string;
  amount: number;
  fee: number;
  status: string;
  created_at: string;
}

export interface PinCheck {
  ok: boolean;
  attempts_left: number;
  locked_until: string | null;
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s.-]/g, '');
}

// --- Connexion -------------------------------------------------------------

export async function sendOtp(method: AuthMethod, value: string): Promise<void> {
  const { error } =
    method === 'phone'
      ? await client().auth.signInWithOtp({ phone: normalizePhone(value) })
      : await client().auth.signInWithOtp({
          email: value.trim().toLowerCase(),
          // L'email peut contenir un lien : il ramène sur Luna, déjà connecté
          options: { emailRedirectTo: window.location.origin },
        });
  if (error) fail(error);
}

export async function verifyOtp(method: AuthMethod, value: string, token: string): Promise<void> {
  const { error } =
    method === 'phone'
      ? await client().auth.verifyOtp({ phone: normalizePhone(value), token, type: 'sms' })
      : await client().auth.verifyOtp({ email: value.trim().toLowerCase(), token, type: 'email' });
  if (error) fail(error);
}

export async function hasSession(): Promise<boolean> {
  const { data } = await client().auth.getSession();
  return !!data.session;
}

// Appelé quand l'utilisateur se connecte (par exemple via le lien de l'email)
export function onSignedIn(callback: () => void): () => void {
  const { data } = client().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') callback();
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  await client().auth.signOut();
}

// --- Profil et portefeuille ------------------------------------------------

export async function getProfile(): Promise<Profile> {
  const { data, error } = await client()
    .from('profiles')
    .select('id, contact, plan, kyc_status, trial_started_at')
    .single();
  if (error) fail(error);
  return data as Profile;
}

export async function getBalance(): Promise<number> {
  const { data, error } = await client().from('wallets').select('balance').single();
  if (error) fail(error);
  return Number(data.balance);
}

// --- Code PIN (vérifié par le serveur) --------------------------------------

export async function hasRemotePin(): Promise<boolean> {
  const { data, error } = await client().rpc('has_pin');
  if (error) fail(error);
  return data === true;
}

export async function setRemotePin(pin: string): Promise<void> {
  const { error } = await client().rpc('set_pin', { p_pin: pin });
  if (error) fail(error);
}

export async function verifyRemotePin(pin: string): Promise<PinCheck> {
  const { data, error } = await client().rpc('verify_pin', { p_pin: pin });
  if (error) fail(error);
  return data as PinCheck;
}

// --- Transferts ------------------------------------------------------------

// Le serveur exige le code PIN pour chaque transfert.
// Renvoie le résultat du contrôle du PIN si celui-ci est faux.
export async function transfer(
  recipientContact: string,
  amount: number,
  pin: string,
): Promise<{ ok: true } | { ok: false; pin: PinCheck }> {
  const contact = recipientContact.includes('@')
    ? recipientContact.trim().toLowerCase()
    : normalizePhone(recipientContact);
  const { data, error } = await client().rpc('transfer', {
    p_recipient_contact: contact,
    p_amount: Math.round(amount),
    p_pin: pin,
  });
  if (error) fail(error);
  return data.ok ? { ok: true } : { ok: false, pin: data.pin as PinCheck };
}

export async function listTransactions(): Promise<LunaTransaction[]> {
  const { data, error } = await client().rpc('my_transactions', { p_limit: 50 });
  if (error) fail(error);
  return (data as LunaTransaction[]).map((t) => ({
    ...t,
    amount: Number(t.amount),
    fee: Number(t.fee),
  }));
}

export function feePercent(plan: Profile['plan']): number {
  return plan === 'vip' ? 0.5 : plan === 'premium' ? 1.5 : 2.5;
}

// --- Vérification d'identité (KYC) -----------------------------------------

async function uploadKycFile(userId: string, label: string, file: File): Promise<string> {
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}-${label}.${extension}`;
  const { error } = await client().storage.from('kyc').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) fail(error);
  return path;
}

export async function submitKyc(
  docType: string,
  recto: File,
  verso: File | null,
  selfie: File,
): Promise<void> {
  const { data } = await client().auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error('Session expirée, reconnectez-vous');

  const rectoPath = await uploadKycFile(userId, 'recto', recto);
  const versoPath = verso ? await uploadKycFile(userId, 'verso', verso) : null;
  const selfiePath = await uploadKycFile(userId, 'selfie', selfie);

  const { error } = await client().rpc('submit_kyc', {
    p_doc_type: docType,
    p_recto_path: rectoPath,
    p_verso_path: versoPath,
    p_selfie_path: selfiePath,
  });
  if (error) fail(error);
}

// --- Administration des pièces d'identité ----------------------------------

export interface KycSubmission {
  id: string;
  user_id: string;
  contact: string;
  doc_type: string;
  recto_path: string;
  verso_path: string | null;
  selfie_path: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await client().rpc('is_admin');
  if (error) return false;
  return data === true;
}

export async function adminListKyc(status: KycSubmission['status'] | null): Promise<KycSubmission[]> {
  const { data, error } = await client().rpc('admin_list_kyc', { p_status: status });
  if (error) fail(error);
  return data as KycSubmission[];
}

export async function adminReviewKyc(submissionId: string, approve: boolean): Promise<void> {
  const { error } = await client().rpc('admin_review_kyc', {
    p_submission_id: submissionId,
    p_approve: approve,
  });
  if (error) fail(error);
}

// Liens temporaires (10 minutes) pour afficher les photos privées
export async function kycFileUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await client().storage.from('kyc').createSignedUrls(paths, 600);
  if (error) fail(error);
  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

// --- Messagerie ------------------------------------------------------------

export interface Conversation {
  contact: string;
  last_body: string;
  last_at: string;
  last_from_me: boolean;
  unread: number;
}

export interface ChatMessage {
  id: string;
  from_me: boolean;
  body: string;
  created_at: string;
  read_at: string | null;
}

function normalizeContact(contact: string): string {
  return contact.includes('@') ? contact.trim().toLowerCase() : normalizePhone(contact);
}

export async function sendMessage(recipientContact: string, body: string): Promise<void> {
  const { error } = await client().rpc('send_message', {
    p_recipient_contact: normalizeContact(recipientContact),
    p_body: body,
  });
  if (error) fail(error);
}

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await client().rpc('my_conversations');
  if (error) fail(error);
  return data as Conversation[];
}

export async function getConversation(contact: string): Promise<ChatMessage[]> {
  const { data, error } = await client().rpc('conversation_messages', {
    p_contact: normalizeContact(contact),
    p_limit: 200,
  });
  if (error) fail(error);
  return data as ChatMessage[];
}

// Prévient dès qu'un message est envoyé ou reçu (en direct)
export function onMessagesChanged(callback: () => void): () => void {
  const channel = client()
    .channel(`messages-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => callback())
    .subscribe();
  return () => {
    void client().removeChannel(channel);
  };
}

// --- Paiements directs Mobile Money (déclarés, non vérifiés) --------------

export type MobileOperator = 'mtn' | 'airtel';

export interface MobileMoneyPayment {
  id: string;
  operator: MobileOperator;
  recipient_phone: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export async function declareMobileMoneyPayment(
  operator: MobileOperator,
  recipientPhone: string,
  amount: number,
  note: string,
): Promise<void> {
  const { error } = await client().rpc('declare_mobile_money_payment', {
    p_operator: operator,
    p_recipient_phone: normalizePhone(recipientPhone),
    p_amount: Math.round(amount),
    p_note: note.trim() || null,
  });
  if (error) fail(error);
}

export async function listMobileMoneyPayments(): Promise<MobileMoneyPayment[]> {
  const { data, error } = await client().rpc('my_mobile_money_payments', { p_limit: 50 });
  if (error) fail(error);
  return (data as MobileMoneyPayment[]).map((p) => ({ ...p, amount: Number(p.amount) }));
}

// --- Épargne (avec le solde Luna) -----------------------------------------

export interface SavingsStatus {
  balance: number;
  wallet_balance: number;
  goal_name: string | null;
  goal_amount: number | null;
  locked_until: string | null;
  auto_amount: number | null;
  auto_day: number | null;
  month_change: number;
}

export interface SavingsMovement {
  id: string;
  kind: 'deposit' | 'withdraw' | 'auto';
  amount: number;
  created_at: string;
}

export async function getSavings(): Promise<SavingsStatus> {
  const { data, error } = await client().rpc('savings_status');
  if (error) fail(error);
  const d = data as Record<string, unknown>;
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    balance: Number(d.balance),
    wallet_balance: Number(d.wallet_balance),
    goal_name: (d.goal_name as string | null) ?? null,
    goal_amount: num(d.goal_amount),
    locked_until: (d.locked_until as string | null) ?? null,
    auto_amount: num(d.auto_amount),
    auto_day: num(d.auto_day),
    month_change: Number(d.month_change),
  };
}

async function rpcVoid(name: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await client().rpc(name, args);
  if (error) fail(error);
}

export const savingsDeposit = (amount: number) => rpcVoid('savings_deposit', { p_amount: Math.round(amount) });
export const savingsWithdraw = (amount: number) => rpcVoid('savings_withdraw', { p_amount: Math.round(amount) });
export const savingsSetGoal = (name: string, amount: number | null) =>
  rpcVoid('savings_set_goal', { p_name: name, p_amount: amount === null ? null : Math.round(amount) });
export const savingsLock = (days: number) => rpcVoid('savings_lock', { p_days: days });
export const savingsSetAuto = (amount: number | null, day: number | null) =>
  rpcVoid('savings_set_auto', { p_amount: amount === null ? null : Math.round(amount), p_day: day });

export async function getSavingsHistory(): Promise<SavingsMovement[]> {
  const { data, error } = await client().rpc('savings_history', { p_limit: 30 });
  if (error) fail(error);
  return (data as SavingsMovement[]).map((m) => ({ ...m, amount: Number(m.amount) }));
}

// --- Appels audio / vidéo ---------------------------------------------------

export type CallKind = 'audio' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'ended' | 'missed';

export interface CallSignal {
  id: number;
  kind: 'offer' | 'answer' | 'ice';
  payload: Record<string, unknown>;
}

export interface IncomingCall {
  id: string;
  contact: string;
  kind: CallKind;
  created_at: string;
}

export interface CallRecord {
  id: string;
  contact: string;
  kind: CallKind;
  outgoing: boolean;
  status: CallStatus;
  created_at: string;
  duration_seconds: number | null;
}

export async function startCall(contact: string, kind: CallKind): Promise<string> {
  const { data, error } = await client().rpc('start_call', {
    p_contact: normalizeContact(contact),
    p_kind: kind,
  });
  if (error) fail(error);
  return data as string;
}

export const answerCall = (callId: string, accept: boolean) =>
  rpcVoid('answer_call', { p_call_id: callId, p_accept: accept });
export const endCall = (callId: string) => rpcVoid('end_call', { p_call_id: callId });
export const sendCallSignal = (callId: string, kind: CallSignal['kind'], payload: unknown) =>
  rpcVoid('send_call_signal', { p_call_id: callId, p_kind: kind, p_payload: payload });

export async function pollCall(callId: string, after: number): Promise<{ status: CallStatus; signals: CallSignal[] }> {
  const { data, error } = await client().rpc('call_poll', { p_call_id: callId, p_after: after });
  if (error) fail(error);
  const d = data as { status: CallStatus; signals: CallSignal[] };
  return { status: d.status, signals: (d.signals ?? []).map((s) => ({ ...s, id: Number(s.id) })) };
}

export async function getIncomingCall(): Promise<IncomingCall | null> {
  const { data, error } = await client().rpc('incoming_call');
  if (error) return null;
  return (data as IncomingCall[])[0] ?? null;
}

export async function listCalls(): Promise<CallRecord[]> {
  const { data, error } = await client().rpc('my_calls', { p_limit: 30 });
  if (error) fail(error);
  return data as CallRecord[];
}

// Prévient dès qu'un appel vous concernant change (en direct)
export function onCallsChanged(callback: () => void): () => void {
  const channel = client()
    .channel(`calls-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => callback())
    .subscribe();
  return () => {
    void client().removeChannel(channel);
  };
}

// --- Notifications ------------------------------------------------------------

export interface NotificationSettings {
  messages: boolean;
  calls: boolean;
  money: boolean;
  kyc: boolean;
  previews: boolean;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data, error } = await client().rpc('get_notification_settings');
  if (error) fail(error);
  return data as NotificationSettings;
}

export const setNotificationSettings = (s: NotificationSettings) =>
  rpcVoid('set_notification_settings', {
    p_messages: s.messages,
    p_calls: s.calls,
    p_money: s.money,
    p_kyc: s.kyc,
    p_previews: s.previews,
  });

export const savePushSubscription = (endpoint: string, p256dh: string, auth: string) =>
  rpcVoid('save_push_subscription', { p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth });

export const deletePushSubscription = (endpoint: string) =>
  rpcVoid('delete_push_subscription', { p_endpoint: endpoint });
