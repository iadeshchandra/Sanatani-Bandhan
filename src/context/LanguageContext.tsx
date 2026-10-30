import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  translations,
  loadLanguageDict,
  getDict,
  getOverrideMap,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  localeFor,
  type TranslationSchema,
} from '../i18n/translations';
import { term as termbaseTerm } from '../i18n/termbase';
import {
  fetchTranslationOverrides,
  extractRegionalOverrides,
  getRegionalOverrides,
} from '../i18n/translationOverrides';
import { dharmicTaxonomy } from '../i18n/taxonomy';
import { regionalTerm, isRegionId, type RegionId } from '../i18n/regionalTerms';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { WorkspaceType } from '../types';
import { workspaceRegistry } from '../lib/workspaceRegistry';

/**
 * OrganizationType — the taxonomy dimension of the language context.
 * Follow-Up Polish Sweep (item 6): this was a hand-kept 4-value union
 * ('Mandir' | 'Ashram' | 'Gurukul' | 'Trust'), so the taxonomy could
 * only ever name 4 of the platform's 17 workspace types. It is now the
 * canonical WorkspaceType union itself — one source of truth
 * (src/types.ts), enforced complete by workspaceRegistry's
 * Record<WorkspaceType, …> shape.
 */
export type OrganizationType = WorkspaceType;

/** TaxonomyMatrix + TAXONOMY_MAP live in ../i18n/taxonomyMap (pure, tested — QUEUED #49). */
export type { TaxonomyMatrix } from '../i18n/taxonomyMap';
import { resolveTaxonomyMatrix } from '../i18n/taxonomyMap';

export interface LanguageContextType {
  // ── Existing API (backward compatible) ──
  currentLang: string;
  language: string;
  changeLanguage: (lang: string) => void;
  setLanguage: (lang: string) => void;
  organizationType: OrganizationType;
  changeOrganizationType: (org: OrganizationType) => void;
  t: (key: string) => string;
  safeTranslate: (key: string, en: string, bn?: string, hi?: string, sa?: string) => string;
  getTaxonomy: (termKey: string | WorkspaceType) => any;
  // ── Phase 1 additions ──
  /** Dharmic termbase lookup with transliteration policy. term('dakshina') → 'दक्षिणा' in hi. */
  term: (key: string) => string;
  /** Has the user explicitly chosen a language (first-run picker dismissed)? */
  languageChosen: boolean;
  /** Mark the language as explicitly chosen (persists; dismisses the picker). */
  markLanguageChosen: () => void;
  /** True while the language dictionary chunk is loading. */
  langLoading: boolean;
  /** The 10 supported display languages with native names + BCP-47. */
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  // ── Track 1 additions: region for the regional vocabulary layer ──
  /** Active region for community vocabulary; 'other' until refined (Track 2). */
  region: RegionId;
  /**
   * Set the region — validates via isRegionId, persists to localStorage,
   * and best-effort syncs to the user's private profile doc.
   */
  setRegion: (region: RegionId) => void;
  /**
   * Regional term lookup — the helper every surface uses for community
   * vocabulary. rt('temple') → 'kovil' in Tamil Nadu, 'mandir' in hi default.
   * Chain: (region,lang) → lang default → (region,en) → en; never blank.
   * Owner-approved runtime overrides (`regional.*` keys) win over the table.
   */
  rt: (key: string) => string;
  /** Has the user explicitly chosen a region (first-run picker dismissed)? */
  regionChosen: boolean;
  /** Mark the region as explicitly chosen (persists; dismisses the picker). */
  markRegionChosen: () => void;
}

const LANG_KEY = 'sb-lang';
const LEGACY_LANG_KEY = 'sanatani_lang';
const CHOSEN_KEY = 'sb-lang-chosen';
const ORG_TYPE_KEY = 'sanatani_org_type';
const REGION_KEY = 'sb-region';
const REGION_CHOSEN_KEY = 'sb-region-chosen';

/**
 * Detect the initial region: sb-region if it's a valid RegionId → else
 * 'other'. Async profile/geo refinement is Track 2's job — this just
 * provides the state + setter.
 */
function detectInitialRegion(): RegionId {
  try {
    const saved = localStorage.getItem(REGION_KEY);
    if (saved && isRegionId(saved)) return saved;
  } catch {
    // sandboxed iframe — fall through
  }
  return 'other';
}

function hasChosenRegion(): boolean {
  try {
    return localStorage.getItem(REGION_CHOSEN_KEY) === '1' || !!localStorage.getItem(REGION_KEY);
  } catch {
    return false;
  }
}

/**
 * Best-effort merge of { region } into the user's private profile doc
 * (sanataniProfiles/{uid}/private/self — self read/write is allowed by
 * firestore.rules). Fail-open: never throws, no-ops when signed out.
 */
function syncRegionToProfile(region: RegionId): void {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    void setDoc(
      doc(db, 'sanataniProfiles', uid, 'private', 'self'),
      { region },
      { merge: true }
    ).catch(() => {
      // offline / permission-denied — local state remains authoritative
    });
  } catch {
    // firebase not ready — fail-open
  }
}

/** Detect the initial language: sb-lang → legacy → navigator → en. */
function detectInitialLang(): string {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && isSupportedLanguage(saved)) return saved;
    const legacy = localStorage.getItem(LEGACY_LANG_KEY);
    if (legacy && isSupportedLanguage(legacy)) {
      localStorage.setItem(LANG_KEY, legacy); // migrate forward
      return legacy;
    }
  } catch {
    // sandboxed iframe — fall through
  }
  try {
    const nav = (navigator.language || '').toLowerCase().split('-')[0];
    if (isSupportedLanguage(nav)) return nav;
    // Map common region variants: e.g. 'bn-BD' already handled by split.
    const twoLetter = nav.slice(0, 2);
    if (isSupportedLanguage(twoLetter)) return twoLetter;
  } catch {
    // ignore
  }
  return 'en';
}

function hasChosen(): boolean {
  try {
    return localStorage.getItem(CHOSEN_KEY) === '1' || !!localStorage.getItem(LANG_KEY);
  } catch {
    return false;
  }
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<string>(detectInitialLang);
  const [langLoading, setLangLoading] = useState<boolean>(false);
  const [dictVersion, setDictVersion] = useState(0); // bump to re-render after lazy load
  const [languageChosen, setLanguageChosen] = useState<boolean>(hasChosen);
  const loadSeq = useRef(0);
  /**
   * Owner-approved regional overrides, parsed as region → termKey → text
   * from `translationOverrides/{lang}` (`regional.{region}.{termKey}` keys).
   * Refreshed whenever the language's override doc resolves. rt() checks
   * this first — an approved correction goes live without a redeploy.
   */
  const regionalOverrideRef = useRef<Record<string, Record<string, string>>>({});

  const [organizationType, setOrganizationType] = useState<OrganizationType>(() => {
    try {
      const saved = localStorage.getItem(ORG_TYPE_KEY) as OrganizationType;
      if (saved && Object.prototype.hasOwnProperty.call(workspaceRegistry, saved)) {
        return saved;
      }
      return 'Mandir';
    } catch {
      return 'Mandir';
    }
  });

  // ── Region state (Track 1: regional vocabulary layer) ──
  const [region, setRegionState] = useState<RegionId>(detectInitialRegion);
  const [regionChosen, setRegionChosen] = useState<boolean>(hasChosenRegion);

  /**
   * Apply a region: validate → set state → persist locally →
   * best-effort sync to the user's private profile doc.
   */
  const applyRegion = useCallback((next: RegionId, opts?: { syncRemote?: boolean }) => {
    if (!isRegionId(next)) return;
    setRegionState(next);
    try {
      localStorage.setItem(REGION_KEY, next);
    } catch {
      // ignore localStorage errors in sandboxed iframes
    }
    if (opts?.syncRemote !== false) syncRegionToProfile(next);
  }, []);

  const setRegion = useCallback((next: RegionId) => applyRegion(next), [applyRegion]);

  const markRegionChosen = useCallback(() => {
    setRegionChosen(true);
    try {
      localStorage.setItem(REGION_CHOSEN_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  /** Regional term lookup — the helper every surface uses for community vocabulary. */
  const rt = useCallback(
    (key: string): string =>
      // Owner-approved regional override first (live without redeploy),
      // then the bundled regional table. The ref is read at call time so
      // late-arriving overrides apply without recreating this callback —
      // the dictVersion bump on `t` re-renders consumers.
      regionalOverrideRef.current[region]?.[key] ?? regionalTerm(key, currentLang, region),
    [currentLang, region]
  );

  // Cross-device memory: if this device never recorded a region, adopt the
  // one stored on the user's private profile doc (e.g. chosen on another
  // device). Runs once at boot when the restored session is known —
  // fail-open, non-blocking, and the local choice always wins.
  useEffect(() => {
    let settled = false;
    let cancelled = false;
    const maybeAdopt = async (uid: string) => {
      if (settled) return;
      settled = true;
      try {
        let hadLocal = false;
        try {
          hadLocal = !!localStorage.getItem(REGION_KEY);
        } catch {
          // ignore
        }
        if (hadLocal) return;
        const snap = await getDoc(doc(db, 'sanataniProfiles', uid, 'private', 'self'));
        if (cancelled || !snap.exists()) return;
        const remote = (snap.data() as { region?: unknown } | undefined)?.region;
        if (typeof remote === 'string' && isRegionId(remote)) {
          // It came from the profile — nothing to write back.
          applyRegion(remote, { syncRemote: false });
        }
      } catch {
        // fail-open: local state remains authoritative
      }
    };
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) void maybeAdopt(user.uid);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [applyRegion]);

  // Keep <html lang> in sync — drives [lang]-based font stacks in CSS
  // and assists screen readers with correct pronunciation.
  useEffect(() => {
    try {
      document.documentElement.setAttribute('lang', localeFor(currentLang));
    } catch {
      // non-DOM environment
    }
  }, [currentLang]);

  // Lazy-load the dictionary chunk whenever the language changes.
  useEffect(() => {
    const seq = ++loadSeq.current;
    // English is bundled; every other language loads its chunk.
    if (currentLang === 'en' || getDict(currentLang) !== getDict('en')) {
      // Already cached (or English) — still ensure version bump for safety.
    }
    setLangLoading(true);
    loadLanguageDict(currentLang)
      .then(() => {
        // Translation Quality System: fetch owner-approved runtime
        // overrides for this language — fire-and-forget with its own
        // timeout, never blocks boot. A second version bump applies them
        // to the UI once they land.
        fetchTranslationOverrides(currentLang).then(async (applied) => {
          if (loadSeq.current !== seq) return;
          // Regional vocabulary layer: parse `regional.*` overrides so
          // rt() serves owner-approved corrections live. Non-English
          // reuses the already-fetched override store (no extra read);
          // English needs its own fetch (the dict path skips 'en').
          try {
            regionalOverrideRef.current =
              currentLang === 'en'
                ? await getRegionalOverrides('en')
                : extractRegionalOverrides(getOverrideMap(currentLang));
          } catch {
            /* fail-open — bundled regional table stands */
          }
          if (applied) setDictVersion((v) => v + 1);
        });
        if (loadSeq.current === seq) {
          setDictVersion((v) => v + 1);
          setLangLoading(false);
        }
      })
      .catch(() => {
        if (loadSeq.current === seq) setLangLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLang]);

  const changeLanguage = useCallback((lang: string) => {
    if (!isSupportedLanguage(lang)) return;
    setCurrentLang(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
      // Keep the legacy key in sync for older code paths.
      localStorage.setItem(LEGACY_LANG_KEY, lang);
    } catch {
      // ignore localStorage errors in sandboxed iframes
    }
  }, []);

  const markLanguageChosen = useCallback(() => {
    setLanguageChosen(true);
    try {
      localStorage.setItem(CHOSEN_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  const changeOrganizationType = (org: OrganizationType) => {
    setOrganizationType(org);
    try {
      localStorage.setItem(ORG_TYPE_KEY, org);
    } catch {
      // ignore localStorage errors in sandboxed iframes
    }
  };

  /**
   * Translates dot-delimited key (e.g. 'nav.dashboard') by traversing the
   * active dictionary. Fallback chain: currentLang -> 'en' -> key itself.
   * dictVersion in the dep array forces re-resolution after lazy loads.
   */
  const t = useCallback(
    (key: string): string => {
      if (!key) return '';

      const resolveKey = (dict: TranslationSchema, path: string[]): string | undefined => {
        let current: any = dict;
        for (const segment of path) {
          if (current && typeof current === 'object' && segment in current) {
            current = current[segment];
          } else {
            return undefined;
          }
        }
        return typeof current === 'string' ? current : undefined;
      };

      const segments = key.split('.');
      const activeDict = getDict(currentLang);
      const translated = resolveKey(activeDict, segments);
      if (translated) return translated;

      // Fallback to English
      if (currentLang !== 'en') {
        const enTranslated = resolveKey(getDict('en'), segments);
        if (enTranslated) return enTranslated;
      }

      return key;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLang, dictVersion]
  );

  /** Dharmic termbase lookup — transliteration policy applied per language. */
  const term = useCallback(
    (key: string): string => termbaseTerm(key, currentLang),
    [currentLang]
  );

  const safeTranslate = useCallback(
    (key: string, en: string, bn?: string, hi?: string, sa?: string): string => {
      void key; // key retained for API compatibility
      switch (currentLang) {
        case 'bn':
          return bn || en;
        case 'hi':
        case 'mr':
          return hi || en;
        case 'sa':
          return sa || hi || en;
        case 'en':
        default:
          return en;
      }
    },
    [currentLang]
  );

  /**
   * Returns organization-adaptive Dharmic term (e.g. 'SpiritualCustodian' -> 'Pradhan Archaka / Pujari').
   */
  const getTaxonomy = useCallback(
    (termKey: string | WorkspaceType): any => {
      if (typeof termKey === 'string' && (dharmicTaxonomy as any)[termKey]) {
        return (dharmicTaxonomy as any)[termKey][organizationType] || termKey;
      }

      // Legacy workspace matrix resolution — resolveTaxonomyMatrix covers
      // every workspace type (own words for the five suites, Mandir matrix
      // as the never-blank fallback for the rest; QUEUED #49). Non-workspace
      // strings still pass through verbatim.
      const key = String(termKey || 'MANDIR').toUpperCase();
      const matrix = resolveTaxonomyMatrix(currentLang, key);
      if (matrix) {
        return {
          ...matrix,
          memberNoun: matrix.memberTerm,
          kartaNoun: matrix.memberTerm,
          offeringNoun: matrix.fundsTerm,
        };
      }

      return termKey;
    },
    [currentLang, organizationType]
  );

  const langValue = useMemo(
    () => ({
      currentLang,
      language: currentLang,
      changeLanguage,
      setLanguage: changeLanguage,
      organizationType,
      changeOrganizationType,
      t,
      safeTranslate,
      getTaxonomy,
      term,
      languageChosen,
      markLanguageChosen,
      langLoading,
      supportedLanguages: SUPPORTED_LANGUAGES,
      region,
      setRegion,
      rt,
      regionChosen,
      markRegionChosen,
    }),
    [
      currentLang,
      changeLanguage,
      organizationType,
      changeOrganizationType,
      t,
      safeTranslate,
      getTaxonomy,
      term,
      languageChosen,
      markLanguageChosen,
      langLoading,
      region,
      setRegion,
      rt,
      regionChosen,
      markRegionChosen,
    ]
  );

  return <LanguageContext.Provider value={langValue}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageProvider;
