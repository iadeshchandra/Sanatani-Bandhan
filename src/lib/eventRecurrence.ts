/**
 * eventRecurrence.ts — the recurrence engine (EVENTS P1 + E1).
 * =====================================================================
 * One event definition may recur — weekly satsang, monthly Ekadashi
 * observance, annual festival. Until this module, the app's only
 * repeating mechanism was the Matha yearly observance and the public
 * page's free-text "Every Purnima" (decoration, not a mechanism: it
 * generated no occurrences, could not be shared, could not be RSVP'd).
 *
 * The law here: occurrences are DERIVED, never stored. Every surface
 * (org public page, Sangam, Solo "From your orgs") expands the same
 * definition through this one module, so the surfaces can never drift
 * apart, and editing the definition rewrites every future occurrence
 * everywhere at once. Expansion is a pure function of
 * (startDate, time, rule, window) — the determinism test pins that
 * two independent expansions agree exactly.
 *
 * Dates are civil dates (YYYY-MM-DD) in local time, matching the
 * convention of org/eventBridge.parseEventStart (default 09:00 when
 * no time is given).
 *
 * EVENTS E1 — TITHI recurrence: a series may also ride the lunar
 * rhythm itself (freq 'tithi'): an occurrence falls on every civil
 * date whose ABSOLUTE tithi (1–30, from the canonical panchang) is in
 * the rule's `tithiDays`. This is the rhythm Gregorian rules cannot
 * say — Ekadashi is the 11th tithi of BOTH pakshas, so no single
 * monthly day-of-month can express it. The free-text "Every Purnima"
 * decoration is a real mechanism now.
 */
import { calculatePanchang } from '../utils/panchang';

export type RecurrenceFreq = 'weekly' | 'monthly' | 'yearly' | 'tithi';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /**
   * Every N weeks / months / years. Default 1. Clamped 1–12.
   * Gregorian frequencies only — a tithi series has no interval:
   * the lunar rhythm itself sets the spacing. Ignored for 'tithi'.
   */
  interval?: number;
  /** Weekly only: weekdays 0=Sunday … 6=Saturday. Default: the start date's weekday. */
  weekdays?: number[];
  /** Monthly/yearly: day of month 1–31 (clamped to the month's length). Default: the start date's day. */
  monthDay?: number;
  /** Yearly only: month 1–12. Default: the start date's month. */
  month?: number;
  /**
   * Tithi only: ABSOLUTE tithi numbers 1–30 the series falls on
   * (1–15 = Shukla Pratipada…Purnima, 16–30 = Krishna Pratipada…
   * Amavasya). An array because one observance can live in both
   * pakshas — Ekadashi is [11, 26]. See TITHI_PRESETS.
   */
  tithiDays?: number[];
  /** Inclusive last occurrence date (YYYY-MM-DD). */
  until?: string;
  /** Maximum occurrences in the whole series, counting the first. */
  count?: number;
}

/**
 * The ABSOLUTE tithi (1–30) of a civil date, from the canonical
 * panchang (utils/panchang.calculatePanchang — Varanasi/IST,
 * sunrise-anchored: the same engine, the same day-anchor, every
 * surface renders). The engine reports the tithi within its paksha
 * (1–15) plus the paksha; absolute = Shukla n, Krishna n + 15 (so
 * Krishna 15 = Amavasya = 30). The civil date is passed as local
 * noon — the engine anchors the day's tithi at local sunrise, so
 * the instant inside the day is irrelevant and the result does not
 * depend on the runtime timezone.
 */
export function absoluteTithiOfDate(y: number, m: number, d: number): number {
  const p = calculatePanchang(new Date(y, m - 1, d, 12, 0, 0, 0));
  return p.paksha === 'Shukla' ? p.tithiNumber : p.tithiNumber + 15;
}

/** Within-paksha tithi names (index 0 = Pratipada … 13 = Chaturdashi);
 *  the 15th is Purnima (Shukla) / Amavasya (Krishna). */
const TITHI_NAMES_WITHIN_PAKSHA = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
  'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
  'Trayodashi', 'Chaturdashi',
] as const;

/** English name of one absolute tithi (1–30): 'Purnima', 'Amavasya',
 *  'Shukla Ekadashi', 'Krishna Chaturthi'. '' when out of range. */
export function absoluteTithiName(abs: number): string {
  if (!Number.isInteger(abs) || abs < 1 || abs > 30) return '';
  if (abs === 15) return 'Purnima';
  if (abs === 30) return 'Amavasya';
  const within = abs <= 15 ? abs : abs - 15;
  const paksha = abs <= 15 ? 'Shukla' : 'Krishna';
  return `${paksha} ${TITHI_NAMES_WITHIN_PAKSHA[within - 1]}`;
}

export interface TithiPreset {
  id: string;
  /** English observance name (a proper noun on every surface). */
  name: string;
  tithiDays: number[];
}

/** The observances the editor offers as one-tap tithi rhythms. */
export const TITHI_PRESETS: readonly TithiPreset[] = [
  { id: 'ekadashi', name: 'Ekadashi', tithiDays: [11, 26] },
  { id: 'purnima', name: 'Purnima', tithiDays: [15] },
  { id: 'amavasya', name: 'Amavasya', tithiDays: [30] },
  { id: 'pradosh', name: 'Pradosh', tithiDays: [13, 28] },
  { id: 'sankashti', name: 'Sankashti Chaturthi', tithiDays: [19] },
];

/** The preset whose day-set exactly equals `days` (order-free), else null. */
export function tithiPresetFor(days: readonly number[] | undefined): TithiPreset | null {
  if (!days || days.length === 0) return null;
  const set = new Set(days);
  for (const p of TITHI_PRESETS) {
    if (p.tithiDays.length === set.size && p.tithiDays.every((d) => set.has(d))) return p;
  }
  return null;
}

/**
 * Human label for a tithi day-set: the preset name when the set is a
 * known observance ('Ekadashi'), else the day names joined
 * ('Shukla Ekadashi, Krishna Ekadashi' stays explicit, never hidden).
 */
export function describeTithiDays(days: readonly number[] | undefined): string {
  if (!days || days.length === 0) return '';
  const preset = tithiPresetFor(days);
  if (preset) return preset.name;
  return [...days].sort((a, b) => a - b).map(absoluteTithiName).filter(Boolean).join(', ');
}

export interface EventOccurrence {
  /** YYYY-MM-DD of this occurrence. */
  date: string;
  /** Epoch ms of the occurrence start (civil date + the event's time). */
  startsAt: number;
  /** 0-based position within the whole series (not just the window). */
  index: number;
}

const DAY_MS = 86400000;
/** Hard iteration bound: ~100 years of days. A series can never run away. */
const MAX_SCAN_DAYS = 366 * 100;

export function isISODate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseISODate(iso: string): { y: number; m: number; d: number } | null {
  if (!isISODate(iso)) return null;
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function toISODate(y: number, m: number, d: number): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(y, 4)}-${p(m)}-${p(d)}`;
}

/** Local-midnight epoch ms of a civil date (DST-safe day arithmetic base). */
function dayMs(y: number, m: number, d: number): number {
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function clampInterval(v: number | undefined): number {
  if (!Number.isFinite(v as number) || !v || (v as number) < 1) return 1;
  return Math.min(12, Math.floor(v as number));
}

/** Structural sanity of a rule (used by forms before saving). */
export function isValidRecurrence(rule: RecurrenceRule | null | undefined): boolean {
  if (!rule || typeof rule !== 'object') return false;
  if (!['weekly', 'monthly', 'yearly', 'tithi'].includes(rule.freq)) return false;
  if (rule.weekdays !== undefined) {
    if (!Array.isArray(rule.weekdays) || rule.weekdays.length === 0) return false;
    if (!rule.weekdays.every((w) => Number.isInteger(w) && w >= 0 && w <= 6)) return false;
  }
  if (rule.tithiDays !== undefined) {
    if (!Array.isArray(rule.tithiDays) || rule.tithiDays.length === 0) return false;
    if (!rule.tithiDays.every((d) => Number.isInteger(d) && d >= 1 && d <= 30)) return false;
  }
  // A tithi series without its lunar days says nothing at all.
  if (rule.freq === 'tithi' && (!Array.isArray(rule.tithiDays) || rule.tithiDays.length === 0)) return false;
  if (rule.monthDay !== undefined && (!Number.isInteger(rule.monthDay) || rule.monthDay < 1 || rule.monthDay > 31)) return false;
  if (rule.month !== undefined && (!Number.isInteger(rule.month) || rule.month < 1 || rule.month > 12)) return false;
  if (rule.interval !== undefined && (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 99)) return false;
  if (rule.until !== undefined && !isISODate(rule.until)) return false;
  if (rule.count !== undefined && (!Number.isInteger(rule.count) || rule.count < 1 || rule.count > 500)) return false;
  return true;
}

/** Does civil date (y,m,d) belong to the series that starts at `start`? */
function matches(
  rule: RecurrenceRule,
  start: { y: number; m: number; d: number },
  y: number,
  m: number,
  d: number
): boolean {
  if (rule.freq === 'tithi') {
    // The day's absolute tithi comes from the canonical panchang;
    // `interval` does not apply (the lunar rhythm sets the spacing).
    const days = rule.tithiDays;
    if (!days || days.length === 0) return false;
    return days.includes(absoluteTithiOfDate(y, m, d));
  }
  const interval = clampInterval(rule.interval);
  if (rule.freq === 'weekly') {
    const weekdays = rule.weekdays && rule.weekdays.length > 0
      ? rule.weekdays
      : [new Date(start.y, start.m - 1, start.d, 12).getDay()];
    const dow = new Date(y, m - 1, d, 12).getDay();
    if (!weekdays.includes(dow)) return false;
    const weekDiff = Math.floor((dayMs(y, m, d) - dayMs(start.y, start.m, start.d)) / (7 * DAY_MS));
    return weekDiff % interval === 0;
  }
  if (rule.freq === 'monthly') {
    const monthDiff = (y - start.y) * 12 + (m - start.m);
    if (monthDiff % interval !== 0) return false;
    const want = Math.min(rule.monthDay ?? start.d, daysInMonth(y, m));
    return d === want;
  }
  // yearly
  const yearDiff = y - start.y;
  if (yearDiff % interval !== 0) return false;
  const wantMonth = rule.month ?? start.m;
  if (m !== wantMonth) return false;
  const want = Math.min(rule.monthDay ?? start.d, daysInMonth(y, m));
  return d === want;
}

/** Epoch ms for a civil date + optional "HH:MM" (default 09:00, local). */
export function occurrenceStartMs(dateISO: string, time?: string): number {
  const p = parseISODate(dateISO);
  if (!p) return NaN;
  let hh = 9;
  let mm = 0;
  if (time) {
    const tm = /^(\d{1,2}):(\d{2})/.exec(time.trim());
    if (tm) {
      hh = Math.min(23, parseInt(tm[1], 10));
      mm = Math.min(59, parseInt(tm[2], 10));
    }
  }
  return new Date(p.y, p.m - 1, p.d, hh, mm, 0, 0).getTime();
}

/**
 * Expand a series into the occurrences inside [fromISO, toISO]
 * (inclusive). Deterministic: same inputs → same list, always.
 * The series start itself is occurrence index 0 when it matches the
 * rule (it always does for monthly/yearly; for weekly the start's
 * weekday is the default weekday, so it matches too). For a tithi
 * series the start is just the anchor: the first occurrence is the
 * first day on/after the start whose absolute tithi is in the rule.
 *
 * Scan cap: the day-scan is bounded by MAX_SCAN_DAYS (~100 years)
 * for every frequency. A tithi scan costs one canonical panchang
 * computation per scanned day, so the same cap is also the work
 * cap; surfaces expand windows of months, never centuries.
 */
export function expandOccurrences(
  startDate: string,
  rule: RecurrenceRule,
  fromISO: string,
  toISO: string,
  time?: string
): EventOccurrence[] {
  const start = parseISODate(startDate);
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  if (!start || !from || !to || !isValidRecurrence(rule)) return [];
  const out: EventOccurrence[] = [];
  const untilParsed = rule.until ? parseISODate(rule.until) : null;
  const untilMs = untilParsed ? dayMs(untilParsed.y, untilParsed.m, untilParsed.d) : null;
  const maxCount = rule.count && rule.count >= 1 ? Math.floor(rule.count) : Infinity;
  let index = 0;
  let cursor = dayMs(start.y, start.m, start.d);
  const scanEnd = Math.min(dayMs(to.y, to.m, to.d), untilMs ?? Infinity);
  for (let scanned = 0; scanned <= MAX_SCAN_DAYS && cursor <= scanEnd; scanned++) {
    const dt = new Date(cursor);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const d = dt.getDate();
    if (matches(rule, start, y, m, d)) {
      if (index >= maxCount) break;
      const iso = toISODate(y, m, d);
      if (cursor >= dayMs(from.y, from.m, from.d)) {
        out.push({ date: iso, startsAt: occurrenceStartMs(iso, time), index });
      }
      index++;
    }
    cursor += DAY_MS;
    // Noon-anchored day steps can drift an hour across DST; re-anchor.
    const nd = new Date(cursor);
    cursor = dayMs(nd.getFullYear(), nd.getMonth() + 1, nd.getDate());
  }
  return out;
}

/** The first occurrence on/after `fromISO` (bounded scan), or null. */
export function nextOccurrence(
  startDate: string,
  rule: RecurrenceRule | null | undefined,
  fromISO: string,
  time?: string
): EventOccurrence | null {
  if (!rule) {
    if (!isISODate(startDate) || startDate < fromISO) return null;
    return { date: startDate, startsAt: occurrenceStartMs(startDate, time), index: 0 };
  }
  // Scan at most ~3 years ahead for the "next" answer.
  const from = parseISODate(fromISO);
  if (!from) return null;
  const horizon = toISODate(from.y + 3, from.m, Math.min(from.d, daysInMonth(from.y + 3, from.m)));
  const list = expandOccurrences(startDate, rule, fromISO, horizon, time);
  return list.length > 0 ? list[0] : null;
}

/** Today's civil date (local) as YYYY-MM-DD — the usual `fromISO`. */
export function localTodayISO(now: Date = new Date()): string {
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Weekday → RFC 5545 BYDAY token. */
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/**
 * The RFC 5545 RRULE for this series (for .ics export). Mirrors the
 * expansion semantics: same defaults (start weekday / month-day /
 * month), UNTIL as a civil date, COUNT when set.
 *
 * Tithi series return null: RFC 5545 has no lunar-tithi rhythm, and
 * a Gregorian RRULE would be a false promise in the devotee's
 * calendar. The .ics exporter names the rhythm in the DESCRIPTION
 * instead (see lib/icsExport).
 */
export function recurrenceRRule(startDate: string, rule: RecurrenceRule): string | null {
  const start = parseISODate(startDate);
  if (!start || !isValidRecurrence(rule)) return null;
  if (rule.freq === 'tithi') return null;
  const interval = clampInterval(rule.interval);
  const parts: string[] = [];
  if (rule.freq === 'weekly') {
    parts.push('FREQ=WEEKLY');
    if (interval > 1) parts.push(`INTERVAL=${interval}`);
    const weekdays = rule.weekdays && rule.weekdays.length > 0
      ? [...rule.weekdays].sort((a, b) => a - b)
      : [new Date(start.y, start.m - 1, start.d, 12).getDay()];
    parts.push(`BYDAY=${weekdays.map((w) => BYDAY[w]).join(',')}`);
  } else if (rule.freq === 'monthly') {
    parts.push('FREQ=MONTHLY');
    if (interval > 1) parts.push(`INTERVAL=${interval}`);
    parts.push(`BYMONTHDAY=${rule.monthDay ?? start.d}`);
  } else if (rule.freq === 'yearly') {
    parts.push('FREQ=YEARLY');
    if (interval > 1) parts.push(`INTERVAL=${interval}`);
    parts.push(`BYMONTH=${rule.month ?? start.m}`);
    parts.push(`BYMONTHDAY=${rule.monthDay ?? start.d}`);
  }
  if (rule.count && rule.count >= 1) parts.push(`COUNT=${Math.floor(rule.count)}`);
  else if (rule.until && isISODate(rule.until)) parts.push(`UNTIL=${rule.until.replace(/-/g, '')}`);
  return `RRULE:${parts.join(';')}`;
}

/** English weekday names, for labels composed by callers. */
export const WEEKDAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** The weekday (0–6) of the series start — the default weekly day. */
export function startWeekday(startDate: string): number | null {
  const p = parseISODate(startDate);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d, 12).getDay();
}
