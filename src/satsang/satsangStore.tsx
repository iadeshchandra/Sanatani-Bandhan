import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  SatsangState, SatsangSettings, Member, Gathering, AttendanceEntry,
  Bhajan, PrasadAssignment, FundEntry,
} from './types';

/* ------------------------------------------------------------------ */
/* Satsang One store — offline-first, per-workspace localStorage.      */
/* The mandali registry, gatherings, attendance, bhajan repertoire,   */
/* prasad rotation and fund records live on this device. Only fund    */
/* postings (contributions / expenses) go to the cloud ledger. New     */
/* data-layer module — DataContext is never touched (transport limit). */
/*                                                                     */
/* SCOPE: the organizer's tool for local satsang mandalis. No social   */
/* or feed features — those belong to the future Sangam layer.        */
/* ------------------------------------------------------------------ */

type EntityKey = 'members' | 'gatherings' | 'attendance' | 'bhajans' | 'prasad' | 'fund';

const EMPTY: SatsangState = {
  members: [], gatherings: [], attendance: [], bhajans: [], prasad: [], fund: [],
  settings: { mandaliName: '', defaultTime: '18:00', defaultVenue: '' },
};

const storageKey = (ws: string) => `sb_satsang_${ws}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Days until a yyyy-mm-dd date (0 = today; negative = past). */
export function daysUntil(iso: string): number {
  const ms = new Date(iso + 'T12:00:00').getTime() - new Date(todayISO() + 'T12:00:00').getTime();
  return Math.round(ms / 86400000);
}

/** Next scheduled gathering (today or future), soonest first. */
export function nextGathering(state: SatsangState): Gathering | null {
  const cands = state.gatherings
    .filter((g) => g.status === 'scheduled' && daysUntil(g.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return cands[0] || null;
}

/** Active members only. */
export function activeMembers(state: SatsangState): Member[] {
  return state.members.filter((m) => m.active);
}

/** Attendance % for a member across completed gatherings (null = no data). */
export function attendancePct(state: SatsangState, memberId: string): number | null {
  const done = new Set(state.gatherings.filter((g) => g.status === 'completed').map((g) => g.id));
  const rows = state.attendance.filter((a) => a.memberId === memberId && done.has(a.gatheringId));
  if (!rows.length) return null;
  return Math.round((rows.filter((r) => r.present).length / rows.length) * 100);
}

/** Members below 50% attendance across completed gatherings. */
export function irregularMembers(state: SatsangState): Member[] {
  return activeMembers(state).filter((m) => {
    const p = attendancePct(state, m.id);
    return p !== null && p < 50;
  });
}

/** Present count for a gathering. */
export function presentCount(state: SatsangState, gatheringId: string): number {
  return state.attendance.filter((a) => a.gatheringId === gatheringId && a.present).length;
}

/** Last prasad assignment date per member (for rotation fairness). */
function lastPrasadDate(state: SatsangState, memberId: string): string {
  const rows = state.prasad
    .filter((p) => p.memberId === memberId && p.status !== 'skipped')
    .map((p) => state.gatherings.find((g) => g.id === p.gatheringId)?.date || '')
    .filter(Boolean)
    .sort();
  return rows.length ? rows[rows.length - 1] : '0000-00-00';
}

/** Suggested next prasad bearer: active member who brought prasad longest ago (or never). */
export function suggestedPrasadBearer(state: SatsangState): Member | null {
  const ms = activeMembers(state);
  if (!ms.length) return null;
  return [...ms].sort((a, b) => lastPrasadDate(state, a.id).localeCompare(lastPrasadDate(state, b.id)))[0];
}

/** Fund balance: contributions minus expenses (posted or not). */
export function fundBalance(state: SatsangState): number {
  return state.fund.reduce((s, f) => s + (f.kind === 'contribution' ? f.amount : -f.amount), 0);
}

/** Bhajans sorted by least-recently-sung first (avoid repeats). */
export function bhajansByStaleness(state: SatsangState): Bhajan[] {
  return [...state.bhajans].sort((a, b) =>
    (a.lastSungDate || '0000-00-00').localeCompare(b.lastSungDate || '0000-00-00')
  );
}

function loadState(ws: string): SatsangState {
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
function buildSeed(): SatsangState {
  const now = Date.now();
  const t = todayISO();
  const members: Member[] = [
    { id: 'm_1', name: 'Example (seed)', phone: '', role: 'sanchalak', joinDate: t, active: true, notes: 'Example record (seed) — replace with your mandali\u2019s sanchalak.', createdAt: now },
    { id: 'm_2', name: 'Example Kirtankar (seed)', phone: '', role: 'kirtankar', joinDate: t, active: true, notes: 'Example record (seed).', createdAt: now },
    { id: 'm_3', name: 'Example Sevak (seed)', phone: '', role: 'prasad-seva', joinDate: t, active: true, notes: 'Example record (seed).', createdAt: now },
  ];
  const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); // next Sunday
  const nextSun = d.toISOString().slice(0, 10);
  const gatherings: Gathering[] = [
    { id: 'g_1', date: nextSun, time: '18:00', venue: 'Community hall (seed)', hostId: 'm_1', theme: 'Ekadashi kirtan (seed)', status: 'scheduled', createdAt: now },
  ];
  const bhajans: Bhajan[] = [
    { id: 'b_1', title: 'Om Jai Jagdish Hare', deity: 'Vishnu', language: 'Hindi', lyricsNote: 'Standard aarti — in the mandali book', timesSung: 12, createdAt: now },
    { id: 'b_2', title: 'Hare Krishna Mahamantra', deity: 'Krishna', language: 'Sanskrit', lyricsNote: 'Kirtan — 16 rounds style', timesSung: 8, createdAt: now },
    { id: 'b_3', title: 'Jai Ganesh Jai Ganesh', deity: 'Ganesha', language: 'Hindi', lyricsNote: 'Opening bhajan', timesSung: 5, createdAt: now },
  ];
  const fund: FundEntry[] = [
    { id: 'f_1', date: t, kind: 'contribution', memberId: 'm_1', amount: 501, note: 'Seed — monthly collection example', createdAt: now },
  ];
  return { ...EMPTY, members, gatherings, bhajans, fund, settings: { ...EMPTY.settings, defaultVenue: 'Community hall' } };
}

/* ------------------------- context ------------------------- */
interface SatsangCtx {
  state: SatsangState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: SatsangState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<SatsangState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<SatsangSettings>) => void;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<SatsangCtx | null>(null);

export const SatsangProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<SatsangState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  // Workspace switch → reload. Guarded so the mount pass never clobbers
  // a seed applied by the desk's own effect in the same commit.
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<SatsangCtx>(() => ({
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
    ensureSeeded: () => setState((s) => (s.members.length ? s : buildSeed())),
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.members)) return false;
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(buildSeed()),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useSatsang = (): SatsangCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSatsang must be used inside SatsangProvider');
  return ctx;
};
