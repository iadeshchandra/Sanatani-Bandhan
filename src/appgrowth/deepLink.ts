/**
 * deepLink — native-app probe for the /get-app smart link.
 * ==========================================================
 * Standard pattern: attempt the custom scheme; only navigate away when the
 * OS claims it. If nothing claims the URL within the timeout, the timer
 * fires and the caller renders the landing content instead. Never a dead
 * end — the fallback path is always the landing page.
 *
 * NOTE (for the APK builder): the native app must register this scheme
 * (e.g. <data android:scheme="sanatanibandhan"> intent-filter in
 * android/app/src/main/AndroidManifest.xml). The current manifest has no
 * custom scheme, so today the attempt harmlessly falls through to the
 * landing page — which is the correct behaviour until the APK registers it.
 */

import type { DeepLinkAttempt } from './types';

/** Custom scheme the native app will claim once its manifest registers it. */
export const NATIVE_APP_SCHEME = 'sanatanibandhan://home';

export interface DeepLinkOptions {
  /** Scheme URL to attempt. Defaults to NATIVE_APP_SCHEME. */
  scheme?: string;
  /** How long to wait for the OS to claim the URL (default 1500ms). */
  timeoutMs?: number;
}

/**
 * Attempt to open the installed native app. Resolves with `claimed: true`
 * when the browser visibly navigated away (page hidden), `claimed: false`
 * when the timer fired without a claim.
 */
export function attemptNativeAppOpen(options: DeepLinkOptions = {}): Promise<DeepLinkAttempt> {
  const scheme = options.scheme ?? NATIVE_APP_SCHEME;
  const timeoutMs = options.timeoutMs ?? 1500;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (claimed: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ claimed });
    };

    const onVisibilityChange = () => {
      // The OS claimed the URL: the page is being backgrounded.
      if (document.hidden) finish(true);
    };
    const onBlur = () => finish(true);
    const onPageHide = () => finish(true);

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      try {
        if (probeFrame.parentNode) probeFrame.parentNode.removeChild(probeFrame);
      } catch {
        /* ignore */
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);

    // Use a hidden iframe for the scheme attempt so a failed claim never
    // replaces the landing page in history; the timer then fires normally.
    // On desktop browsers the navigation throws — that is the expected
    // "not installed" outcome, caught and ignored.
    const probeFrame = document.createElement('iframe');
    probeFrame.style.display = 'none';
    probeFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(probeFrame);
    try {
      probeFrame.contentWindow?.location.replace(scheme);
    } catch {
      /* Not installed — the timer will fire. */
    }
    // Fallback for browsers that block iframe scheme navigation silently:
    // a direct location assignment is a no-op when the scheme is unknown.
    try {
      window.location.assign(scheme);
    } catch {
      /* Not installed — the timer will fire. */
    }
  });
}
