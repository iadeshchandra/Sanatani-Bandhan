import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAuthWorkspace } from './AuthWorkspaceContext';

export type GuideLanguage = 'en' | 'hi' | 'bn' | 'sa';

export interface QuickGuideContextType {
  isOpen: boolean;
  activeModuleId: string;
  activeLanguage: GuideLanguage;
  openGuide: (moduleId?: string) => void;
  closeGuide: () => void;
  setLanguage: (lang: GuideLanguage) => void;
  toggleGuide: (moduleId?: string) => void;
}

const QuickGuideContext = createContext<QuickGuideContextType | undefined>(undefined);

const LOCAL_STORAGE_GUIDE_LANG_KEY = 'sanatani_quick_guide_lang';
const LOCAL_STORAGE_GLOBAL_LANG_KEY = 'sanatan_lang';

export interface QuickGuideProviderProps {
  children: ReactNode;
  initialModuleId?: string;
}

export const QuickGuideProvider: React.FC<QuickGuideProviderProps> = ({
  children,
  initialModuleId = 'SMART_BHANDAR',
}) => {
  const { currentUser } = useAuthWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string>(initialModuleId);

  // Auto-detect Language:
  // 1. User profile preferredLanguage
  // 2. Specific QuickGuide stored language
  // 3. Global platform language
  // 4. Browser navigator language (e.g. bn, hi, en)
  // 5. Default to 'hi'
  const [activeLanguage, setActiveLanguageState] = useState<GuideLanguage>(() => {
    try {
      // 1. Check user profile
      const userLang = (currentUser as any)?.preferredLanguage;
      if (userLang && ['en', 'hi', 'bn', 'sa'].includes(userLang)) {
        return userLang as GuideLanguage;
      }

      // 2. Check local storage
      const storedGuideLang = localStorage.getItem(LOCAL_STORAGE_GUIDE_LANG_KEY);
      if (storedGuideLang && ['en', 'hi', 'bn', 'sa'].includes(storedGuideLang)) {
        return storedGuideLang as GuideLanguage;
      }

      const storedGlobalLang = localStorage.getItem(LOCAL_STORAGE_GLOBAL_LANG_KEY);
      if (storedGlobalLang && ['en', 'hi', 'bn', 'sa'].includes(storedGlobalLang)) {
        return storedGlobalLang as GuideLanguage;
      }

      // 3. Browser environment check
      if (typeof navigator !== 'undefined' && navigator.language) {
        const nav = navigator.language.toLowerCase();
        if (nav.startsWith('bn')) return 'bn';
        if (nav.startsWith('hi')) return 'hi';
        if (nav.startsWith('sa')) return 'sa';
        if (nav.startsWith('en')) return 'en';
      }
    } catch (e) {}

    return 'hi'; // Default to Hindi as standard Pan-Indian Dharmic lingua franca
  });

  // Keep in sync with user profile if it updates
  useEffect(() => {
    const userLang = (currentUser as any)?.preferredLanguage;
    if (userLang && ['en', 'hi', 'bn', 'sa'].includes(userLang)) {
      setActiveLanguageState(userLang as GuideLanguage);
    }
  }, [(currentUser as any)?.preferredLanguage]);

  const setLanguage = (lang: GuideLanguage) => {
    setActiveLanguageState(lang);
    try {
      localStorage.setItem(LOCAL_STORAGE_GUIDE_LANG_KEY, lang);
    } catch (e) {}
  };

  const openGuide = (moduleId?: string) => {
    if (moduleId) {
      setActiveModuleId(moduleId);
    }
    setIsOpen(true);
  };

  const closeGuide = () => {
    setIsOpen(false);
  };

  const toggleGuide = (moduleId?: string) => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      if (moduleId) {
        setActiveModuleId(moduleId);
      }
      setIsOpen(true);
    }
  };

  const value = useMemo(
    () => ({
      isOpen,
      activeModuleId,
      activeLanguage,
      openGuide,
      closeGuide,
      setLanguage,
      toggleGuide,
    }),
    [isOpen, activeModuleId, activeLanguage]
  );

  return (
    <QuickGuideContext.Provider value={value}>
      {children}
    </QuickGuideContext.Provider>
  );
};

export const useQuickGuide = (): QuickGuideContextType => {
  const context = useContext(QuickGuideContext);
  if (!context) {
    throw new Error('useQuickGuide must be used within a QuickGuideProvider');
  }
  return context;
};

export default QuickGuideContext;
