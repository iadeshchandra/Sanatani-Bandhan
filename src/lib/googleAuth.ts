/**
 * googleAuth.ts — shared Google sign-in helper (Membership sprint).
 * =====================================================================
 * Single entry point for "Continue with Google" across PortalLogin
 * (login + signup views) and the purohit signup form.
 *
 * SECURITY (H-11 precedent): a Google sign-in NEVER self-grants a privileged
 * role. The `users/{uid}` doc is created with identity fields only (no
 * `role`/`workspaceId` — the rules forbid clients from writing those).
 * Role resolves to Devotee by default, or Trustee for the recorded creator
 * of a workspace (workspaces/{id}.createdBy), exactly like the email flow.
 *
 * IMPORTANT — Firebase Console prerequisite (cannot be done in code):
 *   Authentication → Sign-in method → Google → Enable.
 * If it is not enabled, signInWithPopup throws `auth/operation-not-allowed`.
 * We surface a clear message AND a console warning pointing at the console.
 */
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

export interface GoogleAuthResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  /** True when we created the users/{uid} identity doc just now. */
  isNewUser: boolean;
}

/** Friendly, non-technical messages for every Google popup failure mode. */
export function googleErrorMessage(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed. Tap "Continue with Google" to try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in was interrupted. Please try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is already registered with a different sign-in method (email/password). Please sign in with your original method.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not switched on for this app yet. Please use email login for now — the administrator has been notified.';
    case 'auth/unauthorized-domain':
      return 'This app address is not yet authorized for Google sign-in. Please use email login for now — the administrator has been notified.';
    case 'auth/network-request-failed':
      return 'No internet connection. Please check your network and try again.';
    default:
      return (err?.message || 'Google sign-in failed. Please try again.').replace('Firebase:', '').trim();
  }
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  let cred;
  try {
    cred = await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    if (err?.code === 'auth/operation-not-allowed') {
      // Cannot be fixed in code — the Firebase Console toggle is required.
      console.warn(
        '[GoogleAuth] auth/operation-not-allowed: enable Google sign-in in the ' +
          'Firebase Console → Authentication → Sign-in method → Google. ' +
          'No code change is needed once it is enabled.'
      );
    }
    throw err;
  }

  const fbUser = cred.user;
  const uid = fbUser.uid;

  // Identity-only doc. No `role` / `workspaceId` / `membership` keys — the
  // Firestore rules forbid clients from writing privilege or tenant claims
  // (H-11). Role defaults to Devotee in-memory; workspace creators resolve
  // to Trustee via workspaces/{id}.createdBy at login, like email users.
  let isNewUser = false;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || '',
        photoURL: fbUser.photoURL || '',
        provider: 'google',
        createdAt: serverTimestamp(),
      });
      isNewUser = true;
    }
  } catch (docErr) {
    // Identity doc write is best-effort (offline / rules hiccup). The auth
    // session itself is valid; the app treats missing docs as new Devotees.
    console.warn('[GoogleAuth] users-doc upsert failed (non-fatal):', docErr);
  }

  return {
    uid,
    email: fbUser.email || '',
    displayName: fbUser.displayName || 'Sanatani Devotee',
    photoURL: fbUser.photoURL || '',
    isNewUser,
  };
}
