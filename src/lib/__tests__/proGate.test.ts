/**
 * proGate.test.ts — QUEUED #23.
 * Paid-seva acceptance gate matrix: free allowance (3 in progress),
 * Pro unlimited, free orders untouched, fail-open on unreadable tier.
 */
import {
  paidSevaAcceptance, FREE_ACTIVE_PAID_SEVA_LIMIT,
  PRO_REQUIRED_CODE, PRO_UPSELL_MESSAGE,
} from '../sevaPro/proGate';

const base = { amountGross: 1100, isPro: false, tierReadable: true, activePaidCount: 0 };

describe('paidSevaAcceptance', () => {
  it('free orders (dakshina 0) are never gated', () => {
    expect(paidSevaAcceptance({ ...base, amountGross: 0, activePaidCount: 99 }))
      .toEqual({ allowed: true, reason: 'free_order' });
  });

  it('Pro providers accept without limit', () => {
    expect(paidSevaAcceptance({ ...base, isPro: true, activePaidCount: 99 }))
      .toEqual({ allowed: true, reason: 'pro' });
  });

  it('community providers are allowed within the free allowance', () => {
    for (const n of [0, 1, FREE_ACTIVE_PAID_SEVA_LIMIT - 1]) {
      expect(paidSevaAcceptance({ ...base, activePaidCount: n }))
        .toEqual({ allowed: true, reason: 'within_allowance' });
    }
  });

  it('community providers at/over the allowance are refused', () => {
    for (const n of [FREE_ACTIVE_PAID_SEVA_LIMIT, FREE_ACTIVE_PAID_SEVA_LIMIT + 1, 25]) {
      expect(paidSevaAcceptance({ ...base, activePaidCount: n }))
        .toEqual({ allowed: false, reason: 'allowance_exhausted' });
    }
  });

  it('fails open when the tier could not be read (never punish on infra)', () => {
    expect(paidSevaAcceptance({ ...base, tierReadable: false, activePaidCount: 99 }))
      .toEqual({ allowed: true, reason: 'unverified_tier' });
  });

  it('the free allowance is exactly 3, per the pricing law in saveGig', () => {
    expect(FREE_ACTIVE_PAID_SEVA_LIMIT).toBe(3);
  });

  it('the refusal is warm and carries the upsell code', () => {
    expect(PRO_REQUIRED_CODE).toBe('PRO_REQUIRED');
    expect(PRO_UPSELL_MESSAGE).toContain('Verified Seva Provider (Pro)');
    expect(PRO_UPSELL_MESSAGE).toContain('3 paid sevas');
    expect(PRO_UPSELL_MESSAGE.toLowerCase()).not.toContain('error');
  });
});
