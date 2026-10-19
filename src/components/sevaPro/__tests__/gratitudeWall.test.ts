/**
 * sevaPro/__tests__/gratitudeWall.test.ts — Kritagyata wall logic.
 */
import { selectGratitudePosts, toWallLang } from '../gratitudeWall';
import type { SangamPost } from '../../../sangam/types';

function post(overrides: Partial<SangamPost> & { id: string }): SangamPost {
  return {
    authorUid: 'u1',
    authorName: 'Devotee',
    authorSanId: 'SAN-AAAAAA',
    authorKind: 'devotee',
    isOfficialPagePost: false,
    kind: 'gratitude',
    text: 'Dhanyavaad',
    createdAt: 1000,
    ashirvadCount: 0,
    commentCount: 0,
    shareCount: 0,
    visibility: 'public',
    status: 'active',
    ...overrides,
  } as SangamPost;
}

describe('toWallLang', () => {
  it('maps bn/hi through, everything else to en', () => {
    expect(toWallLang('bn')).toBe('bn');
    expect(toWallLang('hi')).toBe('hi');
    expect(toWallLang('en')).toBe('en');
    expect(toWallLang('ta')).toBe('en');
    expect(toWallLang(undefined)).toBe('en');
    expect(toWallLang(null)).toBe('en');
    expect(toWallLang('')).toBe('en');
  });
});

describe('selectGratitudePosts', () => {
  it('keeps only kind=gratitude posts', () => {
    const posts = [
      post({ id: 'g1', kind: 'gratitude' }),
      post({ id: 'p1', kind: 'text' }),
      post({ id: 'g2', kind: 'gratitude' }),
    ];
    const out = selectGratitudePosts(posts);
    expect(out.map((p) => p.id)).toEqual(['g1', 'g2']);
  });

  it('drops removed posts', () => {
    const posts = [
      post({ id: 'g1', kind: 'gratitude', status: 'removed' }),
      post({ id: 'g2', kind: 'gratitude', status: 'active' }),
    ];
    expect(selectGratitudePosts(posts).map((p) => p.id)).toEqual(['g2']);
  });

  it('sorts newest first', () => {
    const posts = [
      post({ id: 'old', kind: 'gratitude', createdAt: 100 }),
      post({ id: 'new', kind: 'gratitude', createdAt: 900 }),
      post({ id: 'mid', kind: 'gratitude', createdAt: 500 }),
    ];
    expect(selectGratitudePosts(posts).map((p) => p.id)).toEqual(['new', 'mid', 'old']);
  });

  it('caps at max (default 10)', () => {
    const posts = Array.from({ length: 15 }, (_, i) =>
      post({ id: `g${i}`, kind: 'gratitude', createdAt: i }),
    );
    expect(selectGratitudePosts(posts)).toHaveLength(10);
    expect(selectGratitudePosts(posts, 3)).toHaveLength(3);
  });

  it('handles invalid max gracefully', () => {
    const posts = [post({ id: 'g1', kind: 'gratitude' })];
    expect(selectGratitudePosts(posts, 0)).toHaveLength(1);
    expect(selectGratitudePosts(posts, -5)).toHaveLength(1);
    expect(selectGratitudePosts(posts, NaN)).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(selectGratitudePosts([])).toEqual([]);
  });

  it('treats missing createdAt as oldest', () => {
    const posts = [
      post({ id: 'nocreated', kind: 'gratitude', createdAt: undefined as unknown as number }),
      post({ id: 'hascreated', kind: 'gratitude', createdAt: 500 }),
    ];
    expect(selectGratitudePosts(posts).map((p) => p.id)).toEqual(['hascreated', 'nocreated']);
  });

  it('skips null/undefined entries without throwing', () => {
    const posts = [post({ id: 'g1', kind: 'gratitude' }), null, undefined] as unknown as SangamPost[];
    expect(() => selectGratitudePosts(posts)).not.toThrow();
    expect(selectGratitudePosts(posts)).toHaveLength(1);
  });
});
