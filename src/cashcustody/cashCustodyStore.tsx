import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CashCustodyState, CountingSession, CustodyEvent, CustodyEventKind,
  DenomKey, DENOM_VALUE, DENOMINATIONS, DepositSlip, HundiBox,
  CountingStaff, StaffAttendance,
} from './types';

/* ------------------------------------------------------------------ */
/* Cash Custody store — offline-first, per-workspace localStorage.      */
/* Hundi boxes, counting sessions, custody events (hash-chained),       */
/* deposit slips, staff and attendance live on this device; money posts */
/* to treasury via useData().addTreasuryTransaction (cloud path).      */
/* New data-layer module — DataContext.tsx is never touched.           */
/* ------------------------------------------------------------------ */

/* ---------------- synchronous SHA-256 (no deps) ---------------- */
function sha256Hex(input: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 0xff);
  const w = new Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[chunk + i * 4] << 24) | (bytes[chunk + i * 4 + 1] << 16) | (bytes[chunk + i * 4 + 2] << 8) | bytes[chunk + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

export { sha256Hex };

const GENESIS = 'GENESIS';

/** Hash one custody event, chaining to the previous. seq binds the append
 *  order into the hash so same-millisecond events can't be reordered. */
export function chainEvent(prev: CustodyEvent | undefined, kind: CustodyEventKind, actor: string, details: string, ts?: number, seq?: number): CustodyEvent {
  const prevHash = prev ? prev.hash : GENESIS;
  const t = ts ?? Date.now();
  const s = seq ?? 0;
  const hash = sha256Hex(`${prevHash}|${s}|${t}|${kind}|${actor}|${details}`);
  return { id: `ev_${t.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`, ts: t, seq: s, kind, actor, details, prevHash, hash };
}

/** Verify the whole chain in seq order. Returns the index of the first broken link, or -1 if intact. */
export function verifyChain(events: CustodyEvent[]): number {
  const sorted = [...events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    const expectedPrev = i === 0 ? GENESIS : sorted[i - 1].hash;
    if (ev.prevHash !== expectedPrev) return i;
    const recomputed = sha256Hex(`${ev.prevHash}|${ev.seq ?? 0}|${ev.ts}|${ev.kind}|${ev.actor}|${ev.details}`);
    if (recomputed !== ev.hash) return i;
  }
  return -1;
}

/* ------------------------- state ------------------------- */
type EntityKey = 'boxes' | 'sessions' | 'events' | 'deposits' | 'staff' | 'attendance';

const EMPTY: CashCustodyState = {
  boxes: [], sessions: [], events: [], deposits: [], staff: [], attendance: [],
  settings: { slipSeq: {}, defaultBankName: '', defaultBankBranch: '' },
};

const storageKey = (ws: string) => `sb_cashcustody_${ws}`;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

function loadState(ws: string): CashCustodyState {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) {
      const parsed = JSON.parse(raw);
      // Backfill seq for events written before seq existed (array = append order).
      if (Array.isArray(parsed.events)) {
        parsed.events.forEach((ev: any, i: number) => { if (typeof ev.seq !== 'number') ev.seq = i; });
      }
      return { ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } };
    }
  } catch { /* corrupted → start empty */ }
  return { ...EMPTY };
}

function buildSeed(): CashCustodyState {
  const s: CashCustodyState = { ...EMPTY, settings: { slipSeq: {}, defaultBankName: '', defaultBankBranch: '' } };
  const boxes: HundiBox[] = [
    { id: 'bx_1', boxCode: 'HND-001', name: 'Garbhagriha Hundi', location: 'sanctum', sealNumber: 'SL-2026-0142', custodian1: 'Shri R. Sharma', custodian2: 'Shri M. Gupta', status: 'sealed', createdAt: Date.now() - 90 * 864e5 },
    { id: 'bx_2', boxCode: 'HND-002', name: 'Main Gate Donation Box', location: 'gate', sealNumber: 'SL-2026-0143', custodian1: 'Shri R. Sharma', custodian2: 'Smt. K. Devi', status: 'sealed', createdAt: Date.now() - 90 * 864e5 },
    { id: 'bx_3', boxCode: 'HND-003', name: 'Annakshetra Box', location: 'annakshetra', sealNumber: 'SL-2026-0144', custodian1: 'Shri M. Gupta', custodian2: 'Shri D. Yadav', status: 'sealed', createdAt: Date.now() - 60 * 864e5 },
  ];
  s.boxes = boxes;
  let prev: CustodyEvent | undefined;
  boxes.forEach((b) => {
    prev = chainEvent(prev, 'box_registered', 'Trustee', `${b.boxCode} — ${b.name} (${b.location}), seal ${b.sealNumber}`, b.createdAt, s.events.length);
    s.events.push(prev);
  });
  s.staff = [
    { id: 'st_1', name: 'Shri R. Sharma', phone: '+91 98XXX XXXXX', role: 'supervisor', active: true, joinedDate: todayISO() },
    { id: 'st_2', name: 'Shri M. Gupta', role: 'counter', active: true, joinedDate: todayISO() },
    { id: 'st_3', name: 'Smt. K. Devi', role: 'checker', active: true, joinedDate: todayISO() },
  ];
  return s;
}

/** Total ₹ value of a denomination count map. Coins are entered as ₹ value. */
export function denomTotal(counts: Record<DenomKey, number>): number {
  return DENOMINATIONS.reduce((sum, k) => sum + (Number(counts[k]) || 0) * DENOM_VALUE[k], 0);
}

export function emptyCounts(): Record<DenomKey, number> {
  return { '2000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, 'coins': 0 };
}

/* ------------------------- context ------------------------- */
interface CashCustodyCtx {
  state: CashCustodyState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: CashCustodyState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<CashCustodyState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<CashCustodyState['settings']>) => void;
  /** Append a hash-chained custody event. */
  logEvent: (kind: CustodyEventKind, actor: string, details: string) => CustodyEvent;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<CashCustodyCtx | null>(null);

export const CashCustodyProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<CashCustodyState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<CashCustodyCtx>(() => ({
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
    logEvent: (kind, actor, details) => {
      // Compute eagerly from current state (updaters don't run synchronously).
      // Prev = highest-seq event; seq = append count (events are append-only).
      const sorted = [...state.events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
      const ev = chainEvent(sorted[sorted.length - 1], kind, actor, details, undefined, state.events.length);
      setState((s) => ({ ...s, events: [...s.events, ev] }));
      return ev;
    },
    ensureSeeded: () => setState((s) => (s.boxes.length ? s : buildSeed())),
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.boxes) || !Array.isArray(parsed.events)) return false;
        if (verifyChain(parsed.events) !== -1) return false; // refuse a broken chain
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(buildSeed()),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useCashCustody = (): CashCustodyCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCashCustody must be used inside CashCustodyProvider');
  return ctx;
};

export { uid, todayISO };

/** Next deposit-slip number: SB-DPST-2026-0001. */
export function nextSlipNo(settings: CashCustodyState['settings']): { slipNo: string; seq: Record<string, number> } {
  const year = new Date().getFullYear();
  const seq = { ...settings.slipSeq };
  seq[year] = (seq[year] || 0) + 1;
  return { slipNo: `SB-DPST-${year}-${String(seq[year]).padStart(4, '0')}`, seq };
}
