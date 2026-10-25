/**
 * eventRecurrence.test.ts — EVENTS P1: one definition → everywhere.
 * =====================================================================
 * The law under test: occurrences are DERIVED from the definition,
 * deterministically — the same rule expanded twice (or from two
 * surfaces' call sites) yields identical occurrences, the caps hold,
 * and the .ics RRULE describes the same rhythm the surfaces show.
 * API: expandOccurrences(startDate, rule, fromISO, toISO, time?).
 */
import {
  expandOccurrences,
  nextOccurrence,
  recurrenceRRule,
  isValidRecurrence,
  type RecurrenceRule,
} from '../eventRecurrence';

const dates = (list: { date: string }[]) => list.map((o) => o.date);

describe('expandOccurrences — determinism', () => {
  it('expands a weekly rule identically on repeated calls', () => {
    const rule: RecurrenceRule = { freq: 'weekly' };
    const a = expandOccurrences('2026-10-04', rule, '2026-10-25', '2026-11-23');
    const b = expandOccurrences('2026-10-04', rule, '2026-10-25', '2026-11-23');
    expect(a).toEqual(b);
    expect(dates(a)).toEqual(['2026-10-25', '2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22']);
    // Index counts from the series start, not from the window edge.
    expect(a.map((o) => o.index)).toEqual([3, 4, 5, 6, 7]);
  });

  it('a weekly satsang keeps its weekday (Sunday → Sundays)', () => {
    const occ = expandOccurrences('2026-10-04', { freq: 'weekly' }, '2026-10-25', '2026-11-07');
    expect(occ.length).toBeGreaterThan(0);
    occ.forEach((o) => {
      expect(new Date(`${o.date}T12:00:00`).getDay()).toBe(0);
    });
  });

  it('explicit weekdays override the anchor weekday', () => {
    const occ = expandOccurrences('2026-10-25', { freq: 'weekly', weekdays: [2, 5] }, '2026-10-25', '2026-11-01');
    expect(dates(occ)).toEqual(['2026-10-27', '2026-10-30']);
  });

  it('monthly keeps the day of month; an Ekadashi-style day 11 works', () => {
    const occ = expandOccurrences('2026-10-11', { freq: 'monthly', monthDay: 11 }, '2026-10-25', '2027-01-03');
    expect(dates(occ)).toEqual(['2026-11-11', '2026-12-11']);
  });

  it('a monthly day-31 series clamps to month-end in short months (never vanishes)', () => {
    const occ = expandOccurrences('2026-01-31', { freq: 'monthly' }, '2026-01-01', '2026-06-09');
    expect(dates(occ)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });

  it('yearly repeats on the same month-day (annual festival)', () => {
    const occ = expandOccurrences('2025-10-20', { freq: 'yearly' }, '2026-01-01', '2027-02-04');
    expect(dates(occ)).toEqual(['2026-10-20']);
  });

  it('interval, count and until caps all bind', () => {
    // COUNT is the series total (RFC semantics): the two October
    // sittings consume half of a 4-count biweekly series.
    expect(
      dates(expandOccurrences('2026-10-04', { freq: 'weekly', interval: 2, count: 4 }, '2026-10-25', '2027-01-23'))
    ).toEqual(['2026-11-01', '2026-11-15']);
    expect(
      dates(expandOccurrences('2026-10-04', { freq: 'weekly', until: '2026-11-08' }, '2026-10-25', '2027-01-23'))
    ).toEqual(['2026-10-25', '2026-11-01', '2026-11-08']);
  });

  it('invalid rules expand to nothing (never a fake series)', () => {
    expect(
      expandOccurrences('2026-10-04', { freq: 'weekly', weekdays: [9] }, '2026-10-25', '2026-11-23')
    ).toEqual([]);
    expect(isValidRecurrence({ freq: 'weekly', interval: 0 })).toBe(false);
    expect(isValidRecurrence({ freq: 'monthly', monthDay: 32 })).toBe(false);
    expect(isValidRecurrence({ freq: 'weekly' })).toBe(true);
  });
});

describe('nextOccurrence', () => {
  it('is the head of the same expansion every surface computes', () => {
    const rule: RecurrenceRule = { freq: 'weekly' };
    const all = expandOccurrences('2026-10-04', rule, '2026-10-25', '2026-11-23');
    expect(nextOccurrence('2026-10-04', rule, '2026-10-25')?.date).toBe(all[0].date);
  });
  it('a rule-less event is its own only occurrence — upcoming or nothing', () => {
    expect(nextOccurrence('2026-10-26', undefined, '2026-10-25')?.date).toBe('2026-10-26');
    expect(nextOccurrence('2026-10-20', undefined, '2026-10-25')).toBeNull();
  });
  it('returns null when the series has ended', () => {
    expect(nextOccurrence('2026-10-04', { freq: 'weekly', until: '2026-10-10' }, '2026-10-25')).toBeNull();
  });
});

describe('recurrenceRRule', () => {
  it('mirrors the expansion semantics (start date anchors the defaults)', () => {
    expect(recurrenceRRule('2026-10-25', { freq: 'weekly' })).toBe('RRULE:FREQ=WEEKLY;BYDAY=SU');
    expect(recurrenceRRule('2026-10-25', { freq: 'weekly', interval: 2, weekdays: [0, 3] })).toBe(
      'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SU,WE'
    );
    expect(recurrenceRRule('2026-10-11', { freq: 'monthly', monthDay: 11, count: 6 })).toBe(
      'RRULE:FREQ=MONTHLY;BYMONTHDAY=11;COUNT=6'
    );
    expect(recurrenceRRule('2025-10-20', { freq: 'yearly', until: '2028-10-20' })).toBe(
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=20;UNTIL=20281020'
    );
  });
});
