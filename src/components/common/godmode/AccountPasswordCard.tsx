/**
 * AccountPasswordCard — set / change the signed-in owner's password
 * from inside the GodMode console (SPLASH & GODMODE BATCH, part D).
 * =====================================================================
 * The owner account carries BOTH Google and email+password sign-in
 * (password reset completed 2026-11-23), but until now changing that
 * password meant leaving the console for the org-side settings desk.
 * This card closes that gap with the established Firebase pattern
 * (MasterSettingsDesk's updatePassword flow), hardened for the
 * console:
 *   - updatePassword(auth.currentUser, newPassword);
 *   - on auth/requires-recent-login, ask for the CURRENT password
 *     inline and reauthenticateWithCredential, then retry once —
 *     never a dead-end "log out and back in" message;
 *   - honest success/error copy in the card itself (console-local
 *     copy, the UpdatePrompt local-COPY precedent — no dictionary
 *     keys, GodMode is admin surface);
 *   - passwords live in state only until the submit settles, are
 *     cleared on success AND on failure, and are never logged,
 *     stored, or sent anywhere except Firebase Auth.
 */
import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../../../firebase';
import { friendlyErrorText } from '../../../lib/friendlyError';

const inputCls =
  'w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 min-h-[44px] text-sm text-saffron-300 focus:ring-2 focus:ring-saffron-500 outline-none';

function passwordErrorText(err: any): string {
  const code = typeof err?.code === 'string' ? err.code : '';
  switch (code) {
    case 'auth/weak-password':
      return 'Firebase refused that password as too weak. Choose a longer one — at least 6 characters, more is better.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'That current password did not match. Check it and try again — nothing was changed.';
    case 'auth/user-mismatch':
      return 'The current password belongs to a different account than the one signed in here. Nothing was changed.';
    case 'auth/network-request-failed':
      return 'Network problem — the request never reached Firebase. Check your connection and try again.';
    case 'auth/no-current-user':
      return 'No account is signed in right now. Sign in again, then set the password.';
    default:
      return friendlyErrorText(err, 'en', 'save');
  }
}

export const AccountPasswordCard: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [needsCurrent, setNeedsCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const clearSecrets = () => {
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setNotice({ kind: 'error', text: 'No account is signed in right now. Sign in again, then set the password.' });
      return;
    }
    if (newPassword.length < 6) {
      setNotice({ kind: 'error', text: 'The new password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ kind: 'error', text: 'The new password and its confirmation do not match.' });
      return;
    }
    if (needsCurrent && !currentPassword) {
      setNotice({ kind: 'error', text: 'Enter your current password so Firebase can confirm it is you, then submit again.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      try {
        await updatePassword(user, newPassword);
      } catch (err: any) {
        if (err?.code !== 'auth/requires-recent-login') throw err;
        // Firebase wants a fresh sign-in proof before a password
        // change. Ask for the current password inline (once), then
        // re-authenticate and retry — the owner never leaves the card.
        if (!needsCurrent) {
          setNeedsCurrent(true);
          setNotice({
            kind: 'error',
            text: 'For your protection, Firebase needs your current password before this change. Enter it below and submit again — your new password above is kept for the retry.',
          });
          return;
        }
        if (!user.email) {
          throw Object.assign(new Error('This account has no email address to re-authenticate with.'), { code: 'auth/user-mismatch' });
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
      }
      clearSecrets();
      setNeedsCurrent(false);
      setNotice({
        kind: 'success',
        text: 'Password updated. Use the new password the next time you sign in with email — Google sign-in is unaffected.',
      });
    } catch (err: any) {
      clearSecrets();
      setNotice({ kind: 'error', text: passwordErrorText(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-saffron-400" /> Account password
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        Set or change the password for the account signed in to this console
        ({auth.currentUser?.email ?? 'current account'}). If Firebase asks for
        your current password first, the card will ask for it here — you never
        need to leave the console.
      </p>
      {notice && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 mb-4 text-xs leading-relaxed flex items-start gap-2 ${
            notice.kind === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {notice.kind === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{notice.text}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        {needsCurrent && (
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className={inputCls}
          />
        )}
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (at least 6 characters)"
          className={inputCls}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className={inputCls}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Updating…' : needsCurrent ? 'Confirm & update password' : 'Set / change password'}
        </button>
      </form>
    </div>
  );
};
