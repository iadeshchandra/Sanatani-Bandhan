import type { SangamComment } from './types';

// Re-exported from the canonical serializers module (Audit Fix #1).
// Kept here so existing imports (`../comments`) keep working.
export { toCloudPost, toCloudComment } from './serializers';

/**
 * sangam/comments.ts — pure comment-sync helpers (Step 4: multi-device sync).
 * ============================================================================
 * Kept free of Firebase imports so every function is unit-testable.
 */

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
