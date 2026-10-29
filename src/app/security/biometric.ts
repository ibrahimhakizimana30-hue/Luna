// Empreinte digitale via WebAuthn (le capteur biométrique de l'appareil).
//
// L'appareil demande vraiment l'empreinte (ou le déverrouillage de l'écran)
// avant de répondre. Sans serveur, la signature renvoyée n'est pas vérifiée :
// cela prouve la présence de l'utilisateur sur cet appareil, pas plus.

const CREDENTIAL_ID_KEY = 'luna_biometric_credential_id';
const LEGACY_ENABLED_KEY = 'luna_biometric_enabled';

function toBase64Url(buffer: ArrayBuffer): string {
  let binary = '';
  new Uint8Array(buffer).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.isSecureContext || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function getBiometricCredentialId(): string | null {
  // L'ancien indicateur « activé » ne correspondait à aucune empreinte réelle.
  localStorage.removeItem(LEGACY_ENABLED_KEY);
  return localStorage.getItem(CREDENTIAL_ID_KEY);
}

export function clearBiometric(): void {
  localStorage.removeItem(CREDENTIAL_ID_KEY);
  localStorage.removeItem(LEGACY_ENABLED_KEY);
}

// Enregistre l'empreinte de l'utilisateur. Lève une erreur si l'appareil
// refuse ou si l'utilisateur annule.
export async function registerBiometric(userLabel: string): Promise<void> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Luna' },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: userLabel || 'utilisateur-luna',
        displayName: userLabel || 'Utilisateur Luna',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error('Aucune empreinte enregistrée');
  localStorage.setItem(CREDENTIAL_ID_KEY, toBase64Url(credential.rawId));
}

// Demande l'empreinte. Renvoie true seulement si l'appareil a vérifié
// l'utilisateur avec la clé enregistrée sur cet appareil.
export async function verifyBiometric(): Promise<boolean> {
  const credentialId = getBiometricCredentialId();
  if (!credentialId) return false;
  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!assertion) return false;

    // Le 33e octet des données d'authentification contient les indicateurs :
    // 0x01 = utilisateur présent, 0x04 = utilisateur vérifié (empreinte/code).
    const authData = new Uint8Array(
      (assertion.response as AuthenticatorAssertionResponse).authenticatorData,
    );
    const flags = authData[32];
    return toBase64Url(assertion.rawId) === credentialId && (flags & 0x05) === 0x05;
  } catch {
    return false;
  }
}
