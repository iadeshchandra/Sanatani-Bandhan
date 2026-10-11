import React from 'react';
import { Globe, Building2 } from 'lucide-react';
import { useLanguage, OrganizationType } from '../context/LanguageContext';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

const ORGANIZATION_TYPES: { code: OrganizationType; label: string }[] = [
  { code: 'Mandir', label: 'Mandir (Temple)' },
  { code: 'Ashram', label: 'Ashram / Matha' },
  { code: 'Gurukul', label: 'Gurukul (Academy)' },
  { code: 'Trust', label: 'Dharmic Trust' },
];

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
              {lang.native} ({lang.label})
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
