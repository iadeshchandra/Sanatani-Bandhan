import React, { createContext, useContext, useState } from 'react';
import { translations } from '../i18n/translations';
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
  currentLang: string;
  language: string;
  changeLanguage: (lang: string) => void;
  setLanguage: (lang: string) => void;
  organizationType: OrganizationType;
  changeOrganizationType: (org: OrganizationType) => void;
  t: (key: string) => string;
  safeTranslate: (key: string, en: string, bn?: string, hi?: string, sa?: string) => string;
  getTaxonomy: (termKey: string | WorkspaceType) => any;
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
  },
};

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<string>(() => {
    try {
      return localStorage.getItem('sanatani_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const [organizationType, setOrganizationType] = useState<OrganizationType>(() => {
    try {
      const saved = localStorage.getItem('sanatani_org_type') as OrganizationType;
      if (saved && ['Mandir', 'Ashram', 'Gurukul', 'Trust'].includes(saved)) {
        return saved;
      }
      return 'Mandir';
    } catch {
      return 'Mandir';
    }
  });

  const changeLanguage = (lang: string) => {
    setCurrentLang(lang);
    try {
      localStorage.setItem('sanatani_lang', lang);
    } catch {
      // ignore localStorage errors in sandboxed iframes
    }
  };

  const changeOrganizationType = (org: OrganizationType) => {
    setOrganizationType(org);
    try {
      localStorage.setItem('sanatani_org_type', org);
    } catch {
      // ignore localStorage errors in sandboxed iframes
    }
  };

  /**
   * Translates dot-delimited key (e.g. 'nav.dashboard') by traversing translation dictionaries.
   * Fallback chain: currentLang -> 'en' -> key itself.
   */
  const t = (key: string): string => {
    if (!key) return '';

    const resolveKey = (dict: any, path: string[]): string | undefined => {
      let current = dict;
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
    const activeDict = translations[currentLang] || translations.en;
    const translated = resolveKey(activeDict, segments);

    if (translated) return translated;

    // Fallback to English
    if (currentLang !== 'en') {
      const enTranslated = resolveKey(translations.en, segments);
      if (enTranslated) return enTranslated;
    }

    return key;
  };

  const safeTranslate = (
    key: string,
    en: string,
    bn?: string,
    hi?: string,
    sa?: string
  ): string => {
    switch (currentLang) {
      case 'bn':
        return bn || en;
      case 'hi':
        return hi || en;
      case 'sa':
        return sa || hi || en;
      case 'en':
      default:
        return en;
    }
  };

  /**
   * Returns organization-adaptive Dharmic term (e.g. 'SpiritualCustodian' -> 'Pradhan Archaka / Pujari').
   */
  const getTaxonomy = (termKey: string | WorkspaceType): any => {
    if (typeof termKey === 'string' && dharmicTaxonomy[termKey]) {
      return dharmicTaxonomy[termKey][organizationType] || termKey;
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
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        language: currentLang,
        changeLanguage,
        setLanguage: changeLanguage,
        organizationType,
        changeOrganizationType,
        t,
        safeTranslate,
        getTaxonomy,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageProvider;
