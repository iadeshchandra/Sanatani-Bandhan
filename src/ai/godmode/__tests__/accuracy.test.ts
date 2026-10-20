/**
 * ai/godmode/__tests__/accuracy.test.ts — QUEUED #36 accuracy units.
 * =====================================================================
 * Dual computation (money computed twice via independent paths),
 * figure verification (presence + strict), the auto-correction
 * fallback, and provenance footers.
 */
import {
  combineDual,
  dualAverage,
  dualCommission,
  formatSourcesFooter,
  numericTokensOf,
  renderClaimsFallback,
  termsSources,
  verifyFigures,
} from '../accuracy';
import { DEFAULT_TERMS, type PlatformTerms } from '../../../lib/termsConfig';
import type { FigureClaim } from '../../types';

describe('dualCommission — two independent paths agree', () => {
  const cases: Array<[number, number, number]> = [
    [500, 12, 60],
    [2000, 12, 240],
    [10000, 12, 1200],
    [10000, 8, 800],
    [500, 17.5, 88],
    [999, 15, 150],
    [333, 10, 33],
    [1, 12, 0],
    [2500, 8, 200],
    [750, 17.5, 131],
  ];
  it.each(cases)('₹%i at %s%% → ₹%i by both paths', (amt, rate, expected) => {
    const d = dualCommission(amt, rate);
    expect(d.agree).toBe(true);
    expect(d.value).toBe(expected);
    expect(d.floatPath).toBe(expected);
    expect(d.integerPath).toBe(expected);
  });

  it('combineDual reports disagreement honestly (value withheld)', () => {
    const d = combineDual(88, 87);
    expect(d.agree).toBe(false);
    expect(d.value).toBeNull();
    expect(d.floatPath).toBe(88);
    expect(d.integerPath).toBe(87);
  });
});

describe('dualAverage', () => {
  it('agrees on midpoints', () => {
    expect(dualAverage(280, 320)).toEqual({ agree: true, floatPath: 300, integerPath: 300, value: 300 });
    expect(dualAverage(499, 750).value).toBe(625);
    expect(dualAverage(700, 777).value).toBe(739);
  });
});

describe('verifyFigures — presence', () => {
  const claims: FigureClaim[] = [
    { id: 'a', label: 'Standard BDT monthly', value: 777, rendered: '৳777' },
    { id: 'b', label: 'Community rate', value: 17.5, rendered: '17.5%' },
  ];
  it('passes when every cited figure appears verbatim', () => {
    const v = verifyFigures('Standard is ৳777/mo and community is 17.5%.', claims);
    expect(v.ok).toBe(true);
    expect(v.missing).toEqual([]);
  });
  it('fails with the missing claim identified', () => {
    const v = verifyFigures('Standard is ৳700/mo and community is 17.5%.', claims);
    expect(v.ok).toBe(false);
    expect(v.missing.map((m) => m.id)).toEqual(['a']);
  });
});

describe('verifyFigures — strict mode', () => {
  const claims: FigureClaim[] = [
    { id: 'amt', label: 'Sample order', value: 500, rendered: '₹500' },
    { id: 'take', label: 'Platform keeps', value: 60, rendered: '₹60' },
  ];
  it('passes when every number traces to a claim or an extra', () => {
    const v = verifyFigures('On a ₹500 order — platform keeps ₹60 (the law is 10×).', claims, {
      strict: true,
      extraNumbers: [10],
    });
    expect(v.ok).toBe(true);
    expect(v.stray).toEqual([]);
  });
  it('flags an unexplained number as stray', () => {
    const v = verifyFigures('On a ₹500 order — platform keeps ₹60, plus a ₹999 fee.', claims, {
      strict: true,
      extraNumbers: [10],
    });
    expect(v.ok).toBe(false);
    expect(v.stray).toEqual(['999']);
  });
  it('non-strict mode ignores strays (presence only)', () => {
    const v = verifyFigures('On a ₹500 order — platform keeps ₹60, plus a ₹999 fee.', claims);
    expect(v.ok).toBe(true);
  });
});

describe('renderClaimsFallback — the auto-correction text', () => {
  it('states exactly the claimed figures, nothing invented', () => {
    const text = renderClaimsFallback(
      [{ id: 'a', label: 'Standard BDT monthly', value: 777, rendered: '৳777' }],
      'en'
    );
    expect(text).toContain('Standard BDT monthly: ৳777');
    expect(text).not.toContain('700');
  });
});

describe('provenance — sources + footer', () => {
  function terms(loadedAt: number | null): PlatformTerms {
    const t: PlatformTerms = JSON.parse(JSON.stringify(DEFAULT_TERMS));
    t.loadedAt = loadedAt;
    return t;
  }
  it('termsSources marks live reads with the snapshot load time', () => {
    const s = termsSources(terms(1760000000000), 1760003600000);
    expect(s).toHaveLength(2);
    expect(s[0].live).toBe(true);
    expect(s[0].readAt).toBe(1760000000000);
    expect(s.map((x) => x.label).join(' ')).toMatch(/plans\//);
    expect(s.map((x) => x.label).join(' ')).toMatch(/platformConfig\/commission/);
  });
  it('termsSources marks the defaults snapshot as not-live', () => {
    const s = termsSources(terms(null), 1760003600000);
    expect(s.every((x) => x.live === false)).toBe(true);
  });
  it('footer says "read just now" for a fresh read', () => {
    const now = 1760003600000;
    const line = formatSourcesFooter(
      [{ label: 'plans/standard', readAt: now - 5000, live: true }],
      now
    );
    expect(line).toBe('Source: plans/standard — read just now');
  });
  it('footer discloses code defaults honestly', () => {
    const now = 1760003600000;
    const line = formatSourcesFooter(
      [{ label: 'plans/standard', readAt: now - 5000, live: false }],
      now
    );
    expect(line).toMatch(/code defaults/);
  });
  it('footer shows a clock time for an older read', () => {
    const now = 1760003600000;
    const line = formatSourcesFooter(
      [{ label: 'plans/standard', readAt: now - 3600000, live: true }],
      now
    );
    expect(line).toMatch(/read at /);
  });
});

describe('numericTokensOf', () => {
  it('extracts values from mixed copy', () => {
    expect(numericTokensOf('rate must be 0–100', 'cap is 3')).toEqual(
      expect.arrayContaining([0, 100, 3])
    );
  });
});
