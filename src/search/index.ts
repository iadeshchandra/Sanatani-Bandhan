/**
 * search/index.ts — Universal Search public surface.
 */
export { SearchButton } from './SearchButton';
export { SearchOverlay } from './SearchOverlay';
export { universalSearch, trendingPosts } from './searchService';
export {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from './recentSearches';
export {
  matchScore,
  bestMatchScore,
  rankResults,
  topPerCategory,
  countResults,
  SEARCH_CATEGORIES,
  type SearchCategory,
  type SearchResult,
  type GroupedResults,
} from './types';
