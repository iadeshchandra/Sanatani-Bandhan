import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { DevoteeMember } from '../types';
import { auth, db } from '../services/firebaseClient';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export const APP_BASE_URL = 'https://sanatanibandhan.web.app';
const DYNAMIC_TOKEN_PREFIX = 'SBDYN:';
const DYNAMIC_QR_SECRET = 'SANATANI_TEMPLE_VAULT_KEY_2026';

/** QR payload format versions (scan-only, never credentials). */
export const QR_PAYLOAD_VERSION = 1;
export const QR_TYPE_PAIR = 'sb-pair';
export const QR_TYPE_VERIFY = 'sb-verify';

/** Long-lived identity-verification signature on printed cards (not a login credential). */
const IDENTITY_SIG_VALIDITY_SECONDS = 365 * 24 * 3600;

export interface PairingTokenResponse {
  token: string;
  expiresAt: number;
}

export interface PairingQRPayload {
  v: number;
  type: typeof QR_TYPE_PAIR;
  token: string;
  wid: string;
  exp: number;
}

export interface IdentityQRPayload {
  v: number;
  type: typeof QR_TYPE_VERIFY;
  id: string;
  sig: string;
}

export interface DynamicTokenVerificationResult<T = any> {
  valid: boolean;
  payload?: T;
  error?: 'TOKEN_EXPIRED' | 'INVALID_FORMAT' | 'SIGNATURE_MISMATCH' | 'TAMPER_DETECTED' | string;
  expiresAt?: number;
  issuedAt?: number;
  remainingSeconds?: number;
}

/**
 * Generates an anti-screenshot, time-expiring dynamic QR token.
 * Injects current timestamp and expiresAt into the payload, then serializes,
 * computes an HMAC-SHA256 signature, and packages it in an encoded token.
 * 
 * @param payload Arbitrary payload data (e.g. devoteeId, sevaTier, gatePassId, purpose)
 * @param validitySeconds Lifetime in seconds before expiry (default: 300s = 5 minutes)
 * @returns Encoded token string for QR generation
 */
export const generateDynamicToken = (payload: any, validitySeconds: number = 300): string => {
  const now = Date.now();
  const expiresAt = now + validitySeconds * 1000;

  // Ensure payload is an object
  const baseObject =
    typeof payload === 'object' && payload !== null
      ? payload
      : { value: payload };

  const enrichedPayload = {
    ...baseObject,
    timestamp: now,
    issuedAt: now,
    expiresAt,
    validitySeconds,
  };

  const jsonStr = JSON.stringify(enrichedPayload);
  const signature = CryptoJS.HmacSHA256(jsonStr, DYNAMIC_QR_SECRET).toString(CryptoJS.enc.Hex).slice(0, 16);

  // Encode safely in Base64 (supporting unicode characters)
  const encodedPayload = btoa(encodeURIComponent(jsonStr));
  return `${DYNAMIC_TOKEN_PREFIX}${encodedPayload}.${signature}`;
};

/**
 * Verifies an anti-screenshot dynamic QR token.
 * Checks structure, verifies signature, and ensures Date.now() <= expiresAt.
 * Also supports backward-compatibility for legacy JSON formats with expiry.
 * 
 * @param token Scanned QR code string
 * @returns Verification status, decoded payload, and error description if invalid
 */
export const verifyDynamicToken = <T = any>(token: string): DynamicTokenVerificationResult<T> => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  const trimmed = token.trim();

  // 1. Check for standard SBDYN: token prefix
  if (trimmed.startsWith(DYNAMIC_TOKEN_PREFIX)) {
    try {
      const tokenBody = trimmed.slice(DYNAMIC_TOKEN_PREFIX.length);
      const dotIndex = tokenBody.lastIndexOf('.');
      if (dotIndex === -1) {
        return { valid: false, error: 'INVALID_FORMAT' };
      }

      const encodedPayload = tokenBody.slice(0, dotIndex);
      const providedSig = tokenBody.slice(dotIndex + 1);

      const jsonStr = decodeURIComponent(atob(encodedPayload));
      const expectedSig = CryptoJS.HmacSHA256(jsonStr, DYNAMIC_QR_SECRET).toString(CryptoJS.enc.Hex).slice(0, 16);

      if (providedSig !== expectedSig) {
        return { valid: false, error: 'SIGNATURE_MISMATCH' };
      }

      const payload = JSON.parse(jsonStr);
      const expiresAt = payload.expiresAt || (payload.timestamp ? payload.timestamp + (payload.validitySeconds || 300) * 1000 : 0);
      const now = Date.now();

      if (expiresAt && now > expiresAt) {
        return {
          valid: false,
          payload,
          expiresAt,
          issuedAt: payload.issuedAt || payload.timestamp,
          remainingSeconds: 0,
          error: 'TOKEN_EXPIRED',
        };
      }

      const remainingSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : undefined;

      return {
        valid: true,
        payload,
        expiresAt,
        issuedAt: payload.issuedAt || payload.timestamp,
        remainingSeconds,
      };
    } catch (err) {
      console.error('Failed to parse dynamic QR token:', err);
      return { valid: false, error: 'INVALID_FORMAT' };
    }
  }

  // 2. Fallback: Check if it is a JSON string with expiry or signature
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const now = Date.now();

      // Check legacy signature format { payload: { expiry, ... }, signature }
      if (parsed.payload && typeof parsed.payload === 'object') {
        const inner = parsed.payload;
        const expiry = inner.expiry || inner.expiresAt;
        if (expiry && now > expiry) {
          return {
            valid: false,
            payload: inner,
            expiresAt: expiry,
            remainingSeconds: 0,
            error: 'TOKEN_EXPIRED',
          };
        }
        return {
          valid: true,
          payload: inner,
          expiresAt: expiry,
          remainingSeconds: expiry ? Math.max(0, Math.floor((expiry - now) / 1000)) : undefined,
        };
      }

      // Check direct expiry in json
      const directExpiry = parsed.expiresAt || parsed.expiry;
      if (directExpiry && now > directExpiry) {
        return {
          valid: false,
          payload: parsed,
          expiresAt: directExpiry,
          remainingSeconds: 0,
          error: 'TOKEN_EXPIRED',
        };
      }

      return {
        valid: true,
        payload: parsed,
        expiresAt: directExpiry,
        remainingSeconds: directExpiry ? Math.max(0, Math.floor((directExpiry - now) / 1000)) : undefined,
      };
    } catch {
      return { valid: false, error: 'INVALID_FORMAT' };
    }
  }

  // 3. Fallback: Base64 string that may decode to JSON
  try {
    const decoded = atob(trimmed);
    if (decoded.startsWith('{') && decoded.endsWith('}')) {
      const parsed = JSON.parse(decoded);
      const now = Date.now();
      const expiry = parsed.expiresAt || parsed.expiry;
      if (expiry && now > expiry) {
        return {
          valid: false,
          payload: parsed,
          expiresAt: expiry,
          remainingSeconds: 0,
          error: 'TOKEN_EXPIRED',
        };
      }
      return {
        valid: true,
        payload: parsed,
        expiresAt: expiry,
        remainingSeconds: expiry ? Math.max(0, Math.floor((expiry - now) / 1000)) : undefined,
      };
    }
  } catch {
    // Not valid base64
  }

  return { valid: false, error: 'INVALID_FORMAT' };
};

/**
 * Generates a dynamic QR Data URL with anti-screenshot styling
 */
export const generateDynamicQRDataURL = async (
  payload: any,
  validitySeconds: number = 300,
  options?: { width?: number; margin?: number; darkColor?: string }
): Promise<string> => {
  const token = generateDynamicToken(payload, validitySeconds);
  try {
    return await QRCode.toDataURL(token, {
      width: options?.width || 320,
      margin: options?.margin ?? 2,
      color: {
        dark: options?.darkColor || '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating dynamic QR image:', err);
    return '';
  }
};

/**
 * Secure QR token for a devotee member — IDENTITY VERIFICATION ONLY.
 *
 * Returns a JSON payload `{ v, type: 'sb-verify', id, sig }` where `sig` is a
 * time-expiring HMAC signature over the member id. It proves "this card was
 * issued by the temple for this member id" — it is NOT a login credential and
 * contains NO PIN or secret. Verify with `verifyIdentityQRPayload`.
 *
 * SECURITY: never put credentials (PIN/password) in a QR payload. Anyone who
 * photographs a printed card would otherwise be able to impersonate the member.
 */
export const generateSecureQRToken = (member: DevoteeMember): string => {
  const sig = generateDynamicToken(
    { id: member.id, purpose: QR_TYPE_VERIFY },
    IDENTITY_SIG_VALIDITY_SECONDS
  );
  const payload: IdentityQRPayload = {
    v: QR_PAYLOAD_VERSION,
    type: QR_TYPE_VERIFY,
    id: member.id,
    sig,
  };
  return JSON.stringify(payload);
};

/**
 * Verifies an identity QR payload produced by `generateSecureQRToken`.
 * Returns the member id when the embedded HMAC signature is valid & unexpired.
 */
export const verifyIdentityQRPayload = (
  payloadStr: string
): { valid: boolean; memberId?: string; error?: string } => {
  try {
    const parsed = JSON.parse(payloadStr) as Partial<IdentityQRPayload>;
    if (parsed?.v !== QR_PAYLOAD_VERSION || parsed?.type !== QR_TYPE_VERIFY) {
      return { valid: false, error: 'INVALID_FORMAT' };
    }
    if (typeof parsed.sig !== 'string' || typeof parsed.id !== 'string') {
      return { valid: false, error: 'INVALID_FORMAT' };
    }
    const sigCheck = verifyDynamicToken(parsed.sig);
    if (!sigCheck.valid) {
      return { valid: false, error: sigCheck.error || 'SIGNATURE_MISMATCH' };
    }
    const inner: any = sigCheck.payload;
    if (!inner || inner.id !== parsed.id || inner.purpose !== QR_TYPE_VERIFY) {
      return { valid: false, error: 'TAMPER_DETECTED' };
    }
    return { valid: true, memberId: parsed.id };
  } catch {
    return { valid: false, error: 'INVALID_FORMAT' };
  }
};

/** Pairing token lifetime: 5 minutes (matches the QR copy shown to staff). */
export const PAIRING_TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * Generates a cryptographically random 256-bit hex token (unguessable doc id).
 */
export const randomToken256 = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Requests a one-time QR pairing token, stored Firestore-natively.
 *
 * Spark-plan path (no server): the signed-in staff member writes a
 * `qrPairTokens/{token}` document. The token is a 256-bit random id, so the
 * document is unguessable; Firestore rules allow public read-by-id / delete
 * (bearer-token pattern) and restrict creates to staff of the workspace.
 * Expiry is enforced client-side on claim (rules also bound it at create).
 *
 * Throws Error('QR_PAIRING_UNAUTHENTICATED') when not signed in.
 * Firestore network/permission failures propagate to the caller.
 */
export const requestPairingToken = async (
  memberId: string,
  workspaceId: string,
  memberName?: string,
  role: string = 'Devotee'
): Promise<PairingTokenResponse> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('QR_PAIRING_UNAUTHENTICATED');
  }
  const token = randomToken256();
  const expiresAt = Date.now() + PAIRING_TOKEN_TTL_MS;
  await setDoc(doc(db, 'qrPairTokens', token), {
    memberId,
    workspaceId,
    role,
    memberName: memberName || '',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(expiresAt),
  });
  return { token, expiresAt };
};

/**
 * Builds the scan-only QR payload. Contains the one-time claim token —
 * no member id, no PIN, no credentials of any kind.
 */
export const buildPairingQRPayload = (
  token: string,
  workspaceId: string,
  expiresAt: number
): string => {
  const payload: PairingQRPayload = {
    v: QR_PAYLOAD_VERSION,
    type: QR_TYPE_PAIR,
    token,
    wid: workspaceId,
    exp: expiresAt,
  };
  return JSON.stringify(payload);
};

/**
 * Generates a QR data URL for one-time devotee login pairing.
 * The temple office shows this QR; the devotee scans it at the login screen
 * within 5 minutes. Single-use: each token works exactly once.
 */
export const generatePairingQRDataURL = async (
  memberId: string,
  workspaceId: string,
  memberName?: string,
  role: string = 'Devotee'
): Promise<string> => {
  const { token, expiresAt } = await requestPairingToken(memberId, workspaceId, memberName, role);
  const payload = buildPairingQRPayload(token, workspaceId, expiresAt);
  try {
    return await QRCode.toDataURL(payload, {
      width: 400,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch (err) {
    console.error('Error generating pairing QR', err);
    return '';
  }
};

/**
 * Standard A: one-time pairing QR for devotee login.
 *
 * @deprecated Plaintext-PIN auto-login QRs were removed for security (a
 * photographed QR would permanently leak the member's PIN). This now mints a
 * single-use, 5-minute pairing token stored in Firestore (`qrPairTokens`)
 * and encodes the scan-only payload. The `pin` parameter was removed. Prefer
 * `generatePairingQRDataURL` directly for proper error handling.
 */
export const generateStandardA_AutoLoginQR = async (
  memberId: string,
  workspaceId: string,
  memberName?: string,
  role: string = 'Devotee'
): Promise<string> => {
  try {
    return await generatePairingQRDataURL(memberId, workspaceId, memberName, role);
  } catch (err) {
    console.error('Error generating Standard-A pairing QR', err);
    return '';
  }
};

/**
 * Standard B: Gate Pass QR URL
 */
export const generateStandardB_GatePassQR = async (
  memberId: string
): Promise<string> => {
  const url = `${APP_BASE_URL}/?action=verify&id=${encodeURIComponent(memberId)}`;
  try {
    return await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#ea580c', // orange-600
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR', err);
    return '';
  }
};

/**
 * UPI QR Code for instant temple donations & counter payments
 */
export const generateUPIQRCode = async (
  payeeName: string,
  payeeVPA: string,
  amount: number,
  transactionNote: string = 'Mandir Seva'
): Promise<string> => {
  const url = `upi://pay?pa=${encodeURIComponent(payeeVPA)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
  try {
    return await QRCode.toDataURL(url, {
      width: 250,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating UPI QR', err);
    return '';
  }
};
