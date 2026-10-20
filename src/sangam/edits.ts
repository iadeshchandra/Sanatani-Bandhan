import type { SangamComment, SangamPost } from './types';

/**
 * sangam/edits.ts — pure author edit/delete logic (QUEUED #12).
 * ============================================================================
 * Kept free of Firebase imports so every function is unit-testable.
 *
 * RULES CONTRACT (firestore.rules, verified 2026-10-20):
 * - sangamPosts: the AUTHOR may update only text / imageUrl / updatedAt,
 *   and may DELETE their own posts (owner-approved rules fix, 2026-10-20);
 *   moderators may still delete any post via SuperAdmin.
 * - sangamComments: the AUTHOR may update and delete their own comments.
 *
 * Text limits mirror the composers exactly (post 1000, comment 500) so an
 * edit can never smuggle in content the composer itself would refuse.
 */

export const POST_TEXT_MAX = 1000;
export const COMMENT_TEXT_MAX = 500;

export type EditValidation =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'too_long' };

/** Validate + normalize post text for an edit (same bar as the composer). */
export function validatePostEditText(raw: string): EditValidation {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (text.length > POST_TEXT_MAX) return { ok: false, reason: 'too_long' };
  return { ok: true, text };
}

/** Validate + normalize comment text for an edit (same bar as the drawer input). */
export function validateCommentEditText(raw: string): EditValidation {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (text.length > COMMENT_TEXT_MAX) return { ok: false, reason: 'too_long' };
  return { ok: true, text };
}

/** True when an item carries a real edit stamp (set AND later than creation). */
export function isEdited(item: { createdAt: number; updatedAt?: number }): boolean {
  return typeof item.updatedAt === 'number' && item.updatedAt > item.createdAt;
}

/**
 * Apply an author edit to a post locally. Returns a NEW object; the
 * original is never mutated. Only text / imageUrl / updatedAt change —
 * counts, authorship and kind are structurally untouchable here.
 * `imageUrl: undefined` means "leave the image as-is".
 */
export function applyPostEdit(
  post: SangamPost,
  edits: { text: string; imageUrl?: string },
  at: number,
): SangamPost {
  return {
    ...post,
    text: edits.text,
    ...(edits.imageUrl !== undefined ? { imageUrl: edits.imageUrl } : {}),
    updatedAt: at,
  };
}

/** Apply an author edit to one comment in a thread list (new array). */
export function applyCommentEdit(
  list: SangamComment[],
  commentId: string,
  text: string,
  at: number,
): SangamComment[] {
  return list.map((c) => (c.id === commentId ? { ...c, text, updatedAt: at } : c));
}

/** Remove one comment from a thread list (new array; no-op if absent). */
export function removeComment(list: SangamComment[], commentId: string): SangamComment[] {
  return list.filter((c) => c.id !== commentId);
}

/** Remove one post from a feed list (new array; no-op if absent). */
export function removePost(list: SangamPost[], postId: string): SangamPost[] {
  return list.filter((p) => p.id !== postId);
}
