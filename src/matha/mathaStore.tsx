import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { allowsSeedData } from '../lib/workspaceKind';
import {
  MathaState, MathaSettings, Sannyasi, BranchMatha, DinacharyaItem,
  GurukulStudent, SevaAssignment, Observance, DakshinaRecord,
} from './types';

/* ------------------------------------------------------------------ */
/* Matha One store — offline-first, per-workspace localStorage.        */
/* The sannyasi registry, parampara links, branches, dinacharya,      */
/* gurukul students, seva assignments, observances and dakshina       */
/* records live on this device. Only treasury postings (dakshina /    */
/* donations) go to the cloud ledger. New data-layer module —         */
/* DataContext is never touched (transport limit).                    */
/*                                                                     */
/* RESPECT RULE: this is a sacred institution's internal record.      */
/* ------------------------------------------------------------------ */

type EntityKey = 'sannyasis' | 'branches' | 'dinacharya' | 'students' | 'seva' | 'observances' | 'dakshina';

const EMPTY: MathaState = {
  sannyasis: [], branches: [], dinacharya: [], students: [],
  seva: [], observances: [], dakshina: [],
  settings: { mathaName: '', paramparaName: '' },
};

const storageKey = (ws: string) => `sb_matha_${ws}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Display name: sannyas name, falling back to poorvashram name. */
export function displayName(s: Sannyasi): string {
  return s.sannyasName || s.poorvashramName || '—';
}

/** Residents only (excludes mahasamadhi). */
export function livingSannyasis(state: MathaState): Sannyasi[] {
  return state.sannyasis.filter((s) => s.status !== 'mahasamadhi');
}

/** Children of a guru in the parampara tree. */
export function shishyasOf(state: MathaState, guruId: string): Sannyasi[] {
  return state.sannyasis.filter((s) => s.dikshaGuruId === guruId);
}

/** Roots of the parampara tree (no recorded guru in the registry). */
export function paramparaRoots(state: MathaState): Sannyasi[] {
  const ids = new Set(state.sannyasis.map((s) => s.id));
  return state.sannyasis.filter((s) => !s.dikshaGuruId || !ids.has(s.dikshaGuruId));
}

/** Next occurrence of an MM-DD observance as yyyy-mm-dd. */
export function nextOccurrence(monthDay: string): string {
  const now = new Date();
  const [mm, dd] = monthDay.split('-').map(Number);
  let y = now.getFullYear();
  let d = new Date(y, mm - 1, dd);
  if (d.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    d = new Date(y + 1, mm - 1, dd);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Days until a yyyy-mm-dd date (0 = today). */
export function daysUntil(iso: string): number {
  const ms = new Date(iso + 'T12:00:00').getTime() - new Date(todayISO() + 'T12:00:00').getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/** Observances sorted by upcoming date. */
export function upcomingObservances(state: MathaState): Array<{ o: Observance; date: string; inDays: number }> {
  return state.observances
    .map((o) => ({ o, date: nextOccurrence(o.monthDay), inDays: daysUntil(nextOccurrence(o.monthDay)) }))
    .sort((a, b) => a.inDays - b.inDays);
}

/** Today's dinacharya items, sorted by time. */
export function todaysDinacharya(state: MathaState): DinacharyaItem[] {
  const wd = new Date().getDay();
  return state.dinacharya
    .filter((d) => d.days.length === 0 || d.days.includes(wd))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Total dakshina/donations collected (posted or not). */
export function dakshinaTotal(state: MathaState): number {
  return state.dakshina.reduce((s, d) => s + d.amount, 0);
}

function loadState(ws: string): MathaState {
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
function buildSeed(): MathaState {
  const now = Date.now();
  const sannyasis: Sannyasi[] = [
    {
      id: 'sn_1', poorvashramName: 'Example (seed)', sannyasName: 'Swami Shantananda Saraswati',
      dikshaDate: '1998-02-14', parampara: 'Dashanami', role: 'acharya', status: 'resident',
      notes: 'Example record (seed) — replace with your matha\u2019s acharya.',
      createdAt: now,
    },
    {
      id: 'sn_2', poorvashramName: 'Example (seed)', sannyasName: 'Swami Vidyananda',
      dikshaDate: '2010-07-20', dikshaGuruId: 'sn_1', parampara: 'Dashanami', role: 'brahmachari', status: 'resident',
      notes: 'Example record (seed).',
      createdAt: now,
    },
  ];
  const dinacharya: DinacharyaItem[] = [
    { id: 'd_1', time: '04:30', activity: 'Brahma-muhurta meditation', days: [], createdAt: now },
    { id: 'd_2', time: '06:00', activity: 'Mangala Aarti', days: [], createdAt: now },
    { id: 'd_3', time: '08:00', activity: 'Veda Patha / Svadhyaya', days: [], createdAt: now },
    { id: 'd_4', time: '12:00', activity: 'Madhyahna Bhoga', days: [], createdAt: now },
    { id: 'd_5', time: '18:30', activity: 'Sandhya Aarti', days: [], createdAt: now },
  ];
  const observances: Observance[] = [
    { id: 'o_1', name: 'Guru Purnima', monthDay: '07-10', kind: 'guru-purnima', notes: 'Example (seed) — set your matha\u2019s dates.', createdAt: now },
  ];
  return { ...EMPTY, sannyasis, dinacharya, observances, settings: { ...EMPTY.settings, paramparaName: 'Dashanami' } };
}

/* ------------------------- context ------------------------- */
interface MathaCtx {
  state: MathaState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: MathaState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<MathaState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<MathaSettings>) => void;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<MathaCtx | null>(null);

export const MathaProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<MathaState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  // Workspace switch → reload. Guarded so the mount pass never clobbers
  // a seed applied by the desk's own effect in the same commit.
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<MathaCtx>(() => ({
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
    // Seed guard: only seed when the registry is empty (never clobber user data).
    ensureSeeded: () => {
      // QUEUED #45 seed law: fictitious seed data hydrates ONLY in an
      // explicit demo context. In a real workspace an empty store
      // stays EMPTY — no phantom herds, rooms, meals or members.
      if (!allowsSeedData(workspaceId)) return;
      setState((s) => (s.sannyasis.length ? s : buildSeed()));
    },
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.sannyasis)) return false;
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(allowsSeedData(workspaceId) ? buildSeed() : EMPTY),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useMatha = (): MathaCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMatha must be used inside MathaProvider');
  return ctx;
};
