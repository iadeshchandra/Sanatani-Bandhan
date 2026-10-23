/**
 * safeUrl.ts — the single URL-safety gate for stored/user-entered links.
 * ============================================================================
 * SECURITY P1 (Finding 2): user-controlled URLs (a jyotishi's session
 * link, a priest's live-stream link, a provider's payment link, an org's
 * website, a claimant's proof URL…) were rendered straight into
 * `href`/`window.open` sinks. A value like `javascript:alert(1)` — or
 * the same idea padded with spaces/control characters, which browsers
 * strip before parsing — executes script in the app's origin when a
 * devotee (or the platform owner, in GodMode) taps it.
 *
 * The law: a stored URL may reach a sink ONLY through this module.
 *   - `safeExternalUrl(raw)` → the URL string when its scheme is
 *     http/https, else null. Callers render the link only when non-null
 *     (or fall back to plain text). Bare hosts (`example.org/page`) are
 *     upgraded to `https://…`, matching the long-standing OrgPublicPage
 *     behaviour, so honest data keeps working.
 *   - `safeOpenUrl(raw)` → same check for `window.open` call sites.
 *   - `isSafeExternalUrl(raw)` → boolean form for validators/tests.
 *
 * Deliberately NOT allowed here: `tel:`/`mailto:`/`sms:`/`wa.me` links —
 * those are built by callers from constants + digit-stripped values and
 * never carry a stored scheme. This helper governs the one dangerous
 * class: a scheme that arrives WITH the data.
 *
 * Parsing notes: the WHATWG URL parser already resolves the classic
 * obfuscations (`java\tscript:`, leading C0 controls/spaces, mixed
 * case) the same way the browser's link activation does, so checking
 * `url.protocol` after `new URL()` is the honest test — a hand-rolled
 * prefix check is exactly what the old `startsWith('http')` guard got
 * wrong. Relative URLs throw without a base and are rejected: a stored
 * "link" that is really an in-app path is not an external link.
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/** Trim + strip the C0-control/space padding browsers ignore. */
function normalizeRaw(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/^[\u0000-\u0020]+/, '').trim();
}

/**
 * Return a safe absolute http(s) URL for a stored/user-entered value,
 * or null when the value is not a safe external link.
 * Bare hosts are upgraded to https:// (OrgPublicPage precedent).
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = normalizeRaw(String(raw));
  if (!trimmed) return null;
  // A scheme-like prefix that is not http/https is rejected outright —
  // never "upgraded" into something clickable.
  // A single-leading-slash value is an in-app path, not an external
  // link — never reinterpret it as a host. ('//host' stays external.)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return null;
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  let candidate = trimmed;
  if (!schemeMatch) {
    // No scheme: treat as a bare host/path and give it https.
    candidate = `https://${trimmed.replace(/^\/+/, '')}`;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
  if (!url.hostname) return null;
  return url.toString();
}

/** Boolean form of safeExternalUrl. */
export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  return safeExternalUrl(raw) != null;
}

/** window.open variant: returns the safe URL or null (do not open). */
export function safeOpenUrl(raw: string | null | undefined): string | null {
  return safeExternalUrl(raw);
}
