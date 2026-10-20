/**
 * campus/openHours.ts — structured zone hours + "Open now" computation.
 * ====================================================================
 * Pure and jest-safe (no React, no Firebase). The devotee standing at
 * the temple asks one question — "is the annakshetra serving NOW?" —
 * and this module answers it from the trustee-entered structured
 * hours on the zone (CampusZone.openHours).
 *
 * HONESTY LAWS (never a wrong badge):
 *  - No structured hours, or hours that fail validation → status is
 *    `null` and NO badge renders anywhere. The free-text `hours`
 *    string remains the display note in that case.
 *  - Times are interpreted in the DEVICE's local timezone (stated in
 *    the UI). A devotee at the temple shares the temple's timezone.
 *  - A range whose close ≤ open is an OVERNIGHT range (closes after
 *    midnight) — e.g. 20:00–02:00 during festivals. Its tail spills
 *    into the next day even if that day is a closed day, because the
 *    session genuinely began the day before.
 *  - A weekday in `closedDays` has no ranges of its own that day.
 */
import type { ZoneOpenHours, ZoneTimeRange } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Parse a strict "HH:MM" 24-hour string → minutes since midnight. */
export function parseHHMM(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function isValidRange(r: unknown): r is ZoneTimeRange {
  if (!r || typeof r !== 'object') return false;
  const { open, close } = r as ZoneTimeRange;
  const o = parseHHMM(open);
  const c = parseHHMM(close);
  return o != null && c != null && o !== c;
}

/**
 * Defensive read: coerce stored data into a trustworthy ZoneOpenHours
 * (drops invalid ranges, caps at 2, dedupes/sanitizes closedDays).
 * Returns undefined when nothing valid remains — the "no badge" state.
 */
export function normalizeOpenHours(input: unknown): ZoneOpenHours | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as ZoneOpenHours;
  const ranges = (Array.isArray(raw.ranges) ? raw.ranges : [])
    .filter(isValidRange)
    .slice(0, 2)
    .map((r) => ({ open: r.open.trim(), close: r.close.trim() }));
  if (ranges.length === 0) return undefined;
  const closedDays = [
    ...new Set(
      (Array.isArray(raw.closedDays) ? raw.closedDays : []).filter(
        (d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6,
      ),
    ),
  ].sort((a, b) => a - b);
  return closedDays.length ? { ranges, closedDays } : { ranges };
}

export type ZoneOpenStatus =
  | { state: 'open'; closesAt: Date }
  | { state: 'closed'; opensAt: Date | null; todayClosed: boolean };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Compute open/closed for `now`. Returns null when there are no valid
 * structured hours (callers render NO badge — never guess).
 */
export function zoneOpenStatus(
  input: ZoneOpenHours | undefined | null,
  now: Date,
): ZoneOpenStatus | null {
  const hours = normalizeOpenHours(input);
  if (!hours) return null;
  const closed = new Set(hours.closedDays ?? []);
  const today = startOfDay(now);

  /** Absolute [start, end) intervals beginning on the given day-start. */
  const intervalsFor = (dayStart: Date): Array<{ start: Date; end: Date }> => {
    if (closed.has(dayStart.getDay())) return [];
    return hours.ranges.map((r) => {
      const o = parseHHMM(r.open) as number;
      const c = parseHHMM(r.close) as number;
      const start = new Date(dayStart.getTime() + o * 60000);
      let end = new Date(dayStart.getTime() + c * 60000);
      if (c <= o) end = new Date(end.getTime() + DAY_MS); // overnight range
      return { start, end };
    });
  };

  // Open? Check yesterday first (overnight spill), then today.
  for (const off of [-1, 0]) {
    const dayStart = new Date(today.getTime() + off * DAY_MS);
    for (const iv of intervalsFor(dayStart)) {
      if (now >= iv.start && now < iv.end) {
        return { state: 'open', closesAt: iv.end };
      }
    }
  }

  // Next opening: earliest range start after `now`, today through +7 days.
  let opensAt: Date | null = null;
  for (let off = 0; off <= 7; off++) {
    const dayStart = new Date(today.getTime() + off * DAY_MS);
    for (const iv of intervalsFor(dayStart)) {
      if (iv.start > now && (!opensAt || iv.start < opensAt)) opensAt = iv.start;
    }
    if (opensAt) break;
  }
  return { state: 'closed', opensAt, todayClosed: closed.has(now.getDay()) };
}

/** "5:00 AM" from minutes since midnight. */
export function formatMinutes(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "9:30 PM" from a Date's local time-of-day. */
export function formatTimeOfDay(d: Date): string {
  return formatMinutes(d.getHours() * 60 + d.getMinutes());
}

function opensWhen(opensAt: Date, now: Date): string {
  const diffDays = Math.round(
    (startOfDay(opensAt).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );
  if (diffDays <= 0) return formatTimeOfDay(opensAt);
  if (diffDays === 1) return `tomorrow ${formatTimeOfDay(opensAt)}`;
  return `${DAY_NAMES[opensAt.getDay()]} ${formatTimeOfDay(opensAt)}`;
}

/** Warm one-line badge copy, e.g. "Open now · closes 9:00 PM". */
export function openStatusLabel(status: ZoneOpenStatus, now: Date): string {
  if (status.state === 'open') {
    return `Open now · closes ${formatTimeOfDay(status.closesAt)}`;
  }
  if (!status.opensAt) return status.todayClosed ? 'Closed today' : 'Closed';
  return status.todayClosed
    ? `Closed today · opens ${opensWhen(status.opensAt, now)}`
    : `Closed · opens ${opensWhen(status.opensAt, now)}`;
}

/* ------------------------------------------------------------------ */
/* Builder-side helpers                                                */
/* ------------------------------------------------------------------ */

export interface RangeDraft {
  open: string;
  close: string;
}

const EMPTY_DRAFT: RangeDraft = { open: '', close: '' };

/** Editor initial state: always exactly two draft slots. */
export function draftRangesFrom(input: ZoneOpenHours | undefined | null): RangeDraft[] {
  const ranges = normalizeOpenHours(input)?.ranges ?? [];
  return [
    ranges[0] ? { open: ranges[0].open, close: ranges[0].close } : { ...EMPTY_DRAFT },
    ranges[1] ? { open: ranges[1].open, close: ranges[1].close } : { ...EMPTY_DRAFT },
  ];
}

/**
 * Build the value to persist from editor drafts. Only COMPLETE, valid
 * ranges are kept — a half-typed range never persists, so a badge can
 * never appear from partial input. Zero complete ranges → undefined
 * (the zone simply has no structured hours).
 */
export function buildOpenHours(
  drafts: RangeDraft[],
  closedDays: number[],
): ZoneOpenHours | undefined {
  const complete = drafts
    .filter(
      (d) =>
        parseHHMM(d.open) != null &&
        parseHHMM(d.close) != null &&
        parseHHMM(d.open) !== parseHHMM(d.close),
    )
    .slice(0, 2)
    .map((d) => ({ open: d.open.trim(), close: d.close.trim() }));
  if (complete.length === 0) return undefined;
  return normalizeOpenHours({ ranges: complete, closedDays });
}
