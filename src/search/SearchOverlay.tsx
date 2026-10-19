/**
 * search/SearchOverlay.tsx — full-screen universal search.
 * ============================================================================
 * Debounced live results (300ms), grouped by category. Recent searches are
 * device-local; trending fills the empty state. Warm empty states, never cold.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, Trash2, BadgeCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  SEARCH_CATEGORIES,
  countResults,
  topPerCategory,
  type GroupedResults,
  type SearchCategory,
  type SearchResult,
} from './types';
import { st } from './i18n';
import { universalSearch, trendingPosts } from './searchService';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from './recentSearches';

interface Props {
  onClose: () => void;
}

const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const ResultRow: React.FC<{ result: SearchResult; onPick: (r: SearchResult) => void }> = ({
  result,
  onPick,
}) => (
  <button
    type="button"
    onClick={() => onPick(result)}
    className="w-full min-h-[56px] flex items-center gap-3 px-4 py-2.5 text-left hover:bg-amber-50 active:bg-amber-100 transition-colors"
  >
    {result.imageUrl ? (
      <img
        src={result.imageUrl}
        alt=""
        className="w-11 h-11 rounded-xl object-cover shrink-0 bg-amber-100"
        loading="lazy"
      />
    ) : (
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-lg shrink-0">
        {result.category === 'temples' ? '🛕'
          : result.category === 'people' ? '👥'
          : result.category === 'videos' ? '🎬'
          : result.category === 'shorts' ? '⚡'
          : result.category === 'services' ? '🪔' : '📝'}
      </div>
    )}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[15px] font-semibold text-stone-800 truncate">{result.title}</span>
        {result.verified && <BadgeCheck className="w-4 h-4 text-amber-600 shrink-0" aria-label="verified" />}
      </div>
      {result.subtitle && (
        <div className="text-[13px] text-stone-500 truncate">{result.subtitle}</div>
      )}
    </div>
  </button>
);

export const SearchOverlay: React.FC<Props> = ({ onClose }) => {
  const { currentLang } = useLanguage();
  const lang = currentLang === 'hi' ? 'hi' : currentLang === 'bn' ? 'bn' : 'en';
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResults>({});
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const runId = useRef(0);

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  // Focus the input on mount; lock body scroll while open.
  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    getRecentSearches().then(setRecent);
    trendingPosts().then(setTrending);
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Debounced search — stale runs are discarded via runId.
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults({});
      setSearching(false);
      setSearched(false);
      return;
    }
    const id = ++runId.current;
    setSearching(true);
    universalSearch(debouncedQuery)
      .then((grouped) => {
        if (runId.current !== id) return; // stale
        setResults(topPerCategory(grouped, 5));
        setSearching(false);
        setSearched(true);
      })
      .catch(() => {
        if (runId.current !== id) return;
        setResults({});
        setSearching(false);
        setSearched(true);
      });
  }, [debouncedQuery]);

  const pick = useCallback(
    (r: SearchResult) => {
      void addRecentSearch(query.trim());
      onClose();
      navigate(r.path);
    },
    [navigate, onClose, query],
  );

  const pickRecent = useCallback((q: string) => setQuery(q), []);

  const clearRecent = useCallback(() => {
    void clearRecentSearches().then(() => setRecent([]));
  }, []);

  const total = countResults(results);
  const showEmpty = searched && !searching && total === 0 && debouncedQuery.length >= 2;

  const catLabel = (c: SearchCategory): string => st(`search.cat.${c}`, lang);

  return (
    <div
      className="fixed inset-0 z-[9990] bg-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={st('search.placeholder', lang)}
    >
      {/* Search bar */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-amber-100 bg-gradient-to-b from-amber-50 to-white">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-amber-200 rounded-2xl px-4 min-h-[48px] shadow-sm">
            <Search className="w-5 h-5 text-amber-600 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={st('search.placeholder', lang)}
              className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-stone-800 placeholder:text-stone-400"
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={st('search.clear', lang)}
                className="w-8 h-8 flex items-center justify-center text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={st('search.close', lang)}
            className="min-w-[44px] min-h-[44px] px-3 rounded-2xl text-amber-700 font-semibold text-[15px]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-10">
        {searching && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin" />
          </div>
        )}

        {showEmpty && (
          <div className="px-6 py-14 text-center">
            <div className="text-4xl mb-3">🙏</div>
            <p className="text-stone-600 text-[15px]">{st('search.noResults', lang)}</p>
          </div>
        )}

        {!searched && !searching && query.trim().length < 2 && (
          <>
            {recent.length > 0 && (
              <div className="px-4 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-500">
                    {st('search.recent', lang)}
                  </h3>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="flex items-center gap-1 text-[13px] text-stone-400 min-h-[32px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {st('search.clear', lang)}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => pickRecent(r)}
                      className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-full bg-amber-50 border border-amber-200 text-[14px] text-stone-700"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {trending.length > 0 && (
              <div className="pt-5">
                <h3 className="px-4 text-[13px] font-bold uppercase tracking-wide text-stone-500 mb-1">
                  {st('search.trending', lang)}
                </h3>
                {trending.map((r) => (
                  <ResultRow key={r.id} result={r} onPick={pick} />
                ))}
              </div>
            )}
          </>
        )}

        {!searching && total > 0 && (
          <div className="pb-4">
            {SEARCH_CATEGORIES.map((cat) => {
              const list = results[cat];
              if (!list || list.length === 0) return null;
              return (
                <div key={cat} className="pt-4">
                  <h3 className="px-4 text-[13px] font-bold uppercase tracking-wide text-stone-500 mb-1">
                    {catLabel(cat)}
                  </h3>
                  {list.map((r) => (
                    <ResultRow key={`${cat}-${r.id}`} result={r} onPick={pick} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
