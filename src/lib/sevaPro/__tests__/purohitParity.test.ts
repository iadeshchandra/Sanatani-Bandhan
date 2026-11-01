/**
 * PUROHIT-PARITY contract tests (2026-11-02; audit
 * ~/workspace/staging/purohit-parity/REPORT.md, PP-01→08).
 * =====================================================================
 * Every fixed defect has a pin here that FAILS on the pre-parity tree
 * for the defect's own reason (verified by running this suite against
 * the pristine tree), mirroring the FIX-B standard. Rules are checked
 * textually — no Firestore emulator exists in this environment (the
 * standing gap); the CI compiler + the live PATCH probe remain the
 * real measurements. Client pins are source-level (the FIX-B idiom),
 * plus behavioural checks on the converters the fixes stand on.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  normalizePurohitTier,
  computeEffectiveTier,
} from '../../../types/purohit';
import {
  purohitTierToSevaProTier,
  sevaProTierToPurohitTier,
} from '../tierMapping';

const root = resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const rules = read('firestore.rules');
const pStart = rules.indexOf('match /purohits/{purohitId}');
const pEnd = rules.indexOf('match /purohitAvailability', pStart);
const purohitBlock = rules.slice(pStart, pEnd);

const purohitCtx = read('src/context/PurohitContext.tsx');
const jyotishCtx = read('src/context/JyotishContext.tsx');
const verificationTab = read('src/components/purohit/tabs/VerificationTab.tsx');
const overviewTab = read('src/components/purohit/tabs/OverviewTab.tsx');
const findPurohit = read('src/components/purohit/FindPurohit.tsx');
const adminTabsJ = read('src/components/common/godmode/AdminTabsJ.tsx');

describe('PP-01/PP-02 — the rules claim machinery exists for purohits', () => {
  it('slices the purohits block', () => {
    expect(pStart).toBeGreaterThan(-1);
    expect(pEnd).toBeGreaterThan(pStart);
    expect(purohitBlock).toContain('allow update');
  });

  it('PP-02: create pins a zero anchored endorsement count at birth', () => {
    expect(purohitBlock).toContain(
      "request.resource.data.get('endorsementCount', 0) == 0"
    );
  });

  it('PP-02: the owner branch pins both endorsement anchors', () => {
    expect(purohitBlock).toContain(
      "request.resource.data.get('endorsementCount', 0) == resource.data.get('endorsementCount', 0)"
    );
    expect(purohitBlock).toContain(
      "request.resource.data.get('lastEndorsementId', '') == resource.data.get('lastEndorsementId', '')"
    );
  });

  it('PP-02: an anchored endorsement branch moves only the anchors, naming a NEW endorsements doc', () => {
    expect(purohitBlock).toContain(
      "hasOnly(['endorsementCount', 'lastEndorsementId', 'updatedAt'])"
    );
    expect(purohitBlock).toContain('p1PurohitEndorsementOk(purohitId)');
    expect(rules).toContain('function p1PurohitEndorsementOk(purohitId)');
    expect(rules).toContain('documents/endorsements/$(eid)');
    expect(rules).toContain(
      "getAfter(epath).data.get('purohitId', '') == purohitId"
    );
    expect(rules).toContain(
      "request.resource.data.get('endorsementCount', 0) == resource.data.get('endorsementCount', 0) + 1"
    );
  });

  it('PP-01: a claim branch lets the owner write ONLY verificationTier + updatedAt', () => {
    expect(purohitBlock).toContain("hasOnly(['verificationTier', 'updatedAt'])");
    expect(purohitBlock).toContain('purohitTierClaimOk()');
    expect(rules).toContain('function purohitTierClaimOk()');
  });

  it('PP-01: the claim validator mirrors the ladder (own bar per step, legacy heal)', () => {
    expect(rules).toContain("to == 'ORG_ENDORSED'");
    expect(rules).toContain("to == 'PLATFORM_VERIFIED'");
    expect(rules).toContain("from == 'CREDENTIAL_VERIFIED' || from == 'VERIFIED'");
    expect(rules).toContain('endorsements >= 1 && gigs >= 10 && rating >= 4.5');
    // the purohit merit field is completedGigs (not consultations)
    const claimFn = rules.slice(
      rules.indexOf('function purohitTierClaimOk()'),
      rules.indexOf('function purohitTierClaimOk()') + 1200
    );
    expect(claimFn).toContain("resource.data.get('completedGigs', 0)");
  });
});

describe('PP-03 — endorsePurohit is transactional; the dead tier sync is gone', () => {
  it('writes the endorsement + anchored counter in one transaction', () => {
    expect(purohitCtx).toContain('endorsementCount: prevCount + 1');
    expect(purohitCtx).toContain('lastEndorsementId: ref.id');
    expect(purohitCtx).toContain('await runTransaction(db, async (tx)');
  });

  it('no longer attempts a direct verificationTier write from the endorser', () => {
    expect(purohitCtx).not.toContain("verificationTier: 'ORG_ENDORSED'");
    expect(purohitCtx).not.toContain('tier sync is best-effort');
  });
});

describe('PP-04 — a denied claim speaks on both purohit claim surfaces', () => {
  it('Verification tab catches the claim promise with friendlyError', () => {
    expect(verificationTab).toContain('claimTierAdvancement().catch');
    expect(verificationTab).toContain('friendlyError(err, t, ');
  });

  it('Overview tab catches the claim promise with friendlyError', () => {
    expect(overviewTab).toContain('claimTierAdvancement().catch');
    expect(overviewTab).toContain('friendlyError(err, t, ');
  });
});

describe('PP-05 — the endorsement loop can start (FindPurohit endorse surface)', () => {
  it('mounts an EndorseForm wired to endorsePurohit', () => {
    expect(findPurohit).toContain('EndorseForm');
    expect(findPurohit).toContain('endorsePurohit(purohitId, text');
    expect(findPurohit).toContain('Endorse as organisation');
  });
});

describe('PP-06 — GodMode converts the stored tier, never casts it', () => {
  it('lookup initialises the select through the converter + normaliser', () => {
    expect(adminTabsJ).toContain(
      'purohitTierToSevaProTier(normalizePurohitTier(p.verificationTier))'
    );
    expect(adminTabsJ).not.toContain('(p.verificationTier as SevaProTier)');
  });

  it('the header badge converts too', () => {
    expect(adminTabsJ).toContain(
      'tierBadge(purohitTierToSevaProTier(normalizePurohitTier(pro.verificationTier))'
    );
  });

  it('the conversion the fix stands on is truthful for every stored value', () => {
    // canonical pipeline values land on their true SevaPro step
    expect(purohitTierToSevaProTier(normalizePurohitTier('REGISTERED'))).toBe('REGISTERED');
    expect(purohitTierToSevaProTier(normalizePurohitTier('CREDENTIAL_VERIFIED'))).toBe('VERIFIED');
    expect(purohitTierToSevaProTier(normalizePurohitTier('ORG_ENDORSED'))).toBe('VERIFIED');
    expect(purohitTierToSevaProTier(normalizePurohitTier('PLATFORM_VERIFIED'))).toBe('TRUSTED');
    // legacy dialect values heal to the same display step
    expect(purohitTierToSevaProTier(normalizePurohitTier('VERIFIED'))).toBe('VERIFIED');
    expect(purohitTierToSevaProTier(normalizePurohitTier('TRUSTED'))).toBe('TRUSTED');
    // A manual set from the displayed step writes that step back
    // unchanged for every tier the SevaPro dialect can represent —
    // the property the old cast violated (it wrote REGISTERED for
    // all of them).
    for (const tier of ['REGISTERED', 'CREDENTIAL_VERIFIED', 'PLATFORM_VERIFIED'] as const) {
      expect(
        sevaProTierToPurohitTier(purohitTierToSevaProTier(normalizePurohitTier(tier)))
      ).toBe(tier);
    }
    // Documented expressive limit (tierMapping's own rationale): the
    // 3-step SevaPro manual control has NO ORG_ENDORSED step — it
    // displays as VERIFIED, so a manual set from there writes
    // CREDENTIAL_VERIFIED. The write still passes through
    // setTierManual's audit note + before/after record. This is the
    // program's vocabulary limit, not a silent demotion to REGISTERED
    // (the pre-fix behaviour this batch removes).
    expect(
      sevaProTierToPurohitTier(purohitTierToSevaProTier(normalizePurohitTier('ORG_ENDORSED')))
    ).toBe('CREDENTIAL_VERIFIED');
  });
});

describe('PP-07 — marketplace ranking ranks by the normalised tier (both twins)', () => {
  it('browsePurohits normalises before ranking', () => {
    expect(purohitCtx).toContain('rank[normalizePurohitTier(a.verificationTier)]');
  });

  it('browseJyotishis normalises before ranking (whole-class twin)', () => {
    expect(jyotishCtx).toContain('rank[normalizePurohitTier(a.verificationTier)]');
  });

  it('legacy dialect values normalise to their true ladder step', () => {
    expect(normalizePurohitTier('TRUSTED')).toBe('PLATFORM_VERIFIED');
    expect(normalizePurohitTier('VERIFIED')).toBe('CREDENTIAL_VERIFIED');
  });
});

describe('PP-08 — the checklist no longer promises the pre-JY-05 shortcut', () => {
  it('the live Verification checklist drops "or an endorsement"', () => {
    expect(verificationTab).not.toContain('or an endorsement');
    expect(verificationTab).toContain('(need 10 gigs @ ≥ 4.5)');
  });

  it('the (currently unreferenced) English needTen strings agree', () => {
    expect(read('src/i18n/lang/en.ts')).not.toContain('or an endorsement');
    expect(read('src/i18n/lang/en/professional.ts')).not.toContain(
      'or an endorsement'
    );
  });
});

describe('claim truth table — client ladder agrees with the rules validator', () => {
  it('endorsement earns ORG_ENDORSED, and no further', () => {
    expect(computeEffectiveTier('CREDENTIAL_VERIFIED', 1, 0, 0)).toBe('ORG_ENDORSED');
  });

  it('no endorsement → no step, even with the merit bar met', () => {
    expect(computeEffectiveTier('CREDENTIAL_VERIFIED', 0, 10, 5)).toBe(
      'CREDENTIAL_VERIFIED'
    );
  });

  it('endorsement AND the merit bar together reach PLATFORM_VERIFIED', () => {
    expect(computeEffectiveTier('CREDENTIAL_VERIFIED', 1, 10, 4.5)).toBe(
      'PLATFORM_VERIFIED'
    );
    expect(computeEffectiveTier('ORG_ENDORSED', 1, 9, 5)).toBe('ORG_ENDORSED');
  });

  it('a legacy VERIFIED doc claims into the canonical ladder (heal path)', () => {
    expect(computeEffectiveTier('VERIFIED', 1, 0, 0)).toBe('ORG_ENDORSED');
  });
});
