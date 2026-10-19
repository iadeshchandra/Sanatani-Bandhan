/**
 * social/safety.ts — pure block/mute helpers (Step 5: user safety tools).
 * ============================================================================
 * Kept free of Firebase imports so every function is unit-testable.
 *
 * Design laws:
 * - Blocked users are NEVER notified — block/mute lists live in the
 *   blocker's/muter's own user-scoped collections, readable only by them.
 * - Warm, non-punitive language everywhere.
 */

/** Minimal shape for feed filtering — any post/comment-like with an authorUid. */
export interface AuthoredItem {
  authorUid: string;
}

/**
 * Removes items authored by blocked or muted users.
 * - Block hides posts AND comments from that user.
 * - Mute hides posts but is softer (DMs still allowed) — for the feed,
 *   both hide posts; the difference is enforced in chat.
 */
export function filterHiddenAuthors<T extends AuthoredItem>(
  items: T[],
  blocked: Set<string>,
  muted: Set<string>,
): T[] {
  if (blocked.size === 0 && muted.size === 0) return items;
  return items.filter((it) => !blocked.has(it.authorUid) && !muted.has(it.authorUid));
}

/** True when `viewerUid` has blocked `targetUid` (or vice versa — either direction blocks messaging). */
export function isMessagingBlocked(
  viewerBlocked: Set<string>,
  targetBlocked: Set<string>,
  viewerUid: string,
  targetUid: string,
): boolean {
  return viewerBlocked.has(targetUid) || targetBlocked.has(viewerUid);
}

/** Guard for creating a block/mute: can't target yourself or empty uids. */
export function canTargetSafetyAction(actorUid: string, targetUid: string): boolean {
  return !!actorUid && !!targetUid && actorUid !== targetUid;
}

/** Block subsumes mute: blocking someone also removes them from your mute list. */
export function muteAfterBlock(muted: Set<string>, targetUid: string): Set<string> {
  const next = new Set(muted);
  next.delete(targetUid);
  return next;
}
