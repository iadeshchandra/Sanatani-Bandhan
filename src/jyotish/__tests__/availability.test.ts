/**
 * availability.test.ts — JY-FIX-B pins for JY-07.
 * =====================================================================
 * Availability was write-only: slots saved in the jyotishi workspace
 * were read by NOTHING, and the workspace tab itself rendered saved
 * slots OFF (stale initial state) so a Save could wipe them. These
 * tests pin the pure read-side logic the public surfaces now use.
 */
import {
  summariseAvailability,
  availabilityVerdictForDate,
  weekdayNameForDate,
} from '../availabilityLogic';

const SLOTS = {
  'mon-morning': true,
  'wed-evening': true,
  'wed-morning': false,
  'fri-evening': true,
};

describe('JY-07 — summariseAvailability', () => {
  test('lists only days with a slot on, in week order, with their shifts', () => {
    expect(summariseAvailability(SLOTS)).toEqual([
      { day: 'mon', label: 'Mon', shifts: ['morning'] },
      { day: 'wed', label: 'Wed', shifts: ['evening'] },
      { day: 'fri', label: 'Fri', shifts: ['evening'] },
    ]);
  });

  test('nothing recorded → empty summary (the strip renders nothing)', () => {
    expect(summariseAvailability(null)).toEqual([]);
    expect(summariseAvailability(undefined)).toEqual([]);
    expect(summariseAvailability({})).toEqual([]);
    expect(summariseAvailability({ 'mon-morning': false })).toEqual([]);
  });
});

describe('JY-07 — availabilityVerdictForDate', () => {
  // 2026-11-02 is a Monday; 2026-11-03 a Tuesday; 2026-11-04 a Wednesday.
  test('a date on an available weekday is within', () => {
    expect(availabilityVerdictForDate(SLOTS, '2026-11-02')).toBe('within');
    expect(availabilityVerdictForDate(SLOTS, '2026-11-04')).toBe('within');
  });

  test('a date on an unmarked weekday is outside (soft note, never a block)', () => {
    expect(availabilityVerdictForDate(SLOTS, '2026-11-03')).toBe('outside');
  });

  test('no availability recorded → unknown (no note is shown)', () => {
    expect(availabilityVerdictForDate(null, '2026-11-03')).toBe('unknown');
    expect(availabilityVerdictForDate({}, '2026-11-03')).toBe('unknown');
    expect(availabilityVerdictForDate(SLOTS, '')).toBe('unknown');
    expect(availabilityVerdictForDate(SLOTS, 'not-a-date')).toBe('unknown');
  });

  test('weekday names resolve for the note copy', () => {
    expect(weekdayNameForDate('2026-11-02')).toBe('Monday');
    expect(weekdayNameForDate('2026-11-01')).toBe('Sunday');
  });
});
