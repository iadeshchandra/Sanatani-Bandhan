/**
 * appCheck.ts — SECURITY P1 (Finding 4): App Check client wiring.
 * ============================================================================
 * App Check proves to Firebase that requests come from the real app,
 * not a script with a stolen config. Until this batch the client never
 * initialised it, so nothing could ever be enforced.
 *
 * THE LAW — dormant until configured, fail-open always:
 *   · The provider activates ONLY when a site key is present at build
 *     time in `VITE_FIREBASE_APPCHECK_SITE_KEY` (the existing env-config
 *     pattern; see services/firebaseClient.ts). No key → this module
 *     is a no-op and the app behaves exactly as before — the $0 Spark
 *     setup and the floor devices (2GB RAM / Android 8) are untouched.
 *   · Any initialisation error is swallowed (warn-only): App Check
 *     must never be the reason the app fails to boot.
 *   · Client wiring alone enforces NOTHING. Enforcement is switched on
 *     per-service in the Firebase console (owner's hand) once tokens
 *     are flowing — see the batch NOTES for the console checklist.
 *
 * Web provider: reCAPTCHA Enterprise, the supported attestation for a
 * PWA. (Play Integrity attests the Android app distributed via Play;
 * this build is the web app, so the web provider is the right one.)
 */

import type { FirebaseApp } from 'firebase/app';

let attempted = false;

/** The configured site key, or '' when App Check is not configured. */
export function appCheckSiteKey(): string {
  try {
    return (import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string) || '';
  } catch {
    return '';
  }
}

/** True when a site key is configured (App Check will be attempted). */
export function isAppCheckConfigured(): boolean {
  return appCheckSiteKey().trim().length > 0;
}

/**
 * Initialise App Check for the app, once, if configured. Never throws.
 * Called from lib/firebase.ts immediately after initializeApp, before
 * any Firestore/Auth traffic, so tokens attach from the first request.
 */
export function initAppCheck(app: FirebaseApp): void {
  if (attempted) return;
  attempted = true;
  const siteKey = appCheckSiteKey().trim();
  if (!siteKey) return; // dormant by design — no key, no behaviour change
  // Dynamic import keeps the App Check SDK out of the boot chunk for
  // every deployment that has not configured a key.
  void (async () => {
    try {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      // Fail-open: a broken attestation provider must never brick the
      // app for a devotee on a temple-courtyard connection.
      console.warn('[appCheck] initialisation failed; continuing without it:', err);
    }
  })();
}
