/**
 * MargdarshanCentre — the in-app centre home (Margdarshan J1).
 * =====================================================================
 * Mounted by AppContent as shell chrome on activeModule ===
 * 'margdarshan' (the desk-directory precedent: it carries no
 * MODULE_CATALOG row, and it judges desk doors with the directory's
 * own model, lib/deskDirectory — so a door here can never promise a
 * desk the mount guards would refuse).
 *
 * Views: home (greeting, search, the four wings, most-needed) ·
 * manual (browse/search every page) · atlas · one desk page.
 * The desk page's role door: openable → a real door into the desk
 * (Bahi-Khata uses its deskPanel door, like the Sidebar); plan-locked
 * or role-closed → an honest explanation, never a dead button.
 */

import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { MODULE_CATALOG } from '../common/Sidebar';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useLanguage } from '../../context/LanguageContext';
import { effectiveDeskScope } from '../../lib/membershipAccess';
import { buildDirectoryModel } from '../../lib/deskDirectory';
import { openDeskPanel } from '../../lib/deskPanel';
import { readUsage } from '../../lib/usageStore';
import {
  MANUAL_PAGES,
  STARTER_SLUGS,
  getManualPage,
  resolveManualPage,
  searchManual,
  type ResolvedManualPage,
} from '../../lib/margdarshan';
import {
  AtlasView,
  DeskPageView,
  DoorExplanation,
  GroupedPageList,
  MargSearch,
  PageCard,
  WingGrid,
} from './views';
import type { DeskPage } from '../../lib/margdarshan/types';

type View =
  | { name: 'home' }
  | { name: 'manual' }
  | { name: 'atlas' }
  | { name: 'page'; slug: string; from: 'home' | 'manual' | 'atlas' | 'page' };

export const MargdarshanCentre: React.FC<{
  onNavigate: (moduleId: string) => void;
}> = ({ onNavigate }) => {
  const { t, currentLang } = useLanguage();
  const { activeWorkspace, effectiveRole, checkPermission, firebaseUser } =
    useAuthWorkspace();
  const { myMemberships } = useMembership();
  const [view, setView] = useState<View>({ name: 'home' });
  const [query, setQuery] = useState('');

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
        { role: effectiveRole, checkPermission, deskScope: myDeskScope },
        MODULE_CATALOG
      ),
    [activeWorkspace, effectiveRole, checkPermission, myDeskScope]
  );

  const openPage = (slug: string, from: View['name'] & string) =>
    setView({ name: 'page', slug, from: (from as any) || 'home' });

  /* Most needed: this device's own most-opened desks first (counts
   * never leave the phone), filled out with the first-week starters. */
  const mostNeeded = useMemo<DeskPage[]>(() => {
    const out: DeskPage[] = [];
    const seen = new Set<string>();
    const push = (p?: DeskPage) => {
      if (p && !seen.has(p.slug) && out.length < 6) {
        seen.add(p.slug);
        out.push(p);
      }
    };
    for (const u of readUsage(activeWorkspace?.id)) {
      push(
        MANUAL_PAGES.find((p) => p.deskId === u.id && p.kind === 'desk') ||
          MANUAL_PAGES.find((p) => p.deskId === u.id)
      );
    }
    for (const s of STARTER_SLUGS) push(getManualPage(s));
    return out;
  }, [activeWorkspace?.id]);

  const doorFor = (r: ResolvedManualPage): React.ReactNode => {
    if (r.kind === 'public' && r.route) {
      return (
        <a
          href={r.route}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
        >
          {t('marg.openInApp')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      );
    }
    if (!r.deskId) return null;
    if (!MODULE_CATALOG.some((m) => m.id === r.deskId)) return null;
    if (model.lockedIds.has(r.deskId)) {
      return <DoorExplanation text={t('marg.doorLockedPlan')} />;
    }
    if (!model.desks.some((d) => d.id === r.deskId)) {
      return <DoorExplanation text={t('marg.doorLockedRole')} />;
    }
    const deskId = r.deskId;
    const onClick =
      r.slug === 'bahi-khata'
        ? () => openDeskPanel('treasury', 'bahikhata')
        : () => onNavigate(deskId);
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        {t('marg.openDesk')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  };

  const results = query.trim() ? searchManual(query, currentLang) : null;

  const searchBlock = (
    <div className="space-y-4">
      <MargSearch value={query} onChange={setQuery} />
      {results && (
        <section aria-label={t('marg.searchResults')}>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700/70">
            {t('marg.searchResults')} · {results.length}
          </h2>
          {results.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p) => (
                <PageCard
                  key={p.slug}
                  page={p}
                  onOpen={(s) => openPage(s, view.name)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-6 py-10 text-center">
              <p className="text-base font-black text-stone-700">{t('marg.noResults')}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                {t('marg.noResultsDesc')}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );

  return (
    <div className="min-h-full bg-[#fdf8ef] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {view.name === 'page' ? (
          <DeskPageView
            slug={view.slug}
            door={doorFor(resolveManualPage(getManualPage(view.slug)!, currentLang))}
            onOpenPage={(s) => openPage(s, 'page')}
            onBack={() =>
              setView(
                view.from === 'atlas'
                  ? { name: 'atlas' }
                  : view.from === 'manual'
                    ? { name: 'manual' }
                    : { name: 'home' }
              )
            }
            backLabel={
              view.from === 'atlas'
                ? t('marg.wingFeatures')
                : view.from === 'manual'
                  ? t('marg.backToManual')
                  : t('marg.backToCentre')
            }
          />
        ) : (
          <>
            {/* Sanctum greeting hero (Role Home language). */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-orange-500/20 sm:p-6">
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                {view.name === 'atlas'
                  ? t('marg.atlasTitle')
                  : view.name === 'manual'
                    ? t('marg.manualTitle')
                    : t('marg.greeting')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-orange-50">
                {view.name === 'atlas'
                  ? t('marg.atlasDesc')
                  : view.name === 'manual'
                    ? t('marg.manualDesc')
                    : t('marg.tagline')}
              </p>
              {view.name !== 'home' && (
                <button
                  type="button"
                  onClick={() => setView({ name: 'home' })}
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-white/15 px-4 py-2 text-xs font-black text-white transition hover:bg-white/25"
                >
                  {t('marg.backToCentre')}
                </button>
              )}
            </div>

            {searchBlock}

            {!results && view.name === 'home' && (
              <>
                <WingGrid
                  onGo={(target) =>
                    setView(target === 'manual' ? { name: 'manual' } : { name: 'atlas' })
                  }
                />
                <section aria-label={t('marg.mostNeeded')}>
                  <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700/70">
                    {t('marg.mostNeeded')}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {mostNeeded.map((p) => (
                      <PageCard
                        key={p.slug}
                        page={p}
                        onOpen={(s) => openPage(s, 'home')}
                      />
                    ))}
                  </div>
                </section>
                <section aria-label={t('marg.browseByDomain')}>
                  <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700/70">
                    {t('marg.browseByDomain')}
                  </h2>
                  <GroupedPageList
                    pages={MANUAL_PAGES}
                    onOpen={(s) => openPage(s, 'home')}
                  />
                </section>
              </>
            )}

            {!results && view.name === 'manual' && (
              <GroupedPageList
                pages={MANUAL_PAGES}
                onOpen={(s) => openPage(s, 'manual')}
              />
            )}

            {!results && view.name === 'atlas' && (
              <AtlasView onOpenPage={(s) => openPage(s, 'atlas')} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MargdarshanCentre;
