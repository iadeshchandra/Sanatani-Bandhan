/**
 * eventReminders.ts — attendee reminder scheduling (EVENTS P1).
 * =====================================================================
 * Pure decision logic for the T-3 / T-1 / morning-of attendee
 * reminders and the changed/cancelled notices. No firebase, no
 * React — the service (eventReminderService.ts) owns the reads and
 * the emits; this module owns only the answers, so the scheduling
 * can be pinned by clock-fixture tests:
 *
 *  - Which stage (if any) is due for an event starting at S, now N?
 *  - Has an event the devotee RSVP'd to changed since they last saw
 *    it — and is that change worth one calm Suchana?
 *
 * Calm by construction (engagement laws): at most one reminder per
 * stage per event per devotee, stages are day-granular, and a missed
 * stage is skipped forever — the app never "catches up" with a burst
 * of stale bells. Delivery itself goes through the NotificationCenter
 * pipeline, which applies the devotee's own preferences, quiet hours
 * and daily caps; this module never pings anyone directly.
 */

export type ReminderStage = 't3' | 't1' | 'morning';

export interface ReminderEventLike {
  /** Stable id of the event series/document. */
  eventId: string;
  title: string;
  /** Epoch ms of the (next) occurrence the devotee is attending. */
  startsAt: number;
  /** Which surface the event lives on (deep-link choice). */
  source: 'festival' | 'sangam';
  orgId?: string;
}

/** Whole local days from `nowMs`'s day to the day of `startsAt` (negative = past). */
export function localDayDiff(startsAt: number, nowMs: number): number {
  const a = new Date(nowMs);
  const b = new Date(startsAt);
  const dayA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const dayB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((dayB - dayA) / 86400000);
}

/**
 * The reminder stage due for an event at `nowMs`, or null.
 *  - 't3'      — the event day is exactly 3 local days away;
 *  - 't1'      — the event day is tomorrow;
 *  - 'morning' — the event is today, still ahead, and it is at/after
 *                05:00 local (a bell at 2 AM helps no one; the
 *                pipeline's quiet hours are the second guard).
 * Past events and same-day events already started return null.
 */
export function reminderStageFor(startsAt: number, nowMs: number): ReminderStage | null {
  if (!Number.isFinite(startsAt) || startsAt <= nowMs) return null;
  const diff = localDayDiff(startsAt, nowMs);
  if (diff === 3) return 't3';
  if (diff === 1) return 't1';
  if (diff === 0) {
    const now = new Date(nowMs);
    return now.getHours() >= 5 ? 'morning' : null;
  }
  return null;
}

/** The dedupe/ledger key of one stage of one event for one devotee. */
export function reminderLedgerKey(ev: ReminderEventLike, stage: ReminderStage): string {
  return `evrem:${ev.source}:${ev.eventId}:${ev.startsAt}:${stage}`;
}

export interface DueReminder {
  event: ReminderEventLike;
  stage: ReminderStage;
  key: string;
}

/**
 * From the devotee's events and the set of already-sent ledger keys,
 * the reminders due right now (input order preserved, at most one
 * stage per event — the stage function returns a single stage).
 */
export function dueReminders(
  events: ReminderEventLike[],
  nowMs: number,
  sentKeys: ReadonlySet<string> | Readonly<Record<string, unknown>>
): DueReminder[] {
  const has = (k: string) =>
    typeof (sentKeys as ReadonlySet<string>).has === 'function'
      ? (sentKeys as ReadonlySet<string>).has(k)
      : k in (sentKeys as Readonly<Record<string, unknown>>);
  const out: DueReminder[] = [];
  for (const ev of events) {
    const stage = reminderStageFor(ev.startsAt, nowMs);
    if (!stage) continue;
    const key = reminderLedgerKey(ev, stage);
    if (has(key)) continue;
    out.push({ event: ev, stage, key });
  }
  return out;
}

export type EventChangeKind = 'changed' | 'cancelled' | null;

/**
 * Change detection for an RSVP'd event, from the `updatedAt` the
 * devotee's device last saw vs the record now:
 *  - record gone / unpublished → 'cancelled' (once — the caller
 *    records the notice in its seen-map so it never repeats);
 *  - updatedAt advanced AND the event is still in the future →
 *    'changed';
 *  - anything else → null. A first sighting is never a "change"
 *    (baseline law, same as the org-broadcast watcher).
 */
export function eventChangeKind(
  seenUpdatedAt: number | null,
  current: { updatedAt: number; startsAt: number; live: boolean } | null,
  nowMs: number
): EventChangeKind {
  if (seenUpdatedAt === null) return null; // first sighting — baseline
  if (current === null || !current.live) return 'cancelled';
  if (current.updatedAt > seenUpdatedAt && current.startsAt > nowMs) return 'changed';
  return null;
}
