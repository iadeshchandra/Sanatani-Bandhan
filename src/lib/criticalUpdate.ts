/**
 * criticalUpdate.ts — the critical-update honesty law (UI/UX audit D-09).
 *
 * The "Important update required" hard-block used to fire with no
 * reason: version.json carried `critical: true` and the dialog showed
 * only a generic sentence, so users were stopped mid-sign-in for an
 * unexplained "important issue".
 *
 * The law, enforced at BOTH ends:
 *  - Build end (vite.config.ts): version.json may only be flagged
 *    critical when the build env also supplies CRITICAL_UPDATE_NOTE;
 *    a note-less critical flag is downgraded to a normal update with a
 *    loud build-log warning.
 *  - Client end (here): a manifest counts as critical ONLY when it
 *    carries a non-empty criticalNote. A note-less critical flag (an
 *    older deploy, a hand-edited manifest) degrades to the calm,
 *    dismissible update banner — users are never hard-blocked without
 *    being told why.
 *
 * Pure and dependency-free on purpose: UpdatePrompt and the tests both
 * consume it without dragging the version-handshake module in.
 */

export interface CriticalManifestShape {
  critical?: boolean;
  criticalNote?: string;
}

/** The trimmed reason for a critical update, or null if there is none. */
export function criticalNoteOf(manifest: CriticalManifestShape | null | undefined): string | null {
  if (!manifest || manifest.critical !== true) return null;
  const note = typeof manifest.criticalNote === 'string' ? manifest.criticalNote.trim() : '';
  return note !== '' ? note : null;
}

/**
 * True only when the update may hard-block: flagged critical AND a
 * human-readable reason exists to show in the dialog.
 */
export function isEffectivelyCritical(manifest: CriticalManifestShape | null | undefined): boolean {
  return criticalNoteOf(manifest) !== null;
}

/**
 * The body text for the critical dialog: the update's own reason when
 * one exists, otherwise the caller's generic fallback copy.
 */
export function criticalBodyText(
  manifest: CriticalManifestShape | null | undefined,
  fallback: string,
): string {
  return criticalNoteOf(manifest) ?? fallback;
}
