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
import { isPlatformHeld, shouldCreateDuesOnComplete } from '../orderGuards';

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
