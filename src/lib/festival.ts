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
import type { LiveBoardEntry } from './liveBoard';
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

/* ------------------------------------------------------------------ */
/* EVENTS E2 — seva passes & tickets                                   */
/* ------------------------------------------------------------------ */

/**
 * One flexible pass type (the Eventbrite lesson): a free pass, a paid
 * pass, or an add-on (prasad box, book, parking). 'free'/'paid' are
 * ATTENDANCE passes — buying one creates the buyer's party RSVP;
 * 'addon' is an extra and never touches the RSVP counters.
 */
export interface TicketTier {
  id: string;
  name: Lang3;
  kind: 'free' | 'paid' | 'addon';
  /** Whole currency units; 0 for a free pass. */
  price: number;
  /** Max passes that can be sold; absent = unmetered. */
  capacity?: number;
  /** Early seva price, plainly dated — never a countdown. */
  earlyBird?: { price: number; untilDate: string }; // yyyy-mm-dd
  /** Most passes in one booking (household cap). Default 6. */
  maxPerBooking?: number;
  /**
   * NEXT-LEVEL B1b — the e-dip window for this tier (ISO strings
   * the editor edits): when BOTH are set, this tier's places are
   * allotted by a registered draw instead of a first-come rush —
   * devotees enter the dip between these moments, the committee
   * freezes and publishes the pool, draws openly, and only the
   * selected may then buy (direct purchase is closed meanwhile,
   * client-side and in firestore.rules). The publish stamps them
   * onto the event doc as per-tier epoch-ms maps (dipOpensAtMs /
   * dipClosesAtMs on FestivalEventDoc). Attendance tiers only —
   * an add-on never carries a dip.
   */
  dipOpensAt?: string;
  dipClosesAt?: string;
}

/**
 * NEXT-LEVEL B1b — one tier's e-dip record, stamped onto the
 * published festival_events doc (FestivalEventDoc.dipDraws) by
 * War Room staff through the doc's existing R_BOARD update path
 * (no key-set pin — the liveBoard/fairnessSummary posture). The
 * record is the draw's public commitment: the FREEZE fields
 * (seed, poolHash, poolCount, frozenAtMs) are published BEFORE
 * any winner exists; the draw fields land only when staff run
 * the draw. Aggregates and the method only — no name or entry id
 * can exist in this shape.
 */
export interface DipDrawRecord {
  /** The public seed the committee drew openly (e.g. read out at
   *  the committee meeting) — published with the freeze. */
  seed: string;
  /** SHA-256 fingerprint of the frozen pool: the entry doc ids,
   *  sorted, joined — anyone can recompute it from the register. */
  poolHash: string;
  /** Parties (entries) in the frozen pool. */
  poolCount: number;
  /** Epoch ms the pool was frozen and published. */
  frozenAtMs: number;
  /** Epoch ms the draw ran — absent until it does. */
  drawnAtMs?: number;
  /** Places allotted by the draw, counted in PARTIES (one entry
   *  is one household party). */
  winnersCount?: number;
  /** Selected parties may claim (buy) until this epoch ms —
   *  per tier, stamped at draw time. After it, staff may lapse
   *  an unclaimed place and promote the waitlist. */
  claimByMs?: number;
}

export interface TicketDiscountCode {
  code: string; // stored uppercase
  kind: 'flat' | 'percent' | 'full';
  /** flat: amount off · percent: 1–100 · full: ignored (100% off). */
  value: number;
  maxUses?: number;
}

export interface RefundTier {
  /** Whole days before the festival start. */
  minDaysBefore: number;
  /** Percent of the amount paid that returns. */
  percent: number;
}

/**
 * The trustee's ticketing configuration — lives on the WarRoomPlan
 * (festival_plans: staff-written, member-read, NEVER public, because
 * it carries the discount codes). The editor-shaped fields (tiers,
 * discountCodes, refundPolicy, feeBearer) are what the trustee edits;
 * everything below them is DERIVED by lib/eventTickets'
 * deriveTicketingMaps and exists so firestore.rules can validate a
 * purchase without searching lists (the slotCaps lesson): prices,
 * early-bird stamps and code terms as maps, the refund policy as a
 * sorted ladder the rules can walk by index.
 */
export interface TicketingConfig {
  tiers: TicketTier[];
  discountCodes: TicketDiscountCode[];
  refundPolicy: RefundTier[];
  feeBearer: 'organiser' | 'buyer';
  /** Trustee cancelled the festival: paid passes refund 100%. */
  festivalCancelled?: boolean;
  /** EVENTS E8 — the optional pass-release moment, announced in
   *  advance (the TTD pattern): the ISO string the editor edits,
   *  and its epoch ms (derived beside it by deriveTicketingConfig)
   *  which the publish stamps and firestore.rules compare against
   *  request.time. Absent = no gate; passes are open as they are. */
  releaseAt?: string;
  releaseAtMs?: number;
  /* ---- derived validation maps (deriveTicketingMaps) ---- */
  tierPrices: Record<string, number>;
  tierEarly: Record<string, { price: number; untilMs: number }>;
  tierMax: Record<string, number>;
  tierKinds: Record<string, 'free' | 'paid' | 'addon'>;
  codeMap: Record<string, { kind: 'flat' | 'percent' | 'full'; value: number; maxUses?: number }>;
  /** Sorted by minDaysBefore DESC, always ending at a 0-day row. */
  refundLadder: RefundTier[];
  /** Code → times used. Incremented ONLY through the anchored
   *  discount-use path in firestore.rules (buyer purchase batches). */
  discountUses: Record<string, number>;
  /** Festival start/end as epoch ms (UTC midnight of the civil
   *  dates) — the rules' clock for early-bird, refunds, transfers. */
  startMs: number;
  endMs: number;
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
  /**
   * EVENTS P1 — the darshan-slot waitlists: slotId → (uid → joined-at
   * epoch ms). Uids only — never names — because this doc is public:
   * a waitlisted devotee can find their own place in line without
   * anyone's attendance becoming visible. Maintained only through
   * the anchored counter path in firestore.rules. Absent on pages
   * published before P1 (nobody has ever waited on them).
   */
  slotWaitlist?: Record<string, Record<string, number>>;
  /**
   * EVENTS E2 — seva passes, stamped at publish time from the plan's
   * ticketing config (public-safe: tiers and the refund policy are
   * shown at checkout; discount CODES never appear here — only their
   * terms, keyed by a lookup hash, in discountTerms). tierCaps is the
   * capacity map the rules bound tierSold by (the slotCaps pattern);
   * tierSold moves ONLY in the same batch as the event_tickets
   * record that causes it (anchoredTierCounter in firestore.rules),
   * witnessed by tierAnchorTicketId.
   */
  ticketTiers?: TicketTier[];
  tierCaps?: Record<string, number>;
  tierSold?: Record<string, number>;
  tierAnchorTicketId?: string;
  ticketFeeBearer?: 'organiser' | 'buyer';
  /** The refund ladder, published at checkout exactly as promised. */
  refundPolicy?: RefundTier[];
  /** codeKey (lib/eventTickets codeKeyFor) → terms, for the itemised
   *  quote a buyer sees before confirming. Terms only — the code
   *  itself is never published. */
  discountTerms?: Record<string, { kind: 'flat' | 'percent' | 'full'; value: number }>;
  /** Trustee cancelled the festival — paid passes refund in full. */
  festivalCancelled?: boolean;
  /**
   * EVENTS E8 — the pass-release moment as epoch ms, stamped at
   * publish time from the plan's ticketing config (public-safe:
   * the moment is announced, that is its purpose). ALWAYS a
   * number on a ticketing publish — the moment, or 0 for "no
   * gate" — so a cleared release never leaves a stale stamp;
   * absent only on pages published before E8, which the readers
   * treat as 0. firestore.rules (tkReleaseOpen) refuses a pass
   * purchase committed before this moment.
   */
  ticketReleaseAtMs?: number;
  /**
   * NEXT-LEVEL B1b — the e-dip windows, stamped at publish time
   * from the tiers' dipOpensAt/dipClosesAt (public-safe: the
   * window is announced, that is its purpose). Per-tier epoch-ms
   * maps in the ticketReleaseAtMs idiom; a tier absent from the
   * map is not a dip tier. The publish ALWAYS writes both maps
   * on a ticketing publish ({} when no tier dips), so a removed
   * dip can never leave a stale window standing. firestore.rules
   * read the maps to open entry creation and to witness claims.
   */
  dipOpensAtMs?: Record<string, number>;
  dipClosesAtMs?: Record<string, number>;
  /**
   * NEXT-LEVEL B1b — per-tier e-dip draw records (see
   * DipDrawRecord): the freeze commitment and, once run, the
   * draw's public facts. Written ONLY by War Room staff (the
   * DipPanel) through this doc's R_BOARD update path — never by
   * the publish, which leaves the field untouched. Absent = no
   * dip has been frozen for any tier.
   */
  dipDraws?: Record<string, DipDrawRecord>;
  /**
   * EVENTS E4 — the debrief's public summary, stamped onto the doc
   * ONLY when a trustee deliberately publishes it from the War Room
   * debrief (the festival page's own publish path — the same setDoc
   * merge that stamps festivalCancelled). Aggregates only: no names,
   * no per-person data exists in this shape, so none can leak.
   * Absent = never published (or withdrawn).
   */
  debriefSummary?: FestivalDebriefSummary;
  /**
   * EVENTS E5 — the attendee feedback aggregates, stamped onto the
   * doc ONLY when a trustee deliberately publishes them from the
   * War Room debrief (the same merge publish path as
   * debriefSummary) and ONLY when at least 5 devotees responded —
   * below that threshold a single voice could be recognised, so
   * the builder refuses to produce the summary at all. Averages
   * and a count only: no name, no text, no per-person figure
   * exists in this shape. Absent = never published (or withdrawn).
   */
  feedbackSummary?: FestivalFeedbackSummary;
  /**
   * EVENTS E6 — public gratitude: the NAMES ONLY of sponsors who
   * explicitly consented to be thanked publicly (publicAck on the
   * Utsav register — lib/festivalSponsors.publicAckNames is the
   * only producer). Stamped onto this doc ONLY when a trustee
   * deliberately publishes it from the War Room register (the same
   * merge publish path as debriefSummary); withdrawn with a field
   * delete. A list of name strings — no amount, no contact, no
   * stall holder can exist in this shape. Absent = never
   * published (or withdrawn).
   */
  sponsorThanks?: string[];
  /**
   * REAL-WORLD PACK — the venue, stamped at publish time from the
   * War Room plan: where devotees should come (name/address text),
   * and an optional map link. The publish ALWAYS stamps both
   * ('' = none) so a cleared plan value cannot leave a stale
   * venue standing on the public page. The map link is stored
   * only after lib/safeUrl accepts it, and re-checked at render.
   */
  venue?: string;
  mapUrl?: string;
  /**
   * NEXT-LEVEL A4 — the live notice board: day-of notes from the
   * organising team (gate changes, lost & found, announcements),
   * written by War Room staff through this doc's existing staff
   * update path (the same setDoc merge that stamps debriefSummary
   * / sponsorThanks — the rules' R_BOARD clause pins no key set)
   * and read read-free on the public page. Entries are the
   * organiser's own words, shaped and capped by lib/liveBoard
   * (≤20 entries, resolved lost & found kept visible, badged).
   * Absent = the team has never posted (or the page predates A4).
   */
  liveBoard?: LiveBoardEntry[];
  /**
   * NEXT-LEVEL B1a — the published booking results ("how booking
   * went"), stamped onto the doc ONLY when staff deliberately
   * publish them from the War Room debrief (the same setDoc merge
   * path as debriefSummary — the rules' R_BOARD update clause pins
   * no key set). Aggregates only: per-tier places offered/booked
   * from the anchored tierSold counters, festival totals, the
   * still-waiting count when the register can speak for it, and
   * the release moment when a release calendar was used. No name
   * and no per-person figure exists in this shape, so none can
   * leak. The public page renders it only once the festival has
   * concluded (lib/festivalFairness.fairnessResultsVisible).
   * Absent = never published (or withdrawn).
   */
  fairnessSummary?: FestivalFairnessSummary;
  updatedAt: string;
}

/**
 * EVENTS E4 — the public-safe debrief summary (see FestivalEventDoc
 * .debriefSummary). Every figure is an aggregate computed from the
 * festival's own records by lib/festivalDebrief.buildPublicSummary.
 * Money totals are money the records say was actually collected /
 * received / utilised — never planned figures.
 */
export interface FestivalDebriefSummary {
  /** ISO timestamp of (re)publication. */
  publishedAt: string;
  /** Whole days the festival ran (≥1). */
  days: number;
  /** Confirmed RSVP heads (the expected crowd). */
  expectedHeads: number;
  /** Confirmed heads the gate/War Room marked arrived. */
  arrivedHeads: number;
  /** Confirmed parties (families/groups) who RSVP'd. */
  families: number;
  /** Seva-pass money actually collected (wallet + venue-received). */
  passCollected: number;
  /** Donations received (Utsav budget 'Donations' actual) — null
   *  when no Utsav festival record is linked to this festival. */
  donationsReceived: number | null;
  /** Total utilised (Utsav budget expense actuals) — null when no
   *  Utsav festival record is linked. */
  totalUtilised: number | null;
  /** Currency the money figures were recorded in. */
  currency: string;
}

/**
 * NEXT-LEVEL B1a — one tier's row in the published booking results
 * (see FestivalEventDoc.fairnessSummary). Built by
 * lib/festivalFairness.buildFairnessSummary from the debrief's own
 * tier rows (anchored tierSold vs tierCaps), so the public count
 * and the committee's count are the same numbers by construction.
 */
export interface FestivalFairnessTierRow {
  tierId: string;
  /** The tier's public English name — a pass type, never a person. */
  tierName: string;
  kind: TicketTier['kind'];
  /** Places offered — null = the tier carried no fixed limit. */
  offered: number | null;
  /** Places booked (the anchored tierSold counter). */
  booked: number;
}

/**
 * NEXT-LEVEL B1a — the public-safe booking results. Every figure
 * is an aggregate of the festival's anchored counters and its
 * RSVP register; the shape cannot carry a name, a contact or any
 * per-person figure.
 */
export interface FestivalFairnessSummary {
  /** ISO timestamp of (re)publication. */
  publishedAt: string;
  tiers: FestivalFairnessTierRow[];
  /** Σ offered — null when any tier was unmetered (a total over a
   *  partly-unlimited offer would misstate what was offered). */
  totalOffered: number | null;
  /** Σ booked — a fact whatever the offer's shape was. */
  totalBooked: number;
  /** Parties still on the waitlist when staff published (the
   *  register as it stands) — present ONLY when the register
   *  could honestly count them; omitted, never estimated. */
  waitlistParties?: number;
  /** The E8 release moment (epoch ms) — present ONLY when a
   *  release calendar was used. */
  releaseAtMs?: number;
  /**
   * NEXT-LEVEL B1b — the e-dip aggregates, present ONLY when a
   * dip ran for at least one tier of this festival: parties who
   * entered, parties the draw allotted a place to (still holding
   * it or already claimed), and parties who claimed theirs.
   * Counts only — the same no-names discipline as every figure
   * in this shape; built by lib/festivalFairness from the dip
   * register as it stands when staff publish.
   */
  dip?: { entries: number; selected: number; claimed: number };
}

/**
 * EVENTS E5 — the public-safe feedback summary (see
 * FestivalEventDoc.feedbackSummary). Built ONLY from VISIBLE
 * feedback by lib/festivalFeedback.buildFeedbackSummary, and only
 * when the response count reaches the privacy threshold (5) —
 * averages over fewer voices could identify a person. Every field
 * is an aggregate; the shape cannot carry a name or a sentence.
 */
export interface FestivalFeedbackSummary {
  /** ISO timestamp of (re)publication. */
  publishedAt: string;
  /** Visible responses the averages rest on (≥ 5 by construction). */
  count: number;
  /** Aspect averages, 1–5, one decimal. */
  arrangements: number;
  prasad: number;
  darshanFlow: number;
  cleanliness: number;
  /** Overall average, 1–5, one decimal. */
  overall: number;
  /** Share of respondents who said they would return, 0–100. */
  wouldReturnPct: number;
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
  /**
   * EVENTS P1 — 'confirmed' holds a real place in the counters;
   * 'waitlisted' holds a place in the slot's queue only (no counter
   * share until promotion). Absent on pre-P1 records = confirmed.
   */
  status?: 'confirmed' | 'waitlisted';
  /**
   * EVENTS P1 — day-wise RSVP for multi-day festivals: the civil
   * dates (YYYY-MM-DD) this party attends. Absent = every day.
   */
  days?: string[];
  /** EVENTS P1 — day-of check-in, marked by the organising team. */
  checkedIn?: boolean;
  checkedInAt?: string;
  /**
   * EVENTS E2 — set when this party record was created by a seva-pass
   * purchase (event_tickets/{ticketId}). The ticket is the money
   * record; this back-link lets a ticket cancellation remove exactly
   * the RSVP it created, and a transfer rebind exactly that record.
   */
  ticketId?: string;
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

/**
 * EVENTS P1 — every civil date of a festival, start → end inclusive
 * (noon-anchored like the recurrence engine, so DST never shifts a
 * day). Single-day festivals return [dateISO]. Drives the day-wise
 * RSVP choices and the per-day organiser counts.
 */
export function festivalDayList(dateISO: string, endDateISO: string): string[] {
  const start = new Date(`${dateISO}T12:00:00`).getTime();
  const end = new Date(`${endDateISO || dateISO}T12:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [dateISO];
  const out: string[] = [];
  for (let t = start; t <= end && out.length < 31; t += 86400000) {
    const d = new Date(t);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push(`${d.getFullYear()}-${m}-${day}`);
  }
  return out;
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
  /** EVENTS E2 — seva-pass ticketing (absent = no passes offered). */
  ticketing?: TicketingConfig;
  /**
   * REAL-WORLD PACK — where the festival happens: the venue's
   * name/address as the committee writes it, and an optional map
   * link. Both ride the publish onto the public festival_events
   * doc (stamped even when blank, so clearing them here clears
   * the public page on the next publish).
   */
  venue?: string;
  mapUrl?: string;
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
