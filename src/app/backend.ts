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
      : await client().auth.signInWithOtp({ email: value.trim().toLowerCase() });
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
