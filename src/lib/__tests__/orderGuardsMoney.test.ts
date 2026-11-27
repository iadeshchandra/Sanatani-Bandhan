/**
 * orderGuardsMoney.test.ts — Domain 4 money-path guard tests.
 * =======================================================================
 * Two P0 revenue bugs fixed 2026-10-20:
 * 1. `requestPayout` counted providerNet of EVERY completed order as
 *    platform-held earnings — rail-2 / pay-after-task / wallet-escrow /
 *    direct-dakshina orders never touch the platform's custody, so a
 *    payout for them would double-pay or pay from nothing.
 *    `isPlatformHeld` is the custody test both `requestPayout` and
 *    `providerEarningsSummary` use.
 * 2. Pay-after-task orders completed into `awaiting_commission` never
 *    created a platformDue (early return in orderTransition) — owner Dues,
 *    provider Dues, and auto-suspension all missed Path-B receivables.
 *    `shouldCreateDuesOnComplete` is the decision both branches use.
 */
import {
  isPlatformHeld, shouldCreateDuesOnComplete,
  payoutReservesEarnings, PAYOUT_RESERVED_STATUSES,
} from '../orderGuards';

describe('isPlatformHeld (payout custody)', () => {
  describe('platform-held (payout-eligible)', () => {
    it('rail-1 via platform Bangla QR is held', () => {
      expect(isPlatformHeld({ rail: 'rail1', paymentMethodId: 'bd_banglaqr' })).toBe(true);
    });
    it('rail-1 via platform UPI is held', () => {
      expect(isPlatformHeld({ rail: 'rail1', paymentMethodId: 'in_upi' })).toBe(true);
    });
    it('rail-1 via Payoneer is held', () => {
      expect(isPlatformHeld({ rail: 'rail1', paymentMethodId: 'intl_payoneer' })).toBe(true);
    });
    it('rail-1 via Wise is held', () => {
      expect(isPlatformHeld({ rail: 'rail1', paymentMethodId: 'intl_wise' })).toBe(true);
    });
    it('legacy rail-1 order without a rail field but a platform method is held', () => {
      expect(isPlatformHeld({ paymentMethodId: 'bd_banglaqr' })).toBe(true);
    });
  });

  describe('never platform-held', () => {
    it('rail-2 orders are not held — client paid the provider directly', () => {
      expect(isPlatformHeld({ rail: 'rail2', paymentMethodId: 'provider:own_qr' })).toBe(false);
    });
    it('pay-after-task orders are not held', () => {
      expect(
        isPlatformHeld({ rail: 'rail2', payAfterTask: true, paymentMethodId: 'pay_after_task' })
      ).toBe(false);
    });
    it('wallet-escrow orders are not held', () => {
      expect(isPlatformHeld({ rail: 'rail1', payWithWallet: true, paymentMethodId: 'wallet' })).toBe(false);
    });
    it('walletPaid orders are not held — releaseEscrow already credited the wallet', () => {
      expect(isPlatformHeld({ rail: 'rail1', walletPaid: true, paymentMethodId: 'wallet' })).toBe(false);
    });
    it("'direct' consultation dakshina is not held — paid straight to the jyotishi", () => {
      expect(isPlatformHeld({ rail: 'rail1', paymentMethodId: 'direct' })).toBe(false);
    });
    it('provider-owned rail methods are not held', () => {
      expect(isPlatformHeld({ rail: 'rail1', paymentMethodId: 'provider:own_upi' })).toBe(false);
    });
    it('seva-bazar advance orders are not held', () => {
      expect(
        isPlatformHeld({ rail: 'rail2', paymentMethodId: 'seva-bazar-advance' })
      ).toBe(false);
    });
    it('missing paymentMethodId fails closed', () => {
      expect(isPlatformHeld({ rail: 'rail1' })).toBe(false);
    });
    it('empty order fails closed', () => {
      expect(isPlatformHeld({})).toBe(false);
    });
  });
});

describe('shouldCreateDuesOnComplete (commission receivable)', () => {
  it('rail-2 gig order completing → dues fire', () => {
    expect(shouldCreateDuesOnComplete({ rail: 'rail2' }, 'completed')).toBe(true);
  });
  it('pay-after-task order completing (→ awaiting_commission) → dues fire', () => {
    expect(shouldCreateDuesOnComplete({ rail: 'rail2', payAfterTask: true }, 'completed')).toBe(true);
  });
  it('rail-1 order completing → no dues (commission secured at payment)', () => {
    expect(shouldCreateDuesOnComplete({ rail: 'rail1' }, 'completed')).toBe(false);
  });
  it('non-completion transitions → no dues', () => {
    expect(shouldCreateDuesOnComplete({ rail: 'rail2' }, 'accepted')).toBe(false);
    expect(shouldCreateDuesOnComplete({ rail: 'rail2' }, 'in_progress')).toBe(false);
    expect(shouldCreateDuesOnComplete({ rail: 'rail2' }, 'cancelled')).toBe(false);
  });
  it('missing rail fails closed → no dues', () => {
    expect(shouldCreateDuesOnComplete({}, 'completed')).toBe(false);
  });
});

describe('payoutReservesEarnings (G-W2-1 double-pay guard)', () => {
  // The guard's whole point: a payout whose bank transfer FAILED
  // still reserves the provider's earnings, because the owner may
  // retry that same payment — the money must never be requestable
  // twice. Only an explicit RELEASE frees it again.
  it('requested reserves', () => {
    expect(payoutReservesEarnings('requested')).toBe(true);
  });
  it('approved reserves', () => {
    expect(payoutReservesEarnings('approved')).toBe(true);
  });
  it('paid reserves (the money has left)', () => {
    expect(payoutReservesEarnings('paid')).toBe(true);
  });
  it('settlement_failed STILL reserves — the retry must not double-pay', () => {
    expect(payoutReservesEarnings('settlement_failed')).toBe(true);
  });
  it('released frees the amount — the provider may request it again', () => {
    expect(payoutReservesEarnings('released')).toBe(false);
  });
  it('rejected never reserves', () => {
    expect(payoutReservesEarnings('rejected')).toBe(false);
  });
  it('unknown / missing statuses fail safe (no reservation claimed)', () => {
    expect(payoutReservesEarnings(undefined)).toBe(false);
    expect(payoutReservesEarnings(null)).toBe(false);
    expect(payoutReservesEarnings('')).toBe(false);
    expect(payoutReservesEarnings('something_else')).toBe(false);
  });
  it('the reserved set is exactly the four live states', () => {
    expect([...PAYOUT_RESERVED_STATUSES].sort()).toEqual(
      ['approved', 'paid', 'requested', 'settlement_failed'],
    );
  });
});
