/**
 * blueprintDI18n.test.ts — Blueprint D i18n guard: the three audit
 * history templates D adds (practice cleared / practice mark /
 * assisted-by) must exist in the authored en / hi / bn org fragments
 * with identical placeholders, and resolve through the real merged
 * dictionaries — the same discipline as A's auditI18n guard (which
 * pins whole-subtree parity and covers these keys automatically).
 * The other seven languages fall back per-key to English through
 * the existing chain, as with every org.* key.
 */
import { getDict, loadLanguageDict } from '../translations';
import { orgNs as enOrg } from '../lang/en/org';
import { orgNs as hiOrg } from '../lang/hi/org';
import { orgNs as bnOrg } from '../lang/bn/org';

function resolveKey(dict: unknown, key: string): string | undefined {
  let cur: unknown = dict;
  for (const seg of key.split('.')) {
    if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

const KEYS = [
  'org.audit.history.practiceCleared',
  'org.audit.history.practiceMark',
  'org.audit.history.assistedBy',
] as const;

describe('Blueprint D audit history keys', () => {
  it('are authored in en / hi / bn with identical placeholder sets', () => {
    const frags = { en: enOrg, hi: hiOrg, bn: bnOrg } as const;
    for (const key of KEYS) {
      const en = resolveKey(frags.en, key);
      const hi = resolveKey(frags.hi, key);
      const bn = resolveKey(frags.bn, key);
      expect(typeof en).toBe('string');
      expect(typeof hi).toBe('string');
      expect(typeof bn).toBe('string');
      expect(placeholders(hi!)).toEqual(placeholders(en!));
      expect(placeholders(bn!)).toEqual(placeholders(en!));
      // real translations, not English in local clothing
      expect(hi).not.toBe(en);
      expect(bn).not.toBe(en);
    }
  });

  it('resolve through the merged dictionaries in en / hi / bn', async () => {
    for (const lang of ['en', 'hi', 'bn'] as const) {
      await loadLanguageDict(lang);
      const dict = getDict(lang);
      for (const key of KEYS) {
        const v = resolveKey(dict, key);
        expect(typeof v).toBe('string');
        expect(v).not.toBe(key);
        expect(v!.length).toBeGreaterThan(0);
      }
    }
  });

  it('carry the placeholders renderAuditSummary fills', () => {
    const cleared = resolveKey(enOrg, 'org.audit.history.practiceCleared')!;
    expect(placeholders(cleared)).toEqual(['actor', 'count']);
    const assisted = resolveKey(enOrg, 'org.audit.history.assistedBy')!;
    expect(placeholders(assisted)).toEqual(['helper']);
    const mark = resolveKey(enOrg, 'org.audit.history.practiceMark')!;
    expect(placeholders(mark)).toEqual([]);
  });
});
