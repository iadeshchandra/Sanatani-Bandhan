/**
 * jyotish/availabilityLogic.ts — PURE availability maths (JY-07).
 * =====================================================================
 * Split from JyotishAvailability.tsx so the logic stays jest-safe
 * (the firebase ESM chain cannot load under jest — the same reason
 * dakshinaBridge.ts / dakshinaOrders.ts are separate files).
 * Slots are `{ 'mon-morning': true, 'wed-evening': false, ... }`.
 */

export const AVAILABILITY_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const AVAILABILITY_SHIFTS = ['morning', 'evening'] as const;

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const DAY_FULL: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
/** JS getDay() (0=Sunday) → our slot day key. */
const JS_DAY_TO_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface AvailabilityDay {
  day: string;
  label: string;
  shifts: string[];
}

/** Pure: the days with at least one slot on, in week order. */
export function summariseAvailability(
  slots: Record<string, boolean> | null | undefined
): AvailabilityDay[] {
  if (!slots) return [];
  const out: AvailabilityDay[] = [];
  for (const day of AVAILABILITY_DAYS) {
    const shifts = AVAILABILITY_SHIFTS.filter((s) => slots[`${day}-${s}`]);
    if (shifts.length > 0) out.push({ day, label: DAY_LABELS[day], shifts: [...shifts] });
  }
  return out;
}

export type AvailabilityVerdict = 'within' | 'outside' | 'unknown';

/**
 * Pure: does this date fall on a weekday the jyotishi marked available?
 * 'unknown' when no availability was ever recorded (→ show no note —
 * silence is honest; a guessed warning is not). Day-level only: the
 * slots carry no time-of-day, and neither does a booking's date.
 */
export function availabilityVerdictForDate(
  slots: Record<string, boolean> | null | undefined,
  dateStr: string
): AvailabilityVerdict {
  const days = summariseAvailability(slots);
  if (days.length === 0) return 'unknown';
  if (!dateStr) return 'unknown';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const key = JS_DAY_TO_KEY[d.getDay()];
  return days.some((x) => x.day === key) ? 'within' : 'outside';
}

/** Pure: "Monday" — the weekday name for the soft note. */
export function weekdayNameForDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return DAY_FULL[JS_DAY_TO_KEY[d.getDay()]] || '';
}
