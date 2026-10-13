import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoshalaState, Nandi, HealthRecord, MilkRecord, MilkDisposal,
  FodderItem, FodderConsumption, Sponsorship, DutySlot, GrantRecord,
  GoshalaExpense, GoshalaSettings,
} from './types';

/* ------------------------------------------------------------------ */
/* Goshala One store — offline-first, per-workspace localStorage.      */
/* Cattle, health, milk, fodder, roster and grant records live on this */
/* device; money (sponsorships, expenses) ALSO posts to treasury,      */
/* which has the cloud path. New data-layer module — DataContext is    */
/* never touched (128KB transport limit).                              */
/* ------------------------------------------------------------------ */

type EntityKey =
  | 'nandis' | 'health' | 'milk' | 'disposals' | 'fodderItems'
  | 'fodderUse' | 'sponsorships' | 'duties' | 'grants' | 'expenses';

const EMPTY: GoshalaState = {
  nandis: [], health: [], milk: [], disposals: [],
  fodderItems: [], fodderUse: [], sponsorships: [],
  duties: [], grants: [], expenses: [],
  settings: { grantPerDay: 50, estCostPerDay: 125 },
};

const storageKey = (ws: string) => `sb_goshala_${ws}`;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysFrom = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function loadState(ws: string): GoshalaState {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) return { ...EMPTY, ...JSON.parse(raw), settings: { ...EMPTY.settings, ...(JSON.parse(raw).settings || {}) } };
  } catch { /* corrupted → reseed */ }
  return { ...EMPTY };
}

/* ------------------------- demo seed ------------------------- */
function buildSeed(): GoshalaState {
  const nandis: Nandi[] = [
    { id: 'n_1', name: 'Kamdhenu', tagId: 'GM-0001', breed: 'Gir', sex: 'cow', ageYears: 7, source: 'donated', status: 'milking', addedDate: '2021-03-14' },
    { id: 'n_2', name: 'Nandini', tagId: 'GM-0002', breed: 'Sahiwal', sex: 'cow', ageYears: 6, source: 'donated', status: 'milking', addedDate: '2021-06-02' },
    { id: 'n_3', name: 'Surabhi', tagId: 'GM-0003', breed: 'Tharparkar', sex: 'cow', ageYears: 5, source: 'rescued', status: 'pregnant', addedDate: '2022-01-20', notes: 'Rescued from highway — fully recovered' },
    { id: 'n_4', name: 'Dhenu', tagId: 'GM-0004', breed: 'Gir', sex: 'cow', ageYears: 9, source: 'donated', status: 'dry', addedDate: '2020-11-05' },
    { id: 'n_5', name: 'Kapila', tagId: 'GM-0005', breed: 'Red Sindhi', sex: 'cow', ageYears: 4, source: 'born', status: 'sick', motherId: 'n_1', addedDate: '2022-08-11', notes: 'Mild mastitis — under treatment' },
    { id: 'n_6', name: 'Vrishabha', tagId: 'GM-0006', breed: 'Gir', sex: 'bull', ageYears: 8, source: 'donated', status: 'retired', addedDate: '2020-05-30' },
    { id: 'n_7', name: 'Vatsa Gopal', tagId: 'GM-0007', breed: 'Sahiwal', sex: 'vatsa', ageYears: 1, source: 'born', status: 'vatsa', motherId: 'n_2', addedDate: '2025-09-02' },
    { id: 'n_8', name: 'Vatsa Mohan', tagId: 'GM-0008', breed: 'Gir', sex: 'vatsa', ageYears: 0, source: 'born', status: 'vatsa', motherId: 'n_1', addedDate: '2026-04-18' },
  ];
  const health: HealthRecord[] = [
    { id: 'h_1', nandiId: 'n_1', date: daysFrom(-60), kind: 'vaccination', title: 'FMD vaccination', vetName: 'Dr. R. P. Singh', cost: 150, nextDue: daysFrom(120) },
    { id: 'h_2', nandiId: 'n_2', date: daysFrom(-60), kind: 'vaccination', title: 'FMD vaccination', vetName: 'Dr. R. P. Singh', cost: 150, nextDue: daysFrom(120) },
    { id: 'h_3', nandiId: 'n_3', date: daysFrom(-30), kind: 'deworming', title: 'Quarterly deworming', cost: 80, nextDue: daysFrom(60) },
    { id: 'h_4', nandiId: 'n_5', date: daysFrom(-2), kind: 'treatment', title: 'Mastitis treatment', details: 'Antibiotic course + hot fomentation', vetName: 'Dr. R. P. Singh', cost: 650, nextDue: daysFrom(5) },
    { id: 'h_5', nandiId: 'n_4', date: daysFrom(-10), kind: 'checkup', title: 'General health checkup', vetName: 'Dr. R. P. Singh', cost: 200 },
  ];
  const milk: MilkRecord[] = [];
  const yields: Record<string, number> = { n_1: 9.5, n_2: 8.0 };
  [0, -1, -2].forEach((d) => {
    (['morning', 'evening'] as const).forEach((s) => {
      Object.entries(yields).forEach(([nid, base]) => {
        milk.push({ id: uid('ml'), nandiId: nid, date: daysFrom(d), session: s, liters: Math.round((base / 2 + (Math.random() * 0.6 - 0.3)) * 10) / 10 });
      });
    });
  });
  const disposals: MilkDisposal[] = [
    { id: 'd_1', date: daysFrom(-1), liters: 12, kind: 'sold', amount: 720, party: 'Local dairy' },
    { id: 'd_2', date: daysFrom(-1), liters: 5, kind: 'distributed', amount: 0, party: 'Ashram bhojan-shala' },
    { id: 'd_3', date: todayISO(), liters: 6, kind: 'donated', amount: 0, party: 'Needy families' },
  ];
  const fodderItems: FodderItem[] = [
    { id: 'f_1', name: 'Hara Chara (Green fodder)', kind: 'green', unit: 'quintal', stockQty: 18, ratePerUnit: 900, reorderLevel: 10 },
    { id: 'f_2', name: 'Sukha Chara (Dry fodder)', kind: 'dry', unit: 'quintal', stockQty: 42, ratePerUnit: 1400, reorderLevel: 20 },
    { id: 'f_3', name: 'Dana Mishran (Concentrate)', kind: 'concentrate', unit: 'bag (50kg)', stockQty: 25, ratePerUnit: 1650, reorderLevel: 12 },
    { id: 'f_4', name: 'Khanij Mishran (Mineral mix)', kind: 'mineral', unit: 'bag (25kg)', stockQty: 8, ratePerUnit: 950, reorderLevel: 4 },
  ];
  const fodderUse: FodderConsumption[] = [];
  [0, -1, -2].forEach((d) => {
    fodderUse.push({ id: uid('fu'), date: daysFrom(d), itemId: 'f_1', qty: 1.6 });
    fodderUse.push({ id: uid('fu'), date: daysFrom(d), itemId: 'f_2', qty: 2.4 });
    fodderUse.push({ id: uid('fu'), date: daysFrom(d), itemId: 'f_3', qty: 3 });
  });
  const sponsorships: Sponsorship[] = [
    { id: 'sp_1', nandiId: 'n_1', sponsorName: 'Shri Anil Agarwal', phone: '+91 98100 77777', gotra: 'Kashyap', plan: 'yearly', amount: 21000, startDate: daysFrom(-300), endDate: daysFrom(65), status: 'active', receiptNo: 'SB-GAU-2026-0142' },
    { id: 'sp_2', sponsorName: 'Smt. Meera Kulkarni', phone: '+91 98200 88888', plan: 'monthly', amount: 2100, startDate: daysFrom(-40), endDate: daysFrom(320), status: 'active', receiptNo: 'SB-GAU-2026-0189' },
    { id: 'sp_3', nandiId: 'n_5', sponsorName: 'Shri Ramesh Iyer', plan: 'yearly', amount: 15000, startDate: daysFrom(-350), endDate: daysFrom(15), status: 'expiring', receiptNo: 'SB-GAU-2026-0098' },
  ];
  const duties: DutySlot[] = [
    { id: 'du_1', date: todayISO(), shift: 'morning', duty: 'feeding', assignee: 'Mohanlal Yadav', phone: '+91 98200 11111' },
    { id: 'du_2', date: todayISO(), shift: 'morning', duty: 'milking', assignee: 'Shanti Devi', phone: '+91 98200 22222' },
    { id: 'du_3', date: todayISO(), shift: 'evening', duty: 'cleaning', assignee: 'Mohanlal Yadav' },
    { id: 'du_4', date: todayISO(), shift: 'evening', duty: 'milking', assignee: 'Shanti Devi' },
    { id: 'du_5', date: daysFrom(1), shift: 'morning', duty: 'feeding', assignee: 'Mohanlal Yadav' },
    { id: 'du_6', date: daysFrom(1), shift: 'morning', duty: 'vet-assist', assignee: 'Shanti Devi' },
  ];
  const grants: GrantRecord[] = [
    { id: 'g_1', scheme: 'Rashtriya Gokul Mission — fodder support', authority: 'Dept. of Animal Husbandry', appliedDate: daysFrom(-90), status: 'pending', amountApplied: 480000, amountReceived: 0, notes: '₹50/day/animal claimed for 8 animals × 12 months' },
    { id: 'g_2', scheme: 'State Goshala Anudan', authority: 'State Gau Seva Aayog', appliedDate: daysFrom(-200), status: 'received', amountApplied: 120000, amountReceived: 96000 },
  ];
  const expenses: GoshalaExpense[] = [
    { id: 'e_1', date: daysFrom(-3), head: 'feed', amount: 14400, paidTo: 'Chara supplier — Sharma Traders', paymentMode: 'UPI' },
    { id: 'e_2', date: daysFrom(-2), head: 'vet', amount: 650, paidTo: 'Dr. R. P. Singh', paymentMode: 'Cash' },
    { id: 'e_3', date: daysFrom(-5), head: 'staff', amount: 24000, paidTo: 'Monthly sevadar honorarium (2)', paymentMode: 'Bank' },
  ];
  return {
    ...EMPTY, nandis, health, milk, disposals, fodderItems, fodderUse,
    sponsorships, duties, grants, expenses,
    settings: { grantPerDay: 50, estCostPerDay: 125 },
  };
}

/* ------------------------- context ------------------------- */
interface GoshalaCtx {
  state: GoshalaState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: GoshalaState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<GoshalaState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<GoshalaSettings>) => void;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<GoshalaCtx | null>(null);

export const GoshalaProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<GoshalaState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  // Workspace switch → reload. Guarded so the mount pass never clobbers
  // a seed applied by the desk's own effect in the same commit.
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<GoshalaCtx>(() => ({
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
    ensureSeeded: () => setState((s) => (s.nandis.length ? s : buildSeed())),
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.nandis)) return false;
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(buildSeed()),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useGoshala = (): GoshalaCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGoshala must be used inside GoshalaProvider');
  return ctx;
};

export { uid, todayISO, daysFrom };
