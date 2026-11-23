/**
 * QuickLook — TWO-MODE M1: the "My Organisations" strip and its
 * Quick Look peek, living in Personal (the member shell).
 * =====================================================================
 * The owner's model: from Personal, a member may look at his
 * organisation WITHOUT switching modes — and may fully switch when
 * he chooses. The strip carries one card per enrolment the shared
 * access layer surfaces (lib/quickLook shaping over
 * lib/orgConsoleAccess verdicts): org workspaces where his role
 * opens the console door, plus his Purohit / Jyotishi workspaces
 * when he holds those identities. No enrolments → the strip renders
 * nothing at all (no empty shelf).
 *
 * Tapping an org card opens the PEEK — a body-portal sheet (the
 * fixed-overlay ancestor law) showing only what the role's door
 * already entitles him to know, and nothing invented:
 *   · the org's name and type, and his role in plain words (the
 *     verdict's own canonical role);
 *   · the next upcoming PUBLISHED festival for that workspace —
 *     a bounded read of the world-readable published festival_events
 *     docs (the /events discovery door), shaped by the same public
 *     rules; it fails soft to an honest "none published yet" line;
 *   · the plain statement that full figures live in the workspace.
 * No treasury figure, headcount or desk data is read or shown here:
 * the figures the Day Bands compute are bound to the ACTIVE
 * workspace's stores, so quoting them for another org would be a
 * wrong number dressed as a quick look. The peek's one action,
 * "Open full workspace", walks the exact existing activation path
 * (switchWorkspace, then setViewMode('MANAGER'); the already-active
 * org simply flips the mode, as MemberAppShell's switch does).
 *
 * Tapping a Purohit / Jyotishi card routes to that workspace's
 * existing entry point — enterPurohitSession / enterJyotishSession,
 * the same mode switch ProfileTab and BecomePurohitEntry use.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Eye,
  Sparkles,
  X,
} from 'lucide-react';
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  buildQuickLookCards,
  pickNextFestival,
  shapeOrgEnrolments,
  type OrgEnrolmentCard,
  type ProfessionalEnrolmentCard,
  type QuickLookCard,
} from '../../lib/quickLook';
import type { DiscoveryCard } from '../../lib/eventDiscovery';
import type { FestivalEventDoc } from '../../lib/festival';
import { localTodayISO } from '../../lib/eventRecurrence';
import { pickLang } from '../../lib/microcopy';
import { appLocale } from '../../lib/format';
import { useMyPurohitIdentity } from '../purohit/useMyPurohitIdentity';
import { useMyJyotishIdentity } from '../../jyotish/useMyJyotishIdentity';
import { OrgLogo } from './OrgLogo';

/** Bounded per-workspace peek read — published docs only (public door). */
const PEEK_FETCH_LIMIT = 10;

const formatDay = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  try {
    return new Date(y, m - 1, d).toLocaleDateString(appLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
};

export const MyOrganisationsStrip: React.FC = () => {
  const {
    workspaces,
    activeWorkspace,
    currentRole,
    firebaseUser,
    switchWorkspace,
    setViewMode,
    enterPurohitSession,
    enterJyotishSession,
  } = useAuthWorkspace();
  const { myMemberships, membershipsLoaded } = useMembership();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { identity: purohitIdentity } = useMyPurohitIdentity();
  const { identity: jyotishIdentity } = useMyJyotishIdentity();

  const [peek, setPeek] = useState<OrgEnrolmentCard | null>(null);
  const [peekFestival, setPeekFestival] = useState<DiscoveryCard | null>(null);
  const [peekLoaded, setPeekLoaded] = useState(false);
  const [opening, setOpening] = useState(false);

  const orgCards = useMemo(
    () =>
      shapeOrgEnrolments({
        workspaces,
        memberships: myMemberships,
        membershipsLoaded,
        uid: firebaseUser?.uid ?? null,
        globalRole: currentRole,
        activeWorkspaceId: activeWorkspace?.id ?? null,
      }),
    [
      workspaces,
      myMemberships,
      membershipsLoaded,
      firebaseUser?.uid,
      currentRole,
      activeWorkspace?.id,
    ],
  );

  const professionalCards = useMemo<ProfessionalEnrolmentCard[]>(() => {
    const list: ProfessionalEnrolmentCard[] = [];
    if (purohitIdentity) {
      list.push({
        kind: 'purohit',
        identityId: purohitIdentity.id,
        displayName: purohitIdentity.displayName,
      });
    }
    if (jyotishIdentity) {
      list.push({
        kind: 'jyotish',
        identityId: jyotishIdentity.id,
        displayName: jyotishIdentity.displayName,
      });
    }
    return list;
  }, [purohitIdentity, jyotishIdentity]);

  const cards = useMemo(
    () => buildQuickLookCards(orgCards, professionalCards),
    [orgCards, professionalCards],
  );

  // The peek's festival line: one bounded, fail-soft read per peek.
  useEffect(() => {
    if (!peek) return;
    let cancelled = false;
    setPeekFestival(null);
    setPeekLoaded(false);
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'festival_events'),
            where('workspaceId', '==', peek.workspaceId),
            where('published', '==', true),
            limit(PEEK_FETCH_LIMIT),
          ),
        );
        const docs = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<FestivalEventDoc, 'id'>) }),
        );
        if (!cancelled) {
          setPeekFestival(
            pickNextFestival(docs, localTodayISO(), pickLang(language)),
          );
        }
      } catch {
        if (!cancelled) setPeekFestival(null);
      } finally {
        if (!cancelled) setPeekLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peek, language]);

  const openProfessional = (card: ProfessionalEnrolmentCard) => {
    // The existing entry points — the same session switch the Solo
    // Profile and the Become* entry cards perform.
    if (card.kind === 'purohit' && purohitIdentity) {
      enterPurohitSession(purohitIdentity);
    } else if (card.kind === 'jyotish' && jyotishIdentity) {
      enterJyotishSession(jyotishIdentity);
    }
  };

  const openFullWorkspace = async (card: OrgEnrolmentCard) => {
    if (opening) return;
    setOpening(true);
    try {
      if (card.workspaceId === activeWorkspace?.id) {
        // Already here — the member shell's own switch discipline.
        setViewMode('MANAGER');
        setPeek(null);
        return;
      }
      const ok = await switchWorkspace(card.workspaceId);
      if (ok) {
        setViewMode('MANAGER');
        setPeek(null);
      } else {
        showToast(t('surfaces.twoMode.openFailed'), 'error');
      }
    } finally {
      setOpening(false);
    }
  };

  if (cards.length === 0) return null;

  const renderCard = (card: QuickLookCard) => {
    if (card.kind === 'org') {
      return (
        <button
          key={`org-${card.workspaceId}`}
          type="button"
          onClick={() => setPeek(card)}
          aria-label={`${t('surfaces.twoMode.quickLook')}: ${card.name}`}
          className="flex items-center gap-3 rounded-2xl border border-temple-200 bg-white hover:border-brass-200 hover:bg-temple-50 transition-colors px-3.5 py-2.5 text-left min-h-[64px] shrink-0 max-w-[280px] cursor-pointer"
        >
          <OrgLogo name={card.name} logoUrl={card.logoUrl} size={40} withRing={false} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-black text-temple-950 truncate">
                {card.name}
              </span>
              {card.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
              )}
            </span>
            <span className="block text-[10px] font-bold text-temple-500 uppercase tracking-wider truncate mt-0.5">
              {card.role}
              {card.type ? ` · ${card.type}` : ''}
            </span>
          </span>
          <Eye className="w-4 h-4 text-amber-700 shrink-0" />
        </button>
      );
    }
    const isPurohit = card.kind === 'purohit';
    return (
      <button
        key={card.kind}
        type="button"
        onClick={() => openProfessional(card)}
        className="flex items-center gap-3 rounded-2xl border border-temple-200 bg-white hover:border-brass-200 hover:bg-temple-50 transition-colors px-3.5 py-2.5 text-left min-h-[64px] shrink-0 max-w-[280px] cursor-pointer"
      >
        <span className="w-10 h-10 rounded-xl bg-amber-100 border border-brass-200 flex items-center justify-center shrink-0">
          {isPurohit ? (
            <BookOpen className="w-5 h-5 text-amber-700" />
          ) : (
            <Sparkles className="w-5 h-5 text-amber-700" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-black text-temple-950 truncate">
            {t(isPurohit ? 'surfaces.twoMode.purohitCard' : 'surfaces.twoMode.jyotishCard')}
          </span>
          <span className="block text-[10px] font-bold text-temple-500 uppercase tracking-wider truncate mt-0.5">
            {card.identityId} · {t('surfaces.twoMode.tapToOpen')}
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />
      </button>
    );
  };

  return (
    <>
      <section
        aria-label={t('surfaces.twoMode.myOrgsTitle')}
        className="bg-temple-50 border-b border-temple-200 px-4 sm:px-6 py-2.5 shrink-0"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-black text-temple-400 uppercase tracking-widest shrink-0 hidden sm:block">
            {t('surfaces.twoMode.myOrgsTitle')}
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide min-w-0">
            {cards.map(renderCard)}
          </div>
        </div>
      </section>

      {peek &&
        createPortal(
          <div
            className="fixed inset-0 z-[210]"
            role="dialog"
            aria-modal="true"
            aria-label={`${t('surfaces.twoMode.quickLook')}: ${peek.name}`}
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setPeek(null)}
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg max-h-[88dvh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl border-t border-brass-200 text-temple-900">
              <div className="sticky top-0 bg-sanctum-ivory/95 backdrop-blur rounded-t-3xl z-10 px-5 pt-3 pb-3 border-b border-temple-200">
                <div className="mx-auto w-10 h-1.5 rounded-full bg-temple-300/80" />
                <div className="flex items-center gap-3 mt-2">
                  <OrgLogo name={peek.name} logoUrl={peek.logoUrl} size={40} withRing={false} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-temple-950 truncate">
                      {peek.name}
                    </h3>
                    {peek.type && (
                      <p className="text-[10px] font-bold text-temple-500 uppercase tracking-wider truncate">
                        {peek.type}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPeek(null)}
                    aria-label={t('surfaces.twoMode.close')}
                    className="w-11 h-11 rounded-full bg-temple-50 text-temple-600 hover:text-temple-950 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-temple-700">
                  {t('surfaces.twoMode.roleLine').replace('{role}', peek.role)}
                </p>

                <div className="rounded-2xl border border-temple-200 bg-temple-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-temple-400 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-amber-700" />
                    {t('surfaces.twoMode.nextFestival')}
                  </p>
                  {!peekLoaded ? (
                    <p className="text-xs text-temple-500 mt-1.5">
                      {t('surfaces.twoMode.peekLoading')}
                    </p>
                  ) : peekFestival ? (
                    <>
                      <p className="text-sm font-black text-temple-950 mt-1.5">
                        {peekFestival.title}
                      </p>
                      <p className="text-xs text-temple-500 mt-0.5">
                        {formatDay(peekFestival.startISO)}
                        {peekFestival.endISO > peekFestival.startISO
                          ? ` – ${formatDay(peekFestival.endISO)}`
                          : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-temple-500 mt-1.5 leading-relaxed">
                      {t('surfaces.twoMode.noFestival')}
                    </p>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-temple-500">
                  {t('surfaces.twoMode.peekFiguresNote')}
                </p>

                <button
                  type="button"
                  disabled={opening}
                  onClick={() => void openFullWorkspace(peek)}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-cta hover:bg-cta-hover text-white text-sm font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-60"
                >
                  <span>{t('surfaces.twoMode.openWorkspace')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
