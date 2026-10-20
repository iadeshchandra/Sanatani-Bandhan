/**
 * proSubscription.test.ts — QUEUED #23.
 * Pure-logic tests: Pro plan-id normalization, the claim→subscription
 * landing (the doc claimApprove writes must be the doc getProviderTier
 * reads), and the tier verdict matrix.
 */
import {
  isProPlanId, normalizeProPlanId, isProSubscriptionDoc,
  providerTierFromSubscription, buildProSubscriptionDoc, subscriptionKindLabel,
} from '../proSubscription';

const NOW = new Date('2026-10-20T12:00:00Z');
const future = new Date('2026-11-20T12:00:00Z');
const past = new Date('2026-09-20T12:00:00Z');
const UID = 'provider-uid-1';

describe('isProPlanId / normalizeProPlanId', () => {
  it('recognizes every historical spelling of the Pro plan', () => {
    expect(isProPlanId('purohit_pro')).toBe(true);
    expect(isProPlanId('jyotishi_pro')).toBe(true);
    expect(isProPlanId('PUROHIT_PRO')).toBe(true); // claim-flow tier id
    expect(isProPlanId('Purohit_Pro')).toBe(true);
  });

  it('rejects org plans and empties', () => {
    expect(isProPlanId('STANDARD')).toBe(false);
    expect(isProPlanId('premium')).toBe(false);
    expect(isProPlanId('seva')).toBe(false);
    expect(isProPlanId('')).toBe(false);
    expect(isProPlanId(null)).toBe(false);
    expect(isProPlanId(undefined)).toBe(false);
  });

  it('normalizes to the stored form, preserving jyotishi identity', () => {
    expect(normalizeProPlanId('PUROHIT_PRO')).toBe('purohit_pro');
    expect(normalizeProPlanId('purohit_pro')).toBe('purohit_pro');
    expect(normalizeProPlanId('jyotishi_pro')).toBe('jyotishi_pro');
    expect(normalizeProPlanId('STANDARD')).toBe('');
    expect(normalizeProPlanId(null)).toBe('');
  });
});

describe('claim → subscription landing (QUEUED #23 core)', () => {
  it('an approved PUROHIT_PRO claim lands where getProviderTier reads: pro', () => {
    const claim = { applicantUid: UID, plan: 'PUROHIT_PRO', method: 'bd_bkash', transactionId: 'TXN999888' };
    const doc = buildProSubscriptionDoc(claim, NOW, future);
    // Keyed by the provider uid (the doc id claimApprove writes to).
    expect(doc.providerUid).toBe(UID);
    expect(doc.workspaceId).toBe(UID);
    expect(doc.kind).toBe('pro');
    expect(doc.planId).toBe('purohit_pro'); // normalized — the old raw 'PUROHIT_PRO' never matched
    expect(doc.status).toBe('active');
    expect(doc.startDate).toBe(NOW.toISOString());
    expect(doc.endDate).toBe(future.toISOString());
    expect(doc.paymentMethod).toBe('bd_bkash');
    expect(doc.transactionId).toBe('TXN999888');
    // And the tier reader's verdict on exactly this doc:
    expect(providerTierFromSubscription(doc, UID, NOW)).toBe('pro');
  });

  it('two solo providers never collide (no shared "personal" doc)', () => {
    const a = buildProSubscriptionDoc({ applicantUid: 'uid-a', plan: 'PUROHIT_PRO' }, NOW, future);
    const b = buildProSubscriptionDoc({ applicantUid: 'uid-b', plan: 'PUROHIT_PRO' }, NOW, future);
    expect(a.workspaceId).not.toBe(b.workspaceId);
    expect(providerTierFromSubscription(a, 'uid-b', NOW)).toBe('community');
  });
});

describe('providerTierFromSubscription', () => {
  const proDoc = {
    providerUid: UID, planId: 'purohit_pro', kind: 'pro',
    status: 'active', endDate: future.toISOString(),
  };

  it('active + unexpired Pro doc → pro', () => {
    expect(providerTierFromSubscription(proDoc, UID, NOW)).toBe('pro');
  });

  it('active Pro doc with no endDate → pro (no expiry recorded)', () => {
    const { endDate, ...noEnd } = proDoc;
    expect(providerTierFromSubscription(noEnd, UID, NOW)).toBe('pro');
  });

  it('expired Pro doc → community', () => {
    expect(providerTierFromSubscription({ ...proDoc, endDate: past.toISOString() }, UID, NOW)).toBe('community');
  });

  it('non-active Pro doc → community', () => {
    expect(providerTierFromSubscription({ ...proDoc, status: 'cancelled' }, UID, NOW)).toBe('community');
    expect(providerTierFromSubscription({ ...proDoc, status: 'expired' }, UID, NOW)).toBe('community');
  });

  it('an org plan doc at the uid key is NOT Pro', () => {
    expect(providerTierFromSubscription(
      { workspaceId: UID, planId: 'PREMIUM', status: 'active', endDate: future.toISOString() },
      UID, NOW,
    )).toBe('community');
  });

  it('legacy doc with raw claim planId PUROHIT_PRO reads as pro', () => {
    expect(providerTierFromSubscription(
      { planId: 'PUROHIT_PRO', status: 'active', endDate: future.toISOString() },
      UID, NOW,
    )).toBe('pro');
  });

  it('a doc naming a different providerUid never grants Pro', () => {
    expect(providerTierFromSubscription(proDoc, 'someone-else', NOW)).toBe('community');
  });

  it('missing doc → community', () => {
    expect(providerTierFromSubscription(null, UID, NOW)).toBe('community');
    expect(providerTierFromSubscription(undefined, UID, NOW)).toBe('community');
  });
});

describe('GodMode labelling', () => {
  it('distinguishes Pro (individual) from organisation plans', () => {
    expect(isProSubscriptionDoc({ planId: 'purohit_pro' })).toBe(true);
    expect(isProSubscriptionDoc({ kind: 'pro' })).toBe(true);
    expect(isProSubscriptionDoc({ planId: 'PUROHIT_PRO' })).toBe(true);
    expect(isProSubscriptionDoc({ planId: 'STANDARD' })).toBe(false);
    expect(subscriptionKindLabel({ planId: 'purohit_pro' })).toBe('Pro (individual)');
    expect(subscriptionKindLabel({ planId: 'PREMIUM' })).toBe('Organisation plan');
    expect(subscriptionKindLabel(null)).toBe('Organisation plan');
  });
});
