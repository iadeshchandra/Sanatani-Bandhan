/**
 * follows.test.ts — NEXT-LEVEL WAVE A1: the pure follow-state
 * helpers behind the subscribable temple calendar. The Firestore
 * wrappers are thin (read = getDoc + mergeFollowState; toggle =
 * full-shape create / array union-remove) — what can go wrong lives
 * here: dirty stored data, duplicates, caps, identity of no-ops.
 */
import {
  EMPTY_FOLLOWS,
  FOLLOWS_LIST_CAP,
  cleanIdList,
  isFollowingFestival,
  isFollowingOrg,
  mergeFollowState,
  withFollow,
  withoutFollow,
  type FollowState,
} from '../follows';

// The pure helpers never touch Firestore, but the module imports
// the app's firebase handle — stub it (the house pattern for
// firebase-touching libs under ts-jest).
jest.mock('../firebase', () => ({ db: {} }));

describe('cleanIdList', () => {
  it('keeps strings, trims, de-duplicates, preserves order', () => {
    expect(cleanIdList([' ws-1 ', 'ws-2', 'ws-1', '', 'ws-3'])).toEqual(['ws-1', 'ws-2', 'ws-3']);
  });

  it('drops non-strings and non-arrays', () => {
    expect(cleanIdList([1, null, undefined, {}, 'ok'])).toEqual(['ok']);
    expect(cleanIdList('ws-1')).toEqual([]);
    expect(cleanIdList(undefined)).toEqual([]);
    expect(cleanIdList(null)).toEqual([]);
  });

  it('caps at the rules-pinned list cap', () => {
    const many = Array.from({ length: FOLLOWS_LIST_CAP + 25 }, (_, i) => `id-${i}`);
    expect(cleanIdList(many)).toHaveLength(FOLLOWS_LIST_CAP);
  });
});

describe('mergeFollowState', () => {
  it('empty / garbage in → the empty state', () => {
    expect(mergeFollowState(null)).toEqual(EMPTY_FOLLOWS);
    expect(mergeFollowState(undefined)).toEqual(EMPTY_FOLLOWS);
    expect(mergeFollowState('x')).toEqual(EMPTY_FOLLOWS);
    expect(mergeFollowState({})).toEqual(EMPTY_FOLLOWS);
  });

  it('cleans both lists independently', () => {
    expect(
      mergeFollowState({ orgIds: ['a', 'a', 7], festivalIds: ['f1'], updatedAt: 5 })
    ).toEqual({ orgIds: ['a'], festivalIds: ['f1'] });
  });

  it('never carries unknown keys into the state', () => {
    const s = mergeFollowState({ orgIds: [], festivalIds: [], admin: true });
    expect(Object.keys(s).sort()).toEqual(['festivalIds', 'orgIds']);
  });
});

describe('isFollowing*', () => {
  const state: FollowState = { orgIds: ['ws-1'], festivalIds: ['ws-1__puja'] };

  it('matches by exact id, per list', () => {
    expect(isFollowingOrg(state, 'ws-1')).toBe(true);
    expect(isFollowingOrg(state, 'ws-2')).toBe(false);
    expect(isFollowingFestival(state, 'ws-1__puja')).toBe(true);
    expect(isFollowingFestival(state, 'ws-1')).toBe(false);
  });

  it('an empty id never matches', () => {
    expect(isFollowingOrg(state, '')).toBe(false);
    expect(isFollowingFestival(state, '')).toBe(false);
  });
});

describe('withFollow / withoutFollow', () => {
  it('adds once — a repeat add is the SAME state object (no-op)', () => {
    const s1 = withFollow(EMPTY_FOLLOWS, 'orgIds', 'ws-1');
    expect(s1.orgIds).toEqual(['ws-1']);
    expect(withFollow(s1, 'orgIds', 'ws-1')).toBe(s1);
  });

  it('removes only the named id, only from the named list', () => {
    const s: FollowState = { orgIds: ['a', 'b'], festivalIds: ['a'] };
    expect(withoutFollow(s, 'orgIds', 'a')).toEqual({ orgIds: ['b'], festivalIds: ['a'] });
    expect(withoutFollow(s, 'orgIds', 'zzz')).toBe(s);
  });

  it('an add past the cap keeps the cap (the rules refuse more)', () => {
    let s: FollowState = { orgIds: cleanIdList(Array.from({ length: 300 }, (_, i) => `x${i}`)), festivalIds: [] };
    s = withFollow(s, 'orgIds', 'one-more');
    expect(s.orgIds).toHaveLength(FOLLOWS_LIST_CAP);
  });
});
