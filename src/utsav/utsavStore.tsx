import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { allowsSeedData } from '../lib/workspaceKind';
import { purgePersistedSeedState } from '../lib/seedPurge';
import {
  UtsavState, UtsavSettings, Festival, BudgetLine, CommitteeMember, Task,
  Vendor, ProgramSlot, SafetyItem, CheckinCount,
} from './types';

/* ------------------------------------------------------------------ */
/* Utsav One store — offline-first, per-workspace localStorage.        */
/* Festivals, budgets, committee, vendors, program, safety and         */
/* check-in counts are planned here first. Only treasury postings      */
/* (festival income/expenses, vendor payments) go to the cloud ledger. */
/*                                                                     */
/* EVENTS P1 — TEAM SHARING: the plan also mirrors to                  */
/* utsav_stores/{workspaceId} (the festival_plans pattern): staff of   */
/* the workspace read/write it, newer edit wins on both sides, and     */
/* the device copy remains the offline floor. A plan too large for    */
/* one document (>900 KB serialised) stays device-local with an        */
/* honest status instead of a silent failure.                          */
/* New data-layer module — DataContext is never touched (transport     */
/* limit).                                                            */
/*                                                                     */
/* HONESTY RULE: planned-vs-actual is a management view, not audited   */
/* accounts. The utilisation certificate is the samiti's own summary. */
/* ------------------------------------------------------------------ */

type EntityKey = 'festivals' | 'budget' | 'members' | 'tasks' | 'vendors' | 'program' | 'safety' | 'checkins';

const EMPTY: UtsavState = {
  festivals: [], budget: [], members: [], tasks: [], vendors: [], program: [], safety: [], checkins: [],
  settings: { samitiName: '' },
  ucSeq: 0,
};

const storageKey = (ws: string) => `sb_utsav_${ws}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysFrom = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Whole days from today until `yyyy-mm-dd` (negative = past). */
export function daysUntil(iso: string): number {
  const ms = new Date(iso + 'T12:00:00').getTime() - new Date(todayISO() + 'T12:00:00').getTime();
  return Math.round(ms / 86400000);
}

export interface BudgetTotals {
  plannedIncome: number; actualIncome: number;
  plannedExpense: number; actualExpense: number;
}

/** Planned vs actual totals for one festival. */
export function budgetTotals(state: UtsavState, festivalId: string): BudgetTotals {
  const lines = state.budget.filter((b) => b.festivalId === festivalId);
  const t: BudgetTotals = { plannedIncome: 0, actualIncome: 0, plannedExpense: 0, actualExpense: 0 };
  for (const l of lines) {
    if (l.kind === 'income') { t.plannedIncome += l.planned; t.actualIncome += l.actual; }
    else { t.plannedExpense += l.planned; t.actualExpense += l.actual; }
  }
  return t;
}

/** % of tasks done for a festival (0 when none). */
export function tasksDonePct(state: UtsavState, festivalId: string): number {
  const ts = state.tasks.filter((t) => t.festivalId === festivalId);
  if (!ts.length) return 0;
  return Math.round((ts.filter((t) => t.status === 'done').length / ts.length) * 100);
}

/** Vendor money still outstanding (quote − paid) for booked vendors. */
export function vendorPending(state: UtsavState, festivalId: string): number {
  return state.vendors
    .filter((v) => v.festivalId === festivalId && (v.status === 'booked' || v.status === 'quoted'))
    .reduce((s, v) => s + Math.max(0, v.quote - v.paid), 0);
}

/** Safety checklist completion % for a festival. */
export function safetyDonePct(state: UtsavState, festivalId: string): number {
  const items = state.safety.filter((s) => s.festivalId === festivalId);
  if (!items.length) return 0;
  return Math.round((items.filter((s) => s.done).length / items.length) * 100);
}

/** Total check-in count recorded for a festival. */
export function totalCheckins(state: UtsavState, festivalId: string): number {
  return state.checkins.filter((c) => c.festivalId === festivalId).reduce((s, c) => s + c.count, 0);
}

/**
 * Next utilisation-certificate number: UC-YYYY-NNNN.
 * L6 fix: the sequence comes from the PERSISTED ucSeq counter, not
 * from the festival count — the old formula re-issued a number
 * whenever a festival was deleted (two different certificates could
 * carry the same UC number). The counter only ever moves forward,
 * the same law as the treasury receiptCounters; it lives in the
 * local store because Utsav is device-local by design (a cloud
 * counter would break the offline guarantee).
 */
export function nextUCNo(state: UtsavState): string {
  const year = new Date().getFullYear();
  return `UC-${year}-${String((state.ucSeq || 0) + 1).padStart(4, '0')}`;
}

function loadState(ws: string): UtsavState {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) {
      const parsed = JSON.parse(raw);
      // QUEUED #53: one-time purge of pre-law persisted seed residue
      // (real workspaces only; exact seed-id match — see lib/seedPurge).
      const merged = purgePersistedSeedState('utsav', ws, { ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
      // L6 continuity: stores written before the counter existed had
      // issued up to (festival count) UC numbers — start the counter
      // there so no already-issued number is ever handed out again.
      if (typeof parsed.ucSeq !== 'number') {
        merged.ucSeq = Array.isArray(parsed.festivals) ? parsed.festivals.length : 0;
      }
      return merged;
    }
  } catch { /* corrupted → reseed */ }
  return { ...EMPTY };
}

/* ------------------------- seed ------------------------- */
/** One example festival — clearly an example, dates relative to today. */
function buildSeed(): UtsavState {
  const f: Festival = {
    id: 'f_seed', name: 'Sharadiya Utsav (example)', deity: 'Maa Durga',
    occasion: 'Sharadiya Navratri', startDate: daysFrom(30), endDate: daysFrom(39),
    venue: 'Samiti Maidan', expectedFootfall: 5000, status: 'planned',
    notes: 'Example festival — edit or delete, then add your own.',
  };
  const budget: BudgetLine[] = [
    { id: 'b_s1', festivalId: f.id, kind: 'income', head: 'Sponsorships', planned: 200000, actual: 0 },
    { id: 'b_s2', festivalId: f.id, kind: 'income', head: 'Donations', planned: 150000, actual: 0 },
    { id: 'b_s3', festivalId: f.id, kind: 'expense', head: 'Pandal & decoration', planned: 120000, actual: 0 },
    { id: 'b_s4', festivalId: f.id, kind: 'expense', head: 'Prasad & bhandara', planned: 80000, actual: 0 },
    { id: 'b_s5', festivalId: f.id, kind: 'expense', head: 'Sound & light', planned: 40000, actual: 0 },
  ];
  const members: CommitteeMember[] = [
    { id: 'm_s1', festivalId: f.id, name: 'Example Adhyaksh', role: 'Adhyaksh (President)', responsibilities: 'Overall coordination' },
    { id: 'm_s2', festivalId: f.id, name: 'Example Koshadhyaksh', role: 'Koshadhyaksh (Treasurer)', responsibilities: 'Budget & accounts' },
    { id: 'm_s3', festivalId: f.id, name: 'Example Sanyojak', role: 'Sanyojak (Coordinator)', responsibilities: 'Volunteers & program' },
  ];
  const tasks: Task[] = [
    { id: 't_s1', festivalId: f.id, title: 'Book pandal vendor', assignedTo: 'Example Sanyojak', dueDate: daysFrom(10), status: 'todo' },
    { id: 't_s2', festivalId: f.id, title: 'Print invitations & banners', assignedTo: 'Example Mantri', dueDate: daysFrom(15), status: 'todo' },
  ];
  const vendors: Vendor[] = [
    { id: 'v_s1', festivalId: f.id, category: 'Pandal', name: 'Example Pandal Works', quote: 120000, advance: 0, paid: 0, status: 'quoted' },
  ];
  const program: ProgramSlot[] = [
    { id: 'p_s1', festivalId: f.id, date: daysFrom(30), startTime: '19:00', endTime: '20:00', title: 'Sandhya Aarti', kind: 'Aarti', lead: 'Mukhya Pujari' },
    { id: 'p_s2', festivalId: f.id, date: daysFrom(30), startTime: '20:00', endTime: '22:00', title: 'Bhajan Sandhya', kind: 'Kirtan / Bhajan' },
  ];
  const safety: SafetyItem[] = [
    { id: 's_s1', festivalId: f.id, item: 'Barricades at main gate', category: 'Crowd control', done: false },
    { id: 's_s2', festivalId: f.id, item: 'Drinking water stations (4)', category: 'Water', done: false },
    { id: 's_s3', festivalId: f.id, item: 'First-aid desk with volunteer', category: 'Medical', done: false },
    { id: 's_s4', festivalId: f.id, item: 'Fire extinguishers near pandal', category: 'Fire safety', done: false },
    { id: 's_s5', festivalId: f.id, item: 'Volunteers per gate (min 4)', category: 'Volunteers', done: false },
  ];
  return { ...EMPTY, festivals: [f], budget, members, tasks, vendors, program, safety, settings: { samitiName: '' } };
}

/* ------------------------- context ------------------------- */
interface UtsavCtx {
  state: UtsavState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: UtsavState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<UtsavState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<UtsavSettings>) => void;
  /** Issue (consume) the next UC number — call when a certificate is
   *  actually printed, so previewing never burns a number. */
  takeUCNo: () => string;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
  /** EVENTS P1 — team-sharing state of the cloud mirror. */
  cloudSync: { status: 'local' | 'syncing' | 'shared' | 'error' | 'too-large'; updatedAt: number | null };
}

const Ctx = createContext<UtsavCtx | null>(null);

const metaKey = (ws: string) => `sb_utsav_meta_${ws}`;
const CLOUD_PUSH_LIMIT = 900_000; // Firestore's 1 MiB doc ceiling, with margin.

export const UtsavProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<UtsavState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  const [cloudSync, setCloudSync] = useState<UtsavCtx['cloudSync']>({ status: 'local', updatedAt: null });
  // Newer-wins bookkeeping for the mirror (the War Room's law): the
  // ms stamp of the newest plan this device has made or adopted.
  const localStampRef = useRef<number>(0);
  // Set when the current state arrived FROM the cloud: the persist
  // effect consumes it and skips the echo push exactly once.
  const justAdoptedRef = useRef(false);
  // No push at all until the mount fetch has settled — an unchecked
  // device must never stamp its stale copy over a newer shared plan.
  const cloudCheckedRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (wsRef.current !== workspaceId) {
      wsRef.current = workspaceId;
      localStampRef.current = 0;
      cloudCheckedRef.current = false;
      setCloudSync({ status: 'local', updatedAt: null });
      setState(loadState(workspaceId));
    }
  }, [workspaceId]);

  // Adopt-on-mount: if the committee's cloud plan is newer than this
  // device's, it becomes this device's plan (local work is never
  // silently kept over a newer shared plan — the mirror law).
  useEffect(() => {
    let cancelled = false;
    try {
      const meta = JSON.parse(localStorage.getItem(metaKey(workspaceId)) || 'null') as { updatedAt?: number } | null;
      if (meta && typeof meta.updatedAt === 'number') localStampRef.current = meta.updatedAt;
    } catch { /* no meta yet */ }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'utsav_stores', workspaceId));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as { state?: UtsavState; updatedAt?: number };
          if (data.state && typeof data.updatedAt === 'number') {
            if (data.updatedAt > localStampRef.current) {
              justAdoptedRef.current = true;
              localStampRef.current = data.updatedAt;
              try { localStorage.setItem(metaKey(workspaceId), JSON.stringify({ updatedAt: data.updatedAt })); } catch { /* quota */ }
              setState({ ...EMPTY, ...data.state, settings: { ...EMPTY.settings, ...(data.state.settings || {}) } });
            }
            setCloudSync({ status: 'shared', updatedAt: data.updatedAt });
          }
        }
      } catch {
        if (!cancelled) setCloudSync((s) => ({ ...s }));
      } finally {
        cloudCheckedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
    // EVENTS P1 — every local mutation schedules a debounced mirror
    // push. Adopted-from-cloud states are skipped (no echo loops),
    // and nothing pushes before the mount check has settled.
    if (justAdoptedRef.current) { justAdoptedRef.current = false; return; }
    if (!cloudCheckedRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      const ws = wsRef.current;
      const stamp = Date.now();
      localStampRef.current = stamp;
      try { localStorage.setItem(metaKey(ws), JSON.stringify({ updatedAt: stamp })); } catch { /* quota */ }
      const serialised = JSON.stringify(state);
      if (serialised.length > CLOUD_PUSH_LIMIT) {
        setCloudSync({ status: 'too-large', updatedAt: stamp });
        return;
      }
      setCloudSync({ status: 'syncing', updatedAt: stamp });
      setDoc(doc(db, 'utsav_stores', ws), { workspaceId: ws, state, updatedAt: stamp })
        .then(() => setCloudSync({ status: 'shared', updatedAt: stamp }))
        .catch(() => setCloudSync({ status: 'error', updatedAt: stamp }));
    }, 1200);
    return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
  }, [state]);

  const api = useMemo<UtsavCtx>(() => ({
    state,
    workspaceId,
    cloudSync,
    add: (key, item) => setState((s) => ({ ...s, [key]: [...(s[key] as unknown[]), item] })),
    update: (key, id, patch) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
    remove: (key, id) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).filter((r) => r.id !== id),
    })),
    setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    takeUCNo: () => {
      const seq = (state.ucSeq || 0) + 1;
      setState((s) => ({ ...s, ucSeq: Math.max(s.ucSeq || 0, seq) }));
      return `UC-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
    },
    // Seed guard: only seed when no festivals exist (never clobber user data).
    ensureSeeded: () => {
      // QUEUED #45 seed law: fictitious seed data hydrates ONLY in an
      // explicit demo context. In a real workspace an empty store
      // stays EMPTY — no phantom herds, rooms, meals or members.
      if (!allowsSeedData(workspaceId)) return;
      setState((s) => (s.festivals.length ? s : buildSeed()));
    },
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.festivals)) return false;
        // L6 continuity for old backups without the counter.
        const ucSeq = typeof parsed.ucSeq === 'number' ? parsed.ucSeq : parsed.festivals.length;
        setState({ ...EMPTY, ...parsed, ucSeq, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(allowsSeedData(workspaceId) ? buildSeed() : EMPTY),
  }), [state, workspaceId, cloudSync]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useUtsav = (): UtsavCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUtsav must be used inside UtsavProvider');
  return ctx;
};
