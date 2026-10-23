/**
 * legacyCustodyDecisions.test.ts — owner decisions 2026-10-23 for the
 * legacy hundi desks, pinned as source contracts (the repo's style for
 * component-level laws):
 *  2. Demo seeds (fake ₹372,910 session, preset trustees/boxes in the
 *     counting desk; pre-filled counts in the blind desk) are gated
 *     to DEMO_ workspaces only.
 *  3. The legacy "PIN Verified" claim is relabelled as an honest
 *     attestation — badges render the dictionary string, and no
 *     user-facing text in the desk still claims PIN verification.
 *  4. The read-only Auditor cannot reach the posting desks (mount
 *     gate + canonical read set + layout fallback).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { AUDITOR_READ_DESKS } from '../../../lib/deskVisibility';

const read = (rel: string) =>
  readFileSync(join(__dirname, '..', '..', '..', '..', rel), 'utf8');

const countingDesk = read('src/components/domain2/HundiCountingAuditDesk.tsx');
const blindDesk = read('src/components/domain2/BlindHundiAuditDesk.tsx');
const app = read('src/App.tsx');
const layout = read('src/components/Domain2Layout.tsx');

describe('decision 2 — demo seeds gated to DEMO_ workspaces', () => {
  it('the counting desk computes the DEMO_ gate once', () => {
    expect(countingDesk).toContain(
      "const isDemoWorkspace = !!activeWorkspace?.id?.startsWith('DEMO_');"
    );
  });

  it('the fake past session seeds only in demo workspaces', () => {
    expect(countingDesk).toContain('if (!isDemoWorkspace) return [];');
    // …and the known seed id is purged from stored history elsewhere.
    expect(countingDesk).toContain("s.id !== 'hundi-sess-prev-1'");
  });

  it('preset trustees and named demo boxes render only in demo workspaces', () => {
    expect(countingDesk).toContain(
      'const visibleTrustees = isDemoWorkspace ? PRESET_TRUSTEES : [];'
    );
    expect(countingDesk).toContain(
      'const visibleBoxes = isDemoWorkspace ? HUNDI_BOXES : GENERIC_HUNDI_BOXES;'
    );
    expect(countingDesk).toContain('{visibleBoxes.map((box) => (');
  });

  it('the blind desk pre-fills sample counts only in demo workspaces', () => {
    expect(blindDesk).toContain(
      "() => (isDemoWorkspace ? { ...SAMPLE_COUNTS } : { ...INITIAL_COUNTS })"
    );
  });
});

describe('decision 3 — PIN honesty (attestation, not verification)', () => {
  it('both attestation badges render the dictionary string', () => {
    const occurrences =
      countingDesk.split("{t('org.finance.hundiAudit.pinVerified')}").length - 1;
    expect(occurrences).toBe(2);
  });

  it('no hard-coded "PIN Verified" claim remains in the desk', () => {
    expect(countingDesk).not.toContain('PIN Verified');
    expect(countingDesk).not.toContain('Authenticated with PIN!');
  });

  it('the dictionary values say attested, not verified (en/hi/bn)', () => {
    const en = read('src/i18n/lang/en/org.ts');
    const hi = read('src/i18n/lang/hi/org.ts');
    const bn = read('src/i18n/lang/bn/org.ts');
    expect(en).toContain('pinVerified: "PIN entered — attested, not verified"');
    expect(hi).toContain('pinVerified: "PIN दर्ज — अभिपुष्टि मात्र, सत्यापित नहीं"');
    expect(bn).toContain('pinVerified: "PIN দেওয়া হয়েছে — শুধুমাত্র স্বীকারোক্তি, যাচাই করা নয়"');
  });
});

describe('decision 4 — the Auditor cannot reach a posting desk', () => {
  it("'hundi-audit' is out of the canonical Auditor read set", () => {
    expect(AUDITOR_READ_DESKS).not.toContain('hundi-audit');
    expect(AUDITOR_READ_DESKS).toContain('treasury');
  });

  it('the App.tsx hundi mount gate admits finance roles only', () => {
    const caseBlock = app.slice(
      app.indexOf("case 'hundi':"),
      app.indexOf("case 'cash-custody':")
    );
    expect(caseBlock).toContain(
      "checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <HundiCountingAuditDesk />"
    );
    expect(caseBlock).not.toContain("'Auditor'");
  });

  it('the Domain2 layout resolves hundi tabs to the read-only Audit Trail for an Auditor', () => {
    expect(layout).toContain(
      "return isAuditor ? <AuditTrailView /> : <BlindHundiAuditDesk />;"
    );
    expect(layout).toContain(
      "return isAuditor ? <AuditTrailView /> : <HundiCountingAuditDesk />;"
    );
  });
});
