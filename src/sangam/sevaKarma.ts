import type { SangamPost } from './types';

/**
 * sangam/sevaKarma.ts — seva-karma hours: honest, persistent, per-user.
 * =====================================================================
 * QUEUED #13 — the Seva Board promises "Your seva karma: Nh · recorded
 * to your Sanatani ID". The hours ARE written to Firestore
 * (`sangamPosts/{postId}/volunteers/{uid}` by volunteerSeva()), but cloud
 * post docs carry no `volunteers` field (it's not in the create
 * whitelist), and nothing ever read the subcollection back — so the
 * hours silently reset to 0 on every app restart and never crossed
 * devices. The copy promised what the code couldn't deliver.
 *
 * This module makes the promise true with ZERO new collections and
 * ZERO rules changes:
 *  - `computeSevaKarmaHours` is the single source of the displayed
 *    total (moved out of SevaBoardTab so it can be tested).
 *  - `applyMyVolunteerships` re-unions MY volunteer memberships into
 *    pulled cloud posts during refresh() (one collectionGroup query,
 *    rules `allow read: if true`). Local cache stays authoritative on
 *    any error — fail-open, as everywhere in this store.
 *
 * NOTE: only the VIEWER's own memberships are hydrated. Other users'
 * volunteers arrays are never downloaded here (privacy-by-design,
 * mirrors the subcollection's own-uid write rule).
 */

/** Total seva hours volunteered by `uid` across loaded posts. */
export function computeSevaKarmaHours(posts: readonly SangamPost[], uid: string): number {
  if (!uid) return 0;
  let hours = 0;
  for (const p of posts) {
    if (p.kind !== 'seva' || p.status === 'removed') continue;
    if (!(p.volunteers || []).includes(uid)) continue;
    hours += p.seva?.hoursEach ?? 0;
  }
  return hours;
}

/**
 * Pull the postId out of a volunteers-subcollection doc ref shape.
 * The ref chain is volunteers/{uid} → parent (collection) → parent
 * (the sangamPosts/{postId} doc). Returns null when the chain is
 * missing or empty — never throws.
 */
export function volunteerPostIdFromRef(
  ref: { parent?: { parent?: { id?: string } | null } | null } | null | undefined
): string | null {
  const postId = ref?.parent?.parent?.id;
  return typeof postId === 'string' && postId.length > 0 ? postId : null;
}

/** Dedupe a list of `{ postId }` membership rows into postIds. */
export function extractVolunteerPostIds(items: Array<{ postId: string }>): string[] {
  const seen = new Set<string>();
  for (const it of items) {
    const pid = it?.postId;
    if (typeof pid === 'string' && pid.length > 0) seen.add(pid);
  }
  return [...seen];
}

/**
 * Union my uid into the `volunteers` arrays of the given seva posts.
 * Immutable: returns the same array (copied) when nothing changes.
 * Non-seva posts and posts I haven't volunteered on are untouched.
 */
export function applyMyVolunteerships<T extends SangamPost>(
  posts: readonly T[],
  postIds: Set<string> | readonly string[],
  uid: string
): T[] {
  if (!uid) return [...posts];
  const ids = postIds instanceof Set ? postIds : new Set(postIds);
  if (ids.size === 0) return [...posts];
  return posts.map((p) => {
    if (p.kind !== 'seva' || !ids.has(p.id)) return p;
    const v = p.volunteers || [];
    if (v.includes(uid)) return p;
    return { ...p, volunteers: [...v, uid] };
  });
}
