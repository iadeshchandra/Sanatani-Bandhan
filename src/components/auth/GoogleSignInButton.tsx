/**
 * GoogleSignInButton — "Continue with Google" (Membership sprint).
 * =====================================================================
 * Reusable across PortalLogin (login + signup) and the purohit signup form.
 * Uses the official Google "G" mark drawn as inline SVG (brand-compliant,
 * no emoji). Handles all popup failure modes with friendly messages via
 * the shared googleAuth helper.
 */
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { signInWithGoogle, googleErrorMessage, GoogleAuthResult } from '../../lib/googleAuth';

/** Official Google "G" — multicolor SVG paths (no emoji, no external asset). */
export const GoogleGMark: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.1c.95-2.85 3.6-4.97 6.73-4.97z"
    />
  </svg>
);

interface GoogleSignInButtonProps {
  /** 'login' | 'signup' | 'purohit' — drives the button label. */
  mode?: 'login' | 'signup' | 'purohit';
  onSuccess: (result: GoogleAuthResult) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  mode = 'login',
  onSuccess,
  onError,
  disabled = false,
  className = '',
}) => {
  const [busy, setBusy] = useState(false);

  const label =
    mode === 'purohit'
      ? 'Continue with Google as Purohit'
      : mode === 'signup'
        ? 'Sign up with Google'
        : 'Continue with Google';

  const handleClick = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      onSuccess(result);
    } catch (err: any) {
      onError?.(googleErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled}
      className={`w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-50 border border-stone-300 hover:border-stone-400 rounded-xl py-3.5 px-4 text-sm font-bold text-stone-700 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${className}`}
      aria-label={label}
    >
      {busy ? <Loader2 size={18} className="animate-spin text-stone-500" /> : <GoogleGMark size={18} />}
      <span>{busy ? 'Connecting to Google…' : label}</span>
    </button>
  );
};
