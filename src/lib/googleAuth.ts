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

/**
 * Error WORDS no longer live here (World-Readiness B4): the old
 * English-only message helper's default branch passed the raw SDK
 * message to the screen. Google failures are rendered by the caller
 * through the ONE shared mapper — `friendlyAuthErrorKey` in
 * `src/lib/friendlyAuthError.ts` — in the user's chosen language.
 */

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
