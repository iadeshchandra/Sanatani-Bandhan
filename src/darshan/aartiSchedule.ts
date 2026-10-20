/**
 * darshan/aartiSchedule.ts — pure aarti-schedule math.
 * ============================================================================
 * Jest-safe: zero Firebase imports. All time math uses the device's local
 * clock (temple schedules are published in the temple's local time, which
 * matches the devotee's device for in-region temples — documented limit).
 *
 * Schedule shape mirrors src/darshan/types.ts AartiSchedule:
 *   { name: string; time: "HH:MM" 24h; days?: number[] (0=Sun..6=Sat, empty=daily) }
 */

/** A single published aarti slot. */
export interface AartiSlot {
  name: string;
  /** "HH:MM" 24-hour, e.g. "06:00" */
  time: string;
  /** 0=Sunday..6=Saturday; undefined/empty = every day */
  days?: number[];
}

/** Parsed "HH:MM" → minutes since midnight, or null when invalid. */
export function parseScheduleTime(time: string | null | undefined): number | null {
  if (typeof time !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Validate one schedule slot. Returns an error key, or null when valid. */
export function validateAartiSlot(slot: Partial<AartiSlot> | null | undefined): string | null {
  if (!slot) return 'empty';
  if (!slot.name || !slot.name.trim()) return 'name-required';
  if (parseScheduleTime(slot.time) === null) return 'time-invalid';
  if (slot.days && slot.days.length > 0) {
    if (slot.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return 'days-invalid';
  }
  return null;
}

/**
 * Next occurrence of ONE slot as a Date, strictly after `now`.
 * Looks ahead up to 8 days (covers weekly-only slots).
 */
export function nextOccurrence(slot: AartiSlot, now: Date = new Date()): Date | null {
  const tMin = parseScheduleTime(slot.time);
  if (tMin === null) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();
  for (let d = 0; d < 8; d++) {
    const day = (today + d) % 7;
    if (slot.days?.length && !slot.days.includes(day)) continue;
    const mins = d * 1440 + tMin - nowMin;
    if (mins <= 0) continue;
    return new Date(now.getTime() + mins * 60000);
  }
  return null;
}

/** The next upcoming aarti across all slots, or null when none. */
export function nextAarti(
  slots: AartiSlot[],
  now: Date = new Date(),
): { slot: AartiSlot; at: Date } | null {
  let best: { slot: AartiSlot; at: Date } | null = null;
  for (const s of slots) {
    if (validateAartiSlot(s) !== null) continue;
    const at = nextOccurrence(s, now);
    if (!at) continue;
    if (!best || at.getTime() < best.at.getTime()) best = { slot: s, at };
  }
  return best;
}

/**
 * Slots whose next occurrence starts within `windowMin` minutes from `now`
 * (and hasn't started yet). Used by the reminder checker.
 */
export function dueWithin(
  slots: AartiSlot[],
  windowMin: number,
  now: Date = new Date(),
): Array<{ slot: AartiSlot; at: Date; startsInMin: number }> {
  const out: Array<{ slot: AartiSlot; at: Date; startsInMin: number }> = [];
  for (const s of slots) {
    if (validateAartiSlot(s) !== null) continue;
    const at = nextOccurrence(s, now);
    if (!at) continue;
    const startsInMin = Math.round((at.getTime() - now.getTime()) / 60000);
    if (startsInMin > 0 && startsInMin <= windowMin) {
      out.push({ slot: s, at, startsInMin });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Local date key "YYYY-MM-DD" for dedupe scoping (device timezone). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Warm "in Xm / in Xh Ym / tomorrow" text for a next occurrence. */
export function friendlyCountdown(at: Date, now: Date = new Date()): string {
  const mins = Math.round((at.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return 'starting now';
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  const sameDay = at.getDate() === now.getDate();
  const base = r === 0 ? `in ${h}h` : `in ${h}h ${r}m`;
  return sameDay ? base : `tomorrow ${base}`;
}
