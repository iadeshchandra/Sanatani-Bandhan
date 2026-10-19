/**
 * search/__tests__/search.test.ts — Universal Search unit tests.
 * ============================================================================
 * Matching ladder, multi-text scoring, ranking, grouping. All pure,
 * deterministic. Service layer (Firestore) is intentionally untested here —
 * it degrades to empty groups on failure by contract.
 */
import {
  matchScore,
  bestMatchScore,
  rankResults,
  topPerCategory,
  countResults,
  SEARCH_CATEGORIES,
  type SearchResult,
} from '../types';
import { st } from '../i18n';

const mk = (over: Partial<SearchResult> & { id: string }): SearchResult => ({
  category: 'posts',
  title: 'title',
  score: 0,
  path: '/x',
  ...over,
});

describe('matchScore — the relevance ladder', () => {
  test('exact match scores 1000', () => {
    expect(matchScore('kashi', 'kashi')).toBe(1000);
  });

  test('matching is case-insensitive', () => {
    expect(matchScore('KASHI', 'kashi vishwanath')).toBe(500);
  });

  test('prefix scores 500', () => {
    expect(matchScore('kash', 'kashi vishwanath')).toBe(500);
  });

  test('word-boundary scores 400', () => {
    expect(matchScore('vish', 'kashi vishwanath')).toBe(400);
  });

  test('substring scores 300', () => {
    expect(matchScore('shwa', 'kashi vishwanath')).toBe(300);
  });

  test('no match scores -1', () => {
    expect(matchScore('xyz', 'kashi vishwanath')).toBe(-1);
  });

  test('empty query or text scores -1', () => {
    expect(matchScore('', 'kashi')).toBe(-1);
    expect(matchScore('kashi', '')).toBe(-1);
    expect(matchScore('  ', 'kashi')).toBe(-1);
  });

  test('ladder order: exact > prefix > word > substring', () => {
    const exact = matchScore('ram', 'ram');
    const prefix = matchScore('ram', 'rameshwaram temple');
    const word = matchScore('temple', 'rameshwaram temple');
    const sub = matchScore('eshw', 'rameshwaram temple');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(sub);
  });

  test('trims whitespace on both sides', () => {
    expect(matchScore('  kashi  ', '  kashi  ')).toBe(1000);
  });
});

describe('bestMatchScore — multi-text', () => {
  test('returns the best across texts', () => {
    expect(bestMatchScore('vishwanath', ['Kashi Temple', 'Kashi Vishwanath', 'Varanasi'])).toBe(400);
  });

  test('skips undefined texts', () => {
    expect(bestMatchScore('kashi', [undefined, 'Kashi'])).toBe(1000);
  });

  test('-1 when nothing matches', () => {
    expect(bestMatchScore('xyz', ['Kashi', 'Varanasi'])).toBe(-1);
  });

  test('-1 for empty text list', () => {
    expect(bestMatchScore('kashi', [])).toBe(-1);
  });
});

describe('rankResults', () => {
  test('sorts by score descending', () => {
    const ranked = rankResults([mk({ id: 'a', score: 300 }), mk({ id: 'b', score: 500 }), mk({ id: 'c', score: 400 })]);
    expect(ranked.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  test('verified wins ties', () => {
    const ranked = rankResults([
      mk({ id: 'a', score: 500 }),
      mk({ id: 'b', score: 500, verified: true }),
    ]);
    expect(ranked[0].id).toBe('b');
  });

  test('does not mutate the input', () => {
    const input = [mk({ id: 'a', score: 1 }), mk({ id: 'b', score: 2 })];
    rankResults(input);
    expect(input[0].id).toBe('a');
  });

  test('empty list stays empty', () => {
    expect(rankResults([])).toEqual([]);
  });
});

describe('grouping helpers', () => {
  test('topPerCategory caps each group', () => {
    const grouped = {
      posts: [mk({ id: '1' }), mk({ id: '2' }), mk({ id: '3' })],
      videos: [mk({ id: 'v1', category: 'videos' as const })],
    };
    const capped = topPerCategory(grouped, 2);
    expect(capped.posts?.length).toBe(2);
    expect(capped.videos?.length).toBe(1);
    expect(capped.temples).toBeUndefined();
  });

  test('countResults sums across groups', () => {
    expect(
      countResults({
        posts: [mk({ id: '1' }), mk({ id: '2' })],
        shorts: [mk({ id: 's1', category: 'shorts' as const })],
      }),
    ).toBe(3);
    expect(countResults({})).toBe(0);
  });

  test('SEARCH_CATEGORIES covers all six groups in display order', () => {
    expect(SEARCH_CATEGORIES).toEqual(['temples', 'people', 'posts', 'videos', 'shorts', 'services']);
  });
});

describe('i18n', () => {
  test('all category labels exist in en/hi/bn', () => {
    for (const cat of SEARCH_CATEGORIES) {
      for (const lang of ['en', 'hi', 'bn']) {
        const label = st(`search.cat.${cat}`, lang);
        expect(label).not.toBe(`search.cat.${cat}`);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  test('unknown language falls back to English', () => {
    expect(st('search.placeholder', 'ta')).toBe(st('search.placeholder', 'en'));
  });

  test('unknown key returns the key', () => {
    expect(st('search.nope', 'en')).toBe('search.nope');
  });

  test('empty states are warm, never cold', () => {
    expect(st('search.noResults', 'en')).toContain('🙏');
  });
});
