/**
 * search/recentSearches.ts — recent search history, device-local only.
 * ============================================================================
 * IndexedDB via idb-keyval. Never leaves the device. Clearable.
 */

import { createStore, get, set } from 'idb-keyval';

const store = createStore('sanatani-search', 'recent');
const KEY = 'recent-searches';
const MAX = 10;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const list = await get<string[]>(KEY, store);
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<void> {
  const q = (query || '').trim();
  if (q.length < 2) return;
  try {
    const prev = await getRecentSearches();
    const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
    await set(KEY, next, store);
  } catch {
    /* best-effort — search works without history */
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await set(KEY, [], store);
  } catch {
    /* ignore */
  }
}
