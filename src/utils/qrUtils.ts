import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { DevoteeMember } from '../types';

export const APP_BASE_URL = 'https://sanatanibandhan.web.app';
const DYNAMIC_TOKEN_PREFIX = 'SBDYN:';
const DYNAMIC_QR_SECRET = 'SANATANI_TEMPLE_VAULT_KEY_2026';

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
 * Generates secure vault payload for devotee members
 */
export const generateSecureQRToken = (member: DevoteeMember): string => {
  const vaultToken = member.qrSecretVaultToken || btoa(member.id + '-vault-' + Date.now());
  const payload = JSON.stringify({
    id: member.id,
    pin: member.pin,
    token: vaultToken,
  });
  return payload;
};

/**
 * Standard A: Auto-Login QR URL
 */
export const generateStandardA_AutoLoginQR = async (
  memberId: string,
  pin: string,
  workspaceName: string
): Promise<string> => {
  const url = `${APP_BASE_URL}/?action=autologin&id=${encodeURIComponent(memberId)}&pin=${encodeURIComponent(pin)}&workspace=${encodeURIComponent(workspaceName)}`;
  try {
    return await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR', err);
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
