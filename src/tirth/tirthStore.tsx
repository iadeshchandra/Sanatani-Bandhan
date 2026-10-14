import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  TirthState, TirthSettings, DarshanSlot, DarshanToken, SevaBooking, CrowdSnapshot,
} from './types';

/* ------------------------------------------------------------------ */
/* Tirth One store — offline-first, per-workspace localStorage.        */
/* Darshan slots, tokens, queue state, seva bookings and crowd counts  */
/* live on this device. Only treasury postings (seva-darshan income)   */
/* go to the cloud ledger. New data-layer module — DataContext is      */
/* never touched (transport limit).                                    */
/*                                                                     */
/* QUEUE RULES:                                                        */
/* - Token numbers (T-0001…) reset each day; sequence is per date.     */
/* - A slot accepts tokens up to its daily capacity; overflow is       */
/*   waitlisted (kept as waiting tokens flagged over-capacity, never   */
/*   silently dropped) — actually: issuance is blocked past capacity   */
/*   and the operator is offered the next slot with space instead.      */
/* - "Now serving" per slot = highest served sequence for that slot    */
/*   and date.                                                         */
/* - Wait times are estimates: waiting-ahead × avgMinsPerDevotee.      */
/* ------------------------------------------------------------------ */

type EntityKey = 'slots' | 'tokens' | 'seva' | 'crowd';

const EMPTY: TirthState = {
  slots: [], tokens: [], seva: [], crowd: [],
  settings: { avgMinsPerDevotee: 2, tirthName: '' },
};

const storageKey = (ws: string) => `sb_tirth_${ws}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysFrom = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Tokens for a date (optionally one slot), excluding cancelled. */
export function tokensFor(state: TirthState, date: string, slotId?: string): DarshanToken[] {
  return state.tokens
    .filter((t) => t.date === date && t.status !== 'cancelled' && (!slotId || t.slotId === slotId))
    .sort((a, b) => a.seq - b.seq);
}

/** Next token number for a date: T-0001… (sequence never reuses numbers). */
export function nextToken(state: TirthState, date: string): { no: string; seq: number } {
  const seqs = state.tokens.filter((t) => t.date === date).map((t) => t.seq);
  const seq = seqs.length ? Math.max(...seqs) + 1 : 1;
  return { no: `T-${String(seq).padStart(4, '0')}`, seq };
}

/** Issued (non-cancelled) token count for a slot on a date. */
export function slotIssued(state: TirthState, slotId: string, date: string): number {
  return tokensFor(state, date, slotId).length;
}

/** True when the slot still has room for one more token today. */
export function slotHasRoom(state: TirthState, slot: DarshanSlot, date: string): boolean {
  return slot.active && slotIssued(state, slot.id, date) < slot.capacity;
}

/** Highest served sequence for a slot+date (the "now serving" number). */
export function nowServingSeq(state: TirthState, slotId: string, date: string): number | null {
  const served = state.tokens.filter(
    (t) => t.date === date && t.slotId === slotId && t.status === 'served'
  );
  if (!served.length) return null;
  return Math.max(...served.map((t) => t.seq));
}

/** Waiting tokens for a slot+date, in order. */
export function waitingTokens(state: TirthState, slotId: string, date: string): DarshanToken[] {
  return tokensFor(state, date, slotId).filter((t) => t.status === 'waiting');
}

/** Estimated wait minutes for a token: people ahead × avg minutes. Labelled estimate in UI. */
export function estWaitMins(state: TirthState, slotId: string, date: string, seq: number): number {
  const ahead = waitingTokens(state, slotId, date).filter((t) => t.seq < seq).length;
  return ahead * Math.max(1, state.settings.avgMinsPerDevotee);
}

/** Slot utilisation % for a date (issued ÷ capacity). */
export function slotUtilPct(state: TirthState, slot: DarshanSlot, date: string): number {
  if (slot.capacity <= 0) return 0;
  return Math.min(100, Math.round((slotIssued(state, slot.id, date) / slot.capacity) * 100));
}

/** No-show % for a date (no-show ÷ (served + no-show)). */
export function noShowPct(state: TirthState, date: string): number {
  const ts = state.tokens.filter((t) => t.date === date && (t.status === 'served' || t.status === 'no-show'));
  if (!ts.length) return 0;
  return Math.round((ts.filter((t) => t.status === 'no-show').length / ts.length) * 100);
}

/** Peak crowd hour for a date from snapshots ("14:00 — 850"). */
export function peakCrowd(state: TirthState, date: string): { hour: string; count: number } | null {
  const snaps = state.crowd.filter((c) => c.date === date);
  if (!snaps.length) return null;
  const byHour: Record<string, number> = {};
  for (const s of snaps) {
    const h = s.time.slice(0, 2) + ':00';
    byHour[h] = Math.max(byHour[h] || 0, s.count);
  }
  let best: { hour: string; count: number } | null = null;
  for (const [hour, count] of Object.entries(byHour)) {
    if (!best || count > best.count) best = { hour, count };
  }
  return best;
}

/** Total seva income for a date. */
export function sevaIncome(state: TirthState, date: string): number {
  return state.seva.filter((s) => s.date === date).reduce((sum, s) => sum + s.amount, 0);
}

function loadState(ws: string): TirthState {
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
/** Example slots + a few example tokens so the queue board isn't empty. */
function buildSeed(): TirthState {
  const today = todayISO();
  const now = new Date().toISOString();
  const slots: DarshanSlot[] = [
    { id: 'sl_morn', name: 'Morning darshan', startTime: '06:00', endTime: '11:00', capacity: 800, slotType: 'General', active: true },
    { id: 'sl_senior', name: 'Senior citizen', startTime: '11:00', endTime: '12:00', capacity: 100, slotType: 'Senior citizen', active: true },
    { id: 'sl_eve', name: 'Evening darshan', startTime: '16:00', endTime: '20:00', capacity: 600, slotType: 'General', active: true },
    { id: 'sl_aarti', name: 'Sandhya Aarti', startTime: '19:00', endTime: '19:45', capacity: 200, slotType: 'VIP seva', active: true, notes: 'Example — aarti pass holders' },
  ];
  const tokens: DarshanToken[] = [
    { id: 'tk_s1', date: today, slotId: 'sl_morn', no: 'T-0001', seq: 1, kind: 'walk-in', status: 'served', issuedAt: now, servedAt: now, name: 'Example yatri (seed)' },
    { id: 'tk_s2', date: today, slotId: 'sl_morn', no: 'T-0002', seq: 2, kind: 'walk-in', status: 'served', issuedAt: now, servedAt: now, name: 'Example yatri (seed)' },
    { id: 'tk_s3', date: today, slotId: 'sl_morn', no: 'T-0003', seq: 3, kind: 'walk-in', status: 'waiting', issuedAt: now, name: 'Example yatri (seed)' },
    { id: 'tk_s4', date: today, slotId: 'sl_morn', no: 'T-0004', seq: 4, kind: 'advance', status: 'waiting', issuedAt: now, name: 'Example yatri (seed)' },
  ];
  return { ...EMPTY, slots, tokens, settings: { ...EMPTY.settings } };
}

/* ------------------------- context ------------------------- */
interface TirthCtx {
  state: TirthState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: TirthState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<TirthState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<TirthSettings>) => void;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<TirthCtx | null>(null);

export const TirthProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<TirthState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<TirthCtx>(() => ({
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
    // Seed guard: only seed when no slots exist (never clobber user data).
    ensureSeeded: () => setState((s) => (s.slots.length ? s : buildSeed())),
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.slots)) return false;
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(buildSeed()),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useTirth = (): TirthCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTirth must be used inside TirthProvider');
  return ctx;
};
