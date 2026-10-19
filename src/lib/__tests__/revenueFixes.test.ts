/**
 * revenueFixes.test.ts — AUDIT FIX #4: the two revenue-critical bugs.
 * =======================================================================
 * Pure-function tests (Firestore paths need a live DB):
 * 1. subscriptionMonthsForPeriod — annual payers must get 12 months.
 * 2. canConfirmRail1Receipt — the rail-1 paid-path guard.
 */
import { subscriptionMonthsForPeriod } from '../../billing/planUpgrade';
import { canConfirmRail1Receipt } from '../orderGuards';

describe('subscriptionMonthsForPeriod (annual-claim bug)', () => {
  it("'annual' (what PlanUpgradeFlow writes) grants 12 months", () => {
    expect(subscriptionMonthsForPeriod('annual')).toBe(12);
  });

  it("legacy 'yearly' still grants 12 months", () => {
    expect(subscriptionMonthsForPeriod('yearly')).toBe(12);
  });

  it("'monthly' grants 1 month", () => {
    expect(subscriptionMonthsForPeriod('monthly')).toBe(1);
  });

  it('unrecognized periods fall back to 1 (conservative — never grant time on bad data)', () => {
    expect(subscriptionMonthsForPeriod('bogus')).toBe(1);
    expect(subscriptionMonthsForPeriod('')).toBe(1);
  });

  it('missing period falls back to 1 (matches old behavior for malformed claims)', () => {
    expect(subscriptionMonthsForPeriod(undefined)).toBe(1);
    expect(subscriptionMonthsForPeriod(null)).toBe(1);
  });

  it('annual endDate lands 12 months after start', () => {
    const start = new Date('2026-01-15T00:00:00Z');
    const end = new Date(start);
    end.setMonth(end.getMonth() + subscriptionMonthsForPeriod('annual'));
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0); // January 2027
  });

  it('monthly endDate lands 1 month after start', () => {
    const start = new Date('2026-01-15T00:00:00Z');
    const end = new Date(start);
    end.setMonth(end.getMonth() + subscriptionMonthsForPeriod('monthly'));
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(1); // February 2026
  });
});

describe('canConfirmRail1Receipt (rail-1 paid-path guard)', () => {
  const base = {
    providerUid: 'prov_1',
    status: 'pending_payment',
    rail: 'rail1',
    payWithWallet: false,
  };

  it('allows the provider to confirm a rail-1 pending_payment order', () => {
    expect(canConfirmRail1Receipt(base, 'prov_1')).toBeNull();
  });

  it('rejects non-providers', () => {
    expect(canConfirmRail1Receipt(base, 'someone_else')).toBe('Not your order.');
  });

  it('rejects orders not awaiting payment', () => {
    expect(canConfirmRail1Receipt({ ...base, status: 'paid' }, 'prov_1'))
      .toBe('Order is not awaiting payment.');
    expect(canConfirmRail1Receipt({ ...base, status: 'accepted' }, 'prov_1'))
      .toBe('Order is not awaiting payment.');
  });

  it('rejects wallet orders (they confirm automatically)', () => {
    expect(canConfirmRail1Receipt({ ...base, payWithWallet: true }, 'prov_1'))
      .toBe('Wallet orders confirm automatically.');
  });

  it('rejects rail-2 orders (they use the proof flow)', () => {
    expect(canConfirmRail1Receipt({ ...base, rail: 'rail2' }, 'prov_1'))
      .toBe('Use the rail-2 payment-proof flow for this order.');
  });

  it('rejects unknown rails', () => {
    expect(canConfirmRail1Receipt({ ...base, rail: 'rail9' }, 'prov_1'))
      .toBe('Only rail-1 direct payments can be confirmed here.');
  });
});
