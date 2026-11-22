/**
 * festivalFeedback.test.ts — EVENTS E5: attendee feedback math.
 * =====================================================================
 * The laws these tests pin:
 *  - eligibility is exactly (festival concluded) AND (own RSVP
 *    gate-checked-in) — nobody else is ever asked;
 *  - aggregates rest on VISIBLE feedback only: a hidden record
 *    leaves every figure, organiser's included;
 *  - a rate with nothing behind it is null (response rate with no
 *    checked-in parties; averages with no responses);
 *  - the public summary REFUSES to exist below 5 visible responses
 *    (the privacy threshold), and its key set is pinned — no name,
 *    no text, no per-person figure can ever ride into it;
 *  - the dismissal memory is per festival + per devotee.
 */
/* lib/festivalFeedback reaches localDateOfIso via lib/eventPass,
 * whose token chain (utils/qrUtils) reads services/firebaseClient
 * (import.meta.env, un-loadable under ts-jest/node). The E3/E4 shim
 * pair, verbatim: stub firebaseClient, re-export crypto-js with an
 * explicit default. Neither shim touches any logic under test. */
jest.mock('../../services/firebaseClient', () => ({ auth: { currentUser: null }, db: {} }));
jest.mock('crypto-js', () => {
  const actual = jest.requireActual('crypto-js');
  return { __esModule: true, default: actual, ...actual };
});

import {
  buildFeedbackAggregates,
  buildFeedbackSummary,
  feedbackDefaultDay,
  feedbackDismissedIn,
  feedbackDocId,
  feedbackPromptEligible,
  feedbackRatingOk,
  visibleFeedback,
  withFeedbackDismissed,
  FEEDBACK_PUBLISH_MIN,
  type EventFeedback,
} from '../festivalFeedback';

/* ------------------------------- fixtures ------------------------------- */

let seq = 0;
const fb = (over: Partial<EventFeedback> = {}): EventFeedback => {
  seq += 1;
  return {
    id: `fest1__user-${seq}`,
    workspaceId: 'ws-1',
    festivalId: 'fest1',
    authorUid: `user-${seq}`,
    authorName: `Devotee ${seq}`,
    aspects: { arrangements: 4, prasad: 4, darshanFlow: 4, cleanliness: 4 },
    overall: 4,
    text: 'Grateful.',
    wouldReturn: true,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    state: 'visible',
    ...over,
  };
};

const EV = { dateISO: '2026-01-01', endDateISO: '2026-01-02' };
const AFTER = new Date('2026-01-05T12:00:00').getTime(); // after the last day
const DURING = new Date('2026-01-01T12:00:00').getTime();

/* ------------------------------- eligibility ---------------------------- */

describe('feedbackPromptEligible — only checked-in attendees, only afterwards', () => {
  it('a checked-in attendee is eligible once the festival has concluded', () => {
    expect(feedbackPromptEligible({ checkedIn: true }, EV, AFTER)).toBe(true);
  });
  it('not before the festival ends', () => {
    expect(feedbackPromptEligible({ checkedIn: true }, EV, DURING)).toBe(false);
  });
  it('a booked devotee who never came is never asked', () => {
    expect(feedbackPromptEligible({ checkedIn: false }, EV, AFTER)).toBe(false);
    expect(feedbackPromptEligible({}, EV, AFTER)).toBe(false);
  });
  it('no RSVP, no prompt', () => {
    expect(feedbackPromptEligible(null, EV, AFTER)).toBe(false);
    expect(feedbackPromptEligible(undefined, EV, AFTER)).toBe(false);
  });
});

describe('feedbackDocId + feedbackRatingOk + feedbackDefaultDay', () => {
  it('the doc id is the deterministic pair', () => {
    expect(feedbackDocId('fest1', 'user-9')).toBe('fest1__user-9');
  });
  it('ratings are whole numbers 1–5 only', () => {
    expect(feedbackRatingOk(1)).toBe(true);
    expect(feedbackRatingOk(5)).toBe(true);
    expect(feedbackRatingOk(0)).toBe(false);
    expect(feedbackRatingOk(6)).toBe(false);
    expect(feedbackRatingOk(4.5)).toBe(false);
    expect(feedbackRatingOk('5')).toBe(false);
    expect(feedbackRatingOk(undefined)).toBe(false);
  });
  it('the default day is the civil day of the check-in stamp', () => {
    // Built from local parts, so the civil day is 2026-01-02 in
    // every timezone the suite could run in.
    const stamp = new Date(2026, 0, 2, 10, 30).toISOString();
    expect(feedbackDefaultDay({ checkedInAt: stamp })).toBe('2026-01-02');
    expect(feedbackDefaultDay({})).toBeNull();
    expect(feedbackDefaultDay(null)).toBeNull();
  });
});

/* ------------------------------- moderation ----------------------------- */

describe('visibleFeedback — hidden leaves every aggregate', () => {
  it('keeps visible, drops hidden and anything not plainly visible', () => {
    const list = [fb(), fb({ state: 'hidden' }), fb()];
    expect(visibleFeedback(list)).toHaveLength(2);
    expect(visibleFeedback(list).every((f) => f.state === 'visible')).toBe(true);
  });
});

/* ------------------------------- aggregates ----------------------------- */

describe('buildFeedbackAggregates — averages, rate, would-return', () => {
  it('averages each aspect and the overall, one decimal', () => {
    const list = [
      fb({ aspects: { arrangements: 5, prasad: 3, darshanFlow: 4, cleanliness: 2 }, overall: 5, wouldReturn: true }),
      fb({ aspects: { arrangements: 4, prasad: 3, darshanFlow: 5, cleanliness: 3 }, overall: 4, wouldReturn: false }),
      fb({ aspects: { arrangements: 4, prasad: 4, darshanFlow: 4, cleanliness: 4 }, overall: 4, wouldReturn: true }),
    ];
    const agg = buildFeedbackAggregates(list, 10);
    expect(agg.count).toBe(3);
    expect(agg.aspectAverages).toEqual({
      arrangements: 4.3, // 13/3
      prasad: 3.3, // 10/3
      darshanFlow: 4.3, // 13/3
      cleanliness: 3, // 9/3
    });
    expect(agg.overallAverage).toBe(4.3); // 13/3
    expect(agg.wouldReturnPct).toBe(67); // 2 of 3
    expect(agg.responseRatePct).toBe(30); // 3 of 10 checked-in parties
  });

  it('hidden feedback moves no figure (the caller passes visible only — and the filter is pinned)', () => {
    const all = [fb({ overall: 5 }), fb({ overall: 1, state: 'hidden' })];
    const agg = buildFeedbackAggregates(visibleFeedback(all), 2);
    expect(agg.count).toBe(1);
    expect(agg.overallAverage).toBe(5);
  });

  it('no responses: averages are null, never 0 dressed as data', () => {
    const agg = buildFeedbackAggregates([], 12);
    expect(agg.count).toBe(0);
    expect(agg.aspectAverages).toEqual({
      arrangements: null, prasad: null, darshanFlow: null, cleanliness: null,
    });
    expect(agg.overallAverage).toBeNull();
    expect(agg.wouldReturnPct).toBeNull();
    // The rate DOES have something behind it: 0 of 12 parties.
    expect(agg.responseRatePct).toBe(0);
  });

  it('no checked-in parties: the rate itself is null', () => {
    expect(buildFeedbackAggregates([], 0).responseRatePct).toBeNull();
    expect(buildFeedbackAggregates([fb()], 0).responseRatePct).toBeNull();
  });
});

/* ------------------------------- public summary ------------------------- */

describe('buildFeedbackSummary — the privacy threshold + pinned key set', () => {
  it('refuses below the threshold: 4 visible responses publish nothing', () => {
    const four = [fb(), fb(), fb(), fb()];
    expect(four).toHaveLength(FEEDBACK_PUBLISH_MIN - 1);
    expect(buildFeedbackSummary(four, '2026-01-06T00:00:00.000Z')).toBeNull();
  });

  it('hidden responses do not count toward the threshold', () => {
    const list = [fb(), fb(), fb(), fb(), fb({ state: 'hidden' }), fb({ state: 'hidden' })];
    expect(buildFeedbackSummary(visibleFeedback(list), '2026-01-06T00:00:00.000Z')).toBeNull();
  });

  it('at the threshold it publishes — aggregates only, exact key set', () => {
    const five = [
      fb({ aspects: { arrangements: 5, prasad: 5, darshanFlow: 5, cleanliness: 5 }, overall: 5, wouldReturn: true }),
      fb({ overall: 4, wouldReturn: true }),
      fb({ overall: 4, wouldReturn: true }),
      fb({ overall: 3, wouldReturn: false }),
      fb({ overall: 4, wouldReturn: true }),
    ];
    const s = buildFeedbackSummary(five, '2026-01-06T00:00:00.000Z');
    expect(s).not.toBeNull();
    expect(Object.keys(s as object).sort()).toEqual([
      'arrangements', 'cleanliness', 'count', 'darshanFlow',
      'overall', 'prasad', 'publishedAt', 'wouldReturnPct',
    ]);
    expect(s?.count).toBe(5);
    expect(s?.overall).toBe(4); // 20/5
    expect(s?.wouldReturnPct).toBe(80); // 4 of 5
    expect(s?.publishedAt).toBe('2026-01-06T00:00:00.000Z');
    // No name, no text, no uid can exist in this shape — by key set.
    const flat = JSON.stringify(s);
    expect(flat).not.toContain('Devotee');
    expect(flat).not.toContain('Grateful');
    expect(flat).not.toContain('user-');
  });
});

/* ------------------------------- dismissal memory ----------------------- */

describe('the dismissal memory — asked once, per festival + devotee', () => {
  it('remembers a dismissal and nothing else', () => {
    const data = withFeedbackDismissed({}, 'fest1', 'user-1');
    expect(feedbackDismissedIn(data, 'fest1', 'user-1')).toBe(true);
    expect(feedbackDismissedIn(data, 'fest1', 'user-2')).toBe(false);
    expect(feedbackDismissedIn(data, 'fest2', 'user-1')).toBe(false);
    expect(feedbackDismissedIn({}, 'fest1', 'user-1')).toBe(false);
  });
  it('does not mutate the previous memory', () => {
    const before = {};
    withFeedbackDismissed(before, 'fest1', 'user-1');
    expect(before).toEqual({});
  });
});
