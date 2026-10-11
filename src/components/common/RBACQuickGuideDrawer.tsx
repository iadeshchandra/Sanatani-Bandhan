import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  ClipboardList,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Copy,
  Check,
  FileText,
  Boxes,
  Receipt,
  Heart,
  Scale,
  Building,
  GraduationCap,
  Users,
  UserCheck,
  Flame,
  HelpCircle,
  ArrowRight,
  Compass,
  Scroll,
  Lock,
  Coins
} from 'lucide-react';
import { useQuickGuide, GuideLanguage } from '../../context/QuickGuideContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import {
  SHASTRIC_TERMINOLOGY,
  ShastricTerm,
  TermCategory,
  getModuleRoleSOP,
  searchTerminology,
  getTermByKey,
  ModuleRoleSOP,
  RoleSOPStep
} from '../../data/shastricTerminology';

// UI Labels across the 4 languages
const UI_LABELS: Record<GuideLanguage, {
  guideTitle: string;
  sopTab: string;
  lexiconTab: string;
  roleScope: string;
  complianceShield: string;
  checklistHeader: string;
  searchPlaceholder: string;
  allCategories: string;
  shastricCategory: string;
  financeCategory: string;
  operationsCategory: string;
  sourceReference: string;
  copyDefinition: string;
  copied: string;
  viewInLexicon: string;
  close: string;
  switchModule: string;
  checklistCompleted: string;
  noResults: string;
}> = {
  hi: {
    guideTitle: 'शास्त्रीय एवं वैधानिक त्वरित मार्गदर्शिका (SOP)',
    sopTab: '📋 कार्यप्रणाली (Role SOP)',
    lexiconTab: '📖 शास्त्रीय शब्दकोश (Lexicon)',
    roleScope: 'सक्रिय अधिकार क्षेत्र एवं भूमिका',
    complianceShield: 'वैदिक एवं वैधानिक अनुपालन संरक्षित',
    checklistHeader: 'दैनिक कार्य अनुपालन चेकलिस्ट',
    searchPlaceholder: 'पारिभाषिक शब्द, शास्त्र संदर्भ या अर्थ खोजें...',
    allCategories: 'सभी वर्ग',
    shastricCategory: 'शास्त्रीय मर्यादा',
    financeCategory: 'वित्तीय एवं आयकर',
    operationsCategory: 'मंदिर संचालन',
    sourceReference: 'शास्त्रीय / वैधानिक संदर्भ',
    copyDefinition: 'परिभाषा कॉपी करें',
    copied: 'कॉपी हो गई!',
    viewInLexicon: 'शब्दकोश में देखें',
    close: 'बंद करें',
    switchModule: 'अन्य मॉड्यूल का मार्गदर्शन देखें',
    checklistCompleted: 'सभी कार्य पूर्ण!',
    noResults: 'कोई शब्द नहीं मिला। अन्य भाषा या वर्ग चुनें।',
  },
  bn: {
    guideTitle: 'শাস্ত্রীয় ও সংবিধিবদ্ধ নির্দেশিকা (SOP)',
    sopTab: '📋 দায়িত্বভিত্তিক কার্যপদ্ধতি (SOP)',
    lexiconTab: '📖 সনাতন শব্দকোষ (Lexicon)',
    roleScope: 'বর্তমান ভূমিকা ও অনুমোদন পরিধি',
    complianceShield: 'শাস্ত্রীয় ও আইনি বিধি সংরক্ষিত',
    checklistHeader: 'দৈনিক কর্মপদ্ধতি চেকলিস্ট',
    searchPlaceholder: 'শাস্ত্রীয় শব্দ, আইনি নিয়ম বা অর্থ খুঁজুন...',
    allCategories: 'সকল বিভাগ',
    shastricCategory: 'শাস্ত্রীয় অনুশাসন',
    financeCategory: 'আর্থিক ও করবিধি',
    operationsCategory: 'মন্দির পরিচালনা',
    sourceReference: 'শাস্ত্রীয় / আইনি উৎস',
    copyDefinition: 'সংজ্ঞা কপি করুন',
    copied: 'কপি সম্পন্ন!',
    viewInLexicon: 'শব্দকোষে দেখুন',
    close: 'বন্ধ করুন',
    switchModule: 'অন্যান্য মডিউলের নির্দেশিকা',
    checklistCompleted: 'সমস্ত ধাপ সম্পন্ন!',
    noResults: 'কোনো ফলাফল পাওয়া যায়নি।',
  },
  en: {
    guideTitle: 'Shastric & Statutory Quick Guide (SOP)',
    sopTab: '📋 Role SOP & Workflows',
    lexiconTab: '📖 Shastric Lexicon (Dictionary)',
    roleScope: 'Active Role Authorization',
    complianceShield: 'Vedic & Statutory Protected',
    checklistHeader: 'Mandatory Compliance Checklist',
    searchPlaceholder: 'Search terminology, canonical source or rules...',
    allCategories: 'All Categories',
    shastricCategory: 'Shastric Norms',
    financeCategory: 'Finance & Tax',
    operationsCategory: 'Temple Operations',
    sourceReference: 'Canonical / Statutory Source',
    copyDefinition: 'Copy Definition',
    copied: 'Copied!',
    viewInLexicon: 'View in Lexicon',
    close: 'Close',
    switchModule: 'Switch Module SOP Guide',
    checklistCompleted: 'All steps completed!',
    noResults: 'No glossary terms found matching query.',
  },
  sa: {
    guideTitle: 'शास्त्रसम्मत-वैधानिक-कार्यविधि-दर्शिका (SOP)',
    sopTab: '📋 कार्यविधिः (Role SOP)',
    lexiconTab: '📖 शास्त्रशब्दकोशः (Lexicon)',
    roleScope: 'अधिकारक्षेत्रं दायित्वं च',
    complianceShield: 'वैदिक-वैधानिक-नियम-संरक्षितम्',
    checklistHeader: 'दैनिक-अनुष्ठान-सूची',
    searchPlaceholder: 'पारिभाषिकशब्दं शास्त्रोल्लेखं वा अन्विषन्तु...',
    allCategories: 'सर्वे वर्गाः',
    shastricCategory: 'शास्त्रमर्यादा',
    financeCategory: 'कोष-आयकर-नियमः',
    operationsCategory: 'देवस्थान-सञ्चालनम्',
    sourceReference: 'शास्त्रीयः / वैधानिकः आधारः',
    copyDefinition: 'परिभाषां प्रतिलिपिं कुर्वन्तु',
    copied: 'प्रतिलिपिः कृता!',
    viewInLexicon: 'शब्दकोशे पश्यन्तु',
    close: 'पिदधातु',
    switchModule: 'अन्येषां विभागानां मार्गदर्शिका',
    checklistCompleted: 'सर्वाणि कार्याणि संवृत्तानि!',
    noResults: 'कोऽपि शब्दः न लब्धः।',
  },
};

// Module metadata mappings for quick visual icons
const MODULE_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  SMART_BHANDAR: { icon: Boxes, color: 'text-amber-400', label: 'Smart Bhandar & BOM' },
  FORM_10BD: { icon: Receipt, color: 'text-emerald-400', label: 'Form 10BD & 80G Filing' },
  FEDERATION_SWEEP: { icon: Building, color: 'text-blue-400', label: 'Federation Cash Sweeps' },
  FAMILY_MATRIMONY: { icon: Heart, color: 'text-rose-400', label: 'Vanshavali & Matrimony' },
  PUROHIT_PORTAL: { icon: Flame, color: 'text-amber-500', label: 'Purohit Diary & Dakshina' },
  GOSHALA_DESK: { icon: Heart, color: 'text-emerald-400', label: 'Goshala Sanctuary' },
  HUNDI_VAULT: { icon: Lock, color: 'text-amber-400', label: 'Hundi & Golak Vault Audit' },
  RATNA_BHANDAR: { icon: Sparkles, color: 'text-yellow-400', label: 'Ratna Bhandar & Bullion' },
  SEVADAR_ROSTER: { icon: UserCheck, color: 'text-amber-400', label: 'Sevadar HR Desk & Volunteer Roster' },
};

export const RBACQuickGuideDrawer: React.FC = () => {
  const { isOpen, closeGuide, activeModuleId, openGuide, activeLanguage, setLanguage } = useQuickGuide();
  const { currentRole, activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'SOP' | 'LEXICON'>('SOP');
  const [lexiconQuery, setLexiconQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TermCategory | 'ALL'>('ALL');
  const [hoveredTerm, setHoveredTerm] = useState<ShastricTerm | null>(null);
  const [selectedTermInLexicon, setSelectedTermInLexicon] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Checklist state for active module & role
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeGuide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeGuide]);

  // Current SOP data
  const currentSOP: ModuleRoleSOP = useMemo(() => {
    return getModuleRoleSOP(activeModuleId, currentRole || 'SEVADAR');
  }, [activeModuleId, currentRole]);

  // Filtered Lexicon terms
  const filteredTerms = useMemo(() => {
    return searchTerminology(lexiconQuery, selectedCategory, activeLanguage);
  }, [lexiconQuery, selectedCategory, activeLanguage]);

  const labels = UI_LABELS[activeLanguage];

  // Helper to copy term definition
  const handleCopyDefinition = (term: ShastricTerm) => {
    const textToCopy = `${term.label[activeLanguage]}: ${term.definition[activeLanguage]} (Ref: ${term.canonicalReference || 'Sanatani Shastras'})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(term.termKey);
    showToast(`Definition of ${term.label[activeLanguage]} copied!`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Switch to lexicon and highlight term
  const handleJumpToLexiconTerm = (termKey: string) => {
    setSelectedCategory('ALL');
    setLexiconQuery('');
    setSelectedTermInLexicon(termKey);
    setActiveTab('LEXICON');
    setHoveredTerm(null);
  };

  // Render text with interactive terminology chips
  const renderTextWithTerminologyChips = (text: string) => {
    // Regex matching all termKeys in SHASTRIC_TERMINOLOGY
    const termKeys = SHASTRIC_TERMINOLOGY.map((t) => t.termKey);
    const regex = new RegExp(`\\b(${termKeys.join('|')})\\b`, 'gi');

    const parts = text.split(regex);

    return parts.map((part, index) => {
      const match = SHASTRIC_TERMINOLOGY.find(
        (t) => t.termKey.toLowerCase() === part.toLowerCase()
      );

      if (match) {
        return (
          <span
            key={index}
            onClick={() => setHoveredTerm(match)}
            className="inline-flex items-center gap-0.5 mx-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border-b-2 border-dotted border-amber-400 text-amber-300 font-bold text-xs hover:bg-amber-500/25 hover:border-amber-300 transition-all cursor-pointer group"
            title={`Click to inspect Shastric meaning: ${match.label[activeLanguage]}`}
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-400 group-hover:scale-125 transition-transform" />
            <span>{match.label[activeLanguage].split('(')[0].trim() || part}</span>
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  const moduleIconInfo = MODULE_ICONS[activeModuleId.toUpperCase().replace(/-/g, '_')] || {
    icon: HelpCircle,
    color: 'text-amber-400',
    label: currentSOP.moduleName[activeLanguage],
  };
  const ModuleIconComponent = moduleIconInfo.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop with subtle blur */}
      <div
        onClick={closeGuide}
        className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
      />

      {/* Slide-over Right Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <aside
          ref={drawerRef}
          className="w-screen max-w-2xl bg-stone-950 border-l border-amber-500/30 text-stone-100 shadow-2xl flex flex-col justify-between animate-slideLeft relative overflow-hidden"
        >
          {/* Top Decorative Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* =================================================================
              DRAWER HEADER
          ================================================================= */}
          <header className="p-5 sm:p-6 bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border-b border-amber-500/20 relative z-10 shrink-0 space-y-4">
            {/* Top Bar: Icon, Title & Close */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                  <ModuleIconComponent className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      RBAC SOP & LEXICON
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">
                      Role: <strong className="text-amber-200 uppercase">{currentRole || 'SEVADAR'}</strong>
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-amber-100 tracking-tight mt-0.5 leading-snug">
                    {labels.guideTitle}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeGuide}
                className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors cursor-pointer"
                title={labels.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Selector Pill Buttons (4 Languages: HI, BN, EN, SA) */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Language / भाषा / ভাষা:
              </span>

              <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-2xl border border-stone-800">
                {/* Hindi */}
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeLanguage === 'hi'
                      ? 'bg-amber-500 text-stone-950 font-black shadow'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  🇮🇳 हिन्दी
                </button>

                {/* Bengali */}
                <button
                  type="button"
                  onClick={() => setLanguage('bn')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeLanguage === 'bn'
                      ? 'bg-amber-500 text-stone-950 font-black shadow'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  বাংলা
                </button>

                {/* English */}
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeLanguage === 'en'
                      ? 'bg-amber-500 text-stone-950 font-black shadow'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  English
                </button>

                {/* Sanskrit */}
                <button
                  type="button"
                  onClick={() => setLanguage('sa')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeLanguage === 'sa'
                      ? 'bg-amber-500 text-stone-950 font-black shadow'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  संस्कृतम्
                </button>
              </div>
            </div>

            {/* Tab Selection: 1. Role SOP vs 2. Shastric Lexicon */}
            <div className="flex rounded-2xl bg-stone-950 p-1 border border-stone-800">
              <button
                type="button"
                onClick={() => setActiveTab('SOP')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'SOP'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>{labels.sopTab}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('LEXICON')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'LEXICON'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{labels.lexiconTab}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-900 text-amber-300 ml-1">
                  {SHASTRIC_TERMINOLOGY.length}
                </span>
              </button>
            </div>
          </header>

          {/* =================================================================
              DRAWER CONTENT BODY
          ================================================================= */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar relative z-10">

            {/* TAB 1: ROLE STANDARD OPERATING PROCEDURE (SOP) */}
            {activeTab === 'SOP' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Role Authorization & Module Banner */}
                <div className="p-4 rounded-3xl bg-stone-900/90 border border-amber-500/20 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      {currentSOP.roleLabel[activeLanguage]}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">
                      Module: <strong className="text-white">{currentSOP.moduleName[activeLanguage]}</strong>
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed">
                    {renderTextWithTerminologyChips(currentSOP.roleSummary[activeLanguage])}
                  </p>
                </div>

                {/* Sequential Operational Steps */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Prescribed Standard Operating Steps</span>
                    </h3>
                    <span className="text-[10px] text-amber-300 font-mono">
                      {currentSOP.steps.length} Steps
                    </span>
                  </div>

                  <div className="space-y-3">
                    {currentSOP.steps.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 transition-colors space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-black text-white leading-snug">
                            {step.title[activeLanguage]}
                          </h4>
                          {step.complianceTag && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                              {step.complianceTag}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-300 leading-relaxed">
                          {renderTextWithTerminologyChips(step.description[activeLanguage])}
                        </p>

                        {step.actionRequired && (
                          <div className="pt-2 border-t border-stone-800/80 flex items-center gap-2 text-[11px] text-amber-300 font-medium">
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              <strong>Action:</strong> {step.actionRequired[activeLanguage]}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Role Compliance Checklist */}
                {currentSOP.checklistItems.length > 0 && (
                  <div className="p-4 rounded-3xl bg-stone-900/90 border border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-stone-300 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{labels.checklistHeader}</span>
                      </h4>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        {
                          currentSOP.checklistItems.filter(
                            (_, idx) => checkedItems[`${activeModuleId}_${currentRole}_${idx}`]
                          ).length
                        }{' '}
                        / {currentSOP.checklistItems.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {currentSOP.checklistItems.map((item, idx) => {
                        const checkKey = `${activeModuleId}_${currentRole}_${idx}`;
                        const isChecked = Boolean(checkedItems[checkKey]);

                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-stone-200'
                                : 'bg-stone-950 border-stone-800/80 text-stone-300 hover:border-stone-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setCheckedItems((prev) => ({
                                  ...prev,
                                  [checkKey]: e.target.checked,
                                }));
                              }}
                              className="mt-0.5 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900 cursor-pointer"
                            />
                            <span className={isChecked ? 'line-through text-stone-400' : ''}>
                              {item[activeLanguage]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Switch to Other Core Modules SOPs */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-black text-stone-500 block mb-2">
                    {labels.switchModule}:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(MODULE_ICONS).map(([modKey, modMeta]) => {
                      const IconComp = modMeta.icon;
                      const isCurrent = activeModuleId.toUpperCase().replace(/-/g, '_') === modKey;

                      return (
                        <button
                          key={modKey}
                          type="button"
                          onClick={() => openGuide(modKey)}
                          className={`p-2 rounded-xl text-left border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                            isCurrent
                              ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800'
                          }`}
                        >
                          <IconComp className={`w-3.5 h-3.5 ${modMeta.color}`} />
                          <span className="truncate">{modMeta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SHASTRIC & STATUTORY LEXICON (DICTIONARY) */}
            {activeTab === 'LEXICON' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={lexiconQuery}
                    onChange={(e) => setLexiconQuery(e.target.value)}
                    placeholder={labels.searchPlaceholder}
                    className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                  />
                  {lexiconQuery && (
                    <button
                      type="button"
                      onClick={() => setLexiconQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCategory === 'ALL'
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {labels.allCategories}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('SHASTRIC')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCategory === 'SHASTRIC'
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    🚩 {labels.shastricCategory}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('FINANCE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCategory === 'FINANCE'
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    ⚖️ {labels.financeCategory}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('OPERATIONS')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCategory === 'OPERATIONS'
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    📦 {labels.operationsCategory}
                  </button>
                </div>

                {/* Terminology Cards List */}
                <div className="space-y-4">
                  {filteredTerms.length === 0 ? (
                    <div className="p-8 text-center bg-stone-900/50 rounded-3xl border border-stone-800 space-y-2">
                      <HelpCircle className="w-8 h-8 text-stone-600 mx-auto" />
                      <p className="text-xs text-stone-400">{labels.noResults}</p>
                    </div>
                  ) : (
                    filteredTerms.map((term) => {
                      const isSelected = selectedTermInLexicon === term.termKey;

                      return (
                        <div
                          key={term.termKey}
                          id={`term-${term.termKey}`}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-amber-950/30 border-amber-500 shadow-xl shadow-amber-500/10'
                              : 'bg-stone-900/90 border-stone-800 hover:border-amber-500/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                                  {term.termKey}
                                </span>
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    term.category === 'SHASTRIC'
                                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                      : term.category === 'FINANCE'
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                                  }`}
                                >
                                  {term.category}
                                </span>
                              </div>

                              <h4 className="text-sm sm:text-base font-black text-white mt-1 leading-snug">
                                {term.label[activeLanguage]}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyDefinition(term)}
                              className="p-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors cursor-pointer shrink-0"
                              title={labels.copyDefinition}
                            >
                              {copiedKey === term.termKey ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Definition in active language */}
                          <p className="text-xs text-stone-200 leading-relaxed font-sans mt-2">
                            {term.definition[activeLanguage]}
                          </p>

                          {/* Secondary Language Translations accordion preview */}
                          <div className="mt-3 pt-2.5 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-400">
                            {activeLanguage !== 'sa' && (
                              <div>
                                <span className="text-[10px] text-amber-400 font-mono block">संस्कृतम्:</span>
                                <span className="text-stone-300 font-serif">{term.definition.sa}</span>
                              </div>
                            )}
                            {activeLanguage !== 'hi' && (
                              <div>
                                <span className="text-[10px] text-amber-400 font-mono block">हिन्दी:</span>
                                <span>{term.definition.hi}</span>
                              </div>
                            )}
                            {activeLanguage !== 'bn' && (
                              <div>
                                <span className="text-[10px] text-amber-400 font-mono block">বাংলা:</span>
                                <span>{term.definition.bn}</span>
                              </div>
                            )}
                            {activeLanguage !== 'en' && (
                              <div>
                                <span className="text-[10px] text-amber-400 font-mono block">English:</span>
                                <span>{term.definition.en}</span>
                              </div>
                            )}
                          </div>

                          {/* Canonical Shastric / Statutory Reference */}
                          {term.canonicalReference && (
                            <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                              <span className="flex items-center gap-1 text-stone-500">
                                <Scroll className="w-3 h-3 text-amber-500" />
                                {labels.sourceReference}:
                              </span>
                              <span className="text-amber-300 font-bold">
                                {term.canonicalReference}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* =================================================================
              INLINE TERM INTERACTIVE POPOVER MODAL
          ================================================================= */}
          {hoveredTerm && (
            <div className="absolute inset-x-4 bottom-4 z-50 bg-stone-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl space-y-3 animate-scaleUp">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      {hoveredTerm.category}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">
                      Ref: {hoveredTerm.canonicalReference || 'Sanatan Dharmashastra'}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-amber-200 mt-1">
                    {hoveredTerm.label[activeLanguage]}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setHoveredTerm(null)}
                  className="p-1 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-white leading-relaxed bg-stone-950 p-3 rounded-2xl border border-stone-800">
                {hoveredTerm.definition[activeLanguage]}
              </p>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleJumpToLexiconTerm(hoveredTerm.termKey)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{labels.viewInLexicon}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyDefinition(hoveredTerm)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{labels.copyDefinition}</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              DRAWER FOOTER
          ================================================================= */}
          <footer className="p-4 bg-stone-900 border-t border-stone-800/80 text-center relative z-10 shrink-0">
            <p className="text-[10px] text-stone-400 font-mono">
              🚩 <strong>Sanatani Bandhan Shastric Governance</strong> • All role actions cryptographically logged to Mandir Trust Ledger.
            </p>
          </footer>
        </aside>
      </div>
    </div>
  );
};

export default RBACQuickGuideDrawer;
