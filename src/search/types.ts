/**
 * search/types.ts — Universal Search data models + pure matching/ranking.
 * ============================================================================
 * One search bar for everything: temples, people, posts, videos, shorts,
 * services. All matching is client-side ($0, offline-tolerant).
 *
 * Relevance ladder (highest wins):
 *   exact match (1000) > prefix (500) > word-boundary (400) > substring (300)
 */

/** Searchable categories, in display order. */
export type SearchCategory =
  | 'temples'
  | 'people'
  | 'posts'
  | 'videos'
  | 'shorts'
  | 'services';

export const SEARCH_CATEGORIES: SearchCategory[] = [
  'temples',
  'people',
  'posts',
  'videos',
  'shorts',
  'services',
];

/** A single ranked result. `path` is the react-router destination. */
export interface SearchResult {
  id: string;
  category: SearchCategory;
  /** Primary display line. */
  title: string;
  /** Secondary display line (city, Sanatani ID, snippet...). */
  subtitle?: string;
  /** Thumbnail / avatar URL when available. */
  imageUrl?: string;
  /** Relevance score — higher ranks first. */
  score: number;
  /** Where tapping navigates. */
  path: string;
  /** Verified orgs get a visual boost + ranking boost. */
  verified?: boolean;
}

/** Grouped results keyed by category (only non-empty groups included). */
export type GroupedResults = Partial<Record<SearchCategory, SearchResult[]>>;

/* ------------------------------------------------------------------ */
/* Pure matching — no I/O, fully testable.                             */
/* ------------------------------------------------------------------ */

const norm = (s: string): string => (s || '').toLowerCase().trim();

/**
 * Score a single text against the query.
 * 1000 exact · 500 prefix · 400 word-boundary · 300 substring · -1 no match.
 */
export function matchScore(query: string, text: string): number {
  const q = norm(query);
  const t = norm(text);
  if (!q || !t) return -1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500;
  // Word-boundary: query matches the start of any word.
  const words = t.split(/[\s\-_/.,;:()[\]{}'"]+/);
  if (words.some((w) => w.startsWith(q))) return 400;
  if (t.includes(q)) return 300;
  return -1;
}

/**
 * Best score across multiple texts (e.g. title + subtitle + tags).
 * Returns -1 when nothing matches.
 */
export function bestMatchScore(query: string, texts: (string | undefined)[]): number {
  let best = -1;
  for (const text of texts) {
    if (!text) continue;
    const s = matchScore(query, text);
    if (s > best) best = s;
  }
  return best;
}

/** Sort results by score descending (stable). Verified orgs float up on ties. */
export function rankResults(results: SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (!!b.verified !== !!a.verified) return b.verified ? 1 : -1;
    return 0;
  });
}

/** Keep the top N per category. */
export function topPerCategory(
  grouped: GroupedResults,
  n = 5,
): GroupedResults {
  const out: GroupedResults = {};
  for (const cat of SEARCH_CATEGORIES) {
    const list = grouped[cat];
    if (list && list.length > 0) out[cat] = list.slice(0, n);
  }
  return out;
}

/** Total result count across groups. */
export function countResults(grouped: GroupedResults): number {
  return SEARCH_CATEGORIES.reduce((sum, c) => sum + (grouped[c]?.length || 0), 0);
}
