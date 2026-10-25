/**
 * friendlyAuthError.ts — the ONE shared auth-error mapper
 * (World-Readiness B4, register G-E2/G-E3).
 * =====================================================================
 * Every auth surface (portal login, sign-up steps, purohit/jyotish/solo
 * signup forms, the Google button, password reset) used to render raw
 * Firebase errors — PortalLogin stripped only the "Firebase:" prefix,
 * and the signup forms mapped exactly ONE code before falling through
 * to `err.message`. A devotee could be shown "Firebase: Error
 * (auth/invalid-credential)." as the whole explanation.
 *
 * This module is the single path from a thrown auth failure to words a
 * person can act on:
 *
 *   friendlyAuthErrorKey(err)  → a dictionary key ('auth.err*')
 *   surface renders            → t(friendlyAuthErrorKey(err))
 *
 * The strings live in the dictionary (`auth.err*` in every language's
 * core fragment — authored in all 10 languages), so the message always
 * arrives in the user's chosen language, plain and apologetic, and a
 * raw code or SDK message can NEVER reach the screen: unknown codes,
 * missing codes and non-auth throwables collapse to `auth.errGeneric`,
 * and network failures collapse to `auth.errNetwork`.
 *
 * Presentation only — no auth logic lives here.
 */

/** Firebase auth code → dictionary key. The complete known-code table. */
export const AUTH_ERROR_CODE_TO_KEY: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'auth.errInvalidCredential',
  'auth/wrong-password': 'auth.errInvalidCredential',
  'auth/user-not-found': 'auth.errInvalidCredential',
  'auth/email-already-in-use': 'auth.errEmailInUse',
  'auth/invalid-email': 'auth.errInvalidEmail',
  'auth/weak-password': 'auth.errWeakPassword',
  'auth/user-disabled': 'auth.errUserDisabled',
  'auth/too-many-requests': 'auth.errTooManyRequests',
  'auth/network-request-failed': 'auth.errNetwork',
  'auth/operation-not-allowed': 'auth.errOperationNotAllowed',
  'auth/popup-closed-by-user': 'auth.errPopupClosed',
  'auth/popup-blocked': 'auth.errPopupBlocked',
  'auth/cancelled-popup-request': 'auth.errPopupCancelled',
  'auth/account-exists-with-different-credential': 'auth.errDifferentCredential',
  'auth/unauthorized-domain': 'auth.errUnauthorizedDomain',
  'auth/requires-recent-login': 'auth.errRequiresRecentLogin',
  'auth/credential-already-in-use': 'auth.errCredentialInUse',
  'auth/expired-action-code': 'auth.errExpiredActionCode',
  'auth/invalid-action-code': 'auth.errInvalidActionCode',
  'auth/quota-exceeded': 'auth.errQuotaExceeded',
};

export const AUTH_ERROR_GENERIC_KEY = 'auth.errGeneric';
export const AUTH_ERROR_NETWORK_KEY = 'auth.errNetwork';

/** Every dictionary key this mapper can return (for completeness tests). */
export const FRIENDLY_AUTH_ERROR_KEYS: readonly string[] = Array.from(
  new Set([...Object.values(AUTH_ERROR_CODE_TO_KEY), AUTH_ERROR_GENERIC_KEY]),
);

const NETWORK_HINT = /network|offline|failed to fetch|load failed|net::|unavailable/i;

/**
 * Map any thrown value to the dictionary key of its friendly message.
 * Never returns a raw code, never returns the error's own message.
 */
export function friendlyAuthErrorKey(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null
      ? String((err as { code?: unknown }).code || '')
      : '';
  if (code && AUTH_ERROR_CODE_TO_KEY[code]) return AUTH_ERROR_CODE_TO_KEY[code];
  const message =
    typeof err === 'object' && err !== null
      ? String((err as { message?: unknown }).message || '')
      : String(err || '');
  if (code === 'unavailable' || NETWORK_HINT.test(`${message} ${code}`)) {
    return AUTH_ERROR_NETWORK_KEY;
  }
  return AUTH_ERROR_GENERIC_KEY;
}

/** Convenience: map + translate in one call. */
export function friendlyAuthError(
  err: unknown,
  translate: (key: string) => string,
): string {
  return translate(friendlyAuthErrorKey(err));
}
