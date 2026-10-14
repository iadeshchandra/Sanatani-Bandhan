import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  NyasState, NyasSettings, Registration, ComplianceItem, ApplicationEntry,
  VaultDoc, Meeting,
} from './types';

/* ------------------------------------------------------------------ */
/* Nyas One store — offline-first, per-workspace localStorage.         */
/* Registrations, compliance calendar, 85%-rule entries, vault        */
/* metadata, trustee meetings live on this device. Treasury is READ    */
/* only (income base + donor totals); this suite never writes money.  */
/* New data-layer module — DataContext is never touched (transport     */
/* limit).                                                            */
/*                                                                     */
/* HONESTY RULE: tracks and reminds. Does not file, does not advise.  */
/* ------------------------------------------------------------------ */

type EntityKey = 'registrations' | 'compliance' | 'applications' | 'vault' | 'meetings';

const EMPTY: NyasState = {
  registrations: [], compliance: [], applications: [], vault: [], meetings: [],
  settings: { trustName: '' },
};

const storageKey = (ws: string) => `sb_nyas_${ws}`;
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

/** Indian financial year for a yyyy-mm-dd date, e.g. '2026-27'. */
export function fyOf(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** [start, end] yyyy-mm-dd bounds of an FY string. */
export function fyRange(fy: string): [string, string] {
  const start = Number(fy.split('-')[0]);
  return [`${start}-04-01`, `${start + 1}-03-31`];
}

export function currentFY(): string {
  return fyOf(todayISO());
}

export type RegStatus = 'active' | 'expiring' | 'expired' | 'lifetime';

/** Registration status vs today. Expiring = within 90 days. */
export function regStatus(r: Registration): RegStatus {
  if (!r.validTo) return 'lifetime';
  const d = daysUntil(r.validTo);
  if (d < 0) return 'expired';
  if (d <= 90) return 'expiring';
  return 'active';
}

/** Registrations needing attention now (expired or expiring). */
export function attentionRegs(state: NyasState): Registration[] {
  return state.registrations.filter((r) => {
    const s = regStatus(r);
    return s === 'expired' || s === 'expiring';
  });
}

/** Compliance items currently overdue (past due, not done). */
export function overdueItems(state: NyasState): ComplianceItem[] {
  return state.compliance.filter(
    (c) => c.status !== 'done' && daysUntil(c.dueDate) < 0
  );
}

/** Compliance items due within `withinDays` (and not done). */
export function dueSoonItems(state: NyasState, withinDays = 30): ComplianceItem[] {
  return state.compliance.filter((c) => {
    if (c.status === 'done') return false;
    const d = daysUntil(c.dueDate);
    return d >= 0 && d <= withinDays;
  });
}

/**
 * Compliance health score 0–100.
 * Overdue = −25 each (floor 0), expiring registrations = −10 each,
 * done-this-FY items = +5 each (cap 100). Simple, explainable, honest.
 */
export function healthScore(state: NyasState): { score: number; detail: string } {
  let score = 100;
  const od = overdueItems(state).length;
  const ex = attentionRegs(state).length;
  const done = state.compliance.filter((c) => c.status === 'done' && c.fy === currentFY()).length;
  score -= od * 25;
  score -= ex * 10;
  score += Math.min(done * 5, 20);
  score = Math.max(0, Math.min(100, score));
  const parts: string[] = [];
  if (od) parts.push(`${od} overdue`);
  if (ex) parts.push(`${ex} registration(s) need attention`);
  if (done) parts.push(`${done} completed this FY`);
  return { score, detail: parts.join(' · ') || 'All clear' };
}

/** Sum of 85%-rule application entries for an FY. */
export function appliedForFY(state: NyasState, fy: string): number {
  return state.applications
    .filter((a) => a.fy === fy)
    .reduce((s, a) => s + a.amount, 0);
}

/** Next resolution number (RES-0001 …). */
export function nextResolutionNo(state: NyasState): string {
  const n = state.meetings.reduce((s, m) => s + m.resolutions.length, 0) + 1;
  return `RES-${String(n).padStart(4, '0')}`;
}

function loadState(ws: string): NyasState {
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
/** Generic FY compliance calendar — due dates, not fake filings. */
function buildSeed(): NyasState {
  const fy = currentFY();
  const y = Number(fy.split('-')[0]);
  const compliance: ComplianceItem[] = [
    { id: 'c_seed_10bd', kind: '10BD', fy, dueDate: `${y + 1}-05-31`, status: 'pending', notes: 'Statement of donations — file on the income-tax portal' },
    { id: 'c_seed_10be', kind: '10BE', fy, dueDate: `${y + 1}-06-30`, status: 'pending', notes: 'Donor certificates must be issued/downloaded' },
    { id: 'c_seed_audit', kind: 'Audit', fy, dueDate: `${y + 1}-09-30`, status: 'pending', notes: 'Statutory audit of trust accounts' },
    { id: 'c_seed_itr7', kind: 'ITR-7', fy, dueDate: `${y + 1}-10-31`, status: 'pending', notes: 'Income-tax return for the trust' },
    { id: 'c_seed_fcra', kind: 'FCRA Return', fy, dueDate: `${y + 1}-12-31`, status: 'pending', notes: 'Only if the trust holds FCRA registration' },
    { id: 'c_seed_bm1', kind: 'Board Meeting', fy, dueDate: `${y}-06-30`, status: 'pending', notes: 'Quarterly trustee meeting' },
    { id: 'c_seed_bm2', kind: 'Board Meeting', fy, dueDate: `${y}-09-30`, status: 'pending', notes: 'Quarterly trustee meeting' },
    { id: 'c_seed_bm3', kind: 'Board Meeting', fy, dueDate: `${y}-12-31`, status: 'pending', notes: 'Quarterly trustee meeting' },
    { id: 'c_seed_bm4', kind: 'Board Meeting', fy, dueDate: `${y + 1}-03-31`, status: 'pending', notes: 'Quarterly trustee meeting' },
  ];
  const registrations: Registration[] = [
    {
      id: 'r_seed_pan', kind: 'PAN', regNo: 'EXAMPLE — replace with the trust PAN',
      validFrom: `${y - 5}-04-01`, issuingAuthority: 'Income Tax Department',
      notes: 'Example entry — replace with the real PAN',
    },
  ];
  return { ...EMPTY, registrations, compliance, settings: { trustName: '' } };
}

/* ------------------------- context ------------------------- */
interface NyasCtx {
  state: NyasState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: NyasState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<NyasState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<NyasSettings>) => void;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<NyasCtx | null>(null);

export const NyasProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<NyasState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<NyasCtx>(() => ({
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
    ensureSeeded: () => setState((s) => (s.compliance.length ? s : buildSeed())),
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.compliance)) return false;
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(buildSeed()),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useNyas = (): NyasCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNyas must be used inside NyasProvider');
  return ctx;
};
