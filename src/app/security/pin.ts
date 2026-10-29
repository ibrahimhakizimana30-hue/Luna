// Stockage et vérification du code PIN.
//
// Le PIN n'est jamais enregistré en clair : on garde seulement un hachage
// PBKDF2-SHA256 avec un sel aléatoire. Un code à 4 chiffres reste devinable
// par quelqu'un qui copie le stockage du navigateur, mais il n'est plus
// lisible directement. La vraie protection viendra d'une vérification côté
// serveur.

const PIN_HASH_KEY = 'luna_pin_hash';
const PIN_SALT_KEY = 'luna_pin_salt';
const LEGACY_PIN_KEY = 'luna_user_pin';
const LEGACY_PIN_SET_KEY = 'luna_pin_set';

const FAILED_ATTEMPTS_KEY = 'luna_pin_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'luna_pin_lockout_until';

const PBKDF2_ITERATIONS = 310_000;

// Nombre d'essais autorisés avant un blocage temporaire.
export const MAX_PIN_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 60 * 60_000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function derive(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function hasPin(): boolean {
  return !!localStorage.getItem(PIN_HASH_KEY) && !!localStorage.getItem(PIN_SALT_KEY);
}

export async function savePin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt);
  localStorage.setItem(PIN_SALT_KEY, toBase64(salt));
  localStorage.setItem(PIN_HASH_KEY, toBase64(hash));
  localStorage.removeItem(LEGACY_PIN_KEY);
  localStorage.removeItem(LEGACY_PIN_SET_KEY);
  resetFailedAttempts();
}

export async function checkPin(pin: string): Promise<boolean> {
  const salt = localStorage.getItem(PIN_SALT_KEY);
  const hash = localStorage.getItem(PIN_HASH_KEY);
  if (!salt || !hash) return false;
  const candidate = await derive(pin, fromBase64(salt));
  return constantTimeEqual(candidate, fromBase64(hash));
}

// Les anciennes versions gardaient le PIN en clair : on le convertit en
// hachage puis on efface la version en clair.
export async function migrateLegacyPin(): Promise<void> {
  const legacyPin = localStorage.getItem(LEGACY_PIN_KEY);
  if (legacyPin && !hasPin()) {
    await savePin(legacyPin);
  }
  localStorage.removeItem(LEGACY_PIN_KEY);
  localStorage.removeItem(LEGACY_PIN_SET_KEY);
}

export function getFailedAttempts(): number {
  return parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10) || 0;
}

export function getLockoutUntil(): number {
  return parseInt(localStorage.getItem(LOCKOUT_UNTIL_KEY) || '0', 10) || 0;
}

// Enregistre un échec. Tous les MAX_PIN_ATTEMPTS échecs, l'accès est bloqué,
// et chaque nouveau blocage dure deux fois plus longtemps (30 s, 1 min, 2 min…).
export function recordFailedAttempt(): { attempts: number; lockoutUntil: number } {
  const attempts = getFailedAttempts() + 1;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, String(attempts));

  let lockoutUntil = getLockoutUntil();
  if (attempts % MAX_PIN_ATTEMPTS === 0) {
    const round = attempts / MAX_PIN_ATTEMPTS - 1;
    const duration = Math.min(BASE_LOCKOUT_MS * 2 ** round, MAX_LOCKOUT_MS);
    lockoutUntil = Date.now() + duration;
    localStorage.setItem(LOCKOUT_UNTIL_KEY, String(lockoutUntil));
  }
  return { attempts, lockoutUntil };
}

export function resetFailedAttempts(): void {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_UNTIL_KEY);
}
