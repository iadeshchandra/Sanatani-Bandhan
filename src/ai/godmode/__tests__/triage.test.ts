/**
 * ai/godmode/__tests__/triage.test.ts — deterministic triage scoring.
 * ===================================================================
 * Pure-function tests: no Firestore, no network, no browser. Run with
 *   jest src/ai/godmode/__tests__/triage.test.ts
 */
import { scoreSuggestion } from '../triage';

describe('scoreSuggestion', () => {
  it('scores a good Tamil fix ≥ 80 (approve)', () => {
    const r = scoreSuggestion({
      lang: 'ta',
      key: 'guide.devotional.dana1',
      currentText: 'தானம் செய்யுங்கள்.',
      suggestedText: 'தானம் அளியுங்கள், புண்ணியம் பெறுங்கள்.',
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.recommendation).toBe('approve');
    expect(r.reasons.some((x) => x.includes('Tamil script'))).toBe(true);
  });

  it('rejects an empty suggestion', () => {
    const r = scoreSuggestion({
      lang: 'ta',
      key: 'guide.devotional.dana1',
      currentText: 'தானம் செய்யுங்கள்.',
      suggestedText: '   ',
    });
    expect(r.score).toBeLessThan(50);
    expect(r.recommendation).toBe('reject');
    expect(r.reasons.some((x) => x.toLowerCase().includes('empty'))).toBe(true);
  });

  it('flags Latin gibberish in a Tamil suggestion', () => {
    const r = scoreSuggestion({
      lang: 'ta',
      key: 'guide.devotional.dana1',
      currentText: 'தானம் செய்யுங்கள்.',
      suggestedText: 'xyzqwer asdfghjkl qwertyuiop zzzzzzzz',
    });
    expect(r.recommendation).not.toBe('approve');
    expect(
      r.reasons.some((x) => x.includes('Latin run') || x.includes('script'))
    ).toBe(true);
  });

  it('flags a suggestion identical to the current text', () => {
    const r = scoreSuggestion({
      lang: 'ta',
      key: 'guide.devotional.dana1',
      currentText: 'தானம் செய்யுங்கள்.',
      suggestedText: 'தானம் செய்யுங்கள்.',
    });
    expect(r.score).toBeLessThan(50);
    expect(r.recommendation).toBe('reject');
    expect(r.reasons.some((x) => x.includes('Identical'))).toBe(true);
  });

  it('flags a dropped never-translate term (Prasad missing)', () => {
    const r = scoreSuggestion({
      lang: 'ta',
      key: 'guide.devotional.prasad1',
      currentText: 'Offer Dakshina and take Prasad after the aarti.',
      suggestedText: 'தானம் அளியுங்கள்.',
    });
    expect(r.reasons.some((x) => x.includes('Prasad'))).toBe(true);
    expect(r.score).toBeLessThan(80);
  });

  it('flags extreme length ratios', () => {
    const r = scoreSuggestion({
      lang: 'ta',
      key: 'guide.devotional.dana1',
      currentText: 'தானம்.',
      suggestedText:
        'தானம் அளியுங்கள், புண்ணியம் பெறுங்கள், மனநிறைவு கொள்ளுங்கள், தெய்வ அருள் பெறுங்கள்.',
    });
    expect(r.reasons.some((x) => x.includes('longer'))).toBe(true);
    expect(r.score).toBeLessThan(80);
  });

  it('surfaces regional context without moving the score', () => {
    const base = {
      lang: 'ta',
      key: 'regional.tamil-nadu.temple',
      currentText: 'கோவில்',
      suggestedText: 'கோயில்',
    };
    const plain = scoreSuggestion(base);
    const regional = scoreSuggestion({ ...base, region: 'tamil-nadu', termKey: 'temple' });
    expect(regional.score).toBe(plain.score);
    expect(regional.reasons.some((x) => x.includes('tamil-nadu') && x.includes('temple'))).toBe(true);
  });

  it('passes a plain English suggestion without script noise', () => {
    const r = scoreSuggestion({
      lang: 'en',
      key: 'guide.devotional.dana1',
      currentText: 'Give generously.',
      suggestedText: 'Give with a full heart.',
    });
    expect(r.recommendation).toBe('approve');
  });

  it('tolerates identifiers, digits and emoji in non-Latin text', () => {
    const r = scoreSuggestion({
      lang: 'ta',
      key: 'guide.vda.s1t',
      currentText: 'உங்கள் ID-ஐ உள்ளிடவும்.',
      suggestedText: '🙏 உங்கள் SAN-123456 ID-ஐ உள்ளிடவும், தயவுசெய்து.',
    });
    expect(r.reasons.some((x) => x.includes('Tamil script'))).toBe(true);
    expect(r.recommendation).not.toBe('reject');
  });
});
