/**
 * CrisisDashboard — the org command view (Phase 2 entry point).
 * =========================================================================
 * Tabs: Live Map | Triage | History (+ Coordinators for Trustees).
 * Wire this into the org shell for Trustee / Crisis Coordinator roles.
 *
 * Fail-closed RBAC: Trustee/SuperAdmin → full access; crisisCoordinators
 * edge → coordinator; Sevadar → acknowledge + mark arrived; everyone else
 * → locked screen. Authorisation is resolved before anything renders.
 *
 * Live updates via Firestore onSnapshot, with a 15 s getDocs backup
 * refresh in case the socket stalls. New active events trigger the
 * crowd-density check (throttled, stampede prevention).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Lock, Map as MapIcon, ListOrdered, History, Users } from 'lucide-react';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import type { CrisisEvent } from './crisisCommandTypes';
import { isActiveEvent } from './crisisCommandTypes';
import { useCrisisT } from './crisisI18n';
import { useCrisisAccess } from './crisisAccess';
import { checkCrowdDensity } from './crisisIntelligence';
import { CrisisMap } from './CrisisMap';
import { TriageView } from './TriageView';
import { HistoryView } from './HistoryView';
import { CrisisDetailDrawer } from './CrisisDetailDrawer';
import { CoordinatorManage } from './CoordinatorManage';
import type { Actor } from './crisisActions';

type Tab = 'map' | 'triage' | 'history' | 'coordinators';

const DENSITY_CHECK_THROTTLE_MS = 60_000;

export const CrisisDashboard: React.FC = () => {
  const t = useCrisisT();
  const { activeWorkspace, firebaseUser, currentUser } = useAuthWorkspace();
  const orgId = activeWorkspace?.id || '';
  const access = useCrisisAccess(orgId || undefined);

  const [tab, setTab] = useState<Tab>('triage');
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [selected, setSelected] = useState<CrisisEvent | null>(null);
  const lastDensityCheck = useRef(0);
  const prevActiveIds = useRef<Set<string>>(new Set());

  const actor: Actor = {
    uid: firebaseUser?.uid || currentUser?.id || '',
    name: currentUser?.fullName || currentUser?.name || 'Coordinator',
  };

  const applySnapshot = useCallback((list: CrisisEvent[]) => {
    setEvents(list);
    // Stampede guard: when NEW active events appear, run crowd-density
    // check (throttled to once a minute, client-side best effort).
    const activeIds = new Set(list.filter(isActiveEvent).map((e) => e.id));
    const hasNew = [...activeIds].some((id) => !prevActiveIds.current.has(id));
    prevActiveIds.current = activeIds;
    if (hasNew && Date.now() - lastDensityCheck.current > DENSITY_CHECK_THROTTLE_MS && orgId) {
      lastDensityCheck.current = Date.now();
      checkCrowdDensity({ orgId, workspaceId: orgId }).catch(() => {
        /* best effort — the dashboard stays usable */
      });
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !access.canView) return;
    const q = query(
      collection(db, 'crisis_events'),
      where('workspaceId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    const parse = (docs: { id: string; data: () => unknown }[]): CrisisEvent[] =>
      docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CrisisEvent, 'id'>) }));
    const unsub = onSnapshot(
      q,
      (snap) => applySnapshot(parse(snap.docs)),
      () => {
        /* onSnapshot error → the backup refresh below keeps data fresh */
      },
    );
    // Backup refresh every 60 s in case the live socket stalls.
    // (QUEUED #38: was 15 s — the onSnapshot above is the primary,
    // realtime path; the backup is only stall insurance, and at 15 s it
    // quadrupled this dashboard's Firestore reads for no fresher data.)
    const backup = window.setInterval(() => {
      getDocs(q)
        .then((snap) => applySnapshot(parse(snap.docs)))
        .catch(() => {});
    }, 60000);
    return () => {
      unsub();
      window.clearInterval(backup);
    };
  }, [orgId, access.canView, applySnapshot]);

  if (access.loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-stone-500">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
        <p className="text-[15px]">{t('dash.loading')}</p>
      </div>
    );
  }

  if (!access.canView) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
          <Lock size={28} className="text-stone-400" />
        </div>
        <h2 className="text-[20px] font-bold text-stone-900">{t('dash.lockedTitle')}</h2>
        <p className="text-[15px] text-stone-600 leading-relaxed max-w-md">{t('dash.lockedDesc')}</p>
      </div>
    );
  }

  const activeEvents = events.filter(isActiveEvent);
  const historyEvents = events.filter((e) => !isActiveEvent(e));

  // Keep the drawer in sync with live updates.
  const liveSelected = selected
    ? events.find((e) => e.id === selected.id) ?? selected
    : null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'map', label: t('tab.map'), icon: <MapIcon size={18} /> },
    { id: 'triage', label: t('tab.triage'), icon: <ListOrdered size={18} />, badge: activeEvents.length },
    { id: 'history', label: t('tab.history'), icon: <History size={18} /> },
  ];
  if (access.canManageCoordinators) {
    tabs.push({ id: 'coordinators', label: t('tab.coordinators'), icon: <Users size={18} /> });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 sm:pb-12">
      {/* header */}
      <header className="pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-[22px] font-bold text-stone-900">{t('dash.title')}</h1>
            <p className="text-[13px] text-stone-500 italic">{t('dash.subtitle')}</p>
          </div>
          {activeEvents.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 bg-amber-700 text-amber-50 text-[12px] font-bold px-3 py-1.5 rounded-full shadow-[0_0_14px_rgba(217,119,6,0.45)]">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {t('dash.live')} · {activeEvents.length} {t('dash.activeNow')}
            </span>
          ) : null}
        </div>
      </header>

      {/* tabs */}
      <nav className="flex gap-1.5 mb-4 overflow-x-auto" role="tablist" aria-label={t('dash.title')}>
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={`min-h-[48px] flex-1 min-w-[110px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 px-3 transition active:scale-[0.98] ${
              tab === tb.id
                ? 'bg-stone-900 text-white shadow'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {tb.icon}
            {tb.label}
            {typeof tb.badge === 'number' && tb.badge > 0 ? (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tab === tb.id ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {tb.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* panels */}
      <div role="tabpanel">
        {tab === 'map' ? (
          <CrisisMap events={activeEvents} onSelect={setSelected} />
        ) : null}
        {tab === 'triage' ? (
          <TriageView events={activeEvents} access={access} actor={actor} onSelect={setSelected} />
        ) : null}
        {tab === 'history' ? (
          <HistoryView events={historyEvents} />
        ) : null}
        {tab === 'coordinators' && access.canManageCoordinators ? (
          <CoordinatorManage orgId={orgId} access={access} assignedBy={actor.name} />
        ) : null}
      </div>

      {/* detail drawer */}
      {liveSelected ? (
        <CrisisDetailDrawer
          event={liveSelected}
          access={access}
          actor={actor}
          orgId={orgId}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {/* hidden live-region for screen readers */}
      <div aria-live="polite" className="sr-only">
        {activeEvents.length} {t('dash.activeNow')}
      </div>
    </div>
  );
};
