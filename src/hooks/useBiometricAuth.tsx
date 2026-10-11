import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Fingerprint, Scan, ShieldCheck, CheckCircle2, X } from 'lucide-react';

/**
 * Real WebAuthn (FIDO2) biometric authentication.
 * Uses platform authenticators — FaceID / TouchID / Windows Hello / Android
 * biometrics — via navigator.credentials.create() / .get().
 *
 * Security scope: this is a DEVICE-BOUND second factor for sensitive in-app
 * actions (vault unlocks). It is NOT a phishing-resistant server login — a
 * full FIDO2 server ceremony (challenge issuance + attestation verification
 * on the backend) is the recommended follow-up for sign-in flows.
 *
 * If WebAuthn is unavailable, promptBiometric() resolves false immediately so
 * callers fall back to PIN entry. There is no simulated delay anywhere.
 */

const CRED_STORAGE_KEY = 'sb_webauthn_credential_id';

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'PublicKeyCredential' in window &&
    !!navigator.credentials &&
    typeof (navigator.credentials as any).create === 'function'
  );
}

export async function platformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (
      isWebAuthnSupported() &&
      typeof (window as any).PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      return await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    // fall through
  }
  return false;
}

function rpId(): string {
  const envId = (import.meta as any)?.env?.WEBAUTHN_RP_ID;
  if (typeof envId === 'string' && envId) return envId;
  return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
}

function b64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Register this device's platform authenticator for a user id.
 * Stores only the credential ID locally — the private key never leaves the
 * authenticator hardware.
 */
export async function registerBiometric(userId: string): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  const cleanId = (userId || 'sanatani-user').slice(0, 64);
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: 'Sanatani Bandhan', id: rpId() },
        user: {
          id: new TextEncoder().encode(cleanId),
          name: cleanId,
          displayName: cleanId,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    } as any)) as PublicKeyCredential | null;

    if (cred && cred.rawId) {
      localStorage.setItem(CRED_STORAGE_KEY, b64urlEncode(cred.rawId));
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[WebAuthn] Registration failed or was cancelled:', err);
    return false;
  }
}

/**
 * Perform a real platform-authenticator assertion. Returns true only when the
 * user completes the OS biometric prompt. False on cancel, failure, or when
 * WebAuthn is unavailable (callers must fall back to PIN).
 */
export async function authenticateBiometric(signal?: AbortSignal): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    const stored = localStorage.getItem(CRED_STORAGE_KEY);
    const allowCredentials = stored
      ? [{ type: 'public-key' as const, id: b64urlDecode(stored), transports: ['internal' as const] }]
      : undefined;

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        rpId: rpId(),
        allowCredentials,
        userVerification: 'required',
        timeout: 60000,
      },
      signal,
    } as any);

    return !!assertion;
  } catch (err: any) {
    // NotAllowedError = user cancelled / timed out; NotSupportedError = no authenticator.
    console.warn('[WebAuthn] Authentication failed or was cancelled:', err?.name || err);
    return false;
  }
}

export interface UseBiometricAuthReturn {
  isBiometricAvailable: boolean;
  isAuthenticating: boolean;
  activePromptAction: string | null;
  promptBiometric: (actionName?: string) => Promise<boolean>;
  BiometricPromptModal: React.FC;
  /** Register this device for biometric use. */
  register: (userId: string) => Promise<boolean>;
  /** Direct one-shot biometric assertion (no modal). */
  authenticate: () => Promise<boolean>;
}

export function useBiometricAuth(): UseBiometricAuthReturn {
  // Best-effort sync availability flag. The authoritative check is
  // platformAuthenticatorAvailable(); promptBiometric() always verifies for real.
  const [availabilityHint] = useState<boolean>(() => isWebAuthnSupported());
  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(null);

  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [activePromptAction, setActivePromptAction] = useState<string | null>(null);
  const [modalResolve, setModalResolve] = useState<((val: boolean) => void) | null>(null);
  const [modalStage, setModalStage] = useState<'SCANNING' | 'SUCCESS' | 'CANCELLED'>('SCANNING');
  const abortRef = useRef<AbortController | null>(null);
  const resolveRef = useRef<((val: boolean) => void) | null>(null);

  const finish = useCallback((value: boolean) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsAuthenticating(false);
    setActivePromptAction(null);
    setModalResolve(null);
    const r = resolveRef.current;
    resolveRef.current = null;
    if (r) r(value);
  }, []);

  const promptBiometric = useCallback(
    (actionName: string = 'Verification'): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        // No platform authenticator (or no WebAuthn at all): resolve false
        // immediately so the caller falls back to PIN entry. Never simulate.
        if (!isWebAuthnSupported()) {
          resolve(false);
          return;
        }

        setActivePromptAction(actionName);
        setIsAuthenticating(true);
        setModalStage('SCANNING');
        setModalResolve(() => resolve);
        resolveRef.current = resolve;

        const controller = new AbortController();
        abortRef.current = controller;

        // Real WebAuthn ceremony against the OS biometric sensor.
        authenticateBiometric(controller.signal).then((ok) => {
          // If the user cancelled via the modal, finish() already resolved.
          if (resolveRef.current === null) return;
          if (ok) {
            setModalStage('SUCCESS');
            window.setTimeout(() => finish(true), 450);
          } else {
            finish(false);
          }
        });
      });
    },
    [finish]
  );

  const handleCancel = useCallback(() => {
    setModalStage('CANCELLED');
    // Resolving false lets every caller fall back to its PIN path.
    window.setTimeout(() => finish(false), 150);
  }, [finish]);

  const register = useCallback((userId: string) => registerBiometric(userId), []);
  const authenticate = useCallback(() => authenticateBiometric(), []);

  // Probe platform authenticator presence once (async; informational only).
  React.useEffect(() => {
    let alive = true;
    platformAuthenticatorAvailable().then((v) => {
      if (alive) setPlatformAvailable(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Self-rendering portal modal for the live biometric ceremony.
  const BiometricPromptModal: React.FC = () => {
    if (!isAuthenticating || typeof document === 'undefined') return null;

    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md transition-all animate-fadeIn">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-700/80 shadow-2xl p-6 sm:p-7 text-center space-y-5"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleCancel}
            className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800/80 transition-colors cursor-pointer"
            aria-label="Cancel Biometric Verification"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Security Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>FIDO2 / WebAuthn</span>
          </div>

          {/* Biometric Sensor Visual Indicator */}
          <div className="flex justify-center py-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
              {modalStage === 'SCANNING' ? (
                <>
                  {/* Pulsing rings while the OS biometric prompt is live */}
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping opacity-60"></div>
                  <div className="absolute inset-2 rounded-full border border-amber-500/40 animate-pulse"></div>
                  <div className="relative w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                    <Scan className="w-10 h-10 animate-pulse text-amber-400" />
                    <Fingerprint className="w-7 h-7 absolute text-amber-300/80" />
                  </div>
                </>
              ) : (
                <div className="relative w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)] scale-105 transition-transform duration-300">
                  <CheckCircle2 className="w-11 h-11 text-emerald-400 animate-in zoom-in-75 duration-200" />
                </div>
              )}
            </div>
          </div>

          {/* Action Context Title */}
          <div>
            <h3 className="text-base font-black text-stone-100 tracking-tight">
              {modalStage === 'SCANNING'
                ? (activePromptAction ? `${activePromptAction} Authorization` : 'Biometric Security Scan')
                : modalStage === 'SUCCESS'
                  ? 'Biometric Authenticated!'
                  : 'Verification Cancelled'}
            </h3>
            <p className="text-xs text-stone-400 mt-1 font-medium leading-relaxed">
              {modalStage === 'SCANNING'
                ? 'Complete the biometric prompt on your device (FaceID / TouchID / Windows Hello) to confirm identity'
                : modalStage === 'SUCCESS'
                  ? 'Hardware authenticator assertion verified.'
                  : 'Falling back to PIN entry.'}
            </p>
          </div>

          {/* System Hint Footer */}
          <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500">
            <span className="font-mono">
              {platformAvailable === false ? 'No platform sensor detected' : 'FaceID / TouchID / Hello'}
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
            >
              Use PIN Instead
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return {
    isBiometricAvailable: availabilityHint,
    isAuthenticating,
    activePromptAction,
    promptBiometric,
    BiometricPromptModal,
    register,
    authenticate,
  };
}

// Named helpers re-exported for non-hook usage.
export { platformAuthenticatorAvailable as isSupported };
