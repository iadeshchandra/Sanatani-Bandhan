/**
 * social/__tests__/safety.test.ts — Step 5: block/mute pure logic.
 */
import {
  filterHiddenAuthors, isMessagingBlocked, canTargetSafetyAction, muteAfterBlock,
} from '../safety';

const posts = [
  { authorUid: 'u1', text: 'a' },
  { authorUid: 'u2', text: 'b' },
  { authorUid: 'u3', text: 'c' },
];

describe('filterHiddenAuthors', () => {
  it('returns all items when lists are empty', () => {
    expect(filterHiddenAuthors(posts, new Set(), new Set())).toHaveLength(3);
  });
  it('hides blocked authors', () => {
    const out = filterHiddenAuthors(posts, new Set(['u2']), new Set());
    expect(out.map((p) => p.authorUid)).toEqual(['u1', 'u3']);
  });
  it('hides muted authors', () => {
    const out = filterHiddenAuthors(posts, new Set(), new Set(['u1', 'u3']));
    expect(out.map((p) => p.authorUid)).toEqual(['u2']);
  });
  it('hides both blocked and muted', () => {
    const out = filterHiddenAuthors(posts, new Set(['u1']), new Set(['u2']));
    expect(out.map((p) => p.authorUid)).toEqual(['u3']);
  });
  it('hides everything when all authors hidden', () => {
    const out = filterHiddenAuthors(posts, new Set(['u1', 'u2', 'u3']), new Set());
    expect(out).toHaveLength(0);
  });
});

describe('isMessagingBlocked', () => {
  it('false when nobody blocked', () => {
    expect(isMessagingBlocked(new Set(), new Set(), 'a', 'b')).toBe(false);
  });
  it('true when viewer blocked the target', () => {
    expect(isMessagingBlocked(new Set(['b']), new Set(), 'a', 'b')).toBe(true);
  });
  it('true when target blocked the viewer (either direction blocks)', () => {
    expect(isMessagingBlocked(new Set(), new Set(['a']), 'a', 'b')).toBe(true);
  });
  it('false for unrelated users', () => {
    expect(isMessagingBlocked(new Set(['x']), new Set(['y']), 'a', 'b')).toBe(false);
  });
});

describe('canTargetSafetyAction', () => {
  it('allows valid distinct uids', () => {
    expect(canTargetSafetyAction('a', 'b')).toBe(true);
  });
  it('rejects self-target', () => {
    expect(canTargetSafetyAction('a', 'a')).toBe(false);
  });
  it('rejects empty uids', () => {
    expect(canTargetSafetyAction('', 'b')).toBe(false);
    expect(canTargetSafetyAction('a', '')).toBe(false);
  });
});

describe('muteAfterBlock', () => {
  it('removes the blocked user from the mute set', () => {
    const out = muteAfterBlock(new Set(['u1', 'u2']), 'u1');
    expect([...out]).toEqual(['u2']);
  });
  it('leaves the set unchanged when target was not muted', () => {
    const out = muteAfterBlock(new Set(['u2']), 'u9');
    expect([...out]).toEqual(['u2']);
  });
  it('does not mutate the input set', () => {
    const input = new Set(['u1']);
    muteAfterBlock(input, 'u1');
    expect([...input]).toEqual(['u1']);
  });
});
