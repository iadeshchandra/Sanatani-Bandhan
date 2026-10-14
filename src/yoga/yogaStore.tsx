import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  YogaState, YogaSettings, YogaBatch, YogaStudent, AttendanceRecord, FeeRecord,
  YogaInstructor, ClassDiaryEntry,
} from './types';

/* ------------------------------------------------------------------ */
/* Yoga One store — offline-first, per-workspace localStorage.         */
/* Batches, students, attendance, fees, instructors and the class diary */
/* live on this device. Only treasury postings (fee income) go to the  */
/* cloud ledger. New data-layer module — DataContext is never touched  */
/* (transport limit).                                                  */
/*                                                                     */
/* ENROLMENT RULE: a batch accepts students up to its capacity;        */
/* over-capacity enrolment is blocked and the operator is offered the  */
/* other batches with space instead.                                   */
/* ------------------------------------------------------------------ */

type EntityKey = 'batches' | 'students' | 'attendance' | 'fees' | 'instructors' | 'diary';

const EMPTY: YogaState = {
  batches: [], students: [], attendance: [], fees: [], instructors: [], diary: [],
  settings: { shalaName: '', defaultFeeMonthly: 500, receiptSeq: 0, attendanceAlertBelowPct: 60 },
};

const storageKey = (ws: string) => `sb_yoga_${ws}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const monthISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Active (billable) students of a batch. */
export function batchStudents(state: YogaState, batchId: string): YogaStudent[] {
  return state.students.filter((s) => s.batchId === batchId && s.status === 'active');
}

/** True when the batch still has room for one more student. */
export function batchHasRoom(state: YogaState, batch: YogaBatch): boolean {
  return batch.active && batchStudents(state, batch.id).length < batch.capacity;
}

/** Batches with room, sorted by most room first (suggestion when a batch is full). */
export function batchesWithRoom(state: YogaState, exceptId?: string): YogaBatch[] {
  return state.batches
    .filter((b) => b.id !== exceptId && batchHasRoom(state, b))
    .sort((a, b) => (b.capacity - batchStudents(state, b.id).length) - (a.capacity - batchStudents(state, a.id).length));
}

/** Attendance map studentId → present for a batch+date. */
export function attendanceMap(state: YogaState, batchId: string, date: string): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const r of state.attendance) {
    if (r.batchId === batchId && r.date === date) m[r.studentId] = r.present;
  }
  return m;
}

/** Student attendance % over their marked sessions (all time for the batch). */
export function attendancePct(state: YogaState, studentId: string, batchId: string): number | null {
  const recs = state.attendance.filter((r) => r.studentId === studentId && r.batchId === batchId);
  if (!recs.length) return null;
  const present = recs.filter((r) => r.present).length;
  return Math.round((present / recs.length) * 100);
}

/** Did the batch run on this date? (date's weekday in batch.days) */
export function batchRunsOn(batch: YogaBatch, dateISO: string): boolean {
  return batch.days.includes(new Date(dateISO + 'T12:00:00').getDay());
}

/** Students below the attendance alert threshold (with at least 4 marked sessions). */
export function lowAttendanceStudents(state: YogaState): Array<{ student: YogaStudent; pct: number }> {
  const out: Array<{ student: YogaStudent; pct: number }> = [];
  for (const s of state.students) {
    if (s.status !== 'active') continue;
    const recs = state.attendance.filter((r) => r.studentId === s.id);
    if (recs.length < 4) continue;
    const pct = Math.round((recs.filter((r) => r.present).length / recs.length) * 100);
    if (pct < state.settings.attendanceAlertBelowPct) out.push({ student: s, pct });
  }
  return out.sort((a, b) => a.pct - b.pct);
}

/** Fee paid for a student+period? */
export function feePaid(state: YogaState, studentId: string, period: string): FeeRecord | undefined {
  return state.fees.find((f) => f.studentId === studentId && f.period === period);
}

/** Total fees collected in a YYYY-MM period. */
export function feesCollected(state: YogaState, period: string): number {
  return state.fees.filter((f) => f.period === period).reduce((s, f) => s + f.amount, 0);
}

/** Active students with no fee for the period (overdue list). */
export function feesOverdue(state: YogaState, period: string): YogaStudent[] {
  return state.students.filter((s) => s.status === 'active' && !feePaid(state, s.id, period));
}

/** Next receipt number YG-RCT-YYYY-NNNN. */
export function nextReceiptNo(settings: YogaSettings): { receiptNo: string; seq: number } {
  const seq = settings.receiptSeq + 1;
  const y = new Date().getFullYear();
  return { receiptNo: `YG-RCT-${y}-${String(seq).padStart(4, '0')}`, seq };
}

function loadState(ws: string): YogaState {
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
function buildSeed(): YogaState {
  const now = Date.now();
  const today = todayISO();
  const instructors: YogaInstructor[] = [
    { id: 'i_1', name: 'Yogacharya Meera Sharma', phone: '+91 98250 77777', specialties: 'Hatha, Pranayama', honorariumMonthly: 12000, active: true },
  ];
  const batches: YogaBatch[] = [
    { id: 'b_morn', name: 'Morning Beginners', level: 'beginner', days: [1, 2, 3, 4, 5], startTime: '06:00', endTime: '07:00', instructorId: 'i_1', capacity: 20, feeMonthly: 500, active: true, notes: 'Example batch (seed)' },
    { id: 'b_eve', name: 'Evening Intermediate', level: 'intermediate', days: [1, 3, 5], startTime: '18:00', endTime: '19:00', instructorId: 'i_1', capacity: 15, feeMonthly: 700, active: true, notes: 'Example batch (seed)' },
  ];
  const students: YogaStudent[] = [
    { id: 's_1', name: 'Example sadhak (seed)', phone: '+91 98250 11111', joinDate: today, batchId: 'b_morn', feeCycle: 'monthly', status: 'active', createdAt: now },
    { id: 's_2', name: 'Example sadhika (seed)', phone: '+91 98250 22222', joinDate: today, batchId: 'b_morn', feeCycle: 'monthly', status: 'active', createdAt: now },
  ];
  const attendance: AttendanceRecord[] = [
    { id: 'a_1', date: today, batchId: 'b_morn', studentId: 's_1', present: true, markedAt: now },
    { id: 'a_2', date: today, batchId: 'b_morn', studentId: 's_2', present: true, markedAt: now },
  ];
  return { ...EMPTY, batches, students, attendance, instructors, settings: { ...EMPTY.settings } };
}

/* ------------------------- context ------------------------- */
interface YogaCtx {
  state: YogaState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: YogaState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<YogaState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<YogaSettings>) => void;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<YogaCtx | null>(null);

export const YogaProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<YogaState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<YogaCtx>(() => ({
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
    // Seed guard: only seed when no batches exist (never clobber user data).
    ensureSeeded: () => setState((s) => (s.batches.length ? s : buildSeed())),
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.batches)) return false;
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(buildSeed()),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useYoga = (): YogaCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useYoga must be used inside YogaProvider');
  return ctx;
};
