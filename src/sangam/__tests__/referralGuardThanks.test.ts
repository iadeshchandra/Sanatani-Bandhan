/**
 * QUEUED #25 — referral self-guard wiring + sharer thanks decisions.
 * ============================================================
 * Pure logic only (Firestore/watcher live in referralThanksService.ts):
 *  - resolveReferralAttribution: THE gate both booking paths pass
 *    through before `referredBy` is stored. Self-referrals and
 *    unverifiable attributions resolve to null — silently.
 *  - pickReferralThanks: which claims ring the sharer's one gentle
 *    Suchana bell (baseline law, recency window, per-check cap,
 *    once-per-claim ledger).
 */
import {
  resolveReferralAttribution,
  pickReferralThanks,
  referralThanksDedupeKey,
  REFERRAL_THANKS_RECENCY_MS,
  type ReferralClaimLite,
} from '../referrals';

const NOW = 1_760_000_000_000;
const claim = (id: string, createdAtMs: number, providerName = 'Pandit Ravi'): ReferralClaimLite => ({
  id,
  providerName,
  createdAtMs,
});

describe('resolveReferralAttribution — the self-guard gate', () => {
  it('passes a genuine referral from another devotee', () => {
    expect(resolveReferralAttribution('SAN-ABC123', 'SAN-XYZ789')).toBe('SAN-ABC123');
  });

  it('rejects self-referral — the audit gap', () => {
    expect(resolveReferralAttribution('SAN-ABC123', 'SAN-ABC123')).toBeNull();
  });

  it('rejects self-referral case-insensitively and with stray spaces', () => {
    expect(resolveReferralAttribution(' san-abc123 ', 'SAN-ABC123')).toBeNull();
    expect(resolveReferralAttribution('SAN-ABC123', 'san-abc123')).toBeNull();
  });

  it('normalizes a genuine lowercase ref to canonical form', () => {
    expect(resolveReferralAttribution('san-abc123', 'SAN-XYZ789')).toBe('SAN-ABC123');
  });

  it('drops attribution when the booker SAN-ID is unknown (unverifiable never earns credit)', () => {
    expect(resolveReferralAttribution('SAN-ABC123', null)).toBeNull();
    expect(resolveReferralAttribution('SAN-ABC123', undefined)).toBeNull();
    expect(resolveReferralAttribution('SAN-ABC123', '')).toBeNull();
    expect(resolveReferralAttribution('SAN-ABC123', 'not-a-san-id')).toBeNull();
  });

  it('drops malformed or absent refs', () => {
    expect(resolveReferralAttribution(null, 'SAN-XYZ789')).toBeNull();
    expect(resolveReferralAttribution('', 'SAN-XYZ789')).toBeNull();
    expect(resolveReferralAttribution('BOGUS', 'SAN-XYZ789')).toBeNull();
    expect(resolveReferralAttribution('SAN-ABC12', 'SAN-XYZ789')).toBeNull(); // too short
  });
});

describe('pickReferralThanks — one gentle bell per referred booking', () => {
  it('baseline (first check on a device) rings nothing and marks everything seen', () => {
    const claims = [claim('o1', NOW - 1000), claim('o2', NOW - 2000)];
    const r = pickReferralThanks({ claims, thanked: {}, now: NOW, baseline: true });
    expect(r.notify).toEqual([]);
    expect(Object.keys(r.markThanked).sort()).toEqual(['o1', 'o2']);
  });

  it('rings for a fresh unseen claim and marks it thanked', () => {
    const r = pickReferralThanks({
      claims: [claim('o1', NOW - 60_000)],
      thanked: {},
      now: NOW,
      baseline: false,
    });
    expect(r.notify.map((c) => c.id)).toEqual(['o1']);
    expect(r.markThanked).toEqual({ o1: NOW });
  });

  it('never re-rings an already-thanked claim', () => {
    const r = pickReferralThanks({
      claims: [claim('o1', NOW - 60_000)],
      thanked: { o1: NOW - 1000 },
      now: NOW,
      baseline: false,
    });
    expect(r.notify).toEqual([]);
    expect(r.markThanked).toEqual({});
  });

  it('rings oldest first', () => {
    const claims = [claim('new', NOW - 1000), claim('old', NOW - 9000)];
    const r = pickReferralThanks({ claims, thanked: {}, now: NOW, baseline: false });
    expect(r.notify.map((c) => c.id)).toEqual(['old', 'new']);
  });

  it('caps bells per check and leaves the overflow unmarked for a later check', () => {
    const claims = [claim('o1', NOW - 3000), claim('o2', NOW - 2000), claim('o3', NOW - 1000)];
    const r = pickReferralThanks({ claims, thanked: {}, now: NOW, baseline: false });
    expect(r.notify.map((c) => c.id)).toEqual(['o1', 'o2']);
    expect(r.markThanked).toEqual({ o1: NOW, o2: NOW });
    // Next check: o3 is still fresh and now rings.
    const r2 = pickReferralThanks({
      claims,
      thanked: { ...r.markThanked },
      now: NOW + 60_000,
      baseline: false,
    });
    expect(r2.notify.map((c) => c.id)).toEqual(['o3']);
  });

  it('retires stale claims silently (marked, never rung)', () => {
    const stale = claim('old', NOW - REFERRAL_THANKS_RECENCY_MS - 1);
    const r = pickReferralThanks({ claims: [stale], thanked: {}, now: NOW, baseline: false });
    expect(r.notify).toEqual([]);
    expect(r.markThanked).toEqual({ old: NOW });
  });

  it('a claim exactly at the recency edge still rings', () => {
    const edge = claim('edge', NOW - REFERRAL_THANKS_RECENCY_MS);
    const r = pickReferralThanks({ claims: [edge], thanked: {}, now: NOW, baseline: false });
    expect(r.notify.map((c) => c.id)).toEqual(['edge']);
  });

  it('carries the provider name through for the warm copy (booker never named)', () => {
    const r = pickReferralThanks({
      claims: [claim('o1', NOW - 1000, 'Jyotishi Mira')],
      thanked: {},
      now: NOW,
      baseline: false,
    });
    expect(r.notify[0].providerName).toBe('Jyotishi Mira');
  });
});

describe('referralThanksDedupeKey', () => {
  it('is stable per order and matches the notify helper prefix', () => {
    expect(referralThanksDedupeKey('order42')).toBe('refthanks:order42');
    expect(referralThanksDedupeKey('order42')).toBe(referralThanksDedupeKey('order42'));
    expect(referralThanksDedupeKey('order42')).not.toBe(referralThanksDedupeKey('order43'));
  });
});
