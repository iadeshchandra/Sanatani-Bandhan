/**
 * margdarshan/whatsNewMarker.ts — the "since you were last here"
 * marker for What's New (J2).
 * =====================================================================
 * A device-local localStorage stamp (house pattern, like
 * `sb-sandhya-mode`): the version of the newest release the reader
 * had already seen when they last visited What's New. It is a
 * courtesy highlight, never a mechanic: no unread counts, no
 * badges, no streaks, nothing that nags (engagement law).
 *
 * THE FIRST-VISIT RULE: a device that has never stored a marker has
 * NO highlights at all — null means "new reader", not "everything
 * is new". The whole archive is history for a first-time reader;
 * only what ships between two visits earns the quiet
 * "New since your last visit" treatment. Visiting What's New (the
 * in-app section or the public page) sets the marker to the latest
 * release, silently — it is an effect of visiting, never a button.
 *
 * Pure logic + tiny guarded storage wrappers (private mode, old
 * browsers: a failed read/write degrades to "no highlights", never
 * an error).
 */

import { RELEASES, releasesSince, type ReleaseEntry } from './releases';

/** localStorage key — `sb-…` device-preference family. */
export const WHATS_NEW_SEEN_KEY = 'sb-margdarshan-whatsnew-seen';

/**
 * The set of release versions that are "new since the last visit":
 * every release newer than the stored stamp. null (never visited)
 * and an unknown stamp both yield an EMPTY set — see the rule above.
 */
export function newSinceVersions(
  seenVersion: string | null | undefined
): Set<string> {
  return new Set(releasesSince(seenVersion).map((r) => r.version));
}

/** Is this release a highlight for a reader whose marker is stored? */
export function isNewSince(
  release: ReleaseEntry,
  seenVersion: string | null | undefined
): boolean {
  return newSinceVersions(seenVersion).has(release.version);
}

/** The stamp a visit leaves behind: the newest release's version. */
export function latestSeenStamp(): string {
  return RELEASES[0].version;
}

/* ------------------------------------------------------------------ */
/* Storage wrappers (guarded — storage can throw)                      */
/* ------------------------------------------------------------------ */

export function readWhatsNewSeen(): string | null {
  try {
    return window.localStorage.getItem(WHATS_NEW_SEEN_KEY);
  } catch {
    return null;
  }
}

export function markWhatsNewSeen(): void {
  try {
    window.localStorage.setItem(WHATS_NEW_SEEN_KEY, latestSeenStamp());
  } catch {
    /* private mode / blocked storage — highlights simply stay off */
  }
}
