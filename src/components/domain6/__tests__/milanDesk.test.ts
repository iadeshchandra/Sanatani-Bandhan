/**
 * milanDesk.test.ts — JY-FIX-B pins for JY-12 at the desk surface.
 * =====================================================================
 * The desk's calculateAshtakootGunaMilan used to ignore the user's own
 * nakshatra/rashi and return hardcoded scores per candidate name.
 * These tests pin the rewired desk function: real engine scores for
 * the desk's seed profiles, the sagotra block intact, the honest
 * insufficient-data state, and the removal of fear copy.
 */
import * as fs from 'fs';
import * as path from 'path';

// The desk module's context imports chain into firebase ESM, which
// jest cannot load — stub the five context/hook modules (the FIX-A
// smoke-test pattern). calculateAshtakootGunaMilan itself is pure.
jest.mock('../../../context/DataContext', () => ({ useData: () => ({}) }));
jest.mock('../../../context/AuthWorkspaceContext', () => ({
  useAuthWorkspace: () => ({ activeWorkspace: null, currentUser: null }),
}));
jest.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    safeTranslate: (_k: string, en: string) => en,
    currentLang: 'en',
  }),
}));
jest.mock('../../../hooks/useWorkspaceInr', () => ({
  useInr: () => (n: number) => `₹${n}`,
  useWorkspaceCurrency: () => ({ currency: 'INR', symbol: '₹' }),
}));

import { calculateAshtakootGunaMilan } from '../FamilyRootsMatrimonyDesk';

const candidate = (over: Record<string, unknown> = {}) =>
  ({
    gotra: 'Kashyap',
    nakshatra: 'Rohini',
    rashi: 'Vrishabha (Taurus)',
    manglikStatus: 'Non-Manglik',
    ...over,
  }) as any;

describe('JY-12 — the desk computes from BOTH profiles now', () => {
  test('karta Krittika/Mesha × Rohini/Vrishabha scores the real 12 (was a fabricated 36)', () => {
    const r = calculateAshtakootGunaMilan('Bharadwaja', 'Krittika', 'Mesha (Aries)', 'Non-Manglik', candidate());
    expect(r.totalScore).toBe(12);
    expect(r.kootas.nadi.obtainedScore).toBe(0); // both Antya — Nadi dosha
    expect(r.kootas.bhakoot.obtainedScore).toBe(0); // 2-12 relationship
    expect(r.insufficientData).toBeFalsy();
  });

  test('the SAME candidate scores differently for a different karta (inputs matter)', () => {
    const a = calculateAshtakootGunaMilan('Bharadwaja', 'Krittika', 'Mesha (Aries)', 'Non-Manglik', candidate());
    const b = calculateAshtakootGunaMilan('Bharadwaja', 'Shravana', 'Makara (Capricorn)', 'Non-Manglik', candidate());
    expect(a.totalScore).not.toBe(b.totalScore);
  });

  test('sagotra hard block still overrides everything', () => {
    const r = calculateAshtakootGunaMilan('Kashyap', 'Krittika', 'Mesha (Aries)', 'Non-Manglik', candidate());
    expect(r.isSagotraBlocked).toBe(true);
    expect(r.totalScore).toBe(0);
  });

  test('an unresolvable nakshatra yields the honest no-score state', () => {
    const r = calculateAshtakootGunaMilan(
      'Bharadwaja', 'Krittika', 'Mesha (Aries)', 'Non-Manglik',
      candidate({ nakshatra: 'NotAStar' })
    );
    expect(r.insufficientData).toBe(true);
    expect(r.totalScore).toBe(0);
  });

  test('low scores carry counsel copy — the fear verdict is gone', () => {
    const r = calculateAshtakootGunaMilan('Bharadwaja', 'Krittika', 'Mesha (Aries)', 'Non-Manglik', candidate());
    expect(r.totalScore).toBeLessThan(18);
    expect(r.description).not.toMatch(/contraindicated/i);
    expect(r.description).toMatch(/jyotishi/i);
  });

  test('SOURCE PIN: no hardcoded candidate-name score branches remain', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'FamilyRootsMatrimonyDesk.tsx'), 'utf8');
    expect(src).not.toContain("candidate.nakshatra === 'Rohini'");
    expect(src).not.toContain("candidate.nakshatra === 'Pushya'");
    expect(src).not.toContain("candidate.nakshatra === 'Shravana'");
    expect(src).not.toMatch(/astrologically contraindicated/i);
  });
});
