/**
 * tierFixB.test.tsx — JY-FIX-B pins for the tier-dialect findings.
 * =====================================================================
 * JY-03: GodMode's professionals tab stamped the SevaPro dialect
 * ('VERIFIED') straight into profiles' canonical `verificationTier`,
 * skipping the converter — and readers indexing PUROHIT_TIER_META with
 * the corrupt value crashed (UnifiedProfessionalProfile) or rendered
 * an all-dimmed ladder. JY-05: computeEffectiveTier's platform step
 * tested `endorsementCount >= 1 || …`, so ONE endorsement silently
 * equalled the top tier.
 *
 * These tests fail on the pre-FIX-B tree for exactly those reasons:
 * normalizePurohitTier did not exist, the ladder jumped CV→PV on one
 * endorsement, and VerificationBadge threw on tier='VERIFIED'.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as fs from 'fs';
import * as path from 'path';
import {
  computeEffectiveTier,
  normalizePurohitTier,
  PUROHIT_TIERS,
  PUROHIT_TIER_META,
} from '../../../types/purohit';
import { sevaProTierToPurohitTier } from '../tierMapping';
import { VerificationBadge } from '../../../components/common/VerificationBadge';

describe('JY-03 — normalizePurohitTier heals legacy stored values', () => {
  test('canonical values pass through unchanged', () => {
    for (const t of PUROHIT_TIERS) expect(normalizePurohitTier(t)).toBe(t);
  });

  test("the GodMode-stamped dialect maps to what the approval actually granted", () => {
    // approveApplication honored CREDENTIALS — never org endorsement,
    // never platform verification.
    expect(normalizePurohitTier('VERIFIED')).toBe('CREDENTIAL_VERIFIED');
    expect(normalizePurohitTier('TRUSTED')).toBe('PLATFORM_VERIFIED');
  });

  test('unknown / missing values degrade to the safe floor, never throw', () => {
    expect(normalizePurohitTier('GOLD')).toBe('REGISTERED');
    expect(normalizePurohitTier('')).toBe('REGISTERED');
    expect(normalizePurohitTier(null)).toBe('REGISTERED');
    expect(normalizePurohitTier(undefined)).toBe('REGISTERED');
  });

  test('every converter output is a canonical pipeline tier (safe to store)', () => {
    for (const t of ['REGISTERED', 'VERIFIED', 'TRUSTED'] as const) {
      expect(PUROHIT_TIERS).toContain(sevaProTierToPurohitTier(t));
    }
  });

  test('SOURCE PIN: professionalsAdmin routes profile writes through the converter', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'professionalsAdmin.ts'),
      'utf8'
    );
    expect(src).toContain("sevaProTierToPurohitTier('VERIFIED')");
    expect(src).not.toContain("verificationTier: 'VERIFIED'");
    expect(src).not.toContain('verificationTier: tier,');
  });
});

describe('JY-03 — VerificationBadge renders a corrupt stored tier without crashing', () => {
  test("stored 'VERIFIED' shows the CREDENTIAL_VERIFIED badge", () => {
    const html = renderToString(
      <VerificationBadge tier={'VERIFIED' as never} subject="Jyotishi" />
    );
    expect(html).toContain(PUROHIT_TIER_META.CREDENTIAL_VERIFIED.label);
  });

  test("stored 'TRUSTED' shows the PLATFORM_VERIFIED badge", () => {
    const html = renderToString(
      <VerificationBadge tier={'TRUSTED' as never} subject="Purohit" />
    );
    expect(html).toContain(PUROHIT_TIER_META.PLATFORM_VERIFIED.label);
  });
});

describe('JY-05 — the ladder: every step tests its OWN criteria', () => {
  test('REGISTERED never auto-advances, whatever the evidence', () => {
    expect(computeEffectiveTier('REGISTERED', 9, 99, 5.0)).toBe('REGISTERED');
  });

  test('CREDENTIAL_VERIFIED + no endorsement stays put', () => {
    expect(computeEffectiveTier('CREDENTIAL_VERIFIED', 0, 99, 5.0)).toBe('CREDENTIAL_VERIFIED');
  });

  test('CREDENTIAL_VERIFIED + ≥1 endorsement → ORG_ENDORSED', () => {
    expect(computeEffectiveTier('CREDENTIAL_VERIFIED', 1, 0, 0)).toBe('ORG_ENDORSED');
  });

  test('REGRESSION: endorsements alone NEVER reach PLATFORM_VERIFIED', () => {
    // The audit's JY-05: one endorsement silently equalled the top tier.
    expect(computeEffectiveTier('CREDENTIAL_VERIFIED', 1, 0, 0)).not.toBe('PLATFORM_VERIFIED');
    expect(computeEffectiveTier('ORG_ENDORSED', 7, 0, 0)).toBe('ORG_ENDORSED');
    expect(computeEffectiveTier('ORG_ENDORSED', 7, 9, 5.0)).toBe('ORG_ENDORSED');
  });

  test('ORG_ENDORSED + merit bar (≥10 gigs @ ≥4.5) → PLATFORM_VERIFIED', () => {
    expect(computeEffectiveTier('ORG_ENDORSED', 0, 10, 4.5)).toBe('PLATFORM_VERIFIED');
    expect(computeEffectiveTier('ORG_ENDORSED', 1, 10, 4.5)).toBe('PLATFORM_VERIFIED');
  });

  test('ORG_ENDORSED just below the merit bar stays', () => {
    expect(computeEffectiveTier('ORG_ENDORSED', 0, 10, 4.4)).toBe('ORG_ENDORSED');
    expect(computeEffectiveTier('ORG_ENDORSED', 0, 9, 4.9)).toBe('ORG_ENDORSED');
  });

  test('PLATFORM_VERIFIED is stable', () => {
    expect(computeEffectiveTier('PLATFORM_VERIFIED', 0, 0, 0)).toBe('PLATFORM_VERIFIED');
  });

  test('a corrupt stored value is normalised before the ladder runs', () => {
    // Legacy doc stamped 'VERIFIED' (= CREDENTIAL_VERIFIED) with one
    // endorsement must read as ORG_ENDORSED, not wedge or crash.
    expect(computeEffectiveTier('VERIFIED', 1, 0, 0)).toBe('ORG_ENDORSED');
    expect(computeEffectiveTier('TRUSTED', 0, 0, 0)).toBe('PLATFORM_VERIFIED');
  });
});
