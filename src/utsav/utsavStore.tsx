import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { allowsSeedData } from '../lib/workspaceKind';
import {
  UtsavState, UtsavSettings, Festival, BudgetLine, CommitteeMember, Task,
  Vendor, ProgramSlot, SafetyItem, CheckinCount,
} from './types';

/* ------------------------------------------------------------------ */
/* Utsav One store — offline-first, per-workspace localStorage.        */
/* Festivals, budgets, committee, vendors, program, safety and         */
/* check-in counts live on this device. Only treasury postings         */
/* (festival income/expenses, vendor payments) go to the cloud ledger. */
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

/** Next utilisation-certificate number: UC-YYYY-NNNN. */
export function nextUCNo(state: UtsavState): string {
  const year = new Date().getFullYear();
  return `UC-${year}-${String(state.festivals.length + 1).padStart(4, '0')}`;
}

function loadState(ws: string): UtsavState {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } };
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
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<UtsavCtx | null>(null);

export const UtsavProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<UtsavState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<UtsavCtx>(() => ({
    state,
    workspaceId,
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
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(allowsSeedData(workspaceId) ? buildSeed() : EMPTY),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useUtsav = (): UtsavCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUtsav must be used inside UtsavProvider');
  return ctx;
};
