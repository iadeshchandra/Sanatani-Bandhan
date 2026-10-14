import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  translations,
  loadLanguageDict,
  getDict,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  localeFor,
  type TranslationSchema,
} from '../i18n/translations';
import { term as termbaseTerm } from '../i18n/termbase';
import { dharmicTaxonomy } from '../i18n/taxonomy';
import { WorkspaceType } from '../types';

export type OrganizationType = 'Mandir' | 'Ashram' | 'Gurukul' | 'Trust';

export interface TaxonomyMatrix {
  workspaceLabel: string;
  directoryName: string;
  memberTerm: string;
  fundsTerm: string;
  assetsTerm: string;
  inventoryTerm: string;
  memberNoun?: string;
  kartaNoun?: string;
  offeringNoun?: string;
}

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
}

const TAXONOMY_MAP: Record<string, Record<string, TaxonomyMatrix>> = {
  en: {
    MANDIR: {
      workspaceLabel: 'Mandir / Temple',
      directoryName: 'Devotee Directory',
      memberTerm: 'Bhaktas',
      fundsTerm: 'Chanda / Pranami',
      assetsTerm: 'Temple Assets',
      inventoryTerm: 'Bhandara & Store',
    },
    GOSHALA: {
      workspaceLabel: 'Goshala',
      directoryName: 'Gau Sevak Directory',
      memberTerm: 'Gau Sevaks',
      fundsTerm: 'Gau Seva Nidhi',
      assetsTerm: 'Gomata & Nandi Records',
      inventoryTerm: 'Fodder & Medicine Store',
    },
  },
  hi: {
    MANDIR: {
      workspaceLabel: 'मंदिर',
      directoryName: 'भक्त नामावली',
      memberTerm: 'भक्तजन',
      fundsTerm: 'चंदा / दान',
      assetsTerm: 'मंदिर संपदा',
      inventoryTerm: 'भंडार एवं राशन',
    },
    GOSHALA: {
      workspaceLabel: 'गोशाला',
      directoryName: 'गौ सेवक नामावली',
      memberTerm: 'गौ सेवक',
      fundsTerm: 'गौ सेवा निधि',
      assetsTerm: 'गोमाता एवं नंदी विवरण',
      inventoryTerm: 'चारा एवं औषधि भंडार',
    },
  },
  bn: {
    MANDIR: {
      workspaceLabel: 'মন্দির',
      directoryName: 'ভক্ত তালিকা',
      memberTerm: 'ভক্তবৃন্দ',
      fundsTerm: 'প্রণামী / চাঁদা',
      assetsTerm: 'মন্দির সম্পদ',
      inventoryTerm: 'ভাণ্ডার',
    },
    GOSHALA: {
      workspaceLabel: 'গোশালা',
      directoryName: 'গো সেবক তালিকা',
      memberTerm: 'গো সেবক',
      fundsTerm: 'গো সেবা নিধি',
      assetsTerm: 'গোমাতা ও নন্দীর বিবরণ',
      inventoryTerm: 'খাদ্য ও ঔষধ ভাণ্ডার',
    },
  },
};

const LANG_KEY = 'sb-lang';
const LEGACY_LANG_KEY = 'sanatani_lang';
const CHOSEN_KEY = 'sb-lang-chosen';
const ORG_TYPE_KEY = 'sanatani_org_type';

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

  const [organizationType, setOrganizationType] = useState<OrganizationType>(() => {
    try {
      const saved = localStorage.getItem(ORG_TYPE_KEY) as OrganizationType;
      if (saved && ['Mandir', 'Ashram', 'Gurukul', 'Trust'].includes(saved)) {
        return saved;
      }
      return 'Mandir';
    } catch {
      return 'Mandir';
    }
  });

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

      // Legacy workspace matrix resolution
      const key = String(termKey || 'MANDIR').toUpperCase();
      if (TAXONOMY_MAP[currentLang]?.[key] || TAXONOMY_MAP.en[key]) {
        const matrix =
          TAXONOMY_MAP[currentLang]?.[key] ||
          TAXONOMY_MAP.en[key] ||
          TAXONOMY_MAP.en.MANDIR;

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
