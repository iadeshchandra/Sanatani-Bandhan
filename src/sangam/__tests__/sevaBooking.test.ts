/* Seva Bazar Phase 2 — pure logic tests.
 * =====================================================================
 * No Firestore, no network. Every booking-math and validation rule
 * pinned here.
 */

import {
  SHRADHA_STEPS,
  computeBookingTotal,
  suggestTokenAdvance,
  suggestMuhuratSlots,
  validateBookingDraft,
  sevaOrderStage,
  advanceRailLabel,
  bookingModeLabel,
  type BookingDraft,
} from '../sevaBooking';

describe('SHRADHA_STEPS', () => {
  it('offers more-never-less steps starting at 0', () => {
    expect(SHRADHA_STEPS).toEqual([0, 5, 10, 25]);
    expect(SHRADHA_STEPS[0]).toBe(0);
  });
});

describe('computeBookingTotal', () => {
  it('adds the shradha extra, rounded', () => {
    expect(computeBookingTotal(1100, 10)).toEqual({ base: 1100, extra: 110, total: 1210 });
  });
  it('is zero-safe', () => {
    expect(computeBookingTotal(0, 25)).toEqual({ base: 0, extra: 0, total: 0 });
    expect(computeBookingTotal(-5, 10)).toEqual({ base: 0, extra: 0, total: 0 });
  });
  it('rounds the extra to whole rupees', () => {
    const { extra } = computeBookingTotal(501, 5);
    expect(extra).toBe(25); // 25.05 → 25
    expect(Number.isInteger(extra)).toBe(true);
  });
});

describe('suggestTokenAdvance', () => {
  it('is 20% of the total, rounded to 10', () => {
    expect(suggestTokenAdvance(1100)).toBe(220);
    expect(suggestTokenAdvance(1210)).toBe(240);
  });
  it('floors at the auspicious minimum of 51', () => {
    expect(suggestTokenAdvance(100)).toBe(50); // 20 → floored to 51 → rounded 50
    expect(suggestTokenAdvance(200)).toBe(50); // 40 → 51 → 50
  });
  it('is zero-safe', () => {
    expect(suggestTokenAdvance(0)).toBe(0);
    expect(suggestTokenAdvance(-10)).toBe(0);
  });
});

describe('suggestMuhuratSlots', () => {
  const fixed = new Date(2026, 9, 18, 12, 0, 0); // 18 Oct 2026 noon

  it('returns exactly 3 slots on the next 3 days', () => {
    const slots = suggestMuhuratSlots(fixed, 'en');
    expect(slots).toHaveLength(3);
    expect(slots[0].dateISO).toBe('2026-10-19');
    expect(slots[1].dateISO).toBe('2026-10-20');
    expect(slots[2].dateISO).toBe('2026-10-21');
  });
  it('gives stable ids', () => {
    const slots = suggestMuhuratSlots(fixed, 'en');
    expect(slots[0].id).toBe('slot-2026-10-19-morning');
  });
  it('annotates a real tithi (never blank, never guessed)', () => {
    const slots = suggestMuhuratSlots(fixed, 'en');
    for (const s of slots) {
      expect(s.tithi).toMatch(/^(Shukla|Krishna) \S+/);
    }
  });
  it('localises day labels', () => {
    const bn = suggestMuhuratSlots(fixed, 'bn');
    expect(bn[0].dayLabel).not.toBe(suggestMuhuratSlots(fixed, 'en')[0].dayLabel);
  });
});

describe('validateBookingDraft', () => {
  const base: BookingDraft = {
    mode: 'home',
    slotId: 'slot-2026-10-19-morning',
    name: 'Adesh',
    gotra: '',
    notes: '',
  };

  it('accepts a complete draft with empty gotra', () => {
    expect(validateBookingDraft(base)).toEqual([]);
  });
  it('requires mode, slot, and name — never gotra', () => {
    const v = validateBookingDraft({ ...base, mode: null, slotId: null, name: ' ' });
    expect(v.map((x) => x.field).sort()).toEqual(['mode', 'name', 'slot']);
  });
  it('speaks the devotee’s language', () => {
    const v = validateBookingDraft({ ...base, name: '' }, 'bn');
    expect(v[0].message).toContain('সংকল্প');
  });
});

describe('sevaOrderStage', () => {
  it('maps rail2 statuses to devotee-facing stages', () => {
    expect(sevaOrderStage('pending_payment')).toBe('awaiting_advance');
    expect(sevaOrderStage('paid')).toBe('advance_received');
    expect(sevaOrderStage('accepted')).toBe('accepted');
    expect(sevaOrderStage('in_progress')).toBe('in_seva');
    expect(sevaOrderStage('completed')).toBe('complete');
    expect(sevaOrderStage('awaiting_commission')).toBe('complete');
    expect(sevaOrderStage('bogus')).toBe('unknown');
  });
});

describe('labels', () => {
  it('covers all rails and modes in en/hi/bn', () => {
    for (const l of ['en', 'hi', 'bn'] as const) {
      expect(advanceRailLabel('upi', l)).toBeTruthy();
      expect(advanceRailLabel('bkash', l)).toBeTruthy();
      expect(advanceRailLabel('nagad', l)).toBeTruthy();
      expect(bookingModeLabel('home', l)).toBeTruthy();
      expect(bookingModeLabel('temple', l)).toBeTruthy();
      expect(bookingModeLabel('video', l)).toBeTruthy();
    }
  });
});
