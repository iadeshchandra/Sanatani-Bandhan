/**
 * friendlyError.ts — the ONE shared non-auth error mapper
 * (Error-Polish batch, register G-E4/G-E5).
 * =====================================================================
 * Outside the auth surfaces, a caught failure could still render its
 * raw SDK text — a toast reading "FirebaseError: Missing or
 * insufficient permissions", an alert carrying `err.message`, an
 * inline banner printing an exception string. friendlyAuthError.ts
 * closed that class for sign-in (G-E2/G-E3); this module is the same
 * cure generalised to every other surface:
 *
 *   friendlyErrorKey(err, context)  → a dictionary key ('errors.*')
 *   surface renders                 → t(friendlyErrorKey(err, context))
 *
 * The strings live in the dictionary (`errors` section in every
 * language's core fragment — en/hi/bn authored, the 7 drafts are
 * AI-draft class like all draft content since B3), so the message
 * always arrives in the user's chosen language, plain and warm, and a
 * raw code or SDK message can NEVER reach the screen: known Firestore
 * / Functions codes map to their specific sentence, network-shaped
 * failures collapse to the network sentence, auth-shaped failures
 * delegate to the friendlyAuthError table (never a second copy of it),
 * and anything unrecognised collapses to the caller's context
 * fallback (save / load / generic).
 *
 * The RAW error still goes to console.error at the call boundary —
 * friendly text is for the user's eyes only; diagnosability keeps the
 * original. Presentation only — no logic lives here.
 */

import { friendlyAuthErrorKey } from './friendlyAuthError';
import { getDict } from '../i18n/translations';

/** What the surface was trying to do when the failure happened. */
export type FriendlyErrorContext = 'save' | 'load' | 'generic';

/**
 * Error code → dictionary key. Keys are matched against the full code
 * first, then against the bare segment after the last '/' (Functions
 * codes arrive prefixed, e.g. 'functions/not-found'; Firestore codes
 * arrive bare). Auth codes are NOT here — they delegate below.
 */
export const ERROR_CODE_TO_KEY: Readonly<Record<string, string>> = {
  'permission-denied': 'errors.permission',
  'unauthenticated': 'errors.sessionExpired',
  'not-found': 'errors.notFound',
  'already-exists': 'errors.conflict',
  'failed-precondition': 'errors.conflict',
  aborted: 'errors.conflict',
  'resource-exhausted': 'errors.quota',
  'quota-exceeded': 'errors.quota',
  unavailable: 'errors.network',
  'deadline-exceeded': 'errors.network',
  'network-request-failed': 'errors.network',
  // CloudApiError codes (services/cloudApiClient) — classified there,
  // phrased here.
  NETWORK_ERROR: 'errors.network',
  REQUEST_TIMEOUT: 'errors.network',
};

export const ERROR_SAVE_KEY = 'errors.saveFailed';
export const ERROR_LOAD_KEY = 'errors.loadFailed';
export const ERROR_GENERIC_KEY = 'errors.generic';

/** Every dictionary key this mapper can return (for completeness tests). */
export const FRIENDLY_ERROR_KEYS: readonly string[] = [
  'errors.saveFailed',
  'errors.loadFailed',
  'errors.network',
  'errors.permission',
  'errors.notFound',
  'errors.conflict',
  'errors.quota',
  'errors.sessionExpired',
  'errors.generic',
  'errors.tryAgain',
];

const CONTEXT_FALLBACK: Readonly<Record<FriendlyErrorContext, string>> = {
  save: ERROR_SAVE_KEY,
  load: ERROR_LOAD_KEY,
  generic: ERROR_GENERIC_KEY,
};

const NETWORK_HINT =
  /network|offline|failed to fetch|load failed|net::|timed out|timeout|unreachable|connection/i;
const PERMISSION_HINT =
  /missing or insufficient permissions|permission[-_ ]denied|PERMISSION_DENIED/i;

/**
 * Map any thrown value to the dictionary key of its friendly message.
 * Never returns a raw code, never returns the error's own message.
 */
export function friendlyErrorKey(
  err: unknown,
  context: FriendlyErrorContext = 'generic',
): string {
  const code =
    typeof err === 'object' && err !== null
      ? String((err as { code?: unknown }).code || '')
      : '';
  // Auth-shaped failures keep their richer, purpose-written sentences.
  if (code.startsWith('auth/')) return friendlyAuthErrorKey(err);
  if (code && ERROR_CODE_TO_KEY[code]) return ERROR_CODE_TO_KEY[code];
  const bare = code.includes('/') ? code.slice(code.lastIndexOf('/') + 1) : code;
  if (bare && ERROR_CODE_TO_KEY[bare]) return ERROR_CODE_TO_KEY[bare];

  const name =
    typeof err === 'object' && err !== null
      ? String((err as { name?: unknown }).name || '')
      : '';
  if (name === 'AbortError' || name === 'TimeoutError') return 'errors.network';

  const message =
    typeof err === 'object' && err !== null
      ? String((err as { message?: unknown }).message || '')
      : String(err || '');
  if (NETWORK_HINT.test(`${message} ${code}`)) return 'errors.network';
  if (PERMISSION_HINT.test(message)) return 'errors.permission';
  return CONTEXT_FALLBACK[context] ?? ERROR_GENERIC_KEY;
}

/** Convenience: map + translate in one call. */
export function friendlyError(
  err: unknown,
  translate: (key: string) => string,
  context: FriendlyErrorContext = 'generic',
): string {
  return translate(friendlyErrorKey(err, context));
}

const FRIENDLY_LANGS: readonly string[] = [
  'en', 'hi', 'bn', 'sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml',
];

function lookupKey(dict: unknown, key: string): string | null {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' && node ? node : null;
}

/**
 * Non-hook resolver for the places a React `t` cannot reach: class
 * components (the crash boundary), module-level copy helpers, and
 * surfaces that carry a language code but no translator. Resolves the
 * mapped key straight from the dictionary with the English fallback —
 * the same fallback order the language provider itself uses.
 */
export function friendlyErrorText(
  err: unknown,
  lang: string | null | undefined,
  context: FriendlyErrorContext = 'generic',
): string {
  const key = friendlyErrorKey(err, context);
  const code = lang && FRIENDLY_LANGS.includes(lang) ? lang : 'en';
  try {
    return lookupKey(getDict(code), key) ?? lookupKey(getDict('en'), key) ?? key;
  } catch {
    return key;
  }
}
