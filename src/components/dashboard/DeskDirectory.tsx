import React, { useMemo, useState } from 'react';
import {
  Search,
  X,
  Lock,
  ArrowRight,
  LayoutGrid,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { MODULE_CATALOG, type NavItem } from '../common/Sidebar';
import { UpsellModal } from '../common/UpsellModal';
import { openPlanUpgrade } from '../../billing/PlanUpgradeFlow';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { effectiveDeskScope } from '../../lib/membershipAccess';
import {
  buildDirectoryModel,
  directoryDeskMatchesSearch,
} from '../../lib/deskDirectory';
import { groupByFamily, familyOfDesk, deskFamily } from '../../lib/deskFamilies';
import { getModuleName, getModuleCopy } from '../../suggestions/moduleCopy';
import {
  enableModule,
  usePendingSuggestions,
} from '../../suggestions/store';
import {
  getRecommendations,
  localizeText,
  type Recommendation,
} from '../../suggestions/recommend';
import { getUpcomingFestival, getFestivalName } from '../../suggestions/festivals';
import { SuggestionCard } from '../../suggestions/cards';
import { recordDeskVisit } from '../common/ui/deskHistory';
import { openDeskPanel } from '../../lib/deskPanel';
import type { DeskDoor } from '../../lib/deskDoors';
import { requiredTierForModule } from '../../lib/workspaceRegistry';

/**
 * DeskDirectory — the All-Desks Directory (module-system redesign,
 * 2026-10-23). Replaces the App Store as the discovery surface.
 *
 * One browsable directory of every desk the caller may open, grouped
 * into six plain families (lib/deskFamilies). The set comes from
 * lib/deskDirectory.buildDirectoryModel — the canonical role/scope
 * predicate + family mount truth — so the directory can never promise
 * a desk the mount guards would refuse, and a desk is NEVER hidden
 * for being "not installed" (install gating is retired; see
 * workspaceRegistry.isModuleAllowed). Plan-locked desks stay visible
 * with their plan tag and open the same upsell as the Sidebar.
 *
 * Desk Doors (Bahi-Khata, Batch 3) ride along under their target's
 * family, exactly as in the Sidebar. Suggestions keep flowing here:
 * a pending trigger suggestion or a ranked recommendation renders in
 * the Suggested section with an OPEN action — acting on one records
 * the adoption (enableModule, now bookkeeping only) and opens the
 * desk. This is shell chrome, not a catalog desk: it carries no
 * MODULE_CATALOG row, so the 72-desk count law is untouched.
 */
export const DeskDirectory: React.FC<{
  onNavigate: (moduleId: string) => void;
}> = ({ onNavigate }) => {
  const {
    activeWorkspace,
    effectiveRole,
    checkPermission,
    firebaseUser,
    updateWorkspaceDetails,
  } = useAuthWorkspace();
  const { myMemberships } = useMembership();
  const { t, currentLang } = useLanguage();
  const { devotees, donations } = useData();
  const taxonomy = useWorkspaceTaxonomy();
  const [searchQuery, setSearchQuery] = useState('');
  const [upgradeModuleId, setUpgradeModuleId] = useState<string | null>(null);

  // The caller's own membership edge → desk scope (the Sidebar's law).
  const myMembership = useMemo(
    () =>
      activeWorkspace
        ? (myMemberships.find(
            (m: any) =>
              m.workspaceId === activeWorkspace.id && m.uid === firebaseUser?.uid
          ) as any)
        : undefined,
    [myMemberships, activeWorkspace, firebaseUser]
  );
  const myDeskScope = useMemo(
    () =>
      effectiveDeskScope(myMembership, Date.now(), {
        creatorUid: activeWorkspace?.createdBy,
      }),
    [myMembership, activeWorkspace]
  );

  const model = useMemo(
    () =>
      buildDirectoryModel(
        activeWorkspace,
        {
          role: effectiveRole,
          checkPermission,
          deskScope: myDeskScope,
        },
        MODULE_CATALOG
      ),
    [activeWorkspace, effectiveRole, checkPermission, myDeskScope]
  );

  const labelFor = (m: NavItem): string => {
    if (m.id === 'devotees') return taxonomy.directoryName;
    const translated = t(m.id);
    return translated !== m.id ? translated : m.name;
  };

  const openDesk = (id: string) => {
    recordDeskVisit(id, activeWorkspace?.id || null).catch(() => {});
    onNavigate(id);
  };

  const handleDeskClick = (m: NavItem) => {
    if (model.lockedIds.has(m.id)) {
      setUpgradeModuleId(m.id);
      return;
    }
    openDesk(m.id);
  };

  // A door never selects itself as a module (the deskDoors law): it
  // fires the same deskPanel contract the Sidebar uses — navigate to
  // the target desk with its panel requested. A plan-locked target
  // keeps the C-6 lock.
  const handleDoorClick = (door: DeskDoor) => {
    if (model.lockedIds.has(door.targetDesk)) {
      setUpgradeModuleId(door.targetDesk);
      return;
    }
    openDeskPanel(door.targetDesk, door.panel);
  };

  // ---- Suggested: pending trigger suggestions + ranked picks ----------
  const { suggestions: pendingSuggestions, dismiss } = usePendingSuggestions(
    activeWorkspace?.id
  );
  const visiblePending = useMemo(
    () =>
      pendingSuggestions.filter(
        (s) =>
          model.desks.some((d) => d.id === s.moduleId) &&
          !model.lockedIds.has(s.moduleId)
      ),
    [pendingSuggestions, model]
  );

  const recommendations = useMemo<Recommendation[]>(() => {
    if (!activeWorkspace) return [];
    const festival = getUpcomingFestival(new Date(), 45);
    return getRecommendations({
      orgType: activeWorkspace.type,
      nativeModules: Array.from(model.nativeIds),
      enabledModules: activeWorkspace.enabledModules || [],
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
      recentDeskIds: [],
      lang: currentLang,
    }).filter(
      (r) =>
        model.desks.some((d) => d.id === r.moduleId) &&
        !model.lockedIds.has(r.moduleId) &&
        !visiblePending.some((s) => s.moduleId === r.moduleId)
    );
  }, [activeWorkspace, model, devotees, donations, currentLang, visiblePending]);

  // "Enable" is bookkeeping now — the desk was always present. The
  // adoption write keeps the recommendation engine's exclusion set
  // honest; it is workspace state, so it stays Trustee+ (the desk
  // handlers' law) — everyone else simply opens the desk.
  const recordAdoption = (moduleId: string) => {
    if (!activeWorkspace) return;
    if (!checkPermission(['TRUSTEE', 'SuperAdmin'])) return;
    enableModule(
      activeWorkspace.enabledModules,
      moduleId,
      updateWorkspaceDetails,
      activeWorkspace.id
    );
  };
  const handleOpenSuggestion = (moduleId: string) => {
    recordAdoption(moduleId);
    openDesk(moduleId);
  };
  const handleOpenRecommendation = (r: Recommendation) => {
    recordAdoption(r.moduleId);
    openDesk(r.moduleId);
  };

  // ---- Search + family grouping ---------------------------------------
  const q = searchQuery.trim().toLowerCase();
  const filteredDesks = useMemo(
    () =>
      model.desks.filter((m) =>
        directoryDeskMatchesSearch(m, q, labelFor(m), getModuleName(m.id, currentLang))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, q, currentLang, taxonomy]
  );
  const groups = useMemo(() => groupByFamily(filteredDesks), [filteredDesks]);

  const doorSearchHit = (doorId: string, doorName: string, keywords?: string) =>
    !q ||
    doorName.toLowerCase().includes(q) ||
    doorId.toLowerCase().includes(q) ||
    (keywords || '').toLowerCase().includes(q);

  const tierChipLabel = (id: string) =>
    requiredTierForModule(id) === 'PREMIUM' ? 'Premium' : 'Standard';

  return (
    <div className="min-h-full bg-slate-50/60 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50">
            <LayoutGrid className="h-6 w-6 text-orange-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              {t('suites.seva.directory.title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {t('suites.seva.directory.subtitle')}
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">
            {model.desks.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('suites.seva.directory.searchPlaceholder')}
            aria-label={t('suites.seva.directory.searchPlaceholder')}
            className="min-h-[48px] w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-12 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Margdarshan J1 — the centre's door in the directory. Shell
            chrome like the directory itself (no catalog row): it opens
            the manual/atlas centre, whose own doors are judged by the
            same directory model. Browse mode only. */}
        {!q && (
          <button
            type="button"
            onClick={() => onNavigate('margdarshan')}
            className="group flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-left shadow-sm transition hover:border-orange-300 hover:shadow"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white">
              <BookOpen className="h-5 w-5 text-orange-600" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-amber-900">
                {t('marg.directoryRowTitle')}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-amber-700">
                {t('marg.directoryRowDesc')}
              </span>
            </span>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-amber-400 transition group-hover:text-orange-500"
              aria-hidden="true"
            />
          </button>
        )}

        {/* Suggested — only in browse mode (search narrows to matches). */}
        {!q && (visiblePending.length > 0 || recommendations.length > 0) && (
          <section aria-label={t('suites.seva.directory.suggestedTitle')}>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
              <Sparkles className="h-4 w-4 text-orange-500" aria-hidden="true" />
              {t('suites.seva.directory.suggestedTitle')}
            </h2>
            <div className="space-y-3">
              {visiblePending.map((s) => (
                <SuggestionCard
                  key={s.key}
                  suggestion={s}
                  onOpen={handleOpenSuggestion}
                  onDismiss={dismiss}
                />
              ))}
              {recommendations.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {recommendations.slice(0, 4).map((r) => {
                    const desk = MODULE_CATALOG.find((m) => m.id === r.moduleId);
                    if (!desk) return null;
                    const Icon = desk.icon;
                    const fam = deskFamily(familyOfDesk(r.moduleId) ?? 'records');
                    return (
                      <div
                        key={r.moduleId}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${fam.chipClass}`}
                        >
                          <Icon className={`h-5 w-5 ${fam.iconClass}`} aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-800">
                            {getModuleName(r.moduleId, currentLang)}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
                            {localizeText(r.reason, currentLang)}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenRecommendation(r)}
                            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-orange-600"
                          >
                            {t('suites.seva.cards.open')}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Families */}
        {groups.map(({ family, items }) => {
          const familyDoors = model.doors.filter(
            (d) => familyOfDesk(d.targetDesk) === family.id
          );
          return (
            <section key={family.id} aria-label={t(family.dictKey)}>
              <h2 className="mb-3 flex items-baseline gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                {t(family.dictKey)}
                <span className="font-bold normal-case tracking-normal text-slate-300">
                  {items.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const Icon = m.icon;
                  const locked = model.lockedIds.has(m.id);
                  const doorsHere = familyDoors.filter(
                    (d) =>
                      d.targetDesk === m.id &&
                      doorSearchHit(d.id, d.name, d.keywords)
                  );
                  return (
                    <React.Fragment key={m.id}>
                      <button
                        type="button"
                        onClick={() => handleDeskClick(m)}
                        className="group flex min-h-[44px] w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-orange-200 hover:shadow"
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${family.chipClass}`}
                        >
                          <Icon className={`h-5 w-5 ${family.iconClass}`} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-black text-slate-800">
                              {labelFor(m)}
                            </span>
                            {model.nativeIds.has(m.id) && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                {t('suites.seva.directory.coreBadge')}
                              </span>
                            )}
                            {locked && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
                                <Lock className="h-3 w-3" aria-hidden="true" />
                                {tierChipLabel(m.id)}
                              </span>
                            )}
                            {m.badge && (
                              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-600">
                                {m.badge}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
                            {getModuleCopy(m.id, currentLang)}
                          </span>
                        </span>
                        <ArrowRight
                          className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-orange-500"
                          aria-hidden="true"
                        />
                      </button>
                      {doorsHere.map((door) => {
                        const target = model.desks.find((d) => d.id === door.targetDesk);
                        return (
                          <button
                            key={door.id}
                            type="button"
                            onClick={() => handleDoorClick(door)}
                            className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm transition hover:border-amber-300 hover:shadow"
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white">
                              <BookOpen className="h-5 w-5 text-amber-600" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black text-amber-900">
                                {door.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-amber-700">
                                {target ? labelFor(target) : door.targetDesk}
                              </span>
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                {/* Doors whose target was filtered out by the search but
                    whose own name matched — still discoverable. */}
                {familyDoors
                  .filter(
                    (d) =>
                      !items.some((m) => m.id === d.targetDesk) &&
                      doorSearchHit(d.id, d.name, d.keywords)
                  )
                  .map((door) => (
                    <button
                      key={door.id}
                      type="button"
                      onClick={() => handleDoorClick(door)}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm transition hover:border-amber-300 hover:shadow"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white">
                        <BookOpen className="h-5 w-5 text-amber-600" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-amber-900">
                          {door.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-amber-700">
                          {getModuleName(door.targetDesk, currentLang)}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                    </button>
                  ))}
              </div>
            </section>
          );
        })}

        {groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-base font-black text-slate-700">
              {t('suites.seva.directory.emptyTitle')}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {t('suites.seva.directory.emptyDesc')}
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              {t('suites.seva.directory.title')}
            </button>
          </div>
        )}
      </div>

      <UpsellModal
        isOpen={upgradeModuleId !== null}
        onClose={() => setUpgradeModuleId(null)}
        onUpgrade={() => {
          setUpgradeModuleId(null);
          openPlanUpgrade();
        }}
        module={
          upgradeModuleId
            ? `${upgradeModuleId} (${tierChipLabel(upgradeModuleId)} plan)`
            : ''
        }
      />
    </div>
  );
};

export default DeskDirectory;
