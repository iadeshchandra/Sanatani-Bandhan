/**
 * festival.ts — Festival War-Room core logic (Pillar 2: market domination).
 * =====================================================================
 * Pure functions for the trustee "mission control" view. No Firestore, no
 * React — everything here is unit-testable and offline-safe.
 *
 * Design honesty rules (standing directive):
 *  - Footfall is an ESTIMATE: last-year actual × growth, rounded coarsely,
 *    shown with a ±20% planning band. Never fake precision.
 *  - RSVP headcount is a live *signal* shown next to the projection — it is
 *    not folded into the estimate (that would double-count intent).
 *  - Budget planned-vs-actual is the samiti's own management view.
 */

import { PANJIKA_FESTIVALS, type PanjikaFestival } from './panjikaFestivals';
import { checklistFor } from './festivalChecklists';
import { drikTithiAt, drikLunarMonth } from './drikPanchang';
import { getCalendar } from './regionalCalendars';

export interface Lang3 { en: string; bn: string; hi: string }
export const L = (en: string, bn: string, hi: string): Lang3 => ({ en, bn, hi });

/* ------------------------------------------------------------------ */
/* 1. War-festival picker — the next major festival from the Panjika   */
/* ------------------------------------------------------------------ */

/** Festival families the war-room plans around, in pick priority. */
export const WAR_FESTIVAL_MATCHERS: Array<{ key: string; patterns: string[]; days: number }> = [
  { key: 'diwali', patterns: ['diwali', 'deepavali', 'kali puja'], days: 5 },
  { key: 'durga_puja', patterns: ['durga puja', 'mahalaya', 'vijayadashami', 'dussehra', 'bijoya'], days: 2 },
  { key: 'navratri', patterns: ['navratri', 'navaratri'], days: 9 },
  { key: 'janmashtami', patterns: ['janmashtami', 'krishna janmashtami'], days: 2 },
  { key: 'rath_yatra', patterns: ['rath yatra'], days: 9 },
  { key: 'holi', patterns: ['holi', 'dol purnima'], days: 2 },
  { key: 'saraswati_puja', patterns: ['saraswati puja', 'vasant panchami', 'basant panchami'], days: 1 },
  { key: 'shivaratri', patterns: ['shivaratri', 'maha shivaratri'], days: 1 },
  { key: 'makar_sankranti', patterns: ['makar sankranti', 'pongal'], days: 1 },
];

export interface WarFestival {
  /** Stable key: `${matcherKey}_${dateISO}` — scopes plans per org + festival. */
  key: string;
  matcherKey: string;
  festival: PanjikaFestival;
  name: Lang3;
  significance: Lang3;
  dateISO: string;
  endDateISO: string;
  days: number;
  /** Whole days from `todayISO` until the festival (0 = today, negative = past). */
  daysUntil: number;
  phase: 'countdown' | 'live' | 'ended';
  /** Tithi-aware line for the festival date, e.g. "Krishna Amavasya • Kartik". */
  tithiLine: string;
}

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayISOFromDate(d);
}

function todayISOFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function diffDays(fromISO: string, toISO: string): number {
  return Math.round(
    (new Date(toISO + 'T12:00:00').getTime() - new Date(fromISO + 'T12:00:00').getTime()) / 86400000
  );
}

/** Tithi-aware display for a festival date. Pure + offline. */
export function tithiLineFor(dateISO: string): string {
  try {
    const t = drikTithiAt(new Date(dateISO + 'T12:00:00'));
    const lm = drikLunarMonth(new Date(dateISO + 'T12:00:00'), 'purnimanta');
    return `${t.paksha} ${t.name} • ${lm.name}`;
  } catch {
    return '';
  }
}

/**
 * Pick the primary war festival: the live one if any, else the next
 * upcoming major festival. A festival whose start has passed but whose
 * planning span still covers `fromISO` counts as current (phase 'live') —
 * the war-room must not abandon a festival mid-celebration.
 */
export function pickWarFestival(fromISO: string = todayISO()): WarFestival | null {
  return pickWarFestivals(fromISO, 1)[0] || null;
}

/** Build the WarFestival view-model for one candidate. */
function toWarFestival(
  m: (typeof WAR_FESTIVAL_MATCHERS)[number],
  f: PanjikaFestival,
  endDateISO: string,
  fromISO: string,
  daysUntil: number,
  phase: WarFestival['phase']
): WarFestival {
  return {
    key: `${m.key}_${f.date}`,
    matcherKey: m.key,
    festival: f,
    name: { en: f.nameEn, bn: f.nameBn, hi: f.nameHi || f.nameEn },
    significance: {
      en: f.significanceEn,
      bn: f.significanceBn,
      hi: f.significanceEn, // DB carries EN/BN; HI falls back to EN (never blank)
    },
    dateISO: f.date,
    endDateISO,
    days: m.days,
    daysUntil,
    phase,
    tithiLine: tithiLineFor(f.date),
  };
}

/** One deduped candidate per festival family (earliest date wins; on a date
 *  tie, the entry matching the family's most canonical name pattern wins —
 *  e.g. "Diwali / Deepavali" over "Kali Puja" for the diwali family). */
function dedupeCandidates(
  candidates: Array<{ m: (typeof WAR_FESTIVAL_MATCHERS)[number]; f: PanjikaFestival; endDateISO: string }>
): Array<{ m: (typeof WAR_FESTIVAL_MATCHERS)[number]; f: PanjikaFestival; endDateISO: string }> {
  const patternRank = (c: (typeof candidates)[number]): number => {
    const name = c.f.nameEn.toLowerCase();
    const i = c.m.patterns.findIndex((p) => name.includes(p));
    return i === -1 ? 999 : i;
  };
  const seen = new Set<string>();
  const out: typeof candidates = [];
  const sorted = [...candidates].sort(
    (a, b) => a.f.date.localeCompare(b.f.date) || patternRank(a) - patternRank(b)
  );
  for (const c of sorted) {
    if (seen.has(c.m.key)) continue;
    seen.add(c.m.key);
    out.push(c);
  }
  return out;
}

/**
 * Mission-control festival list: live festivals first (their span covers
 * `fromISO`), then upcoming — each family once. The trustee plans the
 * live festival AND the next ones (e.g. during Navratri, Dussehra and
 * Diwali planning both stay one tap away).
 */
export function pickWarFestivals(fromISO: string = todayISO(), limit = 3): WarFestival[] {
  const candidates: Array<{ m: (typeof WAR_FESTIVAL_MATCHERS)[number]; f: PanjikaFestival; endDateISO: string }> = [];
  for (const m of WAR_FESTIVAL_MATCHERS) {
    for (const f of PANJIKA_FESTIVALS) {
      const endDateISO = addDaysISO(f.date, m.days - 1);
      if (endDateISO < fromISO) continue; // span fully in the past
      const name = f.nameEn.toLowerCase();
      if (m.patterns.some((p) => name.includes(p)) && (f.category === 'festival' || f.category === 'puja')) {
        candidates.push({ m, f, endDateISO });
      }
    }
  }
  const live: typeof candidates = [];
  const upcoming: typeof candidates = [];
  for (const c of dedupeCandidates(candidates)) {
    (c.f.date <= fromISO ? live : upcoming).push(c);
  }
  const ordered = [...live, ...upcoming].slice(0, limit);
  return ordered.map((c) => {
    const daysUntil = diffDays(fromISO, c.f.date);
    const phase: WarFestival['phase'] =
      daysUntil > 0 ? 'countdown' : fromISO <= c.endDateISO ? 'live' : 'ended';
    return toWarFestival(c.m, c.f, c.endDateISO, fromISO, daysUntil, phase);
  });
}

/** Checklist template for the war festival (trustee items become operations). */
export function warChecklistTemplate(wf: WarFestival) {
  return checklistFor(wf.festival.nameEn);
}

/* ------------------------------------------------------------------ */
/* 2. Footfall planner — honest estimates, coarse rounding             */
/* ------------------------------------------------------------------ */

export interface FootfallAssumptions {
  /** Last year's actual footfall (trustee's own count). 0 = not set. */
  lastYear: number;
  /** Expected growth, percent (can be negative). */
  growthPct: number;
}

export interface FootfallProjection {
  /** Coarse projection, rounded to the nearest 50. */
  base: number;
  /** Planning band: ±20%, rounded to the nearest 50. */
  low: number;
  high: number;
  assumptionsSet: boolean;
}

/** Round to the nearest 50 — estimates stay estimates. */
export const round50 = (n: number): number => Math.max(0, Math.round(n / 50) * 50);

export function projectFootfall(a: FootfallAssumptions): FootfallProjection {
  const assumptionsSet = a.lastYear > 0;
  const raw = a.lastYear * (1 + a.growthPct / 100);
  const base = round50(raw);
  return {
    base,
    low: round50(base * 0.8),
    high: round50(base * 1.2),
    assumptionsSet,
  };
}

/**
 * Spread the projection across festival days. The main day (index
 * `mainDayIdx`) carries double weight — crowds peak on the main day.
 */
export function distributeFootfall(total: number, days: number, mainDayIdx?: number): number[] {
  if (days <= 0) return [];
  const main = mainDayIdx ?? Math.floor(days / 2);
  const weights = Array.from({ length: days }, (_, i) => (i === main ? 2 : 1));
  const sum = weights.reduce((s, w) => s + w, 0);
  const out = weights.map((w) => round50((total * w) / sum));
  // Fix rounding drift on the main day so the parts sum to the total.
  const drift = total - out.reduce((s, v) => s + v, 0);
  out[main] = Math.max(0, out[main] + drift);
  return out;
}

/* ------------------------------------------------------------------ */
/* 3. Prasad planner — per-person qty × footfall, unit-aware           */
/* ------------------------------------------------------------------ */

export type PrasadUnit = 'g' | 'ml' | 'pc';

export interface PrasadItem {
  id: string;
  name: Lang3;
  /** Quantity per person, in `unit`. */
  perPersonQty: number;
  unit: PrasadUnit;
  note?: Lang3;
}

export interface PrasadTotal extends PrasadItem {
  /** Total in the item's own unit. */
  total: number;
  /** Human display, auto-converted (g→kg, ml→L). */
  display: string;
}

export function formatPrasadQty(qty: number, unit: PrasadUnit): string {
  if (unit === 'g' && qty >= 1000) return `${(qty / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`;
  if (unit === 'ml' && qty >= 1000) return `${(qty / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} L`;
  if (unit === 'pc') return `${Math.round(qty).toLocaleString('en-IN')} pc`;
  return `${Math.round(qty).toLocaleString('en-IN')} ${unit}`;
}

export function prasadTotals(items: PrasadItem[], footfall: number): PrasadTotal[] {
  return items.map((it) => {
    const total = it.perPersonQty * footfall;
    return { ...it, total, display: formatPrasadQty(total, it.unit) };
  });
}

/** Sensible per-festival starter items (trustee edits freely). */
export function prasadTemplate(matcherKey: string): PrasadItem[] {
  const pc = L('Laddu (pc per person)', 'লাড্ডু (জনপ্রতি)', 'लड्डू (प्रति व्यक्ति)');
  const khichuri: PrasadItem = {
    id: 'pr_khichuri', name: L('Khichuri / bhog (g per person)', 'খিচুড়ি / ভোগ (জনপ্রতি গ্রাম)', 'खिचड़ी / भोग (प्रति व्यक्ति ग्राम)'),
    perPersonQty: 250, unit: 'g',
  };
  switch (matcherKey) {
    case 'diwali':
      return [
        { id: 'pr_laddu', name: pc, perPersonQty: 2, unit: 'pc' },
        { id: 'pr_mithai', name: L('Mixed mithai (g per person)', 'মিশ্র মিষ্টি (জনপ্রতি গ্রাম)', 'मिश्र मिठाई (प्रति व्यक्ति ग्राम)'), perPersonQty: 100, unit: 'g' },
      ];
    case 'durga_puja':
      return [
        khichuri,
        { id: 'pr_laddu', name: pc, perPersonQty: 1, unit: 'pc' },
        { id: 'pr_charnamrita', name: L('Charnamrita (ml per person)', 'চরণামৃত (জনপ্রতি মিলি)', 'चरणामृत (प्रति व्यक्ति मिली)'), perPersonQty: 50, unit: 'ml' },
      ];
    case 'janmashtami':
      return [
        { id: 'pr_panchamrita', name: L('Panchamrita (ml per person)', 'পঞ্চামৃত (জনপ্রতি মিলি)', 'पंचामृत (प्रति व्यक्ति मिली)'), perPersonQty: 100, unit: 'ml' },
        { id: 'pr_makhan', name: L('Makhan-mishri (g per person)', 'মাখন-মিশ্রি (জনপ্রতি গ্রাম)', 'मक्खन-मिश्री (प्रति व्यक्ति ग्राम)'), perPersonQty: 50, unit: 'g' },
      ];
    default:
      return [
        khichuri,
        { id: 'pr_laddu', name: pc, perPersonQty: 1, unit: 'pc' },
      ];
  }
}

/* ------------------------------------------------------------------ */
/* 4. Sevadar roster — roles × shifts with gap severity                */
/* ------------------------------------------------------------------ */

export interface RosterShift { id: string; name: Lang3 }
export const ROSTER_SHIFTS: RosterShift[] = [
  { id: 'morning', name: L('Morning', 'সকাল', 'सुबह') },
  { id: 'afternoon', name: L('Afternoon', 'দুপুর', 'दोपहर') },
  { id: 'evening', name: L('Evening', 'সন্ধ্যা', 'शाम') },
];

export interface RosterRole {
  id: string;
  name: Lang3;
  /** Sevadars needed per shift. */
  neededPerShift: number;
}

export const ROSTER_ROLES: RosterRole[] = [
  { id: 'crowd', name: L('Crowd control', 'ভিড় নিয়ন্ত্রণ', 'भीड़ नियंत्रण'), neededPerShift: 6 },
  { id: 'prasad', name: L('Prasad distribution', 'প্রসাদ বিতরণ', 'प्रसाद वितरण'), neededPerShift: 4 },
  { id: 'gate', name: L('Gate & entry', 'গেট ও প্রবেশ', 'गेट व प्रवेश'), neededPerShift: 4 },
  { id: 'cleaning', name: L('Cleaning', 'পরিষ্কার', 'सफ़ाई'), neededPerShift: 3 },
  { id: 'parking', name: L('Parking', 'পার্কিং', 'पार्किंग'), neededPerShift: 2 },
  { id: 'medical', name: L('Medical / first aid', 'চিকিৎসা / প্রাথমিক', 'चिकित्सा / प्राथमिक'), neededPerShift: 2 },
];

export interface RosterAssignment {
  id: string;
  roleId: string;
  shiftId: string;
  memberName: string;
}

export type GapSeverity = 'ok' | 'amber' | 'red';

export interface RosterGap {
  roleId: string;
  shiftId: string;
  needed: number;
  assigned: number;
  gap: number;
  severity: GapSeverity;
}

/**
 * Gap analysis. Severity: ok = fully staffed; amber = at least half the
 * needed sevadars assigned; red = under half (or none). Calm, factual —
 * never alarming copy downstream.
 */
export function rosterGaps(
  roles: RosterRole[],
  shifts: RosterShift[],
  assignments: RosterAssignment[],
  neededOverride?: Record<string, number>
): RosterGap[] {
  const countBy = new Map<string, number>();
  for (const a of assignments) {
    const k = `${a.roleId}:${a.shiftId}`;
    countBy.set(k, (countBy.get(k) || 0) + 1);
  }
  const out: RosterGap[] = [];
  for (const r of roles) {
    for (const s of shifts) {
      const needed = neededOverride?.[`${r.id}:${s.id}`] ?? r.neededPerShift;
      const assigned = countBy.get(`${r.id}:${s.id}`) || 0;
      const gap = Math.max(0, needed - assigned);
      const coverage = needed === 0 ? 1 : assigned / needed;
      const severity: GapSeverity = gap === 0 ? 'ok' : coverage >= 0.5 ? 'amber' : 'red';
      out.push({ roleId: r.id, shiftId: s.id, needed, assigned, gap, severity });
    }
  }
  return out;
}

/** Overall roster fill %, 0–100. */
export function rosterFillPct(gaps: RosterGap[]): number {
  const needed = gaps.reduce((s, g) => s + g.needed, 0);
  if (!needed) return 100;
  const assigned = gaps.reduce((s, g) => s + Math.min(g.assigned, g.needed), 0);
  return Math.round((assigned / needed) * 100);
}

/* ------------------------------------------------------------------ */
/* 5. War-room readiness — one calm number for the trustee             */
/* ------------------------------------------------------------------ */

export interface ReadinessInputs {
  checklistDonePct: number; // 0–100
  rosterFillPct: number;    // 0–100
  budgetPlanned: boolean;   // any planned expense entered
  prasadPlanned: boolean;   // ≥1 prasad item with qty > 0
  footfallSet: boolean;     // last-year footfall entered
}

export function readinessScore(i: ReadinessInputs): number {
  const s =
    i.checklistDonePct * 0.4 +
    i.rosterFillPct * 0.25 +
    (i.budgetPlanned ? 100 : 0) * 0.15 +
    (i.prasadPlanned ? 100 : 0) * 0.1 +
    (i.footfallSet ? 100 : 0) * 0.1;
  return Math.round(s);
}

/* ------------------------------------------------------------------ */
/* 6. Published festival event page + RSVP (devotee side)              */
/* ------------------------------------------------------------------ */

export interface DarshanSlot {
  id: string;
  label: Lang3;
  /** Max headcount the slot can take. */
  capacity: number;
  note?: Lang3;
}

export interface FestivalTiming {
  id: string;
  label: Lang3;   // e.g. "Sandhya aarti"
  time: string;   // e.g. "6:30 PM"
}

export interface FestivalEventDoc {
  id: string;             // `${workspaceId}__${festivalKey}`
  workspaceId: string;
  festivalKey: string;
  orgName: string;
  name: Lang3;
  significance: Lang3;
  dateISO: string;
  endDateISO: string;
  tithiLine: string;
  timings: FestivalTiming[];
  story: Lang3;           // 1–2 lines, reverent
  rsvpEnabled: boolean;
  darshanSlots: DarshanSlot[];
  published: boolean;
  /** Trustee-published snapshot of expected turnout ("as of …"). */
  publishedHeadcount: number;
  /** Live per-slot bookings — moves only with a matching RSVP record. */
  slotBooked: Record<string, number>;
  /**
   * Per-slot capacity map {slotId: capacity}, stamped at publish time
   * from darshanSlots so firestore.rules can bound slotBooked (the
   * rules cannot index the darshanSlots list by id). Absent on pages
   * published before the EVENTS P0 batch.
   */
  slotCaps?: Record<string, number>;
  /** Live RSVP headcount — moves only with a matching RSVP record. */
  rsvpHeadcount: number;
  updatedAt: string;
}

export interface RsvpEntry {
  id: string;
  eventId: string;
  workspaceId: string;
  uid: string;
  name: string;
  /** 1–20. */
  headcount: number;
  slotId?: string;
  createdAt: string;
}

export function validateRsvp(e: Pick<RsvpEntry, 'name' | 'headcount'>): string | null {
  if (!e.name || e.name.trim().length < 2) return 'name';
  if (!Number.isFinite(e.headcount) || e.headcount < 1 || e.headcount > 20) return 'headcount';
  return null;
}

/** Remaining capacity for a slot given live bookings. */
export function slotRemaining(slot: DarshanSlot, booked: Record<string, number>): number {
  return Math.max(0, slot.capacity - (booked[slot.id] || 0));
}

/** Shareable public URL for a published event. */
export function festivalEventUrl(origin: string, workspaceId: string, eventId: string): string {
  return `${origin.replace(/\/$/, '')}/festival/${encodeURIComponent(workspaceId)}/${encodeURIComponent(eventId)}`;
}

/* ------------------------------------------------------------------ */
/* 7. War-room plan — persisted per org per festival                   */
/* ------------------------------------------------------------------ */

export interface ChecklistItemState {
  done: boolean;
  assignee?: string;
  /** yyyy-mm-dd */
  dueDate?: string;
}

export interface WarRoomPlan {
  id: string; // `${workspaceId}__${festivalKey}`
  workspaceId: string;
  festivalKey: string;
  festivalName: Lang3;
  dateISO: string;
  endDateISO: string;
  footfall: FootfallAssumptions;
  prasad: PrasadItem[];
  roster: RosterAssignment[];
  rosterNeeded: Record<string, number>;
  /** checklist item id → state */
  checklist: Record<string, ChecklistItemState>;
  /** Free-text notes the trustee keeps for the war-room. */
  notes: string;
  updatedAt: string;
}

export function blankPlan(workspaceId: string, wf: WarFestival): WarRoomPlan {
  return {
    id: `${workspaceId}__${wf.key}`,
    workspaceId,
    festivalKey: wf.key,
    festivalName: wf.name,
    dateISO: wf.dateISO,
    endDateISO: wf.endDateISO,
    footfall: { lastYear: 0, growthPct: 10 },
    prasad: prasadTemplate(wf.matcherKey),
    roster: [],
    rosterNeeded: {},
    checklist: {},
    notes: '',
    updatedAt: new Date().toISOString(),
  };
}

/** Overdue checklist items (due before today, not done) — surfaced calmly. */
export function overdueChecklistItems(
  template: { items: Array<{ id: string; role: string }> },
  state: Record<string, ChecklistItemState>,
  today: string = todayISO()
): string[] {
  return template.items
    .filter((it) => it.role === 'trustee')
    .filter((it) => {
      const s = state[it.id];
      return s && !s.done && s.dueDate && s.dueDate < today;
    })
    .map((it) => it.id);
}

export function checklistDonePct(
  template: { items: Array<{ id: string; role: string }> },
  state: Record<string, ChecklistItemState>
): number {
  const items = template.items.filter((it) => it.role === 'trustee');
  if (!items.length) return 0;
  const done = items.filter((it) => state[it.id]?.done).length;
  return Math.round((done / items.length) * 100);
}
