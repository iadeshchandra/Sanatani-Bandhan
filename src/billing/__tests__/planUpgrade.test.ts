/**
 * billing/__tests__/planUpgrade.test.ts — PlanUpgradeFlow pure logic tests.
 */
import {
  planPrice, formatPrice, validateClaim, hasDuplicatePendingClaim,
  buildClaimDoc, methodsForRegion, methodInstructions,
  UPGRADEABLE_TIERS, type ClaimDraft, type PaymentMethodInfo,
} from '../planUpgrade';

const draft = (over: Partial<ClaimDraft> = {}): ClaimDraft => ({
  plan: 'STANDARD', period: 'annual', method: 'bd_bkash',
  transactionId: 'TXN123456', amount: 7000, currency: 'BDT',
  senderInfo: '01600000000', notes: '', ...over,
});

describe('planPrice', () => {
  it('resolves BD annual Standard price', () => {
    expect(planPrice('STANDARD', 'annual', 'BD')).toEqual({ amount: 7000, currency: 'BDT', symbol: '৳' });
  });
  it('resolves IN monthly Premium price', () => {
    expect(planPrice('PREMIUM', 'monthly', 'IN')).toEqual({ amount: 1999, currency: 'INR', symbol: '₹' });
  });
  it('resolves INTL Pro price', () => {
    expect(planPrice('PUROHIT_PRO', 'monthly', 'INTL')).toEqual({ amount: 2.5, currency: 'USD', symbol: '$' });
  });
  it('is case-insensitive on region', () => {
    expect(planPrice('STANDARD', 'monthly', 'bd').amount).toBe(700);
  });
  it('falls back to USD for unknown regions', () => {
    const p = planPrice('STANDARD', 'monthly', 'XX');
    expect(p.currency).toBe('USD');
  });
});

describe('formatPrice', () => {
  it('formats with Indian digit grouping', () => {
    expect(formatPrice(7000, '৳')).toBe('৳7,000');
  });
});

describe('UPGRADEABLE_TIERS', () => {
  it('excludes SEVA (free)', () => {
    expect(UPGRADEABLE_TIERS).not.toContain('SEVA');
    expect(UPGRADEABLE_TIERS).toContain('STANDARD');
    expect(UPGRADEABLE_TIERS).toContain('PREMIUM');
    expect(UPGRADEABLE_TIERS).toContain('PUROHIT_PRO');
  });
});

describe('validateClaim', () => {
  it('passes a valid draft', () => {
    const v = validateClaim(draft(), 'BD');
    expect(v.ok).toBe(true);
    expect(v.amountMismatch).toBe(false);
  });
  it('requires a transaction ID', () => {
    const v = validateClaim(draft({ transactionId: '' }), 'BD');
    expect(v.ok).toBe(false);
    expect(v.errors.transactionId).toBeTruthy();
  });
  it('rejects short transaction IDs', () => {
    const v = validateClaim(draft({ transactionId: 'abc' }), 'BD');
    expect(v.ok).toBe(false);
  });
  it('requires a payment method', () => {
    const v = validateClaim(draft({ method: '' }), 'BD');
    expect(v.ok).toBe(false);
    expect(v.errors.method).toBeTruthy();
  });
  it('requires a positive amount', () => {
    const v = validateClaim(draft({ amount: 0 }), 'BD');
    expect(v.ok).toBe(false);
    expect(v.errors.amount).toBeTruthy();
  });
  it('flags amount mismatch as warning, not blocker', () => {
    const v = validateClaim(draft({ amount: 6500 }), 'BD');
    expect(v.ok).toBe(true);
    expect(v.amountMismatch).toBe(true);
    expect(v.expectedAmount).toBe(7000);
  });
});

describe('hasDuplicatePendingClaim', () => {
  const existing = [
    { plan: 'STANDARD', period: 'annual', status: 'pending' },
    { plan: 'PREMIUM', period: 'monthly', status: 'approved' },
  ];
  it('detects a duplicate pending claim', () => {
    expect(hasDuplicatePendingClaim(existing, 'STANDARD', 'annual')).toBe(true);
  });
  it('ignores non-pending claims', () => {
    expect(hasDuplicatePendingClaim(existing, 'PREMIUM', 'monthly')).toBe(false);
  });
  it('ignores different plan/period', () => {
    expect(hasDuplicatePendingClaim(existing, 'STANDARD', 'monthly')).toBe(false);
  });
  it('handles empty list', () => {
    expect(hasDuplicatePendingClaim([], 'STANDARD', 'annual')).toBe(false);
  });
});

describe('buildClaimDoc', () => {
  it('builds a pending claim with applicantUid', () => {
    const doc = buildClaimDoc(draft(), { applicantUid: 'u1', workspaceId: 'w1', workspaceName: 'Test Mandir' });
    expect(doc.status).toBe('pending');
    expect(doc.applicantUid).toBe('u1');
    expect(doc.plan).toBe('STANDARD');
    expect(doc.transactionId).toBe('TXN123456');
  });
  it('trims and truncates free text', () => {
    const doc = buildClaimDoc(draft({ senderInfo: '  01600  ', notes: 'x'.repeat(1000) }), {
      applicantUid: 'u1', workspaceId: 'w1', workspaceName: 'W',
    });
    expect(doc.senderInfo).toBe('01600');
    expect((doc.notes as string).length).toBe(500);
  });
});

const methods: PaymentMethodInfo[] = [
  { id: 'bd_bkash', region: 'BD', label: 'bKash', type: 'mobile', enabled: true, instructionsEn: ['Pay'], instructionsBn: ['পে'] },
  { id: 'in_upi', region: 'IN', label: 'UPI', type: 'upi', enabled: true, instructionsEn: ['Pay'], instructionsBn: [] },
  { id: 'old', region: 'BD', label: 'Old', type: 'mobile', enabled: false, instructionsEn: [], instructionsBn: [] },
];

describe('methodsForRegion', () => {
  it('returns enabled methods for the region', () => {
    const m = methodsForRegion(methods, 'BD');
    expect(m.map((x) => x.id)).toEqual(['bd_bkash']);
  });
  it('falls back to all enabled when region has none', () => {
    const m = methodsForRegion(methods, 'UK');
    expect(m.map((x) => x.id).sort()).toEqual(['bd_bkash', 'in_upi']);
  });
});

describe('methodInstructions', () => {
  it('prefers Bangla when available', () => {
    expect(methodInstructions(methods[0], 'bn')).toEqual(['পে']);
  });
  it('falls back to English', () => {
    expect(methodInstructions(methods[1], 'bn')).toEqual(['Pay']);
    expect(methodInstructions(methods[0], 'en')).toEqual(['Pay']);
  });
});
