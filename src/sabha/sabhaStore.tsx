import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  SabhaState, SabhaSettings, Member, DuesEntry, WelfareEntry,
  Training, DutyAssignment, Meeting, Notice,
} from './types';

/* ------------------------------------------------------------------ */
/* Sabha One store — offline-first, per-workspace localStorage.        */
/* The sabha's member directory, dues, welfare fund, trainings, duty   */
/* roster, meetings and notices live on this device. Only money       */
/* movements (dues, welfare) post to the cloud treasury. New data-     */
/* layer module — DataContext is never touched (transport limit).      */
/*                                                                     */
/* SCOPE: the ASSOCIATION'S tool. Individual purohit profiles,         */
/* bookings and ratings stay in Purohit One — no duplication here.    */
/* Verification tiers shown are display-only (managed in Purohit One).*/
/* ------------------------------------------------------------------ */

type EntityKey = 'members' | 'dues' | 'welfare' | 'trainings' | 'duties' | 'meetings' | 'notices';

const EMPTY: SabhaState = {
  members: [], dues: [], welfare: [], trainings: [], duties: [], meetings: [], notices: [],
  settings: { sabhaName: '', annualDues: 1100, duesReceiptSeq: 0, resolutionSeq: 0 },
};

const storageKey = (ws: string) => `sb_sabha_${ws}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const thisYear = () => new Date().getFullYear();

/** Next dues receipt number: SB-DUES-YYYY-NNNN. */
export function nextDuesReceipt(settings: SabhaSettings): { receiptNo: string; seq: number } {
  const seq = settings.duesReceiptSeq + 1;
  return { receiptNo: `SB-DUES-${thisYear()}-${String(seq).padStart(4, '0')}`, seq };
}

/** Next meeting resolution number: RES-0001… */
export function nextResolutionNo(settings: SabhaSettings): { resolutionNo: string; seq: number } {
  const seq = settings.resolutionSeq + 1;
  return { resolutionNo: `RES-${String(seq).padStart(4, '0')}`, seq };
}

/** Active members only. */
export function activeMembers(state: SabhaState): Member[] {
  return state.members.filter((m) => m.active);
}

/** Dues collected for a year (posted or not). */
export function duesCollected(state: SabhaState, year: number): number {
  return state.dues.filter((d) => d.year === year).reduce((s, d) => s + d.amount, 0);
}

/** Members who have NOT paid dues for a year. */
export function duesDefaulters(state: SabhaState, year: number): Member[] {
  const paid = new Set(state.dues.filter((d) => d.year === year).map((d) => d.memberId));
  return activeMembers(state).filter((m) => !paid.has(m.id));
}

/** Welfare fund balance: contributions minus disbursements. */
export function welfareBalance(state: SabhaState): number {
  return state.welfare.reduce((s, w) => s + (w.kind === 'contribution' ? w.amount : -w.amount), 0);
}

/** Upcoming duties (today or future), soonest first. */
export function upcomingDuties(state: SabhaState): DutyAssignment[] {
  const t = todayISO();
  return state.duties
    .filter((d) => d.date >= t && (d.status === 'assigned' || d.status === 'confirmed'))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Upcoming trainings (today or future), soonest first. */
export function upcomingTrainings(state: SabhaState): Training[] {
  const t = todayISO();
  return state.trainings
    .filter((x) => x.date >= t)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function loadState(ws: string): SabhaState {
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
function buildSeed(): SabhaState {
  const now = Date.now();
  const t = todayISO();
  const members: Member[] = [
    { id: 'm_1', name: 'Example Acharya (seed)', phone: '', specializations: ['vivah', 'griha-pravesh'], experienceYears: 18, verificationTier: 'silver', joinDate: t, active: true, notes: 'Example record (seed) — verification tier shown here is display-only; it is managed in Purohit One.', createdAt: now },
    { id: 'm_2', name: 'Example Shastri (seed)', phone: '', specializations: ['shraddha', 'navagraha'], experienceYears: 9, verificationTier: 'bronze', joinDate: t, active: true, notes: 'Example record (seed).', createdAt: now },
    { id: 'm_3', name: 'Example Purohit (seed)', phone: '', specializations: ['havan', 'katha'], experienceYears: 4, verificationTier: 'unverified', joinDate: t, active: true, notes: 'Example record (seed).', createdAt: now },
  ];
  const d = new Date(); d.setDate(d.getDate() + 14);
  const trainings: Training[] = [
    { id: 't_1', title: 'Karmakanda refresher — Vivah paddhati (seed)', date: d.toISOString().slice(0, 10), venue: 'Sabha hall (seed)', trainer: 'Example Acharya (seed)', attendeeIds: ['m_2', 'm_3'], certificatesIssued: [], createdAt: now },
  ];
  const notices: Notice[] = [
    { id: 'n_1', title: 'Welcome to Sabha One (seed)', body: 'This board is for internal sabha notices — meeting calls, duty rosters, welfare appeals. Pin the important ones.', postedAt: now, pinned: true },
  ];
  return { ...EMPTY, members, trainings, notices, settings: { ...EMPTY.settings } };
}

/* ------------------------- context ------------------------- */
interface SabhaCtx {
  state: SabhaState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: SabhaState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<SabhaState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<SabhaSettings>) => void;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<SabhaCtx | null>(null);

export const SabhaProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<SabhaState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  // Workspace switch → reload. Guarded so the mount pass never clobbers
  // a seed applied by the desk's own effect in the same commit.
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<SabhaCtx>(() => ({
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
    // Seed guard: only seed when the directory is empty (never clobber user data).
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

export const useSabha = (): SabhaCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSabha must be used inside SabhaProvider');
  return ctx;
};
