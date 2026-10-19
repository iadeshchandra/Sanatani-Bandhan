import { toCloudComment, mergeComments, nextCommentCount } from '../comments';
import type { SangamComment } from '../types';

const base: SangamComment = {
  id: 'cmt_abc123',
  postId: 'post_1',
  authorUid: 'uid_1',
  authorName: 'Meera Devi',
  authorSanId: 'SAN-ABC123',
  authorKind: 'devotee',
  authorTier: 'VERIFIED',
  text: 'Beautiful darshan 🙏',
  createdAt: 1729000000000,
  localOnly: true,
};

describe('toCloudComment', () => {
  it('strips id and localOnly (rules-whitelist violation fix)', () => {
    const cloud = toCloudComment(base);
    expect(cloud).not.toHaveProperty('id');
    expect(cloud).not.toHaveProperty('localOnly');
    expect(cloud).not.toHaveProperty('updatedAt');
  });

  it('keeps exactly the 8 whitelisted fields', () => {
    const cloud = toCloudComment(base);
    expect(Object.keys(cloud).sort()).toEqual(
      ['authorKind', 'authorName', 'authorSanId', 'authorTier', 'authorUid', 'createdAt', 'postId', 'text'].sort(),
    );
  });

  it('preserves all values', () => {
    const cloud = toCloudComment(base);
    expect(cloud.postId).toBe('post_1');
    expect(cloud.authorUid).toBe('uid_1');
    expect(cloud.text).toBe('Beautiful darshan 🙏');
    expect(cloud.createdAt).toBe(1729000000000);
  });

  it('omits authorTier when undefined (Firestore rejects undefined)', () => {
    const { authorTier: _dropped, ...rest } = base;
    const cloud = toCloudComment(rest as SangamComment);
    expect(cloud).not.toHaveProperty('authorTier');
    expect(Object.keys(cloud)).toHaveLength(7);
  });
});

describe('mergeComments', () => {
  const cloudOne: SangamComment = { ...base, id: 'cmt_1', localOnly: false, createdAt: 100 };
  const cloudTwo: SangamComment = { ...base, id: 'cmt_2', localOnly: false, createdAt: 300 };

  it('cloud wins on id conflict (optimistic local replaced by synced)', () => {
    const local: SangamComment = { ...base, id: 'cmt_1', localOnly: true, createdAt: 100 };
    const merged = mergeComments([local], [cloudOne]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('cmt_1');
    expect(merged[0].localOnly).toBe(false);
  });

  it('keeps unsynced local comments alongside cloud ones', () => {
    const unsynced: SangamComment = { ...base, id: 'cmt_local', localOnly: true, createdAt: 200 };
    const merged = mergeComments([unsynced], [cloudOne, cloudTwo]);
    expect(merged.map((c) => c.id)).toEqual(['cmt_1', 'cmt_local', 'cmt_2']);
  });

  it('sorts by createdAt ascending (thread order)', () => {
    const merged = mergeComments([], [cloudTwo, cloudOne]);
    expect(merged[0].id).toBe('cmt_1');
    expect(merged[1].id).toBe('cmt_2');
  });

  it('empty cloud keeps local comments (offline drawer)', () => {
    const local: SangamComment = { ...base, id: 'cmt_x', localOnly: true };
    expect(mergeComments([local], [])).toEqual([local]);
  });

  it('empty local returns cloud as-is', () => {
    const merged = mergeComments([], [cloudOne]);
    expect(merged).toHaveLength(1);
    expect(merged[0].localOnly).toBe(false);
  });

  it('drops stale local copy when cloud version arrives (no duplicates)', () => {
    const staleLocal: SangamComment = { ...base, id: 'cmt_1', localOnly: true, text: 'old text', createdAt: 100 };
    const freshCloud: SangamComment = { ...base, id: 'cmt_1', localOnly: false, text: 'new text', createdAt: 100 };
    const merged = mergeComments([staleLocal], [freshCloud]);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('new text');
  });
});

describe('nextCommentCount', () => {
  it('increments by 1', () => {
    expect(nextCommentCount(3, 1)).toBe(4);
  });

  it('decrements by 1', () => {
    expect(nextCommentCount(3, -1)).toBe(2);
  });

  it('never goes below zero', () => {
    expect(nextCommentCount(0, -1)).toBe(0);
  });
});
