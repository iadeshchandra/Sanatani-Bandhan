/**
 * Sanatani Bandhan — App version + update handshake.
 *
 * Bulletproof update system:
 *  1. `__APP_VERSION__` is baked into the bundle at build time (date + git SHA).
 *  2. `dist/version.json` is generated at build time with the same version.
 *  3. On startup (and periodically), the app fetches /version.json with
 *     cache:'no-store'. If it differs from the running bundle, an update
 *     prompt is shown — even if the service worker hasn't noticed yet.
 *     This catches the Firebase CDN edge-inconsistency case (stale index.html).
 *  4. A `critical` flag in version.json (set manually per deploy) forces a
 *     blocking prompt: "This update fixes an important issue."
 *
 * Offline-first: the version check fails silently with no network — the app
 * keeps working exactly as before.
 */

declare const __APP_VERSION__: string;
declare const __APP_BUILD_TIME__: string;
declare const __APP_BUILD_SHA__: string;

/** Version baked into this bundle, e.g. "v2026.10.16-a1b2c3d". */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v0.0.0-dev';

/** ISO build timestamp baked into this bundle. */
export const APP_BUILD_TIME: string =
  typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '';

/** Git short SHA baked into this bundle. */
export const APP_BUILD_SHA: string =
  typeof __APP_BUILD_SHA__ !== 'undefined' ? __APP_BUILD_SHA__ : '';

export interface VersionManifest {
  version: string;
  buildTime: string;
  sha: string;
  /** When true, the update prompt blocks interaction until applied. */
  critical: boolean;
  criticalNote?: string;
}

const DISMISS_KEY = 'sb_update_dismissed_for';
const LAST_CHECK_KEY = 'sb_update_last_check';

function baseUrl(): string {
  try {
    return import.meta.env.BASE_URL || '/';
  } catch {
    return '/';
  }
}

/**
 * Fetch the deployed version manifest, bypassing every cache layer.
 * Returns null on any failure (offline, 404, bad JSON) — never throws.
 */
export async function fetchDeployedVersion(): Promise<VersionManifest | null> {
  try {
    const base = baseUrl().replace(/\/$/, '');
    const url = `${base}/version.json?ts=${Date.now()}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<VersionManifest>;
    if (!data || typeof data.version !== 'string' || !data.version) return null;
    return {
      version: data.version,
      buildTime: typeof data.buildTime === 'string' ? data.buildTime : '',
      sha: typeof data.sha === 'string' ? data.sha : '',
      critical: data.critical === true,
      criticalNote: typeof data.criticalNote === 'string' ? data.criticalNote : undefined,
    };
  } catch {
    return null; // offline or unreachable — fail silently
  }
}

/** True when the deployed manifest describes a different build than this bundle. */
export function isUpdateAvailable(manifest: VersionManifest | null): boolean {
  if (!manifest) return false;
  return manifest.version !== APP_VERSION;
}

/** Has the user dismissed the prompt for this specific deployed version? */
export function wasDismissedFor(version: string): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === version;
  } catch {
    return false;
  }
}

export function dismissFor(version: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, version);
  } catch {
    /* ignore */
  }
}

/** Throttle: don't hit version.json more often than this. */
export const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function shouldCheckNow(): boolean {
  try {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || '0');
    return Date.now() - last > CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

export function markChecked(): void {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}
