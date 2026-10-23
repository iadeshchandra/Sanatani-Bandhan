/**
 * securityP1.contract.test.ts — SECURITY P1 source contracts.
 * =====================================================================
 * Pins the client halves of the batch so a future refactor cannot
 * quietly reopen a finding:
 *   F1 — rating writes carry their anchors; the unanchored absolute
 *        "recompute" writers are gone.
 *   F3 — the org-page projection never stamps `verified` again.
 *   F4 — App Check is wired at the single Firebase init, dormant
 *        without a key and fail-open.
 *   F5 — the donor-facing flows claim receipt numbers from the shared
 *        counter and fall back to marked PROVISIONAL numbers.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

describe('F1: rating aggregates move only with their anchors', () => {
  it('marketplace submitGigRating stamps lastRatedOrderId in the same transaction', () => {
    const src = read('lib/marketplace.ts');
    expect(src).toMatch(/lastRatedOrderId: orderId/);
  });
  it('PurohitContext: no absolute recompute writer remains; submit is transactional + anchored', () => {
    const src = read('context/PurohitContext.tsx');
    expect(src).not.toMatch(/const recomputeAggregate/);
    expect(src).toMatch(/runTransaction/);
    expect(src).toMatch(/lastReviewId: id/);
    expect(src).toMatch(/lastCompletedGigId: gig\.id/);
  });
  it('JyotishContext: same anchored shape', () => {
    const src = read('context/JyotishContext.tsx');
    expect(src).not.toMatch(/const recomputeAggregate/);
    expect(src).toMatch(/runTransaction/);
    expect(src).toMatch(/lastReviewId: id/);
    expect(src).toMatch(/lastCompletedConsultationId: c\.id/);
  });
});

describe('F3: the org projection never self-verifies', () => {
  it('syncOrgPage does not write a verified field', () => {
    const src = read('context/MembershipContext.tsx');
    expect(src).not.toMatch(/^\s+verified: true,$/m);
  });
});

describe('F4: App Check wiring', () => {
  it('lib/firebase initialises App Check right after initializeApp', () => {
    const src = read('lib/firebase.ts');
    expect(src).toMatch(/initAppCheck\(app\)/);
  });
  it('appCheck is dormant without a key and fail-open', () => {
    const src = read('lib/appCheck.ts');
    expect(src).toMatch(/VITE_FIREBASE_APPCHECK_SITE_KEY/);
    expect(src).toMatch(/ReCaptchaEnterpriseProvider/);
    expect(src).toMatch(/continuing without it/);
  });
});

describe('F5: donor-facing flows claim receipt numbers', () => {
  it('QuickChandaPOS claims SB-CHANDA and falls back to a provisional number', () => {
    const src = read('components/domain2/QuickChandaPOS.tsx');
    expect(src).toMatch(/claimNextReceiptSeq\(/);
    expect(src).toMatch(/formatProvisionalReceiptNumber\('SB-CHANDA'/);
  });
  it('BhandaraTab claims SB-80G and falls back to a provisional number', () => {
    const src = read('annakshetra/BhandaraTab.tsx');
    expect(src).toMatch(/claimNextReceiptSeq\(/);
    expect(src).toMatch(/formatProvisionalReceiptNumber\('SB-80G'/);
  });
  it('DataContext seeds/advances the shared counters', () => {
    const src = read('context/DataContext.tsx');
    expect(src).toMatch(/ensureReceiptCounter\(/);
    expect(src).toMatch(/advanceReceiptCounter\(/);
  });
});
