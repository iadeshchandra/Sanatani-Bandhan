/**
 * eventRecurrenceTithi.test.ts — EVENTS E1: the lunar rhythm.
 * =====================================================================
 * A tithi series falls on every civil date whose ABSOLUTE tithi
 * (1–30, canonical panchang, Varanasi/IST, sunrise-anchored) is in
 * the rule's tithiDays. The hard-coded dates below were derived by
 * scanning the canonical engine itself (utils/panchang) over
 * Jan–Mar 2026 and are pinned here as ground truth:
 *   Shukla Ekadashi (11)  → 2026-01-29, 2026-02-27, 2026-03-29
 *   Krishna Ekadashi (26) → 2026-01-14, 2026-02-13, 2026-03-15
 *   Purnima (15)          → 2026-01-03, 2026-02-01, 2026-03-03
 *   Amavasya (30)         → 2026-01-18, 2026-02-17, 2026-03-19
 *   Trayodashi (13)       → 2026-01-01, 2026-01-31 (Jan, Shukla)
 *   Krishna Trayodashi(28)→ 2026-01-16 (Jan)
 *   Sankashti (19)        → 2026-01-07 (Jan)
 * API: expandOccurrences(startDate, rule, fromISO, toISO, time?).
 */
import {
  expandOccurrences,
  nextOccurrence,
  recurrenceRRule,
  isValidRecurrence,
  absoluteTithiOfDate,
  absoluteTithiName,
  describeTithiDays,
  tithiPresetFor,
  TITHI_PRESETS,
  type RecurrenceRule,
} from '../eventRecurrence';
import { buildIcsEvent } from '../icsExport';

const dates = (list: { date: string }[]) => list.map((o) => o.date);

const EKADASHI: RecurrenceRule = { freq: 'tithi', tithiDays: [11, 26] };

describe('absoluteTithiOfDate — the canonical derivation', () => {
  it('maps paksha + within-paksha number onto 1–30', () => {
    expect(absoluteTithiOfDate(2026, 1, 14)).toBe(26); // Krishna Ekadashi
    expect(absoluteTithiOfDate(2026, 1, 29)).toBe(11); // Shukla Ekadashi
    expect(absoluteTithiOfDate(2026, 1, 3)).toBe(15); // Purnima
    expect(absoluteTithiOfDate(2026, 1, 18)).toBe(30); // Amavasya
  });
});

describe('expandOccurrences — tithi', () => {
  it('lands both Ekadashis of January 2026 (one per paksha)', () => {
    const occ = expandOccurrences('2026-01-01', EKADASHI, '2026-01-01', '2026-01-31');
    expect(dates(occ)).toEqual(['2026-01-14', '2026-01-29']);
    expect(occ.map((o) => o.index)).toEqual([0, 1]);
  });

  it('counts the series index from the anchor, not the window edge', () => {
    const occ = expandOccurrences('2026-01-01', EKADASHI, '2026-02-01', '2026-02-28');
    expect(dates(occ)).toEqual(['2026-02-13', '2026-02-27']);
    expect(occ.map((o) => o.index)).toEqual([2, 3]);
  });

  it('expands Purnima and Amavasya across a quarter', () => {
    expect(dates(expandOccurrences('2026-01-01', { freq: 'tithi', tithiDays: [15] }, '2026-01-01', '2026-03-31')))
      .toEqual(['2026-01-03', '2026-02-01', '2026-03-03']);
    expect(dates(expandOccurrences('2026-01-01', { freq: 'tithi', tithiDays: [30] }, '2026-01-01', '2026-03-31')))
      .toEqual(['2026-01-18', '2026-02-17', '2026-03-19']);
  });

  it('expands Pradosh (both Trayodashis) and Sankashti', () => {
    expect(dates(expandOccurrences('2026-01-01', { freq: 'tithi', tithiDays: [13, 28] }, '2026-01-01', '2026-01-31')))
      .toEqual(['2026-01-01', '2026-01-16', '2026-01-31']);
    expect(dates(expandOccurrences('2026-01-01', { freq: 'tithi', tithiDays: [19] }, '2026-01-01', '2026-01-31')))
      .toEqual(['2026-01-07']);
  });

  it('is deterministic — two expansions agree exactly', () => {
    const a = expandOccurrences('2026-01-01', EKADASHI, '2026-01-01', '2026-03-31', '05:30');
    const b = expandOccurrences('2026-01-01', EKADASHI, '2026-01-01', '2026-03-31', '05:30');
    expect(a).toEqual(b);
    expect(a.length).toBe(6);
  });

  it('honours count and until caps', () => {
    const counted = expandOccurrences('2026-01-01', { ...EKADASHI, count: 3 }, '2026-01-01', '2026-12-31');
    expect(dates(counted)).toEqual(['2026-01-14', '2026-01-29', '2026-02-13']);
    const untiled = expandOccurrences('2026-01-01', { ...EKADASHI, until: '2026-01-20' }, '2026-01-01', '2026-12-31');
    expect(dates(untiled)).toEqual(['2026-01-14']);
  });

  it('ignores the Gregorian interval (the lunar rhythm sets the spacing)', () => {
    const withInterval = expandOccurrences('2026-01-01', { ...EKADASHI, interval: 2 }, '2026-01-01', '2026-01-31');
    expect(dates(withInterval)).toEqual(['2026-01-14', '2026-01-29']);
  });

  it('an invalid tithi rule expands to nothing', () => {
    expect(expandOccurrences('2026-01-01', { freq: 'tithi' }, '2026-01-01', '2026-01-31')).toEqual([]);
    expect(expandOccurrences('2026-01-01', { freq: 'tithi', tithiDays: [] }, '2026-01-01', '2026-01-31')).toEqual([]);
    expect(expandOccurrences('2026-01-01', { freq: 'tithi', tithiDays: [31] }, '2026-01-01', '2026-01-31')).toEqual([]);
  });

  it('nextOccurrence finds the next Ekadashi', () => {
    const nx = nextOccurrence('2026-01-01', EKADASHI, '2026-01-15');
    expect(nx?.date).toBe('2026-01-29');
  });
});

describe('isValidRecurrence — tithi rules', () => {
  it('accepts a well-formed tithi rule', () => {
    expect(isValidRecurrence({ freq: 'tithi', tithiDays: [11, 26] })).toBe(true);
    expect(isValidRecurrence({ freq: 'tithi', tithiDays: [15] })).toBe(true);
  });

  it('rejects missing, empty and out-of-range day sets', () => {
    expect(isValidRecurrence({ freq: 'tithi' })).toBe(false);
    expect(isValidRecurrence({ freq: 'tithi', tithiDays: [] })).toBe(false);
    expect(isValidRecurrence({ freq: 'tithi', tithiDays: [0] })).toBe(false);
    expect(isValidRecurrence({ freq: 'tithi', tithiDays: [31] })).toBe(false);
    expect(isValidRecurrence({ freq: 'tithi', tithiDays: [11.5] })).toBe(false);
    expect(isValidRecurrence({ freq: 'tithi', tithiDays: [11, 40] })).toBe(false);
  });

  it('validates tithiDays whenever the field is present', () => {
    expect(isValidRecurrence({ freq: 'weekly', tithiDays: [99] })).toBe(false);
    expect(isValidRecurrence({ freq: 'weekly' })).toBe(true);
  });
});

describe('tithi naming + presets', () => {
  it('names absolute tithis', () => {
    expect(absoluteTithiName(1)).toBe('Shukla Pratipada');
    expect(absoluteTithiName(11)).toBe('Shukla Ekadashi');
    expect(absoluteTithiName(15)).toBe('Purnima');
    expect(absoluteTithiName(26)).toBe('Krishna Ekadashi');
    expect(absoluteTithiName(30)).toBe('Amavasya');
    expect(absoluteTithiName(0)).toBe('');
    expect(absoluteTithiName(31)).toBe('');
  });

  it('matches presets order-free and describes day-sets', () => {
    expect(tithiPresetFor([26, 11])?.id).toBe('ekadashi');
    expect(tithiPresetFor([15])?.id).toBe('purnima');
    expect(tithiPresetFor([11])).toBeNull();
    expect(describeTithiDays([11, 26])).toBe('Ekadashi');
    expect(describeTithiDays([11])).toBe('Shukla Ekadashi');
    expect(describeTithiDays([15, 11])).toBe('Shukla Ekadashi, Purnima');
    expect(describeTithiDays([])).toBe('');
    expect(TITHI_PRESETS.map((p) => p.id)).toEqual(['ekadashi', 'purnima', 'amavasya', 'pradosh', 'sankashti']);
  });
});

describe('RRULE + .ics — no fake Gregorian rhythm for tithi', () => {
  it('recurrenceRRule returns null for tithi (and still works for weekly)', () => {
    expect(recurrenceRRule('2026-01-01', EKADASHI)).toBeNull();
    expect(recurrenceRRule('2026-10-04', { freq: 'weekly' })).toContain('RRULE:FREQ=WEEKLY');
  });

  it('the .ics names the rhythm in DESCRIPTION and carries no RRULE', () => {
    const ics = buildIcsEvent(
      { uid: 'ekadashi-vrata', title: 'Ekadashi Vrata', date: '2026-01-14', recurrence: EKADASHI },
      Date.UTC(2026, 0, 1),
    );
    expect(ics).not.toBeNull();
    expect(ics).not.toContain('RRULE');
    expect(ics).toContain('DESCRIPTION:Recurs by tithi: Ekadashi');
  });

  it('the tithi note leads an existing description', () => {
    const ics = buildIcsEvent(
      { uid: 'ekadashi-vrata', title: 'Ekadashi Vrata', description: 'Fasting till sunrise.', date: '2026-01-14', recurrence: EKADASHI },
      Date.UTC(2026, 0, 1),
    );
    expect(ics).toContain('DESCRIPTION:Recurs by tithi: Ekadashi\\nFasting till sunrise.');
  });
});
