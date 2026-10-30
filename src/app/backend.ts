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
