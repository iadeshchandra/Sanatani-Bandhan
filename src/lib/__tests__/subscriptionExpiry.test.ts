/**
 * subscriptionExpiry.test.ts — AUDIT FIX #7.
 * Pure-logic tests: expiry math, grace period, downgrade, tier resolution.
 */
import {
  GRACE_PERIOD_DAYS,
  getSubscriptionStatus,
  effectivePlanId,
  daysUntilExpiry,
  isExpiringSoon,
} from '../subscriptionExpiry';

const DAY = 86400000;
const NOW = Date.parse('2026-10-19T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

describe('getSubscriptionStatus', () => {
  it('returns none when there is no subscription doc', () => {
    expect(getSubscriptionStatus(null, NOW)).toBe('none');
    expect(getSubscriptionStatus(undefined, NOW)).toBe('none');
  });

  it('is active when endDate is in the future', () => {
    expect(getSubscriptionStatus({ status: 'active', endDate: iso(NOW + 30 * DAY) }, NOW)).toBe('active');
  });

  it('is active when there is no endDate (lifetime)', () => {
    expect(getSubscriptionStatus({ status: 'active' }, NOW)).toBe('active');
    expect(getSubscriptionStatus({ status: 'active', endDate: null }, NOW)).toBe('active');
  });

  it('is grace within the 7-day window after expiry', () => {
    expect(GRACE_PERIOD_DAYS).toBe(7);
    expect(getSubscriptionStatus({ status: 'active', endDate: iso(NOW - 1 * DAY) }, NOW)).toBe('grace');
    expect(getSubscriptionStatus({ status: 'active', endDate: iso(NOW - 6 * DAY) }, NOW)).toBe('grace');
  });

  it('is expired after the grace window', () => {
    expect(getSubscriptionStatus({ status: 'active', endDate: iso(NOW - 8 * DAY) }, NOW)).toBe('expired');
    expect(getSubscriptionStatus({ status: 'active', endDate: iso(NOW - 365 * DAY) }, NOW)).toBe('expired');
  });

  it('accepts epoch-ms endDates', () => {
    expect(getSubscriptionStatus({ endDate: NOW + DAY }, NOW)).toBe('active');
    expect(getSubscriptionStatus({ endDate: NOW - 30 * DAY }, NOW)).toBe('expired');
  });

  it('treats malformed endDate as active (fail-open, never locks out)', () => {
    expect(getSubscriptionStatus({ endDate: 'not-a-date' }, NOW)).toBe('active');
  });
});

describe('effectivePlanId', () => {
  it('keeps the workspace plan while active or in grace', () => {
    const active = { status: 'active', endDate: iso(NOW + 30 * DAY) };
    const grace = { status: 'active', endDate: iso(NOW - 3 * DAY) };
    expect(effectivePlanId('PREMIUM', active, NOW)).toBe('PREMIUM');
    expect(effectivePlanId('STANDARD', grace, NOW)).toBe('STANDARD');
  });

  it('downgrades expired paid plans to SEVA', () => {
    const expired = { status: 'active', endDate: iso(NOW - 30 * DAY) };
    expect(effectivePlanId('PREMIUM', expired, NOW)).toBe('SEVA');
    expect(effectivePlanId('STANDARD', expired, NOW)).toBe('SEVA');
  });

  it('leaves free workspaces alone (none → SEVA)', () => {
    expect(effectivePlanId(null, null, NOW)).toBe('SEVA');
    expect(effectivePlanId('SEVA', null, NOW)).toBe('SEVA');
  });

  it('never grants time on malformed data', () => {
    // Malformed endDate → active (fail-open), NOT expired — we never
    // surprise-downgrade on data we can't parse.
    expect(effectivePlanId('PREMIUM', { endDate: 'garbage' }, NOW)).toBe('PREMIUM');
  });
});

describe('daysUntilExpiry / isExpiringSoon', () => {
  it('computes days remaining (negative when past)', () => {
    expect(daysUntilExpiry({ endDate: iso(NOW + 10 * DAY) }, NOW)).toBe(10);
    expect(daysUntilExpiry({ endDate: iso(NOW - 2 * DAY) }, NOW)).toBe(-2);
    expect(daysUntilExpiry(null, NOW)).toBeNull();
  });

  it('flags expiring-soon within 14 days while active', () => {
    expect(isExpiringSoon({ endDate: iso(NOW + 10 * DAY) }, NOW)).toBe(true);
    expect(isExpiringSoon({ endDate: iso(NOW + 15 * DAY) }, NOW)).toBe(false);
    expect(isExpiringSoon({ endDate: iso(NOW - 40 * DAY) }, NOW)).toBe(false); // expired, not "soon"
  });
});
