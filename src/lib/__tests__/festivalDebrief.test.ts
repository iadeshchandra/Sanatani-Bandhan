/**
 * festivalDebrief.test.ts — EVENTS E4: the debrief pack's pure math.
 * =====================================================================
 * Every figure in the debrief comes from a record family, and these
 * tests pin the laws that keep the view honest:
 *  - the funnel counts the RSVP register AS IT STANDS (absent status
 *    = confirmed; waitlisted never counts as expected or arrived);
 *  - a rate with nothing behind it is null, never 0% dressed as data;
 *  - arrivals land on the civil day of their own check-in stamp —
 *    a stamp outside the festival span fills no day row;
 *  - pass money is built from tickets ONLY and budget money from
 *    budget lines ONLY: donations are lifted out of the budget as
 *    their own line, and no ticket figure can contain a donation,
 *    by construction (the builders never see each other's inputs);
 *  - walk-ins exist only when manual gate counts exceed the
 *    RSVP-linked arrivals;
 *  - the public summary carries aggregates and nothing else — its
 *    key set is pinned so a name can never slip in.
 */
/* The day-attribution helper (localDateOfIso) is imported from
 * lib/eventPass — the E3 gate's own definition — whose token chain
 * (utils/qrUtils) reads services/firebaseClient (import.meta.env,
 * un-loadable under ts-jest/node). The E3 test file's two shims,
 * verbatim: stub firebaseClient, re-export crypto-js with an
 * explicit default. Neither shim touches any logic under test. */
jest.mock('../../services/firebaseClient', () => ({ auth: { currentUser: null }, db: {} }));
jest.mock('crypto-js', () => {
  const actual = jest.requireActual('crypto-js');
  return { __esModule: true, default: actual, ...actual };
});

import {
  buildBudget,
  buildDayRows,
  buildDebriefCsvRows,
  buildFunnel,
  buildOps,
  buildPublicSummary,
  buildTicketMoney,
  buildTierRows,
  buildWalkins,
  matchLocalFestival,
} from '../festivalDebrief';
import type { RsvpEntry, TicketTier, WarRoomPlan } from '../festival';
import type { EventTicket } from '../eventTickets';
import type { BudgetLine, Festival } from '../../utsav/types';

/* ------------------------------- fixtures ------------------------------- */

let rsvpSeq = 0;
const rsvp = (p: Partial<RsvpEntry>): RsvpEntry => {
  rsvpSeq += 1;
  return {
    id: `r${rsvpSeq}`,
    eventId: 'ws__durga_puja_2026-10-16',
    workspaceId: 'ws',
    uid: `u${rsvpSeq}`,
    name: `Party ${rsvpSeq}`,
    headcount: 2,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...p,
  };
};

/** An ISO stamp whose LOCAL civil date is the given yyyy-mm-dd. */
const localStamp = (dateISO: string, hour = 10): string => {
  const [y, m, d] = dateISO.split('-').map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d, hour, 15, 0).toISOString();
};

let ticketSeq = 0;
const ticket = (p: Partial<EventTicket>): EventTicket => {
  ticketSeq += 1;
  return {
    id: `t${ticketSeq}`,
    workspaceId: 'ws',
    festivalId: 'ws__durga_puja_2026-10-16',
    tierId: 'tier_a',
    tierName: 'Cultural evening pass',
    buyerUid: `b${ticketSeq}`,
    buyerName: `Buyer ${ticketSeq}`,
    attendees: [{ name: 'A' }],
    qty: 2,
    amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 },
    currency: 'INR',
    paymentState: 'paid-wallet',
    createdAt: '2026-10-02T10:00:00.000Z',
    ...p,
  };
};

const tiers: TicketTier[] = [
  { id: 'tier_a', name: { en: 'Cultural evening pass', bn: '', hi: '' }, kind: 'paid', price: 500, capacity: 100 },
  { id: 'tier_b', name: { en: 'Prasad box', bn: '', hi: '' }, kind: 'addon', price: 200 },
];

const budgetLine = (p: Partial<BudgetLine>): BudgetLine => ({
  id: `b${Math.random().toString(36).slice(2, 8)}`,
  festivalId: 'fv1',
  kind: 'income',
  head: 'Donations',
  planned: 0,
  actual: 0,
  ...p,
});

const localFest = (p: Partial<Festival>): Festival => ({
  id: 'fv1',
  name: 'Sharadiya Durga Puja 2026',
  deity: 'Maa Durga',
  occasion: 'Sharadiya Navratri',
  startDate: '2026-10-16',
  endDate: '2026-10-20',
  venue: 'Samiti Maidan',
  expectedFootfall: 5000,
  status: 'completed',
  ...p,
});

/* ------------------------------- funnel ------------------------------- */

describe('buildFunnel — the register as it stands', () => {
  it('counts confirmed / waitlisted / arrived in parties and heads', () => {
    const f = buildFunnel([
      rsvp({ headcount: 4, checkedIn: true, checkedInAt: localStamp('2026-10-16') }),
      rsvp({ headcount: 3 }), // absent status = confirmed, not arrived
      rsvp({ headcount: 2, status: 'confirmed', checkedIn: true, checkedInAt: localStamp('2026-10-17') }),
      rsvp({ headcount: 5, status: 'waitlisted' }),
      rsvp({ headcount: 1, status: 'waitlisted', checkedIn: true }), // waitlisted never "arrived"
    ]);
    expect(f.confirmedParties).toBe(3);
    expect(f.confirmedHeads).toBe(9);
    expect(f.waitlistedParties).toBe(2);
    expect(f.waitlistedHeads).toBe(6);
    expect(f.arrivedParties).toBe(2);
    expect(f.arrivedHeads).toBe(6);
    expect(f.noShowParties).toBe(1);
    expect(f.noShowHeads).toBe(3);
    expect(f.turnoutPct).toBe(67); // 6/9, rounded
  });

  it('turnout is null — never 0% — when nobody is confirmed', () => {
    expect(buildFunnel([]).turnoutPct).toBeNull();
    expect(buildFunnel([rsvp({ status: 'waitlisted' })]).turnoutPct).toBeNull();
    const empty = buildFunnel([]);
    expect(empty.confirmedHeads).toBe(0);
    expect(empty.arrivedHeads).toBe(0);
  });

  it('a confirmed crowd that never arrived is a true 0%', () => {
    const f = buildFunnel([rsvp({ headcount: 10 })]);
    expect(f.turnoutPct).toBe(0);
    expect(f.noShowHeads).toBe(10);
  });
});

/* ------------------------------- day rows ------------------------------- */

describe('buildDayRows — expected by day choice, arrived by check-in day', () => {
  const D = ['2026-10-16', '2026-10-17', '2026-10-18'];

  it('buckets a multi-day festival: subset days, all-days records, per-day turnout', () => {
    const rows = buildDayRows(
      [
        rsvp({ headcount: 4, days: [D[0]], checkedIn: true, checkedInAt: localStamp(D[0]) }),
        rsvp({ headcount: 2, days: [D[1], D[2]] }), // expected days 2+3, never arrived
        rsvp({ headcount: 3, checkedIn: true, checkedInAt: localStamp(D[1]) }), // no days = every day expected
        rsvp({ headcount: 9, status: 'waitlisted', days: [D[0]] }), // never expected
      ],
      D[0],
      D[2]
    );
    expect(rows.map((r) => r.date)).toEqual(D);
    // Day 1: expected 4 (subset) + 3 (all-days) = 7; arrived 4.
    expect(rows[0]).toMatchObject({ expectedHeads: 7, expectedParties: 2, arrivedHeads: 4, arrivedParties: 1, turnoutPct: 57 });
    // Day 2: expected 2 + 3 = 5; arrived 3.
    expect(rows[1]).toMatchObject({ expectedHeads: 5, arrivedHeads: 3, turnoutPct: 60 });
    // Day 3: expected 2 + 3 = 5; arrived 0 → a true 0%.
    expect(rows[2]).toMatchObject({ expectedHeads: 5, arrivedHeads: 0, turnoutPct: 0 });
  });

  it('a check-in stamped outside the span fills no day row but stays in the funnel', () => {
    const set = [rsvp({ headcount: 6, checkedIn: true, checkedInAt: localStamp('2026-10-25') })];
    const rows = buildDayRows(set, D[0], D[2]);
    expect(rows.every((r) => r.arrivedHeads === 0)).toBe(true);
    expect(buildFunnel(set).arrivedHeads).toBe(6);
  });

  it('a day nobody was expected has a null turnout, and a missing stamp attributes nowhere', () => {
    const rows = buildDayRows(
      [rsvp({ headcount: 2, days: [D[0]], checkedIn: true })], // checkedIn, no checkedInAt
      D[0],
      D[2]
    );
    expect(rows[1].turnoutPct).toBeNull();
    expect(rows.every((r) => r.arrivedHeads === 0)).toBe(true);
  });

  it('a single-day festival returns exactly one row', () => {
    const rows = buildDayRows([rsvp({ headcount: 2 })], D[0], D[0]);
    expect(rows).toHaveLength(1);
    expect(rows[0].expectedHeads).toBe(2);
  });
});

/* ------------------------------- tier rows ------------------------------- */

describe('buildTierRows — sold vs capacity from the anchored counters', () => {
  it('reads sold from tierSold and capacity from tierCaps, clamped', () => {
    const rows = buildTierRows(tiers, { tier_a: 40 }, { tier_a: 100 });
    expect(rows[0]).toMatchObject({ tierId: 'tier_a', soldQty: 40, capacity: 100, remaining: 60 });
    // tier_b carries no capacity anywhere → unmetered.
    expect(rows[1]).toMatchObject({ tierId: 'tier_b', soldQty: 0, capacity: null, remaining: null });
  });

  it('falls back to the tier’s own capacity and never reports negative remaining', () => {
    const rows = buildTierRows(tiers, { tier_a: 140 }, undefined);
    expect(rows[0].capacity).toBe(100);
    expect(rows[0].remaining).toBe(0);
  });

  it('no tiers → no rows', () => {
    expect(buildTierRows(undefined, undefined, undefined)).toEqual([]);
  });
});

/* ------------------------------- ticket money ------------------------------- */

describe('buildTicketMoney — pass records only, states kept apart', () => {
  it('splits collected / venue-pending / comp / refunds / cancellations', () => {
    const tm = buildTicketMoney(
      [
        ticket({ paymentState: 'paid-wallet', amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 } }),
        ticket({ paymentState: 'pay-at-venue', venueReceived: true, amounts: { price: 500, discount: 0, fee: 25, gst: 0, total: 500 } }),
        ticket({ paymentState: 'pay-at-venue', amounts: { price: 300, discount: 0, fee: 15, gst: 0, total: 300 } }),
        ticket({ paymentState: 'comp', qty: 4, amounts: { price: 0, discount: 0, fee: 0, gst: 0, total: 0 } }),
        ticket({ paymentState: 'refunded', refundAmount: 500, amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 } }),
        ticket({ paymentState: 'cancelled' }),
        ticket({ paymentState: 'cancelled', venueReceived: true, amounts: { price: 700, discount: 0, fee: 0, gst: 0, total: 700 } }),
      ],
      tiers
    );
    expect(tm.collectedWallet).toBe(1000);
    expect(tm.collectedVenue).toBe(500);
    expect(tm.collectedTotal).toBe(1500);
    expect(tm.venuePendingTotal).toBe(300);
    expect(tm.venuePendingCount).toBe(1);
    expect(tm.compCount).toBe(1);
    expect(tm.compQty).toBe(4);
    expect(tm.refundCount).toBe(1);
    expect(tm.refundTotal).toBe(500); // the ladder amount, not the full total
    expect(tm.cancelledCount).toBe(2);
    expect(tm.venueRefundDueTotal).toBe(700); // received cash still owed back
    expect(tm.venueRefundDueCount).toBe(1);
    expect(tm.liveCount).toBe(4);
    expect(tm.currency).toBe('INR');
  });

  it('a refunded record without a stamped amount falls back to its own total', () => {
    const tm = buildTicketMoney([
      ticket({ paymentState: 'refunded', amounts: { price: 800, discount: 0, fee: 0, gst: 0, total: 800 } }),
    ]);
    expect(tm.refundTotal).toBe(800);
  });

  it('by-tier rows carry live quantities only — refunded/cancelled hold none', () => {
    const tm = buildTicketMoney(
      [
        ticket({ tierId: 'tier_a', qty: 3, paymentState: 'paid-wallet' }),
        ticket({ tierId: 'tier_a', qty: 2, paymentState: 'refunded', refundAmount: 100 }),
        ticket({ tierId: 'tier_b', tierName: 'Prasad box', qty: 5, paymentState: 'pay-at-venue', amounts: { price: 1000, discount: 0, fee: 0, gst: 0, total: 1000 } }),
      ],
      tiers
    );
    const a = tm.byTier.find((r) => r.tierId === 'tier_a');
    const b = tm.byTier.find((r) => r.tierId === 'tier_b');
    expect(a).toMatchObject({ liveQty: 3, collected: 1000, venuePending: 0 });
    expect(b).toMatchObject({ liveQty: 5, collected: 0, venuePending: 1000 });
  });

  it('no tickets → an all-zero, INR-default view (the surface shows an empty state)', () => {
    const tm = buildTicketMoney([]);
    expect(tm.collectedTotal).toBe(0);
    expect(tm.liveCount).toBe(0);
    expect(tm.byTier).toEqual([]);
  });
});

/* ------------------------------- budget ------------------------------- */

describe('buildBudget — donations apart, by construction', () => {
  it('lifts Donations out of the rows while totals still reconcile', () => {
    const b = buildBudget([
      budgetLine({ head: 'Donations', planned: 150000, actual: 142000 }),
      budgetLine({ head: 'Donations', planned: 0, actual: 8000 }), // a second donations line aggregates
      budgetLine({ head: 'Sponsorships', planned: 200000, actual: 180000 }),
      budgetLine({ head: 'Cultural tickets', planned: 50000, actual: 45000 }),
      budgetLine({ kind: 'expense', head: 'Pandal & decoration', planned: 120000, actual: 118500 }),
      budgetLine({ kind: 'expense', head: 'Pandal & decoration', planned: 0, actual: 1500 }),
    ]);
    expect(b.donations).toEqual({ planned: 150000, actual: 150000 });
    expect(b.rows.find((r) => r.head === 'Donations')).toBeUndefined();
    expect(b.rows.find((r) => r.head === 'Sponsorships')).toMatchObject({ planned: 200000, actual: 180000, variance: -20000 });
    expect(b.rows.find((r) => r.head === 'Pandal & decoration')).toMatchObject({ planned: 120000, actual: 120000, variance: 0 });
    // Totals INCLUDE donations (they reconcile with the Reports tab)…
    expect(b.actualIncome).toBe(150000 + 180000 + 45000);
    expect(b.actualExpense).toBe(120000);
    // …and pass money exists nowhere in this builder's world: the
    // ticket builder above never saw a budget line, this one never
    // saw a ticket. Separation is structural, not a filter.
  });

  it('no donations head → donations stays null, never a dressed-up zero line', () => {
    const b = buildBudget([budgetLine({ head: 'Sponsorships', planned: 10, actual: 10 })]);
    expect(b.donations).toBeNull();
  });

  it('empty lines → zero totals and no rows', () => {
    const b = buildBudget([]);
    expect(b.rows).toEqual([]);
    expect(b.donations).toBeNull();
    expect(b.actualIncome).toBe(0);
  });
});

/* ------------------------------- local link ------------------------------- */

describe('matchLocalFestival — date overlap only, never a name guess', () => {
  it('links the single overlapping record', () => {
    const other = localFest({ id: 'fvX', startDate: '2026-12-24', endDate: '2026-12-25' });
    expect(matchLocalFestival('2026-10-16', '2026-10-20', [other, localFest({})])?.id).toBe('fv1');
  });

  it('no overlap → null', () => {
    expect(matchLocalFestival('2026-10-16', '2026-10-20', [localFest({ startDate: '2027-01-01', endDate: '2027-01-02' })])).toBeNull();
    expect(matchLocalFestival('2026-10-16', '2026-10-20', [])).toBeNull();
  });

  it('several overlaps resolve only by a unique shared start date', () => {
    const a = localFest({ id: 'a', startDate: '2026-10-15', endDate: '2026-10-21' });
    const b = localFest({ id: 'b', startDate: '2026-10-16', endDate: '2026-10-18' });
    expect(matchLocalFestival('2026-10-16', '2026-10-20', [a, b])?.id).toBe('b');
    const c = localFest({ id: 'c', startDate: '2026-10-16', endDate: '2026-10-19' });
    expect(matchLocalFestival('2026-10-16', '2026-10-20', [b, c])).toBeNull(); // two share the start → ambiguous
  });
});

/* ------------------------------- ops + walk-ins ------------------------------- */

describe('buildOps — planner vs the crowd that came', () => {
  const plan = (p: Partial<WarRoomPlan>): WarRoomPlan => ({
    id: 'ws__f', workspaceId: 'ws', festivalKey: 'f',
    festivalName: { en: 'F', bn: 'F', hi: 'F' },
    dateISO: '2026-10-16', endDateISO: '2026-10-18',
    footfall: { lastYear: 4000, growthPct: 10 },
    prasad: [{ id: 'pr1', name: { en: 'Laddu', bn: 'লাড্ডু', hi: 'लड्डू' }, perPersonQty: 2, unit: 'pc' }],
    roster: [], rosterNeeded: {}, checklist: {}, notes: '',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...p,
  });

  it('prasad is computed for the projection AND for the actual arrivals', () => {
    const ops = buildOps(plan({}), null, 900, null);
    expect(ops.projectionSet).toBe(true);
    expect(ops.projectedBase).toBe(4400); // 4000 × 1.1, rounded to 50
    expect(ops.prasadForProjection[0].total).toBe(8800);
    expect(ops.prasadForActual[0].total).toBe(1800); // 2 pc × 900 who came
    expect(ops.lastYearFootfall).toBe(4000);
  });

  it('no template → checklist null; unlinked safety → null; roster gaps counted', () => {
    const ops = buildOps(plan({ footfall: { lastYear: 0, growthPct: 10 } }), null, 0, null);
    expect(ops.checklistPct).toBeNull();
    expect(ops.safety).toBeNull();
    expect(ops.projectionSet).toBe(false);
    expect(ops.rosterMissing).toBeGreaterThan(0); // default roles × shifts, nobody assigned
    expect(ops.rosterFillPct).toBe(0);
  });

  it('safety comes from the linked record’s items', () => {
    const ops = buildOps(plan({}), null, 0, [
      { id: 's1', festivalId: 'fv1', item: 'Barricades', category: 'Crowd control', done: true },
      { id: 's2', festivalId: 'fv1', item: 'First aid', category: 'Medical', done: false },
    ]);
    expect(ops.safety).toEqual({ done: 1, total: 2, pct: 50 });
  });
});

describe('buildWalkins — only a supported difference', () => {
  it('manual counts above arrivals → the difference', () => {
    const w = buildWalkins(
      [
        { id: 'c1', festivalId: 'fv1', date: '2026-10-16', gate: 'East', count: 800, recordedAt: '2026-10-16T20:00:00.000Z' },
        { id: 'c2', festivalId: 'fv1', date: '2026-10-17', gate: 'East', count: 500, recordedAt: '2026-10-17T20:00:00.000Z' },
      ],
      1000
    );
    expect(w).toEqual({ manualTotal: 1300, arrivedHeads: 1000, walkinEstimate: 300 });
  });

  it('counts at or below arrivals, or none recorded → no walk-in figure', () => {
    const one = [{ id: 'c1', festivalId: 'fv1', date: '2026-10-16', gate: 'East', count: 900, recordedAt: '2026-10-16T20:00:00.000Z' }];
    expect(buildWalkins(one, 1000)).toBeNull();
    expect(buildWalkins([], 0)).toBeNull();
    expect(buildWalkins(null, 0)).toBeNull();
  });
});

/* ------------------------------- public summary ------------------------------- */

describe('buildPublicSummary — aggregates only, by shape', () => {
  it('carries exactly the aggregate key set — no name can slip in', () => {
    const s = buildPublicSummary({
      funnel: buildFunnel([rsvp({ headcount: 4, checkedIn: true, checkedInAt: localStamp('2026-10-16') })]),
      ticketMoney: buildTicketMoney([ticket({})]),
      budget: buildBudget([budgetLine({ head: 'Donations', planned: 100, actual: 90 }), budgetLine({ kind: 'expense', head: 'Medical', planned: 10, actual: 12 })]),
      dateISO: '2026-10-16',
      endDateISO: '2026-10-18',
      nowIso: '2026-10-25T00:00:00.000Z',
    });
    expect(Object.keys(s).sort()).toEqual([
      'arrivedHeads', 'currency', 'days', 'donationsReceived', 'expectedHeads',
      'families', 'passCollected', 'publishedAt', 'totalUtilised',
    ]);
    expect(s).toMatchObject({
      days: 3, expectedHeads: 4, arrivedHeads: 4, families: 1,
      passCollected: 1000, donationsReceived: 90, totalUtilised: 12, currency: 'INR',
    });
    expect(JSON.stringify(s)).not.toContain('Party');
    expect(JSON.stringify(s)).not.toContain('Buyer');
  });

  it('unlinked budget → money-from-budget fields are null, not zero', () => {
    const s = buildPublicSummary({
      funnel: buildFunnel([]),
      ticketMoney: buildTicketMoney([]),
      budget: null,
      dateISO: '2026-10-16',
      endDateISO: '2026-10-16',
      nowIso: '2026-10-25T00:00:00.000Z',
    });
    expect(s.donationsReceived).toBeNull();
    expect(s.totalUtilised).toBeNull();
    expect(s.days).toBe(1);
  });
});

/* ------------------------------- CSV ------------------------------- */

describe('buildDebriefCsvRows — the committee export keeps money apart', () => {
  it('emits funnel, pass money and budget sections with donations labelled apart', () => {
    const rows = buildDebriefCsvRows({
      festivalName: 'Sharadiya Durga Puja 2026',
      dateISO: '2026-10-16',
      endDateISO: '2026-10-16',
      funnel: buildFunnel([rsvp({ headcount: 2 })]),
      dayRows: buildDayRows([rsvp({ headcount: 2 })], '2026-10-16', '2026-10-16'),
      tierRows: buildTierRows(tiers, { tier_a: 3 }, undefined),
      ticketMoney: buildTicketMoney([ticket({})]),
      budget: buildBudget([budgetLine({ head: 'Donations', planned: 5, actual: 7 })]),
      discountUses: { DIWALI10: 2 },
      walkins: null,
    });
    const flat = rows.map((r) => r.join('|'));
    expect(flat[0]).toBe('Festival debrief|Sharadiya Durga Puja 2026');
    expect(flat.some((r) => r.startsWith('Confirmed|1|2'))).toBe(true);
    expect(flat.some((r) => r.startsWith('Collected — Seva Wallet|1000'))).toBe(true);
    expect(flat.some((r) => r.startsWith('Donations received (kept apart from pass money)|5|7|2'))).toBe(true);
    expect(flat.some((r) => r.startsWith('DIWALI10|2'))).toBe(true);
    // Single-day festival → no day table.
    expect(flat.some((r) => r.startsWith('Day|Expected heads'))).toBe(false);
  });
});
