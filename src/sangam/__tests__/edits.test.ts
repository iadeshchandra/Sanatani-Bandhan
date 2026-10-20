import { toCloudPostEdit, toCloudCommentEdit } from '../serializers';
import {
  validatePostEditText,
  validateCommentEditText,
  isEdited,
  applyPostEdit,
  applyCommentEdit,
  removeComment,
  POST_TEXT_MAX,
  COMMENT_TEXT_MAX,
} from '../edits';
import type { SangamComment, SangamPost } from '../types';

/**
 * edits.test.ts — QUEUED #12 (author post edit/delete UI).
 * Pins the rules contract (firestore.rules):
 * - post author-edit diff may touch ONLY text / imageUrl / updatedAt;
 * - post DELETE is SuperAdmin-only (no serializer/function for it here —
 *   the absence is deliberate; removal goes through report → moderation);
 * - comment author may update/delete own comments; count steps stay bounded.
 */

const post = (over: Partial<SangamPost> = {}): SangamPost => ({
  id: 'post_1',
  authorUid: 'uid_me',
  authorName: 'Meera',
  authorSanId: 'SAN-001',
  authorKind: 'devotee',
  isOfficialPagePost: false,
  kind: 'text',
  text: 'Jai Shri Ram 🙏',
  createdAt: 1000,
  ashirvadCount: 5,
  commentCount: 2,
  shareCount: 1,
  visibility: 'public',
  status: 'active',
  ...over,
});

const comment = (over: Partial<SangamComment> = {}): SangamComment => ({
  id: 'cmt_1',
  postId: 'post_1',
  authorUid: 'uid_me',
  authorName: 'Meera',
  authorSanId: 'SAN-001',
  authorKind: 'devotee',
  text: 'Beautiful 🙏',
  createdAt: 2000,
  ...over,
});

// --- toCloudPostEdit: exactly the rules-approved edit keys ---

describe('toCloudPostEdit', () => {
  it('emits text + updatedAt for a text-only edit', () => {
    const out = toCloudPostEdit({ text: 'Edited words', updatedAt: 5000 });
    expect(Object.keys(out).sort()).toEqual(['text', 'updatedAt']);
    expect(out.text).toBe('Edited words');
    expect(out.updatedAt).toBe(5000);
  });

  it('includes imageUrl only when provided', () => {
    const withImg = toCloudPostEdit({ text: 'x', imageUrl: 'https://a/b.jpg', updatedAt: 5 });
    expect(withImg.imageUrl).toBe('https://a/b.jpg');
    const without = toCloudPostEdit({ text: 'x', imageUrl: undefined, updatedAt: 5 });
    expect('imageUrl' in without).toBe(false);
  });

  it('never leaks identity/count/id fields into the edit payload', () => {
    const dirty = { text: 'x', updatedAt: 5, authorUid: 'uid_other', ashirvadCount: 99, id: 'post_9', localOnly: false } as unknown as Parameters<typeof toCloudPostEdit>[0];
    const out = toCloudPostEdit(dirty);
    expect(Object.keys(out).sort()).toEqual(['text', 'updatedAt']);
  });
});

// --- toCloudCommentEdit ---

describe('toCloudCommentEdit', () => {
  it('emits exactly text + updatedAt', () => {
    const out = toCloudCommentEdit({ text: 'Revised', updatedAt: 7000 });
    expect(Object.keys(out).sort()).toEqual(['text', 'updatedAt']);
    expect(out.text).toBe('Revised');
  });
});

// --- validation (mirrors composer bars) ---

describe('edit text validation', () => {
  it('rejects empty and whitespace-only post text', () => {
    expect(validatePostEditText('')).toEqual({ ok: false, reason: 'empty' });
    expect(validatePostEditText('   \n ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('trims and accepts normal post text', () => {
    expect(validatePostEditText('  Om Namah Shivaya  ')).toEqual({ ok: true, text: 'Om Namah Shivaya' });
  });

  it('rejects post text beyond the composer limit', () => {
    expect(validatePostEditText('a'.repeat(POST_TEXT_MAX + 1))).toEqual({ ok: false, reason: 'too_long' });
    expect(validatePostEditText('a'.repeat(POST_TEXT_MAX)).ok).toBe(true);
  });

  it('applies the comment limit (500), not the post limit', () => {
    expect(validateCommentEditText('a'.repeat(COMMENT_TEXT_MAX + 1))).toEqual({ ok: false, reason: 'too_long' });
    expect(validateCommentEditText('a'.repeat(COMMENT_TEXT_MAX)).ok).toBe(true);
    expect(validateCommentEditText('')).toEqual({ ok: false, reason: 'empty' });
  });
});

// --- isEdited marker ---

describe('isEdited', () => {
  it('is false without an updatedAt stamp', () => {
    expect(isEdited({ createdAt: 1000 })).toBe(false);
  });

  it('is false when updatedAt is not after creation', () => {
    expect(isEdited({ createdAt: 1000, updatedAt: 1000 })).toBe(false);
    expect(isEdited({ createdAt: 1000, updatedAt: 999 })).toBe(false);
  });

  it('is true when updatedAt is after creation', () => {
    expect(isEdited({ createdAt: 1000, updatedAt: 1001 })).toBe(true);
  });
});

// --- applyPostEdit ---

describe('applyPostEdit', () => {
  it('changes text + updatedAt and preserves authorship and counts', () => {
    const orig = post();
    const next = applyPostEdit(orig, { text: 'New words' }, 9000);
    expect(next.text).toBe('New words');
    expect(next.updatedAt).toBe(9000);
    expect(next.authorUid).toBe('uid_me');
    expect(next.ashirvadCount).toBe(5);
    expect(next.commentCount).toBe(2);
    expect(next.kind).toBe('text');
  });

  it('does not mutate the original post', () => {
    const orig = post();
    applyPostEdit(orig, { text: 'Changed' }, 9000);
    expect(orig.text).toBe('Jai Shri Ram 🙏');
    expect(orig.updatedAt).toBeUndefined();
  });

  it('leaves imageUrl untouched when edits.imageUrl is undefined', () => {
    const orig = post({ kind: 'photo', imageUrl: 'https://a/old.jpg' });
    const next = applyPostEdit(orig, { text: 'Caption' }, 9000);
    expect(next.imageUrl).toBe('https://a/old.jpg');
  });

  it('replaces imageUrl when a new one is provided', () => {
    const orig = post({ kind: 'photo', imageUrl: 'https://a/old.jpg' });
    const next = applyPostEdit(orig, { text: 'Caption', imageUrl: 'https://a/new.jpg' }, 9000);
    expect(next.imageUrl).toBe('https://a/new.jpg');
  });
});

// --- comment list helpers ---

describe('comment edit/delete helpers', () => {
  const thread = [comment(), comment({ id: 'cmt_2', authorUid: 'uid_other', text: 'Hari Om' })];

  it('applyCommentEdit edits only the target comment and stamps updatedAt', () => {
    const next = applyCommentEdit(thread, 'cmt_1', 'Revised text', 8000);
    expect(next[0].text).toBe('Revised text');
    expect(next[0].updatedAt).toBe(8000);
    expect(next[1]).toBe(thread[1]); // untouched reference
  });

  it('applyCommentEdit is a no-op for an unknown id', () => {
    const next = applyCommentEdit(thread, 'cmt_missing', 'x', 8000);
    expect(next.map((c) => c.text)).toEqual(thread.map((c) => c.text));
    expect(next.every((c) => c.updatedAt === undefined)).toBe(true);
  });

  it('removeComment removes exactly the target comment', () => {
    const next = removeComment(thread, 'cmt_1');
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('cmt_2');
  });

  it('removeComment is a no-op for an unknown id', () => {
    expect(removeComment(thread, 'cmt_missing')).toHaveLength(2);
  });
});
