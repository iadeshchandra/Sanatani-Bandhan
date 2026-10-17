/**
 * chat/backup/crypto.ts — Sealed envelope cryptography.
 * =====================================================
 * The passphrase NEVER leaves the device. Derivation (PBKDF2-SHA256,
 * 210k iterations) and encryption (AES-GCM-256) happen in-memory via
 * WebCrypto. Nothing here touches the network, Firestore, or logs.
 *
 * Two key modes:
 *  - 'pbkdf2-sha256': key derived from the user's sealing words + salt.
 *  - 'recovery': the 64-char recovery code IS the raw 32-byte key.
 */

export interface BackupEnvelope {
  v: 1;
  kdf: 'pbkdf2-sha256' | 'recovery';
  /** PBKDF2 iterations (210000). Ignored for recovery keys. */
  iterations: number;
  /** base64 salt (16 bytes). Random filler for recovery keys. */
  salt: string;
  /** base64 IV (12 bytes). */
  iv: string;
  createdAt: number;
  chatCount: number;
  messageCount: number;
  /** base64 AES-GCM ciphertext of the JSON payload. */
  data: string;
}

const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;

function b64encode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function importRecoveryKey(code: string): Promise<CryptoKey> {
  const clean = code.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  if (clean.length !== 64) throw new Error('bad-recovery-code');
  const bytes = new Uint8Array(KEY_BYTES);
  for (let i = 0; i < KEY_BYTES; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return crypto.subtle.importKey('raw', bytes as BufferSource, 'AES-GCM', false, ['decrypt']);
}

/**
 * Seal a payload with the user's passphrase. Returns the envelope
 * (safe to upload to Drive) — the passphrase itself never appears in it.
 */
export async function sealWithPassphrase(
  payload: unknown,
  passphrase: string,
  meta: { chatCount: number; messageCount: number }
): Promise<BackupEnvelope> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext);
  return {
    v: 1,
    kdf: 'pbkdf2-sha256',
    iterations: PBKDF2_ITERATIONS,
    salt: b64encode(salt),
    iv: b64encode(iv),
    createdAt: Date.now(),
    chatCount: meta.chatCount,
    messageCount: meta.messageCount,
    data: b64encode(new Uint8Array(ciphertext)),
  };
}

/** Open an envelope with the user's passphrase. Throws on wrong words. */
export async function openWithPassphrase(envelope: BackupEnvelope, passphrase: string): Promise<unknown> {
  if (envelope.v !== 1 || envelope.kdf !== 'pbkdf2-sha256') throw new Error('bad-envelope');
  const salt = b64decode(envelope.salt);
  const iv = b64decode(envelope.iv);
  // Re-derive with the envelope's iteration count (forward-compatible).
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: envelope.iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const ciphertext = b64decode(envelope.data);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ciphertext);
  } catch {
    // AES-GCM auth failure = wrong passphrase. Never leak details.
    throw new Error('wrong-passphrase');
  }
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/**
 * Generate a 64-character recovery key (32 bytes of entropy, hex).
 * Display grouped in 4s for readability; the raw key never persists.
 */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(KEY_BYTES);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Group a recovery code for display: "abcd efgh …". */
export function formatRecoveryCode(code: string): string {
  return code.replace(/(.{4})/g, '$1 ').trim();
}

/** Open an envelope with a recovery code. Throws on bad code. */
export async function openWithRecoveryCode(envelope: BackupEnvelope, code: string): Promise<unknown> {
  if (envelope.v !== 1) throw new Error('bad-envelope');
  const key = await importRecoveryKey(code);
  const iv = b64decode(envelope.iv);
  const ciphertext = b64decode(envelope.data);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ciphertext);
  } catch {
    throw new Error('wrong-passphrase');
  }
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/**
 * Re-seal an already-open payload under a recovery key so the user can
 * restore with EITHER their words or the recovery code. The envelope
 * records kdf 'recovery' and the passphrase envelope is discarded.
 * (Used once, at passphrase-setup time, to bind both openers to one backup.)
 */
export async function sealWithRecoveryCode(
  payload: unknown,
  recoveryCode: string,
  meta: { chatCount: number; messageCount: number }
): Promise<BackupEnvelope> {
  const clean = recoveryCode.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  if (clean.length !== 64) throw new Error('bad-recovery-code');
  const raw = new Uint8Array(KEY_BYTES);
  for (let i = 0; i < KEY_BYTES; i++) raw[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  const key = await crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt']);
  const iv = randomBytes(IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext);
  return {
    v: 1,
    kdf: 'recovery',
    iterations: 0,
    salt: b64encode(randomBytes(SALT_BYTES)),
    iv: b64encode(iv),
    createdAt: Date.now(),
    chatCount: meta.chatCount,
    messageCount: meta.messageCount,
    data: b64encode(new Uint8Array(ciphertext)),
  };
}

/** Validate envelope shape before attempting decrypt (cheap sanity). */
export function isValidEnvelope(x: unknown): x is BackupEnvelope {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return (
    e.v === 1 &&
    (e.kdf === 'pbkdf2-sha256' || e.kdf === 'recovery') &&
    typeof e.salt === 'string' &&
    typeof e.iv === 'string' &&
    typeof e.data === 'string'
  );
}
