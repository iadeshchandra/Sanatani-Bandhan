/**
 * App Store & Add-ons — rebuilt around Seva Suggestions.
 * ============================================================================
 * The store is no longer the front door for discovery; it is "browse
 * everything" for power users. The top section is "Recommended for you" —
 * ranked by org-type affinity, festival proximity, workspace size signals,
 * and adjacent usage — each with a one-line honest reason and one-tap
 * enable. Every module card now carries real outcome-focused copy
 * (src/suggestions/moduleCopy.ts) instead of the old generic sentence.
 *
 * i18n: all chrome via t('suites.seva.appstore.*'); module names and
 * one-line copy via getModuleName()/getModuleCopy(); festival names via
 * getFestivalName().
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Layers as Blocks, CheckCircle2, Download, Trash2, Search, ShieldAlert, Sparkles, Filter, Settings, Layers, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { MODULE_CATALOG } from '../common/Sidebar';
import { workspaceRegistry, resolveOrgModuleId } from '../../lib/workspaceRegistry';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { getRecentDesks } from '../common/ui/deskHistory';
import { getModuleCopy, getModuleName } from '../../suggestions/moduleCopy';
import { getRecommendations, localizeText, type Recommendation } from '../../suggestions/recommend';
import { getUpcomingFestival, getFestivalName } from '../../suggestions/festivals';
import {
  usePendingSuggestions,
  enableModule,
  dismissSuggestion,
  isSuggestionDismissed,
} from '../../suggestions/store';
import { SuggestionCard } from '../../suggestions/cards';

/** Sidebar domainTitle → suites.seva.appstore.domains.* dictionary key. */
const DOMAIN_TITLE_KEYS: Record<string, string> = {
  'Personal': 'suites.seva.appstore.domains.personal',
  'Core Command & CRM': 'suites.seva.appstore.domains.core',
  'Financials & Assets': 'suites.seva.appstore.domains.finance',
  'Vedic Rituals & Ephemeris': 'suites.seva.appstore.domains.vedic',
  'Specialized Desks': 'suites.seva.appstore.domains.specialized',
  'Matrimony & Outreach': 'suites.seva.appstore.domains.outreach',
  'Governance & Security': 'suites.seva.appstore.domains.governance',
  'Sanatani Life & Connect': 'suites.seva.appstore.domains.life',
};

export const AppStoreDesk: React.FC = () => {
  const { activeWorkspace, updateWorkspaceDetails } = useAuthWorkspace();
  const { showToast } = useToast();
  const { t, currentLang } = useLanguage();
  const { devotees, donations } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Native' | 'Installed' | 'Available'>('All');
  const [recentDeskIds, setRecentDeskIds] = useState<string[]>([]);
  const [recDismissVersion, setRecDismissVersion] = useState(0);

  useEffect(() => {
    // QUEUED #50 (D11b): recents are scoped to the active workspace.
    getRecentDesks(activeWorkspace?.id || null).then(setRecentDeskIds).catch(() => {});
  }, [activeWorkspace?.id]);

  const { suggestions: pendingSuggestions, dismiss: dismissPending } = usePendingSuggestions(
    activeWorkspace?.id
  );

  const baseModules = activeWorkspace ? workspaceRegistry[activeWorkspace.type] || [] : [];
  const enabledModules = activeWorkspace?.enabledModules || [];

  /** Localised domain (category) title, with fallback to the registry title. */
  const domainTitle = (dt: string): string => {
    const k = DOMAIN_TITLE_KEYS[dt];
    return k ? t(k) : dt;
  };

  // ---- Ranked recommendations -------------------------------------------
  const recommendations: Recommendation[] = useMemo(() => {
    if (!activeWorkspace) return [];
    const festival = getUpcomingFestival(new Date(), 45);
    const recs = getRecommendations({
      orgType: activeWorkspace.type,
      nativeModules: baseModules,
      enabledModules,
      devoteeCount: (devotees || []).length,
      donationCount: (donations || []).length,
      daysToFestival: festival ? festival.daysAway : null,
      festivalName: festival
        ? {
            en: getFestivalName(festival, 'en'),
            hi: getFestivalName(festival, 'hi'),
            bn: getFestivalName(festival, 'bn'),
          }
        : null,
      recentDeskIds,
      lang: currentLang,
    });
    // Drop recommendations the user already dismissed; drop ones that have a
    // pending trigger suggestion (the trigger card renders instead).
    const pendingIds = new Set(pendingSuggestions.map((s) => s.moduleId));
    return recs.filter(
      (r) =>
        !pendingIds.has(r.moduleId) &&
        !isSuggestionDismissed(activeWorkspace.id, `rec:${r.moduleId}`)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeWorkspace?.id,
    activeWorkspace?.type,
    enabledModules.join(','),
    (devotees || []).length,
    (donations || []).length,
    recentDeskIds.join(','),
    pendingSuggestions.length,
    recDismissVersion,
    currentLang,
  ]);

  if (!activeWorkspace) return null;

  // QUEUED #57 (audit A1-D01): availability is judged canonically, the
  // same key nav and mount use — a legacy enabled entry stored under an
  // alias id still makes its desk "available" here.
  const isAvailable = (id: string) =>
    baseModules.includes(resolveOrgModuleId(id)) ||
    enabledModules.some((e) => resolveOrgModuleId(e) === resolveOrgModuleId(id));

  const handleEnable = (moduleId: string) => {
    enableModule(enabledModules, moduleId, updateWorkspaceDetails, activeWorkspace.id);
    // A dismissed recommendation for this module should not haunt the user.
    const modName = getModuleName(moduleId, currentLang);
    showToast(
      t('suites.seva.appstore.toasts.enabled').replace('{name}', modName),
      'success',
      t('suites.seva.appstore.toasts.enabledTitle')
    );
  };

  const handleToggleModule = (moduleId: string, isInstalling: boolean) => {
    if (isInstalling) {
      handleEnable(moduleId);
      return;
    }
    // QUEUED #57: uninstall removes the canonical entry AND any legacy
    // alias entry naming the same desk — a raw-id filter used to leave
    // the alias behind, so the desk stayed enabled after "uninstall".
    const canonical = resolveOrgModuleId(moduleId);
    const newEnabled = enabledModules.filter((id) => resolveOrgModuleId(id) !== canonical);
    updateWorkspaceDetails({ enabledModules: newEnabled });
    showToast(t('suites.seva.appstore.toasts.uninstalled'), 'success');
  };

  const handleDismissRec = (moduleId: string) => {
    if (!activeWorkspace?.id) return;
    dismissSuggestion(activeWorkspace.id, `rec:${moduleId}`);
    setRecDismissVersion((v) => v + 1);
  };

  const showRecommendations = recommendations.length > 0 || pendingSuggestions.length > 0;

  const filterKeys = ['all', 'native', 'installed', 'available'] as const;
  const filterValues: Record<(typeof filterKeys)[number], 'All' | 'Native' | 'Installed' | 'Available'> = {
    all: 'All',
    native: 'Native',
    installed: 'Installed',
    available: 'Available',
  };

  const processedModules = MODULE_CATALOG.filter(m =>
    // 'workspace-hub' joins the never-sold shell desks (QUEUED #57): it
    // is always available to Trustees, not an installable add-on.
    !['dashboard', 'appStore', 'sadhana-karma', 'sanatani-vivah', 'yatraNet', 'workspace-hub'].includes(m.id)
  ).map(m => {
    const isNative = baseModules.includes(m.id);
    // QUEUED #57: canonical — a legacy alias entry in enabledModules
    // still shows its desk as Installed (and uninstall above clears it).
    const isInstalled = enabledModules.some((e) => resolveOrgModuleId(e) === m.id);

    let status: 'Native' | 'Installed' | 'Available' = 'Available';
    if (isNative) status = 'Native';
    else if (isInstalled) status = 'Installed';

    return { ...m, status };
  });

  const filteredModules = processedModules.filter(m => {
    const name = getModuleName(m.id, currentLang);
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          domainTitle(m.domainTitle).toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    return m.status === activeFilter;
  });

  // Group by Domain
  const groupedModules = filteredModules.reduce((acc, module) => {
    if (!acc[module.domainTitle]) {
      acc[module.domainTitle] = [];
    }
    acc[module.domainTitle].push(module);
    return acc;
  }, {} as Record<string, typeof processedModules>);

  return (
    <div className="flex flex-col h-full bg-temple-950 text-temple-200">
      {/* Header */}
      <div className="shrink-0 border-b border-temple-800 bg-temple-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Sparkles size={12} /> {t('suites.seva.appstore.header.badge')}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <Blocks className="w-8 h-8 text-indigo-500" />
                {t('suites.seva.appstore.header.title')}
              </h1>
              <p className="text-sm text-temple-400 mt-2 font-medium max-w-2xl leading-relaxed">
                {t('suites.seva.appstore.header.subtitle')}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex gap-2">
                {filterKeys.map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(filterValues[f])}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
                      activeFilter === filterValues[f]
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-temple-900 text-temple-400 border-temple-800 hover:text-temple-200 hover:bg-temple-800'
                    }`}
                  >
                    {t(`suites.seva.appstore.filters.${f}`)}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-temple-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t('suites.seva.appstore.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-temple-900 border border-temple-800 rounded-lg text-sm text-temple-200 placeholder-temple-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">

        {/* ---- Recommended for you ---- */}
        {showRecommendations && (
          <section aria-label={t('suites.seva.appstore.recommended.title')} className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-saffron-400" aria-hidden="true" />
              <h2 className="text-lg font-black text-white">
                {t('suites.seva.appstore.recommended.title')}
              </h2>
              <div className="h-px bg-temple-800 flex-1"></div>
            </div>
            <p className="text-xs text-temple-500 mb-5 max-w-2xl">
              {t('suites.seva.appstore.recommended.subtitle')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {pendingSuggestions.map((s) => (
                <SuggestionCard
                  key={s.key}
                  suggestion={s}
                  onEnable={handleEnable}
                  onDismiss={dismissPending}
                />
              ))}
              {recommendations.map((rec) => {
                const mod = MODULE_CATALOG.find((m) => m.id === rec.moduleId);
                const Icon = mod?.icon || Sparkles;
                const modName = getModuleName(rec.moduleId, currentLang);
                return (
                  <div
                    key={rec.moduleId}
                    className="relative rounded-2xl border border-temple-800 bg-temple-900 p-4 sm:p-5 hover:border-temple-700 transition-all flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => handleDismissRec(rec.moduleId)}
                      aria-label={t('suites.seva.appstore.recommended.dismissLabel').replace('{name}', modName)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-temple-600 hover:text-temple-300 hover:bg-temple-800 transition-all"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                      </div>
                      <div className="pr-6">
                        <h3 className="font-bold text-temple-100 leading-tight">{modName}</h3>
                        <p className="text-[11px] text-saffron-400/90 font-semibold mt-1 leading-snug">
                          {localizeText(rec.reason, currentLang)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-temple-400 leading-relaxed mb-4 flex-1">
                      {getModuleCopy(rec.moduleId, currentLang)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleEnable(rec.moduleId)}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-md text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <Download size={16} aria-hidden="true" />
                      {t('suites.seva.appstore.recommended.enableModule')}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---- Full catalog ---- */}
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-black text-white">
            {t('suites.seva.appstore.catalog.title')}
          </h2>
          <div className="h-px bg-temple-800 flex-1"></div>
        </div>

        {Object.keys(groupedModules).length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-temple-900 rounded-full flex items-center justify-center mb-4 border border-temple-800">
              <Layers className="w-8 h-8 text-temple-600" />
            </div>
            <h3 className="text-xl font-black text-temple-300">{t('suites.seva.appstore.catalog.emptyTitle')}</h3>
            <p className="text-temple-500 text-sm mt-2 max-w-sm">
              {t('suites.seva.appstore.catalog.emptyDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-12 pb-12">
            {Object.entries(groupedModules).map(([domain, mods]) => (
              <div key={domain}>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-lg font-black text-white">{domainTitle(domain)}</h2>
                  <div className="h-px bg-temple-800 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mods.map(mod => {
                    const Icon = mod.icon;
                    return (
                      <div key={mod.id} className="bg-temple-900 border border-temple-800 rounded-2xl p-5 hover:border-temple-700 transition-all flex flex-col group relative overflow-hidden shadow-sm hover:shadow-xl">

                        {/* Native Badge Overlay */}
                        {mod.status === 'Native' && (
                          <div className="absolute top-0 right-0">
                             <div className="bg-temple-800 text-[9px] font-black uppercase tracking-widest text-temple-400 px-3 py-1 rounded-bl-xl border-l border-b border-temple-700/50 flex items-center gap-1">
                               <Settings size={10} /> {t('suites.seva.appstore.catalog.nativeBadge')}
                             </div>
                          </div>
                        )}

                        <div className="flex items-start gap-4 mb-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
                            mod.status === 'Native' ? 'bg-temple-800 border-temple-700 text-temple-400' :
                            mod.status === 'Installed' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' :
                            'bg-temple-950 border-temple-800 text-temple-500'
                          }`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="pr-4">
                            <h3 className="font-bold text-temple-100 leading-tight mb-1">{getModuleName(mod.id, currentLang)}</h3>
                            {mod.badge && (
                              <span className="inline-block px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                {mod.badge}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Real outcome-focused copy for every module */}
                        <p className="text-xs text-temple-400 leading-relaxed mb-6 mt-1 flex-1">
                          {getModuleCopy(mod.id, currentLang)}
                        </p>

                        <div className="pt-4 border-t border-temple-800/50 mt-auto">
                          {mod.status === 'Native' ? (
                            <button disabled className="w-full py-2.5 rounded-xl bg-temple-950 border border-temple-800 text-temple-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 opacity-70 cursor-not-allowed">
                              <CheckCircle2 size={16} /> {t('suites.seva.appstore.catalog.includedIn').replace('{orgType}', activeWorkspace.type)}
                            </button>
                          ) : mod.status === 'Installed' ? (
                            <button
                              onClick={() => handleToggleModule(mod.id, false)}
                              className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            >
                              <Trash2 size={16} /> {t('suites.seva.appstore.catalog.uninstall')}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleModule(mod.id, true)}
                              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-md text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            >
                              <Download size={16} /> {t('suites.seva.appstore.catalog.install')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
