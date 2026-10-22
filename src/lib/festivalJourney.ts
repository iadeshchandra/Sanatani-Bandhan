/**
 * festivalJourney.ts — Blueprint D, deliverable 3: the festival
 * journey (pure logic, no React, no Firebase).
 * ============================================================================
 * A festival is the biggest day of an org's year, and the work is
 * scattered across six desks: plan it (Utsav), budget it (Treasury),
 * take bookings, roster the volunteers, run the day-of queue, then
 * close out honestly — publish the month's accounts and thank the
 * devotees. New trustees discover this sequence by failing it once.
 * The journey is GUIDANCE over the existing desks: one card, the
 * right order, a deep link per step — NOT a new suite, not a new
 * data model.
 *
 * Honesty law (the brief's, and this app's): progress is DERIVED
 * FROM REAL DATA or it is not shown. A step reads "done" only when
 * the org's own records say so:
 *   · budget     — expense entries exist in the festival's month;
 *   · bookings   — bookings exist in the festival's week;
 *   · volunteers — duty shifts exist in the festival's week;
 *   · published  — the festival month's accounts are on the
 *                  Transparency Board (Blueprint A's publish flow).
 * Steps where no cheap truthful signal exists (plan, day-of queue,
 * the thank-you broadcast — broadcasts have no read-back store) show
 * as OPEN steps with their deep link, never a borrowed checkmark.
 * Counts shown are the real counts. Nothing is estimated, projected
 * or filled in.
 */

import type { PanjikaFestival } from './panjikaFestivals';

/** How far ahead a journey appears — long enough to plan, near
 *  enough to matter. */
export const JOURNEY_WINDOW_DAYS = 75;

/** The journey appears for the next MAJOR festival (utsav-class),
 *  not for every ekadashi — rhythm, not noise. */
export function pickJourneyFestival(
  upcoming: readonly PanjikaFestival[],
  todayIso: string
): PanjikaFestival | null {
  const horizon = addDaysIso(todayIso, JOURNEY_WINDOW_DAYS);
  for (const f of upcoming) {
    if (f.date < todayIso || f.date > horizon) continue;
    if (f.category === 'festival' || f.category === 'puja') return f;
  }
  return null;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The 7-day window the festival sits in (3 days either side —
 *  preparation and the day itself, plus the wind-down). */
export function festivalWeek(festivalDate: string): { from: string; to: string } {
  return { from: addDaysIso(festivalDate, -3), to: addDaysIso(festivalDate, 3) };
}

export type JourneyStepId =
  | 'plan'
  | 'budget'
  | 'bookings'
  | 'volunteers'
  | 'queue'
  | 'publish'
  | 'thanks';

export interface JourneyStep {
  id: JourneyStepId;
  /** Catalog module id the step deep-links to. */
  deskId: string;
  /**
   * The step's state, derived ONLY from the signals documented in
   * the header:
   *  - 'done'  — the org's records prove it;
   *  - 'open'  — a signal exists and reads zero/not-yet;
   *  - 'link'  — no truthful signal; the step is guidance only.
   */
  state: 'done' | 'open' | 'link';
  /** The REAL count behind the state (bookings, shifts, expense
   *  entries) when the step has one; null for link-only steps. */
  count: number | null;
}

export interface JourneySignals {
  /** Treasury rows (any type) dated in the festival month — the
   *  budget step reads EXPENSE rows; the count is of expenses. */
  expenseCountInMonth: number;
  /** Bookings dated inside the festival week. */
  bookingsInWeek: number;
  /** Duty shifts dated inside the festival week. */
  shiftsInWeek: number;
  /** Whether the festival month has published accounts. */
  monthPublished: boolean;
}

/** Count signals from the org's own rows. Dates are ISO strings;
 *  rows with unusable dates simply do not count (never guessed). */
export function journeySignals(args: {
  festivalDate: string;
  treasury: readonly { type?: string; date?: string | null; isPractice?: boolean | null }[];
  bookings: readonly { bookingDate?: string | null; date?: string | null }[];
  shifts: readonly { date?: string | null; shiftDate?: string | null }[];
  publishedMonths: readonly string[];
}): JourneySignals {
  const month = args.festivalDate.slice(0, 7);
  const week = festivalWeek(args.festivalDate);
  const inWeek = (d: string | null | undefined) =>
    typeof d === 'string' && d >= week.from && d <= week.to;
  return {
    // Practice rows are not a budget — a festival planned entirely
    // in practice mode shows an open budget step, honestly.
    expenseCountInMonth: args.treasury.filter(
      (t) =>
        t.type === 'Expense' &&
        t.isPractice !== true &&
        typeof t.date === 'string' &&
        t.date.slice(0, 7) === month
    ).length,
    bookingsInWeek: args.bookings.filter((b) => inWeek(b.bookingDate ?? b.date)).length,
    shiftsInWeek: args.shifts.filter((s) => inWeek(s.date ?? s.shiftDate)).length,
    monthPublished: args.publishedMonths.includes(month),
  };
}

export function buildJourneySteps(signals: JourneySignals): JourneyStep[] {
  return [
    { id: 'plan', deskId: 'utsav-one', state: 'link', count: null },
    {
      id: 'budget',
      deskId: 'treasury',
      state: signals.expenseCountInMonth > 0 ? 'done' : 'open',
      count: signals.expenseCountInMonth,
    },
    {
      id: 'bookings',
      deskId: 'poojaBooking',
      state: signals.bookingsInWeek > 0 ? 'done' : 'open',
      count: signals.bookingsInWeek,
    },
    {
      id: 'volunteers',
      deskId: 'sevadar-roster',
      state: signals.shiftsInWeek > 0 ? 'done' : 'open',
      count: signals.shiftsInWeek,
    },
    { id: 'queue', deskId: 'tirth-one', state: 'link', count: null },
    {
      id: 'publish',
      deskId: 'treasury',
      state: signals.monthPublished ? 'done' : 'open',
      count: null,
    },
    { id: 'thanks', deskId: 'sandeshBroadcast', state: 'link', count: null },
  ];
}

/** Dismissal is per festival per workspace — dismissing Durga Puja's
 *  journey never hides Janmashtami's. */
export const journeyDismissKey = (workspaceId: string, festivalDate: string, nameEn: string) =>
  `sb_journey_dismissed_${workspaceId}_${festivalDate}_${nameEn}`;
