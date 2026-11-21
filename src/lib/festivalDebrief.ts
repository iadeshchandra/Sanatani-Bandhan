/**
 * festivalDebrief.ts — EVENTS E4: the festival debrief pack (pure logic).
 * =====================================================================
 * One honest post-festival view, computed ENTIRELY from records that
 * already exist: the festival's RSVP register (festival_rsvps), the
 * seva-pass money records (event_tickets), the published event doc's
 * anchored tier counters, the War Room plan (footfall/prasad/roster/
 * checklist planners + the ticketing config's discount-use counter),
 * and — when a Utsav festival record covers the same dates — that
 * record's budget lines, safety items and manual gate counts from
 * the utsav store (the utsav_stores doc).
 *
 * HONESTY LAWS (the standing directive, applied figure by figure):
 *  - Every figure names its source at the surface; in here, every
 *    builder reads ONE record family only, so a figure can never
 *    silently mix sources. Ticket money and donation money are built
 *    by different functions from different inputs — they are kept
 *    apart BY CONSTRUCTION, never by a filter that could slip.
 *  - A rate with nothing behind it is null, never 0% dressed as
 *    data (turnout with no confirmed RSVPs is null; the surface
 *    shows an empty state, not a number).
 *  - The RSVP register keeps no history: a cancelled RSVP is
 *    DELETED (the anchored-counter law) and a waitlist claim flips
 *    the record to 'confirmed'. So the funnel below is the register
 *    AS IT STANDS — current confirmed / current waitlisted /
 *    arrived — and the surface labels it exactly that. Ticket
 *    cancellations DO survive as records (paymentState), and are
 *    counted in the money builder.
 *  - Walk-ins are shown only as a difference the records support:
 *    the team's manual gate counts (utsav checkins) minus the
 *    RSVP-linked arrivals. When the manual counts do not exceed
 *    the arrivals — or were never recorded — there is no walk-in
 *    figure at all. Nothing is estimated into existence.
 *
 * No Firestore, no React — everything here is unit-testable and
 * offline-safe, like lib/festival and lib/festivalMemory.
 */
import {
  festivalDayList,
  checklistDonePct,
  prasadTotals,
  projectFootfall,
  rosterFillPct,
  rosterGaps,
  ROSTER_ROLES,
  ROSTER_SHIFTS,
  type FestivalDebriefSummary,
  type PrasadTotal,
  type RosterGap,
  type RsvpEntry,
  type TicketTier,
  type WarRoomPlan,
} from './festival';
import { deriveDayCounts } from './festivalRsvp';
import { localDateOfIso } from './eventPass';
import { ticketEffQty, type EventTicket } from './eventTickets';
import type {
  BudgetLine,
  CheckinCount,
  Festival,
  SafetyItem,
} from '../utsav/types';

/* ------------------------------------------------------------------ */
/* 1. The registration funnel — the RSVP register as it stands         */
/* ------------------------------------------------------------------ */

export interface DebriefFunnel {
  /** Parties (records) currently confirmed. */
  confirmedParties: number;
  /** Heads on confirmed records — the expected crowd. */
  confirmedHeads: number;
  /** Parties still waiting for a place (unmet demand). */
  waitlistedParties: number;
  waitlistedHeads: number;
  /** Confirmed parties the gate / War Room marked arrived. */
  arrivedParties: number;
  arrivedHeads: number;
  /**
   * arrivedHeads ÷ confirmedHeads × 100 (rounded). Null when no
   * confirmed heads exist — a turnout with nothing behind it is
   * not a number.
   */
  turnoutPct: number | null;
  /** Confirmed but never arrived. */
  noShowParties: number;
  noShowHeads: number;
}

const statusOf = (r: RsvpEntry): 'confirmed' | 'waitlisted' =>
  (r.status || 'confirmed') === 'waitlisted' ? 'waitlisted' : 'confirmed';

export function buildFunnel(rsvps: readonly RsvpEntry[]): DebriefFunnel {
  let confirmedParties = 0;
  let confirmedHeads = 0;
  let waitlistedParties = 0;
  let waitlistedHeads = 0;
  let arrivedParties = 0;
  let arrivedHeads = 0;
  for (const r of rsvps) {
    const heads = r.headcount || 0;
    if (statusOf(r) === 'waitlisted') {
      waitlistedParties += 1;
      waitlistedHeads += heads;
    } else {
      confirmedParties += 1;
      confirmedHeads += heads;
      if (r.checkedIn) {
        arrivedParties += 1;
        arrivedHeads += heads;
      }
    }
  }
  return {
    confirmedParties,
    confirmedHeads,
    waitlistedParties,
    waitlistedHeads,
    arrivedParties,
    arrivedHeads,
    turnoutPct:
      confirmedHeads > 0 ? Math.round((arrivedHeads / confirmedHeads) * 100) : null,
    noShowParties: confirmedParties - arrivedParties,
    noShowHeads: confirmedHeads - arrivedHeads,
  };
}

/* ------------------------------------------------------------------ */
/* 2. Day-wise rows — expected from day choices, arrived from the      */
/*    record's own check-in day (the E3 gate-day definition)           */
/* ------------------------------------------------------------------ */

export interface DebriefDayRow {
  date: string;
  expectedHeads: number;
  expectedParties: number;
  arrivedHeads: number;
  arrivedParties: number;
  /** Null when nobody was expected that day. */
  turnoutPct: number | null;
}

/**
 * Expected heads per day reuse P1's deriveDayCounts (a record with
 * no `days` attends every day). Arrivals are attributed to the civil
 * day of the record's checkedInAt — localDateOfIso, the same day
 * definition the E3 gate uses. A checked-in record whose stamp is
 * missing or falls outside the festival span counts in the overall
 * funnel but in no day row — it is never smeared across days.
 */
export function buildDayRows(
  rsvps: readonly RsvpEntry[],
  dateISO: string,
  endDateISO: string
): DebriefDayRow[] {
  const days = festivalDayList(dateISO, endDateISO);
  const expected = deriveDayCounts(rsvps, days);
  const arrived = new Map<string, { heads: number; parties: number }>();
  for (const d of days) arrived.set(d, { heads: 0, parties: 0 });
  for (const r of rsvps) {
    if (statusOf(r) !== 'confirmed' || !r.checkedIn) continue;
    const day = localDateOfIso(r.checkedInAt);
    if (!day) continue;
    const cell = arrived.get(day);
    if (!cell) continue;
    cell.heads += r.headcount || 0;
    cell.parties += 1;
  }
  return expected.map((e) => {
    const a = arrived.get(e.date) || { heads: 0, parties: 0 };
    return {
      date: e.date,
      expectedHeads: e.heads,
      expectedParties: e.parties,
      arrivedHeads: a.heads,
      arrivedParties: a.parties,
      turnoutPct: e.heads > 0 ? Math.round((a.heads / e.heads) * 100) : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* 3. Pass tiers — sold vs capacity, from the anchored counters        */
/* ------------------------------------------------------------------ */

export interface DebriefTierRow {
  tierId: string;
  tierName: string;
  kind: TicketTier['kind'];
  /** Null = the tier carries no capacity (unmetered). */
  capacity: number | null;
  /** The anchored tierSold counter — never a client-kept count. */
  soldQty: number;
  /** Null when unmetered. */
  remaining: number | null;
}

export function buildTierRows(
  tiers: readonly TicketTier[] | undefined,
  tierSold: Record<string, number> | undefined,
  tierCaps: Record<string, number> | undefined
): DebriefTierRow[] {
  return (tiers || []).map((t) => {
    const capRaw = tierCaps?.[t.id] ?? t.capacity;
    const capacity =
      capRaw === undefined || capRaw === null ? null : Math.max(0, Math.floor(capRaw));
    const soldQty = Math.max(0, Math.floor(tierSold?.[t.id] || 0));
    return {
      tierId: t.id,
      tierName: t.name?.en || t.id,
      kind: t.kind,
      capacity,
      soldQty,
      remaining: capacity === null ? null : Math.max(0, capacity - soldQty),
    };
  });
}

/* ------------------------------------------------------------------ */
/* 4. Pass money — event_tickets ONLY. Donations can never enter       */
/*    here: this builder never receives a budget line.                 */
/* ------------------------------------------------------------------ */

export interface DebriefTierMoney {
  tierId: string;
  tierName: string;
  /** Live passes' effective quantity (refunded/cancelled hold none). */
  liveQty: number;
  /** Money in hand for this tier (wallet + venue-received). */
  collected: number;
  /** Live pay-at-venue money not yet received. */
  venuePending: number;
}

export interface DebriefTicketMoney {
  currency: string;
  /** Live pass records (paid-wallet + pay-at-venue + comp). */
  liveCount: number;
  collectedWallet: number;
  collectedVenue: number;
  collectedTotal: number;
  venuePendingTotal: number;
  venuePendingCount: number;
  /** Free passes issued by price or by a full code — no money, by design. */
  compCount: number;
  compQty: number;
  refundCount: number;
  /** Sum of the refunds the records carry (refundAmount). */
  refundTotal: number;
  cancelledCount: number;
  /**
   * Cancelled passes whose venue money WAS received and never went
   * through a desk refund — cash still due back at the desk.
   */
  venueRefundDueTotal: number;
  venueRefundDueCount: number;
  byTier: DebriefTierMoney[];
}

export function buildTicketMoney(
  tickets: readonly EventTicket[],
  tiers?: readonly TicketTier[]
): DebriefTicketMoney {
  const tierName = new Map<string, string>();
  for (const t of tiers || []) tierName.set(t.id, t.name?.en || t.id);
  const byTierMap = new Map<string, DebriefTierMoney>();
  const tierRow = (t: EventTicket): DebriefTierMoney => {
    let row = byTierMap.get(t.tierId);
    if (!row) {
      row = {
        tierId: t.tierId,
        tierName: tierName.get(t.tierId) || t.tierName || t.tierId,
        liveQty: 0,
        collected: 0,
        venuePending: 0,
      };
      byTierMap.set(t.tierId, row);
    }
    return row;
  };

  const out: DebriefTicketMoney = {
    currency: tickets[0]?.currency || 'INR',
    liveCount: 0,
    collectedWallet: 0,
    collectedVenue: 0,
    collectedTotal: 0,
    venuePendingTotal: 0,
    venuePendingCount: 0,
    compCount: 0,
    compQty: 0,
    refundCount: 0,
    refundTotal: 0,
    cancelledCount: 0,
    venueRefundDueTotal: 0,
    venueRefundDueCount: 0,
    byTier: [],
  };

  for (const t of tickets) {
    const total = t.amounts?.total || 0;
    const row = tierRow(t);
    if (t.paymentState === 'paid-wallet') {
      out.liveCount += 1;
      out.collectedWallet += total;
      row.liveQty += ticketEffQty(t);
      row.collected += total;
    } else if (t.paymentState === 'pay-at-venue') {
      out.liveCount += 1;
      row.liveQty += ticketEffQty(t);
      if (t.venueReceived === true) {
        out.collectedVenue += total;
        row.collected += total;
      } else {
        out.venuePendingTotal += total;
        out.venuePendingCount += 1;
        row.venuePending += total;
      }
    } else if (t.paymentState === 'comp') {
      out.liveCount += 1;
      out.compCount += 1;
      out.compQty += t.qty || 0;
      row.liveQty += ticketEffQty(t);
    } else if (t.paymentState === 'refunded') {
      out.refundCount += 1;
      // Desk refunds stamp the full total as refundAmount; buyer
      // cancellations stamp the ladder amount. A refunded record
      // without a stamp falls back to its total — the record's own
      // figures, never an invented one.
      out.refundTotal += t.refundAmount ?? total;
    } else if (t.paymentState === 'cancelled') {
      out.cancelledCount += 1;
      if (t.venueReceived === true) {
        out.venueRefundDueTotal += total;
        out.venueRefundDueCount += 1;
      }
    }
  }
  out.collectedTotal = out.collectedWallet + out.collectedVenue;
  out.byTier = [...byTierMap.values()].filter(
    (r) => r.liveQty > 0 || r.collected > 0 || r.venuePending > 0
  );
  return out;
}

/* ------------------------------------------------------------------ */
/* 5. The festival budget — Utsav budget lines ONLY. Donations are     */
/*    lifted out as their own line; pass money can never enter here:   */
/*    this builder never receives a ticket.                            */
/* ------------------------------------------------------------------ */

export interface DebriefBudgetRow {
  head: string;
  kind: 'income' | 'expense';
  planned: number;
  actual: number;
  /** actual − planned (negative = under plan). */
  variance: number;
}

export interface DebriefBudget {
  /** The 'Donations' income head, lifted out — a subset of the
   *  income totals below, shown apart and never added twice. */
  donations: { planned: number; actual: number } | null;
  /** Every head except Donations, in the order first recorded. */
  rows: DebriefBudgetRow[];
  plannedIncome: number;
  actualIncome: number;
  plannedExpense: number;
  actualExpense: number;
}

export const DONATIONS_HEAD = 'Donations';

export function buildBudget(lines: readonly BudgetLine[]): DebriefBudget {
  let donations: DebriefBudget['donations'] = null;
  const byKey = new Map<string, DebriefBudgetRow>();
  const totals = { plannedIncome: 0, actualIncome: 0, plannedExpense: 0, actualExpense: 0 };
  for (const l of lines) {
    const planned = l.planned || 0;
    const actual = l.actual || 0;
    if (l.kind === 'income') {
      totals.plannedIncome += planned;
      totals.actualIncome += actual;
    } else {
      totals.plannedExpense += planned;
      totals.actualExpense += actual;
    }
    if (l.kind === 'income' && l.head === DONATIONS_HEAD) {
      donations = donations || { planned: 0, actual: 0 };
      donations.planned += planned;
      donations.actual += actual;
      continue;
    }
    const key = `${l.kind}::${l.head}`;
    let row = byKey.get(key);
    if (!row) {
      row = { head: l.head, kind: l.kind, planned: 0, actual: 0, variance: 0 };
      byKey.set(key, row);
    }
    row.planned += planned;
    row.actual += actual;
    row.variance = row.actual - row.planned;
  }
  return { donations, rows: [...byKey.values()], ...totals };
}

/* ------------------------------------------------------------------ */
/* 6. Linking the Utsav festival record — deterministic, never fuzzy   */
/* ------------------------------------------------------------------ */

/**
 * The War Room plans around Panjika festivals; budgets, safety
 * items, manual gate counts and the lessons field live on the
 * samiti's own Utsav festival records. The link is DATE OVERLAP
 * ONLY — names are never fuzzy-matched into a figure:
 *  - exactly one record overlaps the festival's span → linked;
 *  - several overlap → linked only when exactly one of them starts
 *    on the festival's own start date;
 *  - otherwise unlinked, and the debrief says so honestly instead
 *    of borrowing another festival's numbers.
 */
export function matchLocalFestival(
  dateISO: string,
  endDateISO: string,
  festivals: readonly Festival[]
): Festival | null {
  const start = dateISO;
  const end = endDateISO || dateISO;
  const overlapping = festivals.filter(
    (f) => f.startDate <= end && (f.endDate || f.startDate) >= start
  );
  if (overlapping.length === 1) return overlapping[0];
  if (overlapping.length > 1) {
    const exact = overlapping.filter((f) => f.startDate === start);
    if (exact.length === 1) return exact[0];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 7. Operations — planner vs what actually happened                   */
/* ------------------------------------------------------------------ */

export interface DebriefOps {
  /** The footfall planner's projection (0 when assumptions unset). */
  projectedBase: number;
  projectionSet: boolean;
  /** Last year's footfall as the planner recorded it (0 = unset). */
  lastYearFootfall: number;
  /** Prasad planned for the projected crowd (per-person × base). */
  prasadForProjection: PrasadTotal[];
  /** Prasad the crowd that actually came would need (× arrived). */
  prasadForActual: PrasadTotal[];
  /** War-room checklist completion; null when no template exists. */
  checklistPct: number | null;
  rosterGaps: RosterGap[];
  /** Roster cells still short of sevadars. */
  rosterGapCells: number;
  /** Total sevadar places still unfilled. */
  rosterMissing: number;
  rosterFillPct: number;
  /** Safety items of the linked Utsav record; null when unlinked
   *  or the record carries no safety items. */
  safety: { done: number; total: number; pct: number } | null;
}

export function buildOps(
  plan: WarRoomPlan,
  template: { items: Array<{ id: string; role: string }> } | null,
  arrivedHeads: number,
  safetyItems: readonly SafetyItem[] | null
): DebriefOps {
  const proj = projectFootfall(plan.footfall);
  const gaps = rosterGaps(ROSTER_ROLES, ROSTER_SHIFTS, plan.roster, plan.rosterNeeded);
  const short = gaps.filter((g) => g.gap > 0);
  let safety: DebriefOps['safety'] = null;
  if (safetyItems && safetyItems.length > 0) {
    const done = safetyItems.filter((s) => s.done).length;
    safety = {
      done,
      total: safetyItems.length,
      pct: Math.round((done / safetyItems.length) * 100),
    };
  }
  return {
    projectedBase: proj.base,
    projectionSet: proj.assumptionsSet,
    lastYearFootfall: plan.footfall.lastYear || 0,
    prasadForProjection: prasadTotals(plan.prasad, proj.base),
    prasadForActual: prasadTotals(plan.prasad, arrivedHeads),
    checklistPct: template ? checklistDonePct(template, plan.checklist) : null,
    rosterGaps: gaps,
    rosterGapCells: short.length,
    rosterMissing: short.reduce((s, g) => s + g.gap, 0),
    rosterFillPct: rosterFillPct(gaps),
    safety,
  };
}

/* ------------------------------------------------------------------ */
/* 8. Walk-ins — only the difference the gate counts support           */
/* ------------------------------------------------------------------ */

export interface DebriefWalkins {
  /** The team's manual gate counts for the festival, all days. */
  manualTotal: number;
  arrivedHeads: number;
  /** manualTotal − arrivedHeads (> 0 by construction here). */
  walkinEstimate: number;
}

/**
 * Returns null unless manual gate counts exist AND exceed the
 * RSVP-linked arrivals — the only case where a walk-in figure is
 * a fact about records rather than a guess.
 */
export function buildWalkins(
  checkins: readonly CheckinCount[] | null,
  arrivedHeads: number
): DebriefWalkins | null {
  if (!checkins || checkins.length === 0) return null;
  const manualTotal = checkins.reduce((s, c) => s + (c.count || 0), 0);
  if (manualTotal <= arrivedHeads) return null;
  return { manualTotal, arrivedHeads, walkinEstimate: manualTotal - arrivedHeads };
}

/* ------------------------------------------------------------------ */
/* 9. The public summary — aggregates only, by shape                   */
/* ------------------------------------------------------------------ */

export function buildPublicSummary(input: {
  funnel: DebriefFunnel;
  ticketMoney: DebriefTicketMoney;
  budget: DebriefBudget | null;
  dateISO: string;
  endDateISO: string;
  nowIso: string;
}): FestivalDebriefSummary {
  const days = festivalDayList(input.dateISO, input.endDateISO).length;
  return {
    publishedAt: input.nowIso,
    days: Math.max(1, days),
    expectedHeads: input.funnel.confirmedHeads,
    arrivedHeads: input.funnel.arrivedHeads,
    families: input.funnel.confirmedParties,
    passCollected: input.ticketMoney.collectedTotal,
    donationsReceived: input.budget ? (input.budget.donations?.actual ?? 0) : null,
    totalUtilised: input.budget ? input.budget.actualExpense : null,
    currency: input.ticketMoney.currency,
  };
}

/* ------------------------------------------------------------------ */
/* 10. CSV rows for the committee (English data labels, the           */
/*     ReportsTab CSV idiom — figures only, each with its source)      */
/* ------------------------------------------------------------------ */

export function buildDebriefCsvRows(input: {
  festivalName: string;
  dateISO: string;
  endDateISO: string;
  funnel: DebriefFunnel;
  dayRows: DebriefDayRow[];
  tierRows: DebriefTierRow[];
  ticketMoney: DebriefTicketMoney;
  budget: DebriefBudget | null;
  discountUses: Record<string, number> | null;
  walkins: DebriefWalkins | null;
}): string[][] {
  const f = input.funnel;
  const tm = input.ticketMoney;
  const rows: string[][] = [
    ['Festival debrief', input.festivalName],
    ['Dates', `${input.dateISO} to ${input.endDateISO || input.dateISO}`],
    [],
    ['Registration (from RSVP records)', 'Parties', 'Heads'],
    ['Confirmed', String(f.confirmedParties), String(f.confirmedHeads)],
    ['Waitlisted', String(f.waitlistedParties), String(f.waitlistedHeads)],
    ['Arrived (gate check-ins)', String(f.arrivedParties), String(f.arrivedHeads)],
    ['Did not come', String(f.noShowParties), String(f.noShowHeads)],
    ['Turnout %', f.turnoutPct === null ? '' : String(f.turnoutPct)],
  ];
  if (input.dayRows.length > 1) {
    rows.push([], ['Day', 'Expected heads', 'Arrived heads', 'Turnout %']);
    for (const d of input.dayRows) {
      rows.push([
        d.date,
        String(d.expectedHeads),
        String(d.arrivedHeads),
        d.turnoutPct === null ? '' : String(d.turnoutPct),
      ]);
    }
  }
  if (input.tierRows.length > 0) {
    rows.push([], ['Pass type', 'Sold', 'Capacity']);
    for (const t of input.tierRows) {
      rows.push([t.tierName, String(t.soldQty), t.capacity === null ? '' : String(t.capacity)]);
    }
  }
  if (input.discountUses && Object.keys(input.discountUses).length > 0) {
    rows.push([], ['Discount code', 'Times used']);
    for (const [code, n] of Object.entries(input.discountUses)) {
      rows.push([code, String(n)]);
    }
  }
  rows.push(
    [],
    ['Seva pass money (from pass records)', `Amount (${tm.currency})`],
    ['Collected — Seva Wallet', String(tm.collectedWallet)],
    ['Collected — received at venue', String(tm.collectedVenue)],
    ['To collect at venue', String(tm.venuePendingTotal)],
    ['Free passes issued', String(tm.compQty)],
    ['Refunds given (count)', String(tm.refundCount)],
    ['Refunds given (amount)', String(tm.refundTotal)],
    ['Cancelled passes', String(tm.cancelledCount)]
  );
  if (tm.venueRefundDueCount > 0) {
    rows.push(['Cash refunds due at desk', String(tm.venueRefundDueTotal)]);
  }
  if (input.budget) {
    const b = input.budget;
    rows.push(
      [],
      ['Festival budget (from Utsav budget lines)', 'Planned', 'Actual', 'Difference'],
      ['Donations received (kept apart from pass money)', String(b.donations?.planned ?? 0), String(b.donations?.actual ?? 0), String((b.donations?.actual ?? 0) - (b.donations?.planned ?? 0))]
    );
    for (const r of b.rows) {
      rows.push([`${r.head} (${r.kind})`, String(r.planned), String(r.actual), String(r.variance)]);
    }
    rows.push(
      ['Total income', String(b.plannedIncome), String(b.actualIncome), String(b.actualIncome - b.plannedIncome)],
      ['Total expense', String(b.plannedExpense), String(b.actualExpense), String(b.actualExpense - b.plannedExpense)]
    );
  }
  if (input.walkins) {
    rows.push(
      [],
      ['Gate counts (from manual gate records)', 'Heads'],
      ['Counted at the gates', String(input.walkins.manualTotal)],
      ['Of which arrived with an RSVP', String(input.walkins.arrivedHeads)],
      ['Walk-ins (difference)', String(input.walkins.walkinEstimate)]
    );
  }
  return rows;
}
