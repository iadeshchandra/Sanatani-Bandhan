import {
  computeSevaKarmaHours,
  applyMyVolunteerships,
  extractVolunteerPostIds,
  volunteerPostIdFromRef,
} from '../sevaKarma';
import type { SangamPost } from '../types';

/**
 * sevaKarma.test.ts — QUEUED #13 (seva-karma hours persistence).
 * Pins the honesty contract for the Seva Board copy "Your seva karma ·
 * recorded to your Sanatani ID":
 *  - the displayed total comes ONLY from posts where I volunteered;
 *  - my volunteer memberships are re-unioned from the persisted
 *    sangamPosts/{postId}/volunteers/{uid} docs during refresh(), so the
 *    record survives restarts and follows me across devices;
 *  - nobody else's hours/memberships are ever fabricated locally.
 */

const sevaPost = (over: Partial<SangamPost> = {}): SangamPost => ({
  id: 'post_1',
  authorUid: 'uid_org',
  authorName: 'Riverside Mandir',
  authorSanId: 'SAN-ORG',
  authorKind: 'org',
  isOfficialPagePost: true,
  kind: 'seva',
  text: 'Sunday annadanam — hands needed.',
  createdAt: 1000,
  ashirvadCount: 0,
  commentCount: 0,
  shareCount: 0,
  ashirvadBy: [],
  volunteers: [],
  visibility: 'public',
  status: 'active',
  seva: { venue: 'Riverside ghat', date: 'Sunday', hoursEach: 3, slots: 6, slotsTaken: 0 },
  ...over,
});

describe('computeSevaKarmaHours', () => {
  it('sums hoursEach across seva posts I volunteered on', () => {
    const posts = [
      sevaPost({ id: 'a', volunteers: ['me'], seva: { venue: 'v', date: 'd', hoursEach: 3, slots: 5, slotsTaken: 1 } }),
      sevaPost({ id: 'b', volunteers: ['me', 'other'], seva: { venue: 'v', date: 'd', hoursEach: 4, slots: 5, slotsTaken: 2 } }),
    ];
    expect(computeSevaKarmaHours(posts, 'me')).toBe(7);
  });

  it("does NOT count other people's volunteering", () => {
    const posts = [sevaPost({ volunteers: ['someoneElse'] })];
    expect(computeSevaKarmaHours(posts, 'me')).toBe(0);
  });

  it('ignores non-seva posts even if I am in volunteers', () => {
    const posts = [sevaPost({ kind: 'text', volunteers: ['me'] })];
    expect(computeSevaKarmaHours(posts, 'me')).toBe(0);
  });

  it('ignores removed posts', () => {
    const posts = [sevaPost({ status: 'removed', volunteers: ['me'] })];
    expect(computeSevaKarmaHours(posts, 'me')).toBe(0);
  });

  it('treats a missing seva block as 0 hours', () => {
    const posts = [sevaPost({ volunteers: ['me'], seva: undefined })];
    expect(computeSevaKarmaHours(posts, 'me')).toBe(0);
  });

  it('returns 0 for empty posts and empty uid', () => {
    expect(computeSevaKarmaHours([], 'me')).toBe(0);
    expect(computeSevaKarmaHours([sevaPost({ volunteers: ['me'] })], '')).toBe(0);
  });
});

describe('applyMyVolunteerships', () => {
  it('unions my uid into matching seva posts (the restart-hydration path)', () => {
    const posts = [sevaPost({ id: 'a', volunteers: [] }), sevaPost({ id: 'b', volunteers: [] })];
    const out = applyMyVolunteerships(posts, ['a'], 'me');
    expect(out[0].volunteers).toEqual(['me']);
    expect(out[1].volunteers).toEqual([]);
  });

  it('never duplicates a uid already present', () => {
    const posts = [sevaPost({ id: 'a', volunteers: ['me'] })];
    const out = applyMyVolunteerships(posts, new Set(['a']), 'me');
    expect(out[0].volunteers).toEqual(['me']);
  });

  it('keeps existing other volunteers and appends mine', () => {
    const posts = [sevaPost({ id: 'a', volunteers: ['other'] })];
    const out = applyMyVolunteerships(posts, ['a'], 'me');
    expect(out[0].volunteers).toEqual(['other', 'me']);
  });

  it('does not touch non-seva posts even when the postId matches', () => {
    const posts = [sevaPost({ id: 'a', kind: 'text', volunteers: [] })];
    const out = applyMyVolunteerships(posts, ['a'], 'me');
    expect(out[0].volunteers).toEqual([]);
    expect(out[0]).toBe(posts[0]);
  });

  it('is immutable — the original array and posts are untouched', () => {
    const posts = [sevaPost({ id: 'a', volunteers: [] })];
    const before = posts[0].volunteers;
    const out = applyMyVolunteerships(posts, ['a'], 'me');
    expect(posts[0].volunteers).toBe(before);
    expect(posts[0].volunteers).toEqual([]);
    expect(out[0]).not.toBe(posts[0]);
  });

  it('returns an unchanged copy for empty postIds or empty uid', () => {
    const posts = [sevaPost({ id: 'a', volunteers: [] })];
    expect(applyMyVolunteerships(posts, [], 'me')[0].volunteers).toEqual([]);
    expect(applyMyVolunteerships(posts, ['a'], '')[0].volunteers).toEqual([]);
  });
});

describe('volunteerPostIdFromRef', () => {
  it('extracts the postId from the volunteers/{uid} ref chain', () => {
    const ref = { parent: { parent: { id: 'post_42' } } };
    expect(volunteerPostIdFromRef(ref)).toBe('post_42');
  });

  it('returns null for missing chains', () => {
    expect(volunteerPostIdFromRef(null)).toBeNull();
    expect(volunteerPostIdFromRef(undefined)).toBeNull();
    expect(volunteerPostIdFromRef({})).toBeNull();
    expect(volunteerPostIdFromRef({ parent: null })).toBeNull();
    expect(volunteerPostIdFromRef({ parent: { parent: { id: '' } } })).toBeNull();
  });
});

describe('extractVolunteerPostIds', () => {
  it('dedupes and drops empty postIds', () => {
    expect(
      extractVolunteerPostIds([{ postId: 'a' }, { postId: 'b' }, { postId: 'a' }, { postId: '' }])
    ).toEqual(['a', 'b']);
  });
});

describe('end-to-end: restart hydration restores the recorded hours', () => {
  it('cloud post (no volunteers) + persisted membership doc → hours return', () => {
    // What refresh() pulls from Firestore — no volunteers field at all.
    const cloudPosts = [
      sevaPost({ id: 'a', volunteers: undefined, seva: { venue: 'v', date: 'd', hoursEach: 3, slots: 5, slotsTaken: 0 } }),
      sevaPost({ id: 'b', volunteers: undefined, seva: { venue: 'v', date: 'd', hoursEach: 2, slots: 5, slotsTaken: 0 } }),
    ];
    expect(computeSevaKarmaHours(cloudPosts, 'me')).toBe(0); // before hydration: the old bug
    const hydrated = applyMyVolunteerships(cloudPosts, extractVolunteerPostIds([{ postId: 'a' }]), 'me');
    expect(computeSevaKarmaHours(hydrated, 'me')).toBe(3); // after hydration: record honored
  });
});
