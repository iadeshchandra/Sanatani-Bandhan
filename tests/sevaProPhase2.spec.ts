/**
 * sevaProPhase2.spec.ts — Pratham Seva program (Phase 2) unit tests.
 * Pure-logic tests: tiers, welcome-reward engine, trilingual copy,
 * and a static safety check on the Firestore rules snippet
 * (no `if`/`let` inside function bodies — rules language forbids it).
 */
import * as fs from 'fs';
import * as path from 'path';
import { sevaProCopy, REJECT_TEMPLATE_KEYS } from '../src/lib/sevaPro/copy';
import {
  tierRank, tierBadge, getTier, canAcceptPaidSevas, getsTopPlacement,
  qualifiesForTrusted, isTierAdvancement, TIER_ORDER,
} from '../src/lib/sevaPro/tiers';
import {
  DEFAULT_PRATHAM_CONFIG, scheduleMultiplierFor, effectiveCommissionPercent,
  schedulePosition, buildWelcomeRewardGrant, consumeFreeSeva,
  addBonusFreeSevas, welcomeBlessing, sanitizeConfig,
} from '../src/lib/sevaPro/prathamSeva';

describe('tiers', () => {
  test('TIER_ORDER is ascending trust', () => {
    expect(TIER_ORDER).toEqual(['REGISTERED', 'VERIFIED', 'TRUSTED']);
  });

  test('getTier defaults unknown/missing to REGISTERED', () => {
    expect(getTier(null)).toBe('REGISTERED');
    expect(getTier({})).toBe('REGISTERED');
    expect(getTier({ verificationTier: 'GODMODE' })).toBe('REGISTERED');
    expect(getTier({ verificationTier: 'VERIFIED' })).toBe('VERIFIED');
  });

  test('canAcceptPaidSevas gates REGISTERED out', () => {
    expect(canAcceptPaidSevas('REGISTERED')).toBe(false);
    expect(canAcceptPaidSevas('VERIFIED')).toBe(true);
    expect(canAcceptPaidSevas('TRUSTED')).toBe(true);
    expect(canAcceptPaidSevas(undefined)).toBe(false);
  });

  test('only TRUSTED gets top placement', () => {
    expect(getsTopPlacement('TRUSTED')).toBe(true);
    expect(getsTopPlacement('VERIFIED')).toBe(false);
  });

  test('tierBadge carries warm, non-corporate copy in all languages', () => {
    for (const lang of ['en', 'bn', 'hi'] as const) {
      const v = tierBadge('VERIFIED', lang);
      expect(v.label).toContain('✓');
      expect(v.blessing.length).toBeGreaterThan(10);
      const t = tierBadge('TRUSTED', lang);
      expect(t.label).toContain('🌟');
      const r = tierBadge('REGISTERED', lang);
      expect(r.icon).toBe('🪔');
    }
    // never compliance language
    const all = ['en', 'bn', 'hi'].map((l) => tierBadge('VERIFIED', l as any).blessing).join(' ');
    expect(all).not.toMatch(/KYC|compliance/i);
  });

  test('qualifiesForTrusted requires all three bars', () => {
    const ok = qualifiesForTrusted({ completedSevas: 12, rating: 4.8, ratingCount: 5, templeEndorsements: 1 });
    expect(ok.eligible).toBe(true);
    expect(ok.missing).toEqual([]);

    const short = qualifiesForTrusted({ completedSevas: 4, rating: 5, ratingCount: 5, templeEndorsements: 1 });
    expect(short.eligible).toBe(false);
    expect(short.missing.join(' ')).toMatch(/completed sevas/);

    const lowRated = qualifiesForTrusted({ completedSevas: 12, rating: 4.2, ratingCount: 10, templeEndorsements: 1 });
    expect(lowRated.eligible).toBe(false);

    const noEndorse = qualifiesForTrusted({ completedSevas: 12, rating: 4.9, ratingCount: 10, templeEndorsements: 0 });
    expect(noEndorse.eligible).toBe(false);
    expect(noEndorse.missing.join(' ')).toMatch(/endorsement/);
  });

  test('isTierAdvancement never mistakes a downgrade', () => {
    expect(isTierAdvancement('REGISTERED', 'VERIFIED')).toBe(true);
    expect(isTierAdvancement('VERIFIED', 'TRUSTED')).toBe(true);
    expect(isTierAdvancement('TRUSTED', 'VERIFIED')).toBe(false);
    expect(isTierAdvancement('VERIFIED', 'VERIFIED')).toBe(false);
    expect(tierRank('TRUSTED')).toBeGreaterThan(tierRank('REGISTERED'));
  });
});

describe('prathamSeva reward engine', () => {
  const schedule = DEFAULT_PRATHAM_CONFIG.commissionSchedule; // [{3,0},{5,0.06},{1.0}]

  test('scheduleMultiplierFor walks brackets in order', () => {
    expect(scheduleMultiplierFor(schedule, 0)).toBe(0);
    expect(scheduleMultiplierFor(schedule, 2)).toBe(0);
    expect(scheduleMultiplierFor(schedule, 3)).toBe(0.06);
    expect(scheduleMultiplierFor(schedule, 7)).toBe(0.06);
    expect(scheduleMultiplierFor(schedule, 8)).toBe(1.0);
    expect(scheduleMultiplierFor(schedule, 500)).toBe(1.0);
    expect(scheduleMultiplierFor([], 3)).toBe(1.0);
  });

  test('effectiveCommissionPercent: free sevas first, then easing, then full', () => {
    // freeSevasRemaining > 0 → 0%
    expect(effectiveCommissionPercent(12, DEFAULT_PRATHAM_CONFIG, 0, 3)).toBe(0);
    // no free sevas left → schedule applies (12% * 0.06 = 0.72%)
    expect(effectiveCommissionPercent(12, DEFAULT_PRATHAM_CONFIG, 3, 0)).toBe(0.72);
    // graduated → full standard rate
    expect(effectiveCommissionPercent(12, DEFAULT_PRATHAM_CONFIG, 8, 0)).toBe(12);
    expect(effectiveCommissionPercent(12, DEFAULT_PRATHAM_CONFIG, 100, 0)).toBe(12);
  });

  test('schedulePosition reports the blessing state', () => {
    const p = schedulePosition(DEFAULT_PRATHAM_CONFIG, 0, 3, 'en');
    expect(p.inFreeSevas).toBe(true);
    expect(p.bracketLabel).toMatch(/3/);
    const q = schedulePosition(DEFAULT_PRATHAM_CONFIG, 8, 0, 'en');
    expect(q.inFreeSevas).toBe(false);
    expect(q.bracketLabel).toMatch(/full standard rate/);
  });

  test('buildWelcomeRewardGrant snapshots the promised schedule', () => {
    const grant = buildWelcomeRewardGrant(DEFAULT_PRATHAM_CONFIG, '2026-10-17T00:00:00.000Z');
    expect(grant.freeSevasRemaining).toBe(3);
    expect(grant.completedSevasSinceVerified).toBe(0);
    expect(grant.prathamSevaConfigSnapshot.commissionSchedule).toEqual(schedule);
    // deep copy — mutating the grant must not touch the config
    grant.prathamSevaConfigSnapshot.commissionSchedule[0].rate = 0.99;
    expect(DEFAULT_PRATHAM_CONFIG.commissionSchedule[0].rate).toBe(0);
  });

  test('consumeFreeSeva never goes below zero', () => {
    expect(consumeFreeSeva(3)).toBe(2);
    expect(consumeFreeSeva(1)).toBe(0);
    expect(consumeFreeSeva(0)).toBe(0);
  });

  test('addBonusFreeSevas stacks on top', () => {
    expect(addBonusFreeSevas(2, 5)).toBe(7);
    expect(addBonusFreeSevas(0, 0)).toBe(0);
  });

  test('welcomeBlessing uses the sacred-credentials copy', () => {
    const b = welcomeBlessing(DEFAULT_PRATHAM_CONFIG, 'en');
    expect(b.title).toBe('🪔 Your sacred credentials are honored');
    expect(b.body).toBe('Your first 3 sevas are offered commission-free — may your service bring light.');
    // trilingual
    expect(welcomeBlessing(DEFAULT_PRATHAM_CONFIG, 'bn').body).toContain('কমিশনমুক্ত');
    expect(welcomeBlessing(DEFAULT_PRATHAM_CONFIG, 'hi').body).toContain('कमीशन-मुक्त');
  });

  test('sanitizeConfig clamps admin input and falls back on empty schedule', () => {
    const c = sanitizeConfig({ defaultFreeSevas: 999, trustedBoostDays: -5, commissionSchedule: [] });
    expect(c.defaultFreeSevas).toBe(50);
    expect(c.trustedBoostDays).toBe(0);
    expect(c.commissionSchedule).toEqual(DEFAULT_PRATHAM_CONFIG.commissionSchedule);

    const d = sanitizeConfig({ commissionSchedule: [{ sevas: 2, rate: 5 }, { rate: -1 }] });
    expect(d.commissionSchedule[0].rate).toBe(1); // clamped
    expect(d.commissionSchedule[1].rate).toBe(0); // clamped
  });
});

describe('trilingual copy', () => {
  test('interpolation works and fallback returns the key', () => {
    expect(sevaProCopy('en', 'welcomeRewardBody', { n: 3 })).toContain('3');
    expect(sevaProCopy('bn', 'progressLabel', { done: 2, total: 5 })).toContain('2');
    expect(sevaProCopy('en', 'noSuchKey' as any)).toBe('noSuchKey');
  });

  test('reject templates exist in all three languages', () => {
    expect(REJECT_TEMPLATE_KEYS.length).toBeGreaterThanOrEqual(3);
    for (const k of REJECT_TEMPLATE_KEYS) {
      for (const lang of ['en', 'bn', 'hi'] as const) {
        const text = sevaProCopy(lang, k as any);
        expect(text.length).toBeGreaterThan(20);
        expect(text).not.toBe(k);
      }
    }
  });

  test('no corporate-cold language anywhere in the copy', () => {
    const keys = [
      'programTagline', 'tierVerifiedBlessing', 'welcomeRewardBody', 'applyIntro',
      'docGovtIdHint', 'applicationSubmitted', 'approveLabel', 'rejectLabel',
    ];
    const corpus = keys.map((k) => sevaProCopy('en', k as any)).join(' ');
    expect(corpus).not.toMatch(/KYC|compliance|background check|audit/i);
  });
});

describe('firestore rules snippet safety', () => {
  const snippetPath = path.join(__dirname, '..', 'firestore', 'prathamSeva.rules');
  const altPath = path.join(
    process.env.HOME || '', 'workspace/sanatani-bandhan/seva-pro/phase2/firestore/prathamSeva.rules'
  );

  function loadSnippet(): string {
    for (const p of [snippetPath, altPath]) {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    }
    throw new Error('prathamSeva.rules snippet not found next to the test');
  }

  test('covers prathamSevaConfig + both application collections, deny-by-default', () => {
    const src = loadSnippet();
    expect(src).toMatch(/match \/prathamSevaConfig\//);
    expect(src).toMatch(/match \/purohitApplications\//);
    expect(src).toMatch(/match \/jyotishApplications\//);
    expect(src).toMatch(/allow delete: if false/);
  });

  test('no `if` statements or `let` bindings inside function bodies', () => {
    const src = loadSnippet();
    const lines = src.split('\n');
    const offenders = lines.filter((l) => {
      const t = l.trim();
      if (t.startsWith('//') || t.startsWith('*')) return false;
      return /^\s*if\s*\(/.test(l) || /^\s*let\s+[a-zA-Z_$]/.test(l);
    });
    expect(offenders).toEqual([]);
  });

  test('applicants cannot self-grant review fields on create', () => {
    const src = loadSnippet();
    for (const field of ['tier', 'freeSevasRemaining', 'boostUntil', 'reviewedBy', 'reviewNote']) {
      expect(src).toContain(`request.resource.data.get('${field}'`);
    }
  });
});
