/**
 * staffMoneyNotify.test.ts — NOTIFICATION WAVE 2, staff money pickers.
 * Pure logic: payout/claim state ledgers (a rejection rings once),
 * the large-donation threshold (maker–checker line, practice rows
 * never news), and the plan stages (period-keyed dedupe = renewal
 * suppression by construction).
 */
import {
  claimDedupeKey,
  donationDedupeKey,
  isLargeDonation,
  payoutDedupeKey,
  pickClaimRejections,
  pickLargeDonations,
  pickPayoutFailures,
  pickPlanStage,
  planDedupeKey,
  LARGE_DONATION_DEFAULT_THRESHOLD,
  PLAN_EXPIRY_NOTICE_DAYS,
  type PaymentClaimLike,
  type PayoutLike,
  type TreasuryTxLike,
} from '../staffMoneyNotify';
import { DEFAULT_PAYOUT_APPROVAL_THRESHOLD } from '../approvals';
import type { SubscriptionLike } from '../subscriptionExpiry';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

/* ------------------------------ payouts ------------------------------ */

const payout = (over: Partial<PayoutLike> = {}): PayoutLike => ({
  id: 'po-1',
  status: 'pending',
  amount: 4500,
  currency: 'INR',
  providerUid: 'me',
  ...over,
});

describe('pickPayoutFailures', () => {
  it('a payout standing rejected with an empty ledger is news, once-keyed', () => {
    const { notices, settled } = pickPayoutFailures([payout({ status: 'rejected' })], {});
    expect(notices).toHaveLength(1);
    expect(notices[0].dedupeKey).toBe(payoutDedupeKey('po-1'));
    expect(notices[0].dedupeKey).toBe('payout:po-1:failed');
    expect(settled).toEqual({ 'po-1': 'rejected' });
  });

  it('the same rejection already settled in the ledger is silence', () => {
    const { notices } = pickPayoutFailures([payout({ status: 'rejected' })], { 'po-1': 'rejected' });
    expect(notices).toHaveLength(0);
  });

  it('a transition INTO rejected rings; other statuses settle silently', () => {
    const into = pickPayoutFailures([payout({ status: 'rejected' })], { 'po-1': 'pending' });
    expect(into.notices).toHaveLength(1);
    const calm = pickPayoutFailures(
      [payout({ status: 'paid' }), payout({ id: 'po-2', status: 'pending' })],
      {},
    );
    expect(calm.notices).toHaveLength(0);
    expect(calm.settled).toEqual({ 'po-1': 'paid', 'po-2': 'pending' });
  });

  it('junk rows (no id / no status) are ignored, never settled', () => {
    const { notices, settled } = pickPayoutFailures(
      [{ id: '', status: 'rejected' }, { id: 'po-9' } as PayoutLike],
      {},
    );
    expect(notices).toHaveLength(0);
    expect(settled).toEqual({});
  });
});

/* --------------------------- payment claims -------------------------- */

const claim = (over: Partial<PaymentClaimLike> = {}): PaymentClaimLike => ({
  id: 'cl-1',
  workspaceId: 'ws-1',
  workspaceName: 'Kali Mandir',
  applicantUid: 'me',
  plan: 'Standard',
  period: 'annual',
  status: 'pending',
  ...over,
});

describe('pickClaimRejections', () => {
  it('a rejected claim is news with the house dedupe shape', () => {
    const { notices } = pickClaimRejections([claim({ status: 'rejected' })], {});
    expect(notices).toHaveLength(1);
    expect(notices[0].dedupeKey).toBe(claimDedupeKey('cl-1'));
    expect(notices[0].dedupeKey).toBe('payclaim:cl-1:rejected');
  });

  it('approved / pending claims settle silently; a settled rejection stays silent', () => {
    const calm = pickClaimRejections([claim({ status: 'approved' }), claim({ id: 'cl-2' })], {});
    expect(calm.notices).toHaveLength(0);
    const again = pickClaimRejections([claim({ status: 'rejected' })], { 'cl-1': 'rejected' });
    expect(again.notices).toHaveLength(0);
  });
});

/* --------------------------- large donations ------------------------- */

const tx = (over: Partial<TreasuryTxLike> = {}): TreasuryTxLike => ({
  id: 'tx-1',
  workspaceId: 'ws-1',
  type: 'Income',
  amount: 25_000,
  ...over,
});

describe('large donations', () => {
  it('the default line IS the maker–checker threshold (one line for money in and out)', () => {
    expect(LARGE_DONATION_DEFAULT_THRESHOLD).toBe(DEFAULT_PAYOUT_APPROVAL_THRESHOLD);
    expect(LARGE_DONATION_DEFAULT_THRESHOLD).toBe(10_000);
  });

  it('isLargeDonation: Income at/over the line counts; below does not', () => {
    expect(isLargeDonation(tx({ amount: 10_000 }), 10_000)).toBe(true);
    expect(isLargeDonation(tx({ amount: 50_000 }), 10_000)).toBe(true);
    expect(isLargeDonation(tx({ amount: 9_999 }), 10_000)).toBe(false);
  });

  it('expenses and practice rows are never news, however large', () => {
    expect(isLargeDonation(tx({ type: 'Expense', amount: 90_000 }), 10_000)).toBe(false);
    expect(isLargeDonation(tx({ isPractice: true, amount: 90_000 }), 10_000)).toBe(false);
  });

  it('a workspace threshold override is honoured', () => {
    expect(isLargeDonation(tx({ amount: 6_000 }), 5_000)).toBe(true);
    expect(isLargeDonation(tx({ amount: 6_000 }), 10_000)).toBe(false);
  });

  it('pickLargeDonations skips settled ids and below-line rows', () => {
    const notified = new Set([donationDedupeKey('tx-old')]);
    const out = pickLargeDonations(
      [tx({ id: 'tx-old' }), tx({ id: 'tx-small', amount: 500 }), tx({ id: 'tx-big' })],
      notified,
      10_000,
    );
    expect(out.map((n) => n.tx.id)).toEqual(['tx-big']);
    expect(out[0].dedupeKey).toBe('txn:tx-big');
  });
});

/* ----------------------------- plan stages --------------------------- */

const sub = (over: Partial<SubscriptionLike> = {}): SubscriptionLike => ({
  planId: 'STANDARD',
  status: 'active',
  endDate: new Date(NOW + 30 * DAY).toISOString(),
  ...over,
});

describe('pickPlanStage', () => {
  it('silent while the period is comfortably ahead', () => {
    expect(pickPlanStage(sub(), 'ws-1', NOW)).toBeNull();
  });

  it('expiring inside the notice window, expiring AT the period end', () => {
    const end = NOW + 5 * DAY;
    const n = pickPlanStage(sub({ endDate: new Date(end).toISOString() }), 'ws-1', NOW);
    expect(n?.stage).toBe('expiring');
    expect(n?.daysLeft).toBe(5);
    expect(n?.expiresAt).toBe(end);
    expect(n?.dedupeKey).toBe(planDedupeKey('ws-1', end, 'expiring'));
    expect(PLAN_EXPIRY_NOTICE_DAYS).toBe(7);
  });

  it('the window edge: exactly 7 days speaks, 8 does not', () => {
    const at7 = pickPlanStage(sub({ endDate: new Date(NOW + 7 * DAY).toISOString() }), 'ws-1', NOW);
    expect(at7?.stage).toBe('expiring');
    const at8 = pickPlanStage(sub({ endDate: new Date(NOW + 8 * DAY).toISOString() }), 'ws-1', NOW);
    expect(at8).toBeNull();
  });

  it('grace once the period ends, expiring at the grace end', () => {
    const end = NOW - 2 * DAY;
    const n = pickPlanStage(sub({ endDate: new Date(end).toISOString() }), 'ws-1', NOW);
    expect(n?.stage).toBe('grace');
    expect(n?.expiresAt).toBe(end + 7 * DAY);
  });

  it('expired past grace — and a plan first seen lapsed speaks expired, never a stale stage', () => {
    const end = NOW - 30 * DAY;
    const n = pickPlanStage(sub({ endDate: new Date(end).toISOString() }), 'ws-1', NOW);
    expect(n?.stage).toBe('expired');
    expect(n?.expiresAt).toBeUndefined();
  });

  it('renewal suppression is structural: a renewed period is a different key and a silent stage', () => {
    const oldEnd = NOW - 2 * DAY;
    const before = pickPlanStage(sub({ endDate: new Date(oldEnd).toISOString() }), 'ws-1', NOW);
    expect(before?.stage).toBe('grace');
    const renewed = sub({ endDate: new Date(NOW + 365 * DAY).toISOString() });
    expect(pickPlanStage(renewed, 'ws-1', NOW)).toBeNull();
    expect(planDedupeKey('ws-1', NOW + 365 * DAY, 'grace')).not.toBe(before?.dedupeKey);
  });

  it('no subscription doc (free workspace) and lifetime plans stay silent', () => {
    expect(pickPlanStage(null, 'ws-1', NOW)).toBeNull();
    expect(pickPlanStage(undefined, 'ws-1', NOW)).toBeNull();
    expect(pickPlanStage(sub({ endDate: null }), 'ws-1', NOW)).toBeNull();
  });
});
