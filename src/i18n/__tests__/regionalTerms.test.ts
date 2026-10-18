/**
 * regionalTerms.test.ts — the belonging contract.
 * =================================================
 * 1. Pan-Sanatani invariant: sacred terms NEVER vary by region/language.
 * 2. Resolution chain: (region,lang) → (region,en) → lang default → en.
 * 3. detectNativeProfile: device locale → phone → geo → default.
 * 4. Never blank: every term resolves to a non-empty string for every
 *    supported (lang, region) pair.
 */
import {
  REGIONAL_TERMS,
  REGIONAL_TERM_KEYS,
  PAN_SANATANI_TERMS,
  regionalTerm,
  detectNativeProfile,
  regionForLang,
  isRegionId,
  REGIONS,
  isDraftRegionalTerm,
} from '../regionalTerms';
import { SUPPORTED_LANGS } from '../translationQuality';
import { REGION_IDS } from '../regionalTerms';

describe('pan-Sanatani invariant', () => {
  const pairs: Array<[string, string]> = [
    ['ta', 'tamil-nadu'],
    ['ml', 'kerala'],
    ['bn', 'bangladesh'],
    ['hi', 'hindi-belt'],
    ['en', 'global-diaspora'],
  ];
  for (const key of Object.keys(PAN_SANATANI_TERMS)) {
    test(`"${key}" never varies`, () => {
      for (const [lang, region] of pairs) {
        expect(regionalTerm(key, lang, region)).toBe(PAN_SANATANI_TERMS[key]);
      }
    });
  }
});

describe('resolution chain', () => {
  test('tamil-nadu + ta → கோவில் (not a northern word in Tamil script)', () => {
    expect(regionalTerm('temple', 'ta', 'tamil-nadu')).toBe('கோவில்');
  });
  test('tamil-nadu + en → kovil transliteration (English UI still feels local)', () => {
    expect(regionalTerm('temple', 'en', 'tamil-nadu')).toBe('kovil');
  });
  test('kerala priest → ശാന്തി', () => {
    expect(regionalTerm('priest', 'ml', 'kerala')).toBe('ശാന്തി');
  });
  test('tamil greeting → வணக்கம்', () => {
    expect(regionalTerm('greeting', 'ta', 'tamil-nadu')).toBe('வணக்கம்');
  });
  test('tamil honorific → திரு (Thiru, not Shri)', () => {
    expect(regionalTerm('honorific', 'ta', 'tamil-nadu')).toBe('திரு');
  });
  test('south festival → Deepavali word, north → Diwali word', () => {
    expect(regionalTerm('festivalOfLights', 'ta', 'tamil-nadu')).toBe('தீபாவளி');
    expect(regionalTerm('festivalOfLights', 'hi', 'hindi-belt')).toBe('दिवाली');
  });
  test('unknown region falls back to language default', () => {
    expect(regionalTerm('temple', 'ta', 'other')).toBe('கோவில்');
  });
  test('unknown language falls back to English', () => {
    expect(regionalTerm('temple', 'xx' as never, 'other')).toBe('temple');
  });
  test('unknown key is logged and returned (never blank)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(regionalTerm('not-a-term', 'ta', 'tamil-nadu')).toBe('not-a-term');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('never blank', () => {
  test('every term × every lang × every region resolves non-empty', () => {
    for (const key of REGIONAL_TERM_KEYS) {
      for (const lang of SUPPORTED_LANGS) {
        for (const region of REGION_IDS) {
          const v = regionalTerm(key, lang, region);
          expect(typeof v).toBe('string');
          expect(v.length).toBeGreaterThan(0);
          expect(v).not.toMatch(/^\s*$/);
        }
      }
    }
  });
});

describe('detectNativeProfile', () => {
  test('ta-IN device locale → Tamil + tamil-nadu', () => {
    expect(detectNativeProfile({ bcp47: 'ta-IN' })).toEqual({ lang: 'ta', region: 'tamil-nadu' });
  });
  test('bn-BD → Bengali + bangladesh', () => {
    expect(detectNativeProfile({ bcp47: 'bn-BD' })).toEqual({ lang: 'bn', region: 'bangladesh' });
  });
  test('880 phone → Bengali + bangladesh', () => {
    expect(detectNativeProfile({ phoneDigits: '8801712345678', country: 'BD' })).toEqual({
      lang: 'bn',
      region: 'bangladesh',
    });
  });
  test('IN + Tamil Nadu state → ta + tamil-nadu', () => {
    expect(detectNativeProfile({ country: 'IN', state: 'Tamil Nadu' })).toEqual({
      lang: 'ta',
      region: 'tamil-nadu',
    });
  });
  test('IN + Kerala state → ml + kerala', () => {
    expect(detectNativeProfile({ country: 'IN', state: 'Kerala' })).toEqual({
      lang: 'ml',
      region: 'kerala',
    });
  });
  test('IN + unknown state → hi + hindi-belt', () => {
    expect(detectNativeProfile({ country: 'IN' })).toEqual({ lang: 'hi', region: 'hindi-belt' });
  });
  test('diaspora: US + ta device → Tamil kept, region tamil-nadu (geo never overrides language)', () => {
    expect(detectNativeProfile({ bcp47: 'ta', country: 'US' })).toEqual({
      lang: 'ta',
      region: 'tamil-nadu',
    });
  });
  test('diaspora: US + en → en + global-diaspora', () => {
    expect(detectNativeProfile({ bcp47: 'en-US', country: 'US' })).toEqual({
      lang: 'en',
      region: 'global-diaspora',
    });
  });
  test('nothing known → en + other', () => {
    expect(detectNativeProfile({})).toEqual({ lang: 'en', region: 'other' });
  });
  test('unsupported device language (pa) falls through to geo', () => {
    expect(detectNativeProfile({ bcp47: 'pa-IN', country: 'IN', state: 'Punjab' })).toEqual({
      lang: 'hi',
      region: 'punjab',
    });
  });
});

describe('region taxonomy', () => {
  test('every RegionId has metadata with a default language', () => {
    for (const id of REGION_IDS) {
      expect(isRegionId(id)).toBe(true);
      expect(REGIONS[id].lang).toBeTruthy();
      expect(REGIONS[id].blurb.length).toBeGreaterThan(0);
    }
  });
  test('regionForLang covers every supported language', () => {
    for (const lang of SUPPORTED_LANGS) {
      expect(isRegionId(regionForLang(lang))).toBe(true);
    }
  });
});

describe('draft marking', () => {
  test('all starter terms are draft in the 7 draft languages', () => {
    for (const lang of ['sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml']) {
      for (const key of REGIONAL_TERM_KEYS) {
        expect(isDraftRegionalTerm(lang, key)).toBe(true);
      }
    }
  });
  test('en/hi/bn starter terms are verified', () => {
    for (const lang of ['en', 'hi', 'bn']) {
      for (const key of REGIONAL_TERM_KEYS) {
        expect(isDraftRegionalTerm(lang, key)).toBe(false);
      }
    }
  });
  test('every term has all 10 language defaults', () => {
    for (const key of REGIONAL_TERM_KEYS) {
      const def = REGIONAL_TERMS[key];
      for (const lang of SUPPORTED_LANGS) {
        expect(def.defaults[lang]).toBeTruthy();
      }
    }
  });
});
