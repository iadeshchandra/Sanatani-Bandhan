import React from 'react';
import { Globe, Building2 } from 'lucide-react';
import { useLanguage, OrganizationType } from '../context/LanguageContext';
// Canonical language registry — the single source every picker reads.
// (Language Completion Sweep B1: this file used to carry a hand-copied
// duplicate list; it drifted in order and shape from the registry.)
import { SUPPORTED_LANGUAGES } from '../i18n/schema';
import { workspaceRegistry } from '../lib/workspaceRegistry';
import { orgTypeLabel } from '../types/membership';

/**
 * Org-type options come from the CANONICAL registry — never a hand list.
 * workspaceRegistry is Record<WorkspaceType, …>, so the compiler itself
 * guarantees every one of the platform's 17 workspace types is a key;
 * labels come from ORG_TYPE_LABELS (types/membership), the same source
 * the org directory chips use. (Polish Sweep item 6: this file used to
 * hand-list only Mandir/Ashram/Gurukul/Trust.)
 */
const ORGANIZATION_TYPES: { code: OrganizationType; label: string }[] = (
  Object.keys(workspaceRegistry) as OrganizationType[]
).map((code) => ({ code, label: orgTypeLabel(code) }));

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentLang, changeLanguage, organizationType, changeOrganizationType } = useLanguage();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 1. Organization Type Selector */}
      <div className="relative inline-flex items-center">
        <div className="absolute left-2.5 pointer-events-none text-slate-400 flex items-center">
          <Building2 className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <select
          value={organizationType}
          onChange={(e) => changeOrganizationType(e.target.value as OrganizationType)}
          className="pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer transition-colors shadow-2xs appearance-none"
          title="Select Organization Type Taxonomy"
        >
          {ORGANIZATION_TYPES.map((org) => (
            <option key={org.code} value={org.code}>
              {org.label}
            </option>
          ))}
        </select>
        <div className="absolute right-2 pointer-events-none text-slate-400 text-[9px] font-bold">
          ▼
        </div>
      </div>

      {/* 2. Language Selector */}
      <div className="relative inline-flex items-center">
        <div className="absolute left-2.5 pointer-events-none text-slate-400 flex items-center">
          <Globe className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <select
          value={currentLang}
          onChange={(e) => changeLanguage(e.target.value)}
          className="pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer transition-colors shadow-2xs appearance-none"
          title="Select Platform Language"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.englishName})
            </option>
          ))}
        </select>
        <div className="absolute right-2 pointer-events-none text-slate-400 text-[9px] font-bold">
          ▼
        </div>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
