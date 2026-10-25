import React, { useState } from 'react';
import { motion } from 'motion/react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import type { GoogleAuthResult } from '../../lib/googleAuth';
import { friendlyAuthErrorKey } from '../../lib/friendlyAuthError';
import { CheckCircle2 } from 'lucide-react';

/**
 * SignupCredentialsStep — Step 1 of the unified Sign Up flow (UX research revision).
 *
 * Credentials FIRST, no decisions. Big "Continue with Google" button at top
 * (primary, lowest friction), then name/email/password fields as the alternative.
 * The role question comes AFTER auth (Step 2), following the progressive-commitment
 * pattern: easy credentials first, role question after psychological commitment.
 *
 * On completion the Firebase Auth user exists; the parent stores the credentials
 * and advances to the role cards. Path forms in Step 3 receive these via `preAuth`
 * and skip their own credential sections.
 */
export interface SignupCreds {
  uid: string;
  displayName: string;
  email: string;
  googleUser?: GoogleAuthResult | null;
}

interface SignupCredentialsStepProps {
  onComplete: (creds: SignupCreds) => void;
  t: (key: string) => string;
}

const inputCls =
  'w-full pl-4 pr-4 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm';

export const SignupCredentialsStep: React.FC<SignupCredentialsStepProps> = ({ onComplete, t }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = (result: GoogleAuthResult) => {
    const current = auth.currentUser;
    if (!current || current.uid !== result.uid) {
      setError(t('cred_google_expired'));
      return;
    }
    onComplete({
      uid: result.uid,
      displayName:
        displayName.trim() ||
        (result.displayName !== 'Sanatani Devotee' ? result.displayName : ''),
      email: result.email,
      googleUser: result,
    });
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) {
      setError(t('cred_name_required'));
      return;
    }
    if (password.length < 6) {
      setError(t('cred_password_min'));
      return;
    }
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      // QUEUED #41: persist the typed name onto the Firebase Auth profile
      // as well. Downstream session-identity resolution (e.g. /register-org)
      // reads displayName from the Auth user; when it was never written,
      // org creation dead-ended on the admin name. Best-effort — signup
      // must not fail if the profile write does (the register-org flow
      // also falls back to the Sanatani profile name).
      await updateProfile(cred.user, { displayName: displayName.trim() }).catch(() => {});
      onComplete({
        uid: cred.user.uid,
        displayName: displayName.trim(),
        email: cleanEmail,
        googleUser: null,
      });
    } catch (err: any) {
      // World-Readiness B4 (G-E3): the shared friendlyAuthError mapper —
      // every Firebase code renders a dictionary sentence, never raw.
      setError(t(friendlyAuthErrorKey(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="signup-credentials"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="rounded-2xl bg-[#f7f4ef]/95 p-4 sm:p-6 shadow-[inset_0_2px_14px_rgba(0,0,0,0.07)]"
    >
      <div className="text-center mb-5">
        <h3 className="text-lg font-black text-temple-900">{t('cred_title')}</h3>
        <p className="text-[12.5px] text-temple-500 font-medium mt-1">{t('cred_sub')}</p>
      </div>

      {/* Primary: Google — lowest friction */}
      <GoogleSignInButton
        onSuccess={handleGoogleSuccess}
        onError={(m) => setError(m)}
      />

      <div className="flex items-center gap-4 py-4 opacity-70">
        <div className="h-px bg-temple-200 flex-1" />
        <span className="text-[10.5px] font-black tracking-[0.22em] text-temple-400">
          {t('cred_or_email')}
        </span>
        <div className="h-px bg-temple-200 flex-1" />
      </div>

      <form onSubmit={submitEmail} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            {t('cred_name')}
          </label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('cred_name_ph')}
            className={inputCls}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            {t('cred_email')}
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('cred_email_ph')}
            className={inputCls}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            {t('cred_password')}
          </label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('cred_password_ph')}
            className={inputCls}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black py-3.5 rounded-xl shadow-md transition-all text-sm disabled:opacity-50 min-h-[52px]"
        >
          {loading ? t('cred_creating') : t('cred_continue')}
        </button>
      </form>

      <p className="text-[11px] text-temple-400 text-center mt-3 flex items-center justify-center gap-1.5">
        <CheckCircle2 size={13} className="text-emerald-600" />
        {t('cred_secure_note')}
      </p>
    </motion.div>
  );
};
