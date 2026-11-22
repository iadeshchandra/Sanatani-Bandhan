/**
 * festivalForecast.test.ts — NEXT-LEVEL A3: the forecast's pure math.
 * =====================================================================
 * The laws these tests pin:
 *  - no usable history → no forecast, and the blocker names why
 *    (nothing booked ever / bookings but no gate marks / too thin);
 *  - a register with bookings but not one arrival mark is SKIPPED,
 *    never read as a 0% turnout (the E4 null-turnout law) — and it
 *    cannot drag a good register's rates down;
 *  - a segment under the sample threshold never drives the range —
 *    the overall rate stands in for it;
 *  - the range is the spread of the stated lenses: low never
 *    exceeds mid, mid never exceeds high;
 *  - prasad cooks for the middle of the range widened by the
 *    range's own spread, rounded UP to the nearest 10;
 *  - the gate hint follows its named rule (one sevadar per 40
 *    expected parties on the busiest day, never fewer than 2).
 */
import {
  buildForecast,
  leadBucketOf,
  leadDaysFor,
  GATE_MIN_VOLUNTEERS,
  type ForecastHistoryFestival,
  type ForecastPartyInput,
  type ForecastTarget,
} from '../festivalForecast';

const party = (p: Partial<ForecastPartyInput>): ForecastPartyInput => ({
  headcount: 2,
  arrived: true,
  paid: false,
  ...p,
});
const parties = (n: number, p: Partial<ForecastPartyInput>): ForecastPartyInput[] =>
  Array.from({ length: n }, () => party(p));
const hist = (
  festivalId: string,
  startDateISO: string,
  ps: ForecastPartyInput[]
): ForecastHistoryFestival => ({ festivalId, startDateISO, parties: ps });
const target = (ps: ForecastPartyInput[], busiest = 0): ForecastTarget => ({
  startDateISO: '2026-03-20',
  parties: ps,
  busiestDayBookedParties: busiest,
});

describe('blockers — no forecast is ever fabricated', () => {
  it('no history at all → no-history', () => {
    const r = buildForecast([], target(parties(5, {})));
    expect(r.forecast).toBeNull();
    expect(r.blocker).toBe('no-history');
    expect(r.history.festivalsSeen).toBe(0);
  });

  it('registers exist but nothing was ever booked → no-history', () => {
    const r = buildForecast([hist('f1', '2026-01-20', [])], target(parties(5, {})));
    expect(r.forecast).toBeNull();
    expect(r.blocker).toBe('no-history');
  });

  it('bookings but not one arrival mark → no-gate-data (never a 0% turnout)', () => {
    const r = buildForecast(
      [hist('f1', '2026-01-20', parties(20, { arrived: false }))],
      target(parties(5, {}))
    );
    expect(r.forecast).toBeNull();
    expect(r.blocker).toBe('no-gate-data');
    expect(r.history.festivalsSkippedNoGateData).toBe(1);
  });

  it('a skipped register cannot drag a good register down', () => {
    const r = buildForecast(
      [
        hist('silent', '2025-12-20', parties(20, { arrived: false })),
        hist('marked', '2026-01-20', [
          ...parties(10, { arrived: true }),
          ...parties(10, { arrived: false }),
        ]),
      ],
      target(parties(4, {}))
    );
    expect(r.forecast).not.toBeNull();
    expect(r.forecast?.basis.festivalsUsed).toBe(1);
    expect(r.forecast?.basis.festivalsSkippedNoGateData).toBe(1);
    expect(r.forecast?.overall.partyRate).toBeCloseTo(0.5);
  });

  it('usable but tiny history → thin-history', () => {
    const r = buildForecast(
      [hist('f1', '2026-01-20', [...parties(3, { arrived: true }), ...parties(3, { arrived: false })])],
      target(parties(5, {}))
    );
    expect(r.forecast).toBeNull();
    expect(r.blocker).toBe('thin-history');
  });

  it('a real model but no bookings yet → no-bookings, rates still stand', () => {
    const r = buildForecast(
      [hist('f1', '2026-01-20', [...parties(10, { arrived: true }), ...parties(10, { arrived: false })])],
      target([])
    );
    expect(r.blocker).toBe('no-bookings');
    expect(r.forecast).not.toBeNull();
    expect(r.forecast?.overall.partyRate).toBeCloseTo(0.5);
    expect(r.forecast?.expected).toBeNull();
    expect(r.forecast?.prasad).toBeNull();
    expect(r.forecast?.gate).toBeNull();
  });
});

describe('segments — thin segments stand aside, real ones shape the range', () => {
  it('a paid segment under the threshold falls back to the overall rate', () => {
    // 20 free parties (10 arrived) + 4 paid parties (all arrived):
    const history = [
      hist('f1', '2026-01-20', [
        ...parties(10, { arrived: true, headcount: 2, paid: false }),
        ...parties(10, { arrived: false, headcount: 2, paid: false }),
        ...parties(4, { arrived: true, headcount: 2, paid: true }),
      ]),
    ];
    const r = buildForecast(history, target(parties(10, { paid: true, headcount: 2 })));
    expect(r.forecast?.basis.paidSegmentUsed).toBe(false);
    expect(r.forecast?.basis.freeSegmentUsed).toBe(true);
    // Overall: 14 of 24 parties and 28 of 48 heads → every lens agrees.
    expect(r.forecast?.expected?.partiesLow).toBe(6);
    expect(r.forecast?.expected?.partiesHigh).toBe(6);
    expect(r.forecast?.expected?.headsLow).toBe(12);
    expect(r.forecast?.expected?.headsHigh).toBe(12);
  });

  it('lead-time segments move the high end when early bookers reliably come', () => {
    const early = (arrived: boolean): Partial<ForecastPartyInput> => ({
      arrived, headcount: 1, createdAt: '2026-01-01T12:00:00.000Z',
    });
    const late = (arrived: boolean): Partial<ForecastPartyInput> => ({
      arrived, headcount: 1, createdAt: '2026-01-19T12:00:00.000Z',
    });
    const history = [
      hist('f1', '2026-01-20', [
        ...parties(20, early(true)),
        ...parties(4, late(true)),
        ...parties(16, late(false)),
      ]),
    ];
    const t = target(
      parties(20, { headcount: 1, createdAt: '2026-03-01T12:00:00.000Z' })
    );
    t.startDateISO = '2026-03-20';
    const r = buildForecast(history, t);
    // Overall rate 24/40 = 0.6 → 12; the lead lens sees only early
    // bookers in the target, at their own rate 1.0 → 20.
    expect(r.forecast?.expected?.headsLow).toBe(12);
    expect(r.forecast?.expected?.headsHigh).toBe(20);
    expect(r.forecast?.expected?.headsMid).toBe(16);
    expect(r.forecast?.basis.leadSegmentsUsed).toEqual(expect.arrayContaining(['early', 'late']));
    // Prasad: spread (20−12)/16 = 0.5 → buffer 1.25 → 16 × 1.25 = 20.
    expect(r.forecast?.prasad?.spreadRatio).toBeCloseTo(0.5);
    expect(r.forecast?.prasad?.bufferFactor).toBeCloseTo(1.25);
    expect(r.forecast?.prasad?.headsToCookFor).toBe(20);
  });

  it('party and head rates are separate truths', () => {
    const history = [
      hist('f1', '2026-01-20', [
        ...parties(5, { arrived: true, headcount: 1 }),
        ...parties(5, { arrived: false, headcount: 4 }),
      ]),
    ];
    const r = buildForecast(history, target(parties(10, { headcount: 2 })));
    expect(r.forecast?.overall.partyRate).toBeCloseTo(0.5);
    expect(r.forecast?.overall.headRate).toBeCloseTo(0.2);
    expect(r.forecast?.expected?.partiesLow).toBe(5);
    expect(r.forecast?.expected?.headsLow).toBe(4);
  });
});

describe('range + prasad arithmetic', () => {
  it('low ≤ mid ≤ high across scenarios', () => {
    const scenarios: Array<[ForecastHistoryFestival[], ForecastTarget]> = [
      [
        [hist('a', '2026-01-20', [...parties(15, { arrived: true }), ...parties(15, { arrived: false })])],
        target(parties(30, { headcount: 3 })),
      ],
      [
        [hist('a', '2026-01-20', [...parties(12, { arrived: true, paid: true }), ...parties(18, { arrived: false })])],
        target([...parties(6, { paid: true }), ...parties(6, {})]),
      ],
    ];
    for (const [h, t] of scenarios) {
      const e = buildForecast(h, t).forecast?.expected;
      expect(e).not.toBeNull();
      expect(e!.headsLow).toBeLessThanOrEqual(e!.headsMid);
      expect(e!.headsMid).toBeLessThanOrEqual(e!.headsHigh);
      expect(e!.partiesLow).toBeLessThanOrEqual(e!.partiesHigh);
    }
  });

  it('prasad rounds UP to the nearest 10 even with a certain range', () => {
    const history = [hist('f1', '2026-01-20', parties(10, { arrived: true, headcount: 1 }))];
    const r = buildForecast(history, target(parties(7, { headcount: 1 })));
    expect(r.forecast?.expected?.headsMid).toBe(7);
    expect(r.forecast?.prasad?.bufferFactor).toBeCloseTo(1);
    expect(r.forecast?.prasad?.headsToCookFor).toBe(10);
  });
});

describe('gate hint — the named rule', () => {
  const history = [
    hist('f1', '2026-01-20', [
      ...parties(16, { arrived: true, headcount: 1 }),
      ...parties(4, { arrived: false, headcount: 1 }),
    ]),
  ]; // overall party rate 0.8

  it('100 booked on the busiest day → 80 expected → 2 sevadars', () => {
    const r = buildForecast(history, target(parties(10, { headcount: 1 }), 100));
    expect(r.forecast?.gate?.expectedParties).toBe(80);
    expect(r.forecast?.gate?.volunteers).toBe(2);
    expect(r.forecast?.gate?.partiesPerVolunteer).toBe(40);
  });

  it('300 booked on the busiest day → 240 expected → 6 sevadars', () => {
    const r = buildForecast(history, target(parties(10, { headcount: 1 }), 300));
    expect(r.forecast?.gate?.expectedParties).toBe(240);
    expect(r.forecast?.gate?.volunteers).toBe(6);
  });

  it('the minimum is never below the named floor', () => {
    const r = buildForecast(history, target(parties(10, { headcount: 1 }), 10));
    expect(r.forecast?.gate?.volunteers).toBe(GATE_MIN_VOLUNTEERS);
  });

  it('no busiest-day figure → no gate hint', () => {
    const r = buildForecast(history, target(parties(10, { headcount: 1 }), 0));
    expect(r.forecast?.gate).toBeNull();
  });
});

describe('lead time — civil days, bucket edges', () => {
  const start = '2026-01-20';
  it('counts whole civil days from the booking day', () => {
    expect(leadDaysFor('2026-01-01T12:00:00.000Z', start)).toBe(19);
    expect(leadDaysFor('2026-01-13T12:00:00.000Z', start)).toBe(7);
    expect(leadDaysFor('2026-01-20T12:00:00.000Z', start)).toBe(0);
  });
  it('a booking during the festival is 0, never negative', () => {
    expect(leadDaysFor('2026-01-21T12:00:00.000Z', start)).toBe(0);
  });
  it('no usable stamp → null, and no bucket', () => {
    expect(leadDaysFor(undefined, start)).toBeNull();
    expect(leadDaysFor('not a date', start)).toBeNull();
    expect(leadBucketOf(null)).toBeNull();
  });
  it('bucket edges: 7 early · 6 mid · 3 mid · 2 late · 0 late', () => {
    expect(leadBucketOf(7)).toBe('early');
    expect(leadBucketOf(6)).toBe('mid');
    expect(leadBucketOf(3)).toBe('mid');
    expect(leadBucketOf(2)).toBe('late');
    expect(leadBucketOf(0)).toBe('late');
  });
});
