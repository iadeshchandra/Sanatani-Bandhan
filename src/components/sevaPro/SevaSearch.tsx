/**
 * SevaSearch — search & discovery across the unified Seva Professional pool.
 * ==========================================================================
 * Filters: specialization, language, tradition, city/service-area, tier,
 * trust band. Sort: recommended (trust score) / nearest / top rated.
 *
 * Does NOT touch the existing FindPurohit / DevoteeMarketplace screens —
 * this is a new, additive surface. The raw trust score powers "recommended"
 * sorting internally; devotees only ever see warm copy (TrustBadge).
 */
import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  TrustResult,
  TrustBand,
  VerificationTier,
  normalizeTier,
  type DisplayLang,
} from '../../lib/sevaPro/trustScore';
import { TrustBadge } from './TrustBadge';

export interface SearchableProvider {
  uid: string;
  displayName: string;
  roles: Array<'purohit' | 'jyotish'>;
  specializations: string[];
  languages: string[];
  tradition?: string;
  city?: string;
  /** Stored tier string (any scheme). */
  verificationTier: string;
  trust: TrustResult;
  /** Weighted average ashirvad rating (1–5). Optional — falls back to trust band. */
  avgRating?: number;
  /** Distance in km from the devotee. Optional — "nearest" degrades gracefully. */
  distanceKm?: number;
}

export interface SevaFilters {
  query: string;
  specialization: string;
  language: string;
  tradition: string;
  city: string;
  tier: VerificationTier | 'any';
  trustBand: TrustBand | 'any';
}

export type SevaSort = 'recommended' | 'topRated' | 'nearest';

export const EMPTY_FILTERS: SevaFilters = {
  query: '',
  specialization: '',
  language: '',
  tradition: '',
  city: '',
  tier: 'any',
  trustBand: 'any',
};

/**
 * Pure filter + sort. Unit-testable; the component is a thin shell over it.
 * "recommended" = trust score desc (the internal ranking signal), with a
 * deterministic uid tiebreak so listings never shuffle between renders.
 */
export function filterAndSortProviders(
  providers: SearchableProvider[],
  filters: SevaFilters,
  sort: SevaSort
): SearchableProvider[] {
  const q = filters.query.trim().toLowerCase();
  const filtered = providers.filter((p) => {
    if (q) {
      const hay = [p.displayName, ...p.specializations, p.city || '', p.tradition || '']
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.specialization && !p.specializations.includes(filters.specialization)) return false;
    if (filters.language && !p.languages.includes(filters.language)) return false;
    if (filters.tradition && (p.tradition || '') !== filters.tradition) return false;
    if (filters.city && (p.city || '').toLowerCase() !== filters.city.trim().toLowerCase()) return false;
    if (filters.tier !== 'any' && normalizeTier(p.verificationTier) !== filters.tier) return false;
    if (filters.trustBand !== 'any' && p.trust.band !== filters.trustBand) return false;
    return true;
  });

  const byUid = (a: SearchableProvider, b: SearchableProvider) => (a.uid < b.uid ? -1 : 1);
  const sorted = [...filtered];
  if (sort === 'recommended') {
    sorted.sort((a, b) => b.trust.score - a.trust.score || byUid(a, b));
  } else if (sort === 'topRated') {
    sorted.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0) || b.trust.score - a.trust.score || byUid(a, b));
  } else {
    // nearest: providers without a distance sink to the bottom, stable by score.
    sorted.sort(
      (a, b) =>
        (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY) ||
        b.trust.score - a.trust.score ||
        byUid(a, b)
    );
  }
  return sorted;
}

const COPY: Record<string, Record<DisplayLang, string>> = {
  searchPh: {
    en: 'Search by name, seva, city…',
    bn: 'নাম, সেবা, শহরে খুঁজুন…',
    hi: 'नाम, सेवा, शहर से खोजें…',
  },
  filters: {
    en: 'Filters',
    bn: 'ফিল্টার',
    hi: 'फ़िल्टर',
  },
  specialization: { en: 'Specialization', bn: 'বিশেষজ্ঞতা', hi: 'विशेषज्ञता' },
  language: { en: 'Language', bn: 'ভাষা', hi: 'भाषा' },
  tradition: { en: 'Tradition', bn: 'ঐতিহ্য', hi: 'परंपरा' },
  city: { en: 'City', bn: 'শহর', hi: 'शहर' },
  tier: { en: 'Tier', bn: 'স্তর', hi: 'स्तर' },
  trustBand: { en: 'Trust', bn: 'আস্থা', hi: 'विश्वास' },
  any: { en: 'Any', bn: 'যেকোনো', hi: 'कोई भी' },
  sort: { en: 'Sort', bn: 'সাজান', hi: 'क्रमबद्ध करें' },
  recommended: { en: 'Recommended', bn: 'প্রস্তাবিত', hi: 'अनुशंसित' },
  topRated: { en: 'Top rated', bn: 'সেরা রেটেড', hi: 'शीर्ष रेटेड' },
  nearest: { en: 'Nearest', bn: 'নিকটতম', hi: 'निकटतम' },
  noResults: {
    en: 'No sevadars match — try widening your filters with an open heart.',
    bn: 'কোনো সেবাদার মেলেনি — মন খুলে ফিল্টার প্রশস্ত করে দেখুন।',
    hi: 'कोई सेवादार नहीं मिला — हृदय खोलकर फ़िल्टर विस्तृत करें।',
  },
  rolePurohit: { en: 'Purohit', bn: 'পুরোহিত', hi: 'पुरोहित' },
  roleJyotish: { en: 'Jyotishi', bn: 'জ্যোতিষী', hi: 'ज्योतिषी' },
  bandNew: { en: 'New', bn: 'নতুন', hi: 'नए' },
  bandGrowing: { en: 'Growing', bn: 'বর্ধনশীল', hi: 'बढ़ते' },
  bandTrusted: { en: 'Trusted', bn: 'বিশ্বস্ত', hi: 'विश्वसनीय' },
  bandRenowned: { en: 'Renowned', bn: 'বিখ্যাত', hi: 'प्रसिद्ध' },
};

function asLang(currentLang: string): DisplayLang {
  return currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en';
}

const inputCls =
  'min-h-[44px] w-full rounded-2xl border border-stone-200/70 dark:border-stone-700/60 bg-white/80 dark:bg-stone-900/60 px-3 text-sm text-stone-900 dark:text-stone-100';

export interface SevaSearchProps {
  providers: SearchableProvider[];
  /** Distinct option lists derived by the host screen (or static). */
  specializations?: string[];
  languages?: string[];
  traditions?: string[];
  onSelect?: (provider: SearchableProvider) => void;
  className?: string;
}

export const SevaSearch: React.FC<SevaSearchProps> = ({
  providers,
  specializations = [],
  languages = [],
  traditions = [],
  onSelect,
  className = '',
}) => {
  const { currentLang } = useLanguage();
  const lang = asLang(currentLang || 'en');
  const [filters, setFilters] = useState<SevaFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SevaSort>('recommended');
  const [showFilters, setShowFilters] = useState(false);

  const set = (k: keyof SevaFilters, v: string) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const results = useMemo(() => filterAndSortProviders(providers, filters, sort), [providers, filters, sort]);

  const bandLabel = (b: TrustBand) =>
    b === 'renowned' ? COPY.bandRenowned[lang]
      : b === 'trusted' ? COPY.bandTrusted[lang]
        : b === 'growing' ? COPY.bandGrowing[lang]
          : COPY.bandNew[lang];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search + sort */}
      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder={COPY.searchPh[lang]}
            aria-label={COPY.searchPh[lang]}
            className={`${inputCls} pl-9`}
          />
        </label>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-2xl border border-stone-200/70 dark:border-stone-700/60 bg-white/80 dark:bg-stone-900/60 px-3 text-sm font-medium text-stone-700 dark:text-stone-200"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {COPY.filters[lang]}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="seva-sort" className="text-sm font-medium text-stone-600 dark:text-stone-300">
          {COPY.sort[lang]}
        </label>
        <select
          id="seva-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SevaSort)}
          className={`${inputCls} w-auto`}
        >
          <option value="recommended">{COPY.recommended[lang]}</option>
          <option value="topRated">{COPY.topRated[lang]}</option>
          <option value="nearest">{COPY.nearest[lang]}</option>
        </select>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="grid grid-cols-2 gap-3 rounded-3xl border border-stone-200/70 dark:border-stone-700/60 bg-white/60 dark:bg-stone-900/40 p-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{COPY.specialization[lang]}</span>
            <select value={filters.specialization} onChange={(e) => set('specialization', e.target.value)} className={inputCls}>
              <option value="">{COPY.any[lang]}</option>
              {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{COPY.language[lang]}</span>
            <select value={filters.language} onChange={(e) => set('language', e.target.value)} className={inputCls}>
              <option value="">{COPY.any[lang]}</option>
              {languages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{COPY.tradition[lang]}</span>
            <select value={filters.tradition} onChange={(e) => set('tradition', e.target.value)} className={inputCls}>
              <option value="">{COPY.any[lang]}</option>
              {traditions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{COPY.city[lang]}</span>
            <input value={filters.city} onChange={(e) => set('city', e.target.value)} placeholder={COPY.any[lang]} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{COPY.tier[lang]}</span>
            <select value={filters.tier} onChange={(e) => set('tier', e.target.value)} className={inputCls}>
              <option value="any">{COPY.any[lang]}</option>
              <option value="TRUSTED">Trusted</option>
              <option value="VERIFIED">Verified</option>
              <option value="REGISTERED">Registered</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{COPY.trustBand[lang]}</span>
            <select value={filters.trustBand} onChange={(e) => set('trustBand', e.target.value)} className={inputCls}>
              <option value="any">{COPY.any[lang]}</option>
              <option value="renowned">{COPY.bandRenowned[lang]}</option>
              <option value="trusted">{COPY.bandTrusted[lang]}</option>
              <option value="growing">{COPY.bandGrowing[lang]}</option>
              <option value="new">{COPY.bandNew[lang]}</option>
            </select>
          </label>
        </div>
      )}

      {/* Results */}
      {results.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-stone-300 dark:border-stone-600 p-6 text-center text-sm text-stone-500 dark:text-stone-400">
          🪔 {COPY.noResults[lang]}
        </p>
      ) : (
        <ul className="space-y-3">
          {results.map((p) => (
            <li key={p.uid}>
              <button
                type="button"
                onClick={() => onSelect?.(p)}
                className="block w-full text-left transition active:scale-[0.99]"
              >
                <TrustBadge
                  result={p.trust}
                  name={p.displayName}
                  specializations={p.specializations.slice(0, 4)}
                  variant="compact"
                />
                <p className="mt-1 px-1 text-xs text-stone-500 dark:text-stone-400">
                  {p.roles.map((r) => (r === 'purohit' ? COPY.rolePurohit[lang] : COPY.roleJyotish[lang])).join(' · ')}
                  {' · '}{bandLabel(p.trust.band)}
                  {p.city ? ` · ${p.city}` : ''}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SevaSearch;
