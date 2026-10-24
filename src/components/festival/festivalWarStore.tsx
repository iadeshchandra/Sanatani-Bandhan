/**
 * festivalWarStore.tsx — Festival war-room persistence (Pillar 2).
 * =====================================================================
 * Offline-first, per-workspace:
 *  - `sb_festwar_${workspaceId}` in localStorage is the source of truth on
 *    this device. Planners (footfall, prasad, roster, checklist) work fully
 *    offline.
 *  - The same plan mirrors to Firestore `festival_plans/{planId}` (debounced)
 *    so the trustee's team sees one shared war-room when online. Firestore's
 *    IndexedDB persistence queues writes while offline; on reconnect the
 *    newer `updatedAt` wins.
 *  - `useFestivalCloud` subscribes to the published `festival_events` doc
 *    and live `festival_rsvps` for the war festival — RSVP headcount feeds
 *    back into the footfall card.
 *
 * New module — utsavStore/DataContext are never touched.
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  doc, setDoc, getDoc, getDocs, onSnapshot, collection, query, where,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import {
  WarRoomPlan, WarFestival, FestivalEventDoc, RsvpEntry,
  blankPlan, validateRsvp,
} from '../../lib/festival';
import { applyFestivalRsvp } from '../../lib/festivalRsvp';

const LS_KEY = (ws: string) => `sb_festwar_${ws}`;

type PlanMap = Record<string, WarRoomPlan>;

function loadLocal(ws: string): PlanMap {
  try {
    const raw = localStorage.getItem(LS_KEY(ws));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as PlanMap;
    }
  } catch { /* corrupted → start fresh */ }
  return {};
}

interface WarCtx {
  workspaceId: string;
  /** Read the current plan (no side effects — safe during render). */
  getPlan: (wf: WarFestival) => WarRoomPlan | null;
  /** Create the plan if missing (call from effects/handlers, never render). */
  ensurePlan: (wf: WarFestival) => WarRoomPlan;
  /** Patch the plan; persists locally immediately, mirrors to cloud debounced. */
  patchPlan: (wf: WarFestival, patch: Partial<WarRoomPlan>) => void;
  cloudStatus: 'local' | 'syncing' | 'synced' | 'offline';
}

const Ctx = createContext<WarCtx | null>(null);

export const FestivalWarProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({
  workspaceId, children,
}) => {
  const { isAuthenticated, firebaseUser } = useAuthWorkspace();
  const [plans, setPlans] = useState<PlanMap>(() => loadLocal(workspaceId));
  const [rev, setRev] = useState(0); // bumped on every plan change → consumers re-render
  const [cloudStatus, setCloudStatus] = useState<WarCtx['cloudStatus']>('local');
  const wsRef = useRef(workspaceId);
  const plansRef = useRef(plans);
  plansRef.current = plans;
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Workspace switch → reload local plans.
  useEffect(() => {
    if (wsRef.current !== workspaceId) {
      wsRef.current = workspaceId;
      setPlans(loadLocal(workspaceId));
      setCloudStatus('local');
      setRev((r) => r + 1);
    }
  }, [workspaceId]);

  // Persist locally on every change.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY(wsRef.current), JSON.stringify(plansRef.current)); } catch { /* quota → memory only */ }
  }, [rev]);

  /** Mirror one plan to Firestore (debounced, best-effort). */
  const mirrorToCloud = useCallback((plan: WarRoomPlan) => {
    if (!isAuthenticated || !firebaseUser) return;
    const id = plan.id;
    if (syncTimers.current[id]) clearTimeout(syncTimers.current[id]);
    syncTimers.current[id] = setTimeout(async () => {
      setCloudStatus('syncing');
      try {
        const ref = doc(db, 'festival_plans', id);
        const snap = await getDoc(ref);
        const remote = snap.exists() ? (snap.data() as WarRoomPlan) : null;
        // Newer updatedAt wins — never clobber fresher cloud state.
        if (!remote || (plan.updatedAt || '') >= (remote.updatedAt || '')) {
          await setDoc(ref, { ...plan, updatedAt: new Date().toISOString() }, { merge: true });
        } else {
          // Cloud is newer (another device) → adopt it locally.
          setPlans((prev) => ({ ...prev, [id]: remote as WarRoomPlan }));
          setRev((r) => r + 1);
        }
        setCloudStatus('synced');
      } catch {
        setCloudStatus('offline'); // offline → queued in localStorage, retried on next edit
      }
    }, 1500);
  }, [isAuthenticated, firebaseUser]);

  /** Pull the cloud copies on mount (newer wins). Runs once per workspace. */
  const pulledRef = useRef('');
  useEffect(() => {
    if (!isAuthenticated || !firebaseUser || pulledRef.current === workspaceId) return;
    pulledRef.current = workspaceId;
    (async () => {
      try {
        const q = query(collection(db, 'festival_plans'), where('workspaceId', '==', workspaceId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPlans((prev) => {
            const next = { ...prev };
            snap.docs.forEach((d) => {
              const remote = d.data() as WarRoomPlan;
              const local = next[d.id];
              if (!local || (remote.updatedAt || '') > (local.updatedAt || '')) next[d.id] = remote;
            });
            return next;
          });
          setRev((r) => r + 1);
          setCloudStatus('synced');
        }
      } catch { /* offline on first load — local plans stand alone */ }
    })();
  }, [isAuthenticated, firebaseUser, workspaceId]);

  const getPlan = useCallback((wf: WarFestival): WarRoomPlan | null => {
    return plansRef.current[`${wsRef.current}__${wf.key}`] || null;
  }, []);

  const ensurePlan = useCallback((wf: WarFestival): WarRoomPlan => {
    const id = `${wsRef.current}__${wf.key}`;
    const existing = plansRef.current[id];
    if (existing) return existing;
    const fresh = blankPlan(wsRef.current, wf);
    setPlans((prev) => ({ ...prev, [id]: fresh }));
    setRev((r) => r + 1);
    return fresh;
  }, []);

  const patchPlan = useCallback((wf: WarFestival, patch: Partial<WarRoomPlan>) => {
    const id = `${wsRef.current}__${wf.key}`;
    const cur = plansRef.current[id] || blankPlan(wsRef.current, wf);
    const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
    setPlans((prev) => ({ ...prev, [id]: next }));
    setRev((r) => r + 1);
    mirrorToCloud(next);
  }, [mirrorToCloud]);

  const api = useMemo<WarCtx>(() => ({
    workspaceId,
    getPlan,
    ensurePlan,
    patchPlan,
    cloudStatus,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [workspaceId, cloudStatus, getPlan, ensurePlan, patchPlan, rev]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useFestivalWar = (): WarCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFestivalWar must be used inside FestivalWarProvider');
  return ctx;
};

/**
 * Reactive plan handle for one war festival. Ensures the plan exists once,
 * then returns the live plan + patch on every render.
 */
export function useWarPlan(wf: WarFestival | null): {
  plan: WarRoomPlan | null;
  patch: (p: Partial<WarRoomPlan>) => void;
} {
  const { getPlan, ensurePlan, patchPlan } = useFestivalWar();
  const key = wf?.key;
  useEffect(() => {
    if (wf) ensurePlan(wf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const patch = useCallback(
    (p: Partial<WarRoomPlan>) => { if (wf) patchPlan(wf, p); },
    [key, patchPlan] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return { plan: wf ? getPlan(wf) : null, patch };
}

/* ------------------------------------------------------------------ */
/* Cloud: published event doc + live RSVPs                             */
/* ------------------------------------------------------------------ */

export interface FestivalCloud {
  event: FestivalEventDoc | null;
  rsvps: RsvpEntry[];
  rsvpHeadcount: number;
  loading: boolean;
  publishEvent: (event: FestivalEventDoc) => Promise<void>;
  unpublish: () => Promise<void>;
  submitRsvp: (entry: { name: string; headcount: number; slotId?: string }) => Promise<void>;
}

/**
 * Subscribes to `festival_events/{planId}` and `festival_rsvps` for the war
 * festival. Public event reads work signed-out; RSVP writes need sign-in
 * (spam guard, consistent with follow/join flows).
 */
export function useFestivalCloud(
  workspaceId: string,
  festivalKey: string,
  opts?: { subscribeRsvps?: boolean }
): FestivalCloud {
  const { firebaseUser } = useAuthWorkspace();
  const eventId = `${workspaceId}__${festivalKey}`;
  const [event, setEvent] = useState<FestivalEventDoc | null>(null);
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!festivalKey) { setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'festival_events', eventId),
      (snap) => {
        setEvent(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<FestivalEventDoc, 'id'>) }) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [eventId, festivalKey]);

  useEffect(() => {
    if (opts?.subscribeRsvps === false || !festivalKey) return;
    const q = query(collection(db, 'festival_rsvps'), where('eventId', '==', eventId));
    const unsub = onSnapshot(
      q,
      (snap) => setRsvps(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RsvpEntry, 'id'>) }))),
      () => { /* permission or offline — trustee still has local plans */ }
    );
    return unsub;
  }, [eventId, festivalKey, opts?.subscribeRsvps]);

  const publishEvent = useCallback(async (e: FestivalEventDoc) => {
    // Stamp slotCaps from darshanSlots: firestore.rules bounds each
    // slot's booked count by this map (rules cannot index the slots
    // list by id), so capacity is enforced server-side, not just by
    // the greyed-out button on the public page.
    const slotCaps: Record<string, number> = {};
    for (const s of e.darshanSlots || []) slotCaps[s.id] = s.capacity;
    await setDoc(doc(db, 'festival_events', eventId), { ...e, slotCaps, id: eventId, updatedAt: new Date().toISOString() }, { merge: true });
  }, [eventId]);

  const unpublish = useCallback(async () => {
    await updateDoc(doc(db, 'festival_events', eventId), { published: false, updatedAt: new Date().toISOString() });
  }, [eventId]);

  const submitRsvp = useCallback(async (entry: { name: string; headcount: number; slotId?: string }) => {
    const err = validateRsvp(entry);
    if (err) throw new Error(err);
    if (!firebaseUser) throw new Error('signin');
    const uid = (firebaseUser as { uid?: string }).uid || 'anon';
    // One transaction — RSVP record + counters together, capacity
    // enforced (see lib/festivalRsvp).
    await applyFestivalRsvp({
      eventId,
      workspaceId,
      uid,
      name: entry.name,
      headcount: entry.headcount,
      ...(entry.slotId ? { slotId: entry.slotId } : {}),
    });
  }, [eventId, workspaceId, firebaseUser]);

  const rsvpHeadcount = useMemo(
    () => rsvps.reduce((s, r) => s + (r.headcount || 0), 0),
    [rsvps]
  );

  return { event, rsvps, rsvpHeadcount, loading, publishEvent, unpublish, submitRsvp };
}
