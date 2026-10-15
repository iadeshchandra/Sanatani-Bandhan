import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  SamskaraState, Family, FamilyMember, SamskaraRecord, Ancestor, CeremonyPlan,
  SamskaraId, SAMSKARAS, ChecklistItem, SAMSARA_DEFAULT_CHECKLIST,
} from './types';

/* ------------------------------------------------------------------ */
/* Samskara One store — offline-first, per-scope localStorage.         */
/* Family records, samskara chronicles, pitra records and ceremony     */
/* plans live on this device. Sacred family data NEVER leaves the     */
/* device. Only dakshina postings go to the cloud treasury ledger.    */
/* New data-layer module — DataContext is never touched.              */
/*                                                                     */
/* RESPECT RULE: this is a family's most sacred record. No badges,    */
/* no streaks, no points, no gamification. Ever.                      */
/* ------------------------------------------------------------------ */

type EntityKey = 'families' | 'members' | 'records' | 'ancestors' | 'plans';

/** String translator carried in from the UI (useLanguage's t with
 *  {var} interpolation, via useTr in ./ui). Lets reminder texts and
 *  seed checklists render in the family's language. */
export type Translator = (key: string, vars?: Record<string, string | number>) => string;

const EMPTY: SamskaraState = {
  families: [], members: [], records: [], ancestors: [], plans: [],
};

const storageKey = (scope: string) => `sb_samskara_${scope}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Age in whole years from a yyyy-mm-dd birth date. -1 if unknown. */
export function ageYears(birthDate?: string): number {
  if (!birthDate) return -1;
  const b = new Date(birthDate + 'T12:00:00');
  const n = new Date(todayISO() + 'T12:00:00');
  let age = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) age--;
  return age;
}

/** Days until a yyyy-mm-dd date (0 = today, negative = past → clamped 0). */
export function daysUntil(iso: string): number {
  const ms = new Date(iso + 'T12:00:00').getTime() - new Date(todayISO() + 'T12:00:00').getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/** Next occurrence of an MM-DD date as yyyy-mm-dd. */
export function nextMonthDay(monthDay: string): string {
  const [mm, dd] = monthDay.split('-').map(Number);
  const now = new Date();
  let d = new Date(now.getFullYear(), mm - 1, dd);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d.getTime() < today.getTime()) d = new Date(now.getFullYear() + 1, mm - 1, dd);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Reminder {
  id: string;
  kind: 'samskara-age' | 'shraddha' | 'ceremony';
  title: string;
  detail: string;
  memberId?: string;
  ancestorId?: string;
  planId?: string;
  date?: string;       // relevant yyyy-mm-dd
  inDays?: number;
  gentle: boolean;      // true → soft tone (shraddha, antyeshti-adjacent)
}

/** Gentle, age-based samskara reminders for living members.
 *  Only surfaces samskaras with a typicalAge >= 0 that are not yet
 *  recorded as completed/planned, within a 2-year approach window. */
export function samskaraReminders(state: SamskaraState, tr: Translator): Reminder[] {
  const out: Reminder[] = [];
  const recKey = new Set(state.records.map((r) => `${r.memberId}:${r.samskaraId}`));
  for (const m of state.members) {
    if (!m.isLiving || !m.birthDate) continue;
    const age = ageYears(m.birthDate);
    if (age < 0) continue;
    for (const s of SAMSKARAS) {
      if (s.typicalAge < 0) continue;
      if (s.forGender !== 'all' && s.forGender !== m.gender) continue;
      if (recKey.has(`${m.id}:${s.id}`)) continue;
      const diff = s.typicalAge - age;
      if (diff >= 0 && diff <= 2) {
        const sName = s.transliteration;
        out.push({
          id: `sa_${m.id}_${s.id}`,
          kind: 'samskara-age',
          title: diff === 0
            ? tr('suites.samskara.reminders.ageNow', { name: m.name, age, samskara: sName })
            : diff === 1
              ? tr('suites.samskara.reminders.ageSoonThisYear', { name: m.name, typicalAge: s.typicalAge, samskara: sName })
              : tr('suites.samskara.reminders.ageSoonYears', { name: m.name, typicalAge: s.typicalAge, diff, samskara: sName }),
          detail: tr('suites.samskara.reminders.ageDetail', { timing: tr(`suites.samskara.list.${s.id}.timing`) }),
          memberId: m.id,
          gentle: false,
        });
      }
    }
  }
  return out;
}

/** Annual shraddha reminders for ancestors, within a 30-day window. */
export function shraddhaReminders(state: SamskaraState, tr: Translator): Reminder[] {
  const out: Reminder[] = [];
  for (const a of state.ancestors) {
    if (!a.shraddhaMonthDay) continue;
    const next = nextMonthDay(a.shraddhaMonthDay);
    const inDays = daysUntil(next);
    if (inDays <= 30) {
      const dayWord = tr(`suites.samskara.reminders.${inDays === 1 ? 'day' : 'days'}`);
      out.push({
        id: `sh_${a.id}`,
        kind: 'shraddha',
        title: inDays === 0
          ? tr('suites.samskara.reminders.shraddhaToday', { name: a.name })
          : tr('suites.samskara.reminders.shraddhaUpcoming', { name: a.name, days: inDays, dayWord }),
        detail: tr('suites.samskara.reminders.shraddhaDetail', { relation: a.relation ? ` — ${a.relation}` : '' }),
        ancestorId: a.id,
        date: next,
        inDays,
        gentle: true,
      });
    }
  }
  return out.sort((x, y) => (x.inDays ?? 999) - (y.inDays ?? 999));
}

/** Upcoming ceremony plans within 60 days. */
export function ceremonyReminders(state: SamskaraState, tr: Translator): Reminder[] {
  const out: Reminder[] = [];
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? '—';
  for (const p of state.plans) {
    if (!p.targetDate) continue;
    const inDays = daysUntil(p.targetDate);
    if (inDays <= 60) {
      const meta = SAMSKARAS.find((s) => s.id === p.samskaraId);
      const sName = meta?.transliteration ?? tr('suites.samskara.tabs.ceremony');
      const name = memberName(p.memberId);
      const dayWord = tr(`suites.samskara.reminders.${inDays === 1 ? 'day' : 'days'}`);
      out.push({
        id: `ce_${p.id}`,
        kind: 'ceremony',
        title: inDays === 0
          ? tr('suites.samskara.reminders.ceremonyToday', { samskara: sName, name })
          : tr('suites.samskara.reminders.ceremonyUpcoming', { samskara: sName, name, days: inDays, dayWord }),
        detail: p.targetDate,
        memberId: p.memberId,
        planId: p.id,
        date: p.targetDate,
        inDays,
        gentle: p.samskaraId === 'antyeshti',
      });
    }
  }
  return out.sort((x, y) => (x.inDays ?? 999) - (y.inDays ?? 999));
}

export function allReminders(state: SamskaraState, tr: Translator): Reminder[] {
  return [...shraddhaReminders(state, tr), ...ceremonyReminders(state, tr), ...samskaraReminders(state, tr)];
}

/** Members of a family, eldest first (birth date order, unknowns last). */
export function familyMembers(state: SamskaraState, familyId: string): FamilyMember[] {
  return state.members
    .filter((m) => m.familyId === familyId)
    .sort((a, b) => (a.birthDate || '9999').localeCompare(b.birthDate || '9999'));
}

/** Samskara records for a member, in traditional order. */
export function memberChronicle(state: SamskaraState, memberId: string): Array<{ meta: (typeof SAMSKARAS)[number]; record?: SamskaraRecord }> {
  const bySamskara = new Map(state.records.filter((r) => r.memberId === memberId).map((r) => [r.samskaraId, r]));
  return SAMSKARAS.map((meta) => ({ meta, record: bySamskara.get(meta.id) }));
}

function loadState(scope: string): SamskaraState {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...EMPTY, ...parsed };
    }
  } catch { /* corrupted → start empty */ }
  return { ...EMPTY };
}

/* ------------------------- context ------------------------- */
interface SamskaraCtx {
  state: SamskaraState;
  scopeId: string;
  add: <K extends EntityKey>(key: K, item: SamskaraState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<SamskaraState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  /** Build a ceremony plan pre-filled with the traditional checklist.
   *  Pass the UI translator so seed items render in the family's language. */
  newPlan: (memberId: string, samskaraId: SamskaraId, tr?: Translator) => CeremonyPlan;
  toggleChecklist: (planId: string, itemId: string) => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<SamskaraCtx | null>(null);

export const SamskaraProvider: React.FC<{ scopeId: string; children: React.ReactNode }> = ({ scopeId, children }) => {
  const [state, setState] = useState<SamskaraState>(() => loadState(scopeId));
  const scopeRef = useRef(scopeId);
  useEffect(() => {
    if (scopeRef.current !== scopeId) { scopeRef.current = scopeId; setState(loadState(scopeId)); }
  }, [scopeId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(scopeRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<SamskaraCtx>(() => ({
    state,
    scopeId,
    add: (key, item) => setState((s) => ({ ...s, [key]: [...(s[key] as unknown[]), item] })),
    update: (key, id, patch) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
    remove: (key, id) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).filter((r) => r.id !== id),
    })),
    newPlan: (memberId, samskaraId, tr?) => {
      const src = SAMSARA_DEFAULT_CHECKLIST[samskaraId] || [];
      const checklist: ChecklistItem[] = src.map((text, i) => ({
        id: uid('ci'),
        text: tr ? tr(`suites.samskara.checklist.${samskaraId}.item${i}`) : text,
        done: false,
      }));
      const plan: CeremonyPlan = {
        id: uid('plan'), memberId, samskaraId, checklist, createdAt: Date.now(),
      };
      setState((s) => ({ ...s, plans: [...s.plans, plan] }));
      return plan;
    },
    toggleChecklist: (planId, itemId) => setState((s) => ({
      ...s,
      plans: s.plans.map((p) => (p.id === planId
        ? { ...p, checklist: p.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
        : p)),
    })),
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.families) || !Array.isArray(parsed.members)) return false;
        setState({ ...EMPTY, ...parsed });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState({ ...EMPTY }),
  }), [state, scopeId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useSamskara = (): SamskaraCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSamskara must be used inside SamskaraProvider');
  return ctx;
};
