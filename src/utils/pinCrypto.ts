/**
 * pinCrypto.ts — Server-free PIN verification for the Firebase Spark ($0) plan.
 *
 * PBKDF2-SHA256 (100,000 iterations, per-member 128-bit salt) via WebCrypto.
 * Used as an HONEST FALLBACK when the PIN-verification server is unreachable:
 * this is a device-lock grade check (proves the device saw this PIN before),
 * NOT a substitute for server verification. UI copy must say so.
 *
 * Also ships a tiny client-side rate limiter: 5 failed attempts → 60s
 * cooldown, persisted in localStorage so it survives reloads.
 *
 * Zero dependencies: SubtleCrypto + localStorage only.
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32; // SHA-256 output

const te = new TextEncoder();

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

async function pbkdf2(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

/** Constant-time-ish comparison to avoid trivial timing leaks. */
function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export interface PinHash {
  /** Hex-encoded 128-bit random salt. */
  salt: string;
  /** Hex-encoded PBKDF2-SHA256(pin, salt, 100k). */
  hash: string;
}

/**
 * Hash a fresh PIN. Call wherever a PIN is SET (devotee creation,
 * PIN regeneration, admin PIN provisioning) and persist the result
 * alongside the record as `pinSalt` / `pinHash`.
 */
export async function generatePinHash(pin: string): Promise<PinHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(pin, salt);
  return { salt: toHex(salt), hash: toHex(hash) };
}

/**
 * Verify a PIN against a stored salt+hash. Returns false (never throws)
 * on malformed inputs.
 */
export async function verifyPinHash(
  pin: string,
  saltHex: string,
  hashHex: string
): Promise<boolean> {
  try {
    if (!pin || !saltHex || !hashHex) return false;
    const salt = fromHex(saltHex);
    const expected = fromHex(hashHex);
    if (salt.length !== SALT_BYTES || expected.length !== HASH_BYTES) return false;
    const actual = await pbkdf2(pin, salt);
    return safeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Client-side rate limiter: 5 failed attempts → 60s cooldown (per key).
// ---------------------------------------------------------------------------

const RL_MAX_ATTEMPTS = 5;
const RL_COOLDOWN_MS = 60_000;
const RL_PREFIX = 'sb_pin_rl_';

interface RLState {
  failures: number;
  lockedUntil: number;
}

function rlKey(key: string): string {
  return `${RL_PREFIX}${key}`;
}

function readRL(key: string): RLState {
  try {
    const raw = localStorage.getItem(rlKey(key));
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as RLState;
    if (typeof parsed.failures !== 'number' || typeof parsed.lockedUntil !== 'number') {
      return { failures: 0, lockedUntil: 0 };
    }
    // Expired lock resets the counter.
    if (parsed.lockedUntil && Date.now() >= parsed.lockedUntil) {
      return { failures: 0, lockedUntil: 0 };
    }
    return parsed;
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

/** True when another attempt is allowed right now. */
export function pinAttemptAllowed(key: string): boolean {
  const s = readRL(key);
  return !(s.lockedUntil && Date.now() < s.lockedUntil);
}

/** Seconds until the cooldown lifts (0 when allowed). */
export function pinRetryAfterSec(key: string): number {
  const s = readRL(key);
  if (!s.lockedUntil || Date.now() >= s.lockedUntil) return 0;
  return Math.ceil((s.lockedUntil - Date.now()) / 1000);
}

/** Record a failed attempt; locks for 60s once 5 failures accumulate. */
export function recordPinFailure(key: string): void {
  const s = readRL(key);
  const failures = s.failures + 1;
  const lockedUntil = failures >= RL_MAX_ATTEMPTS ? Date.now() + RL_COOLDOWN_MS : 0;
  try {
    localStorage.setItem(rlKey(key), JSON.stringify({ failures, lockedUntil }));
  } catch {
    /* storage unavailable — limiter degrades to in-memory-less */
  }
}

/** Clear the failure counter (call on successful verification). */
export function clearPinFailures(key: string): void {
  try {
    localStorage.removeItem(rlKey(key));
  } catch {
    /* ignore */
  }
}
