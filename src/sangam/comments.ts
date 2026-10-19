import type { SangamComment } from './types';

/**
 * sangam/comments.ts — pure comment-sync helpers (Step 4: multi-device sync).
 * ============================================================================
 * Kept free of Firebase imports so every function is unit-testable.
 */

/**
 * Builds the exact document the `sangamComments` Firestore rules whitelist
 * allows on create: postId, authorUid, authorName, authorSanId, authorKind,
 * authorTier, text, createdAt. Strips local-only fields (id, localOnly) and
 * omits undefined optionals (Firestore rejects undefined values).
 *
 * Previously `addComment` pushed the raw object (id + localOnly + pushDoc's
 * updatedAt), which the rules rejected — so comments never reached the cloud.
 */
export function toCloudComment(c: SangamComment): Record<string, string | number> {
  const out: Record<string, string | number> = {
    postId: c.postId,
    authorUid: c.authorUid,
    authorName: c.authorName,
    authorSanId: c.authorSanId,
    authorKind: c.authorKind,
    text: c.text,
    createdAt: c.createdAt,
  };
  if (c.authorTier !== undefined) out.authorTier = c.authorTier;
  return out;
}

/**
 * Merges a live cloud snapshot with local optimistic comments.
 * - Cloud wins on id conflict (the same comment, now synced).
 * - Still-unsynced local comments (localOnly, id not in cloud) are kept.
 * - Result is sorted by createdAt ascending (oldest first, thread order).
 */
export function mergeComments(
  local: SangamComment[],
  cloud: SangamComment[],
): SangamComment[] {
  const cloudIds = new Set(cloud.map((c) => c.id));
  const unsynced = local.filter((c) => c.localOnly === true && !cloudIds.has(c.id));
  const normalizedCloud = cloud.map((c) => ({ ...c, localOnly: false as const }));
  return [...normalizedCloud, ...unsynced].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Bounded commentCount step. Never below zero; only ±1 steps are meaningful
 * (matches the Firestore rules branch that permits exactly ±1).
 */
export function nextCommentCount(current: number, delta: 1 | -1): number {
  return Math.max(0, current + delta);
}

/**
 * Builds the exact document the `sangamPosts` Firestore rules whitelist
 * allows on create. Strips local-only fields (id, localOnly, ashirvadBy,
 * volunteers) and omits undefined optionals (Firestore rejects undefined).
 *
 * Previously `createPost` pushed the raw object, which the rules rejected —
 * so posts never reached the cloud (same bug as comments, Step 4).
 */
export function toCloudPost(p: Record<string, unknown>): Record<string, unknown> {
  const allowed = [
    'authorUid', 'authorName', 'authorSanId', 'authorKind', 'authorRoleId', 'authorTier',
    'orgId', 'orgName', 'isOfficialPagePost', 'kind', 'text', 'imageUrl', 'shlokaRef',
    'seva', 'serviceCard', 'eventRef', 'sharedFrom', 'createdAt', 'ashirvadCount',
    'commentCount', 'shareCount', 'visibility', 'status',
    'providerUid', 'providerName', 'festival', 'anonymized',
  ];
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (p[k] !== undefined) out[k] = p[k];
  }
  return out;
}
