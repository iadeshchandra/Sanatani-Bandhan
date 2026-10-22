/**
 * toastI18n.test.ts — QUEUED #62 regression guard.
 * ================================================================
 * The disease (audit A4-5): the Sabha / Yoga / Tirth / Satsang / Nyas
 * suites (and two Utsav restore paths) fired showToast / window.confirm
 * with hard-coded English string literals, bypassing t() entirely —
 * invisible in English, glaring in Hindi / Bangla. Matha and Utsav had
 * already been cured by routing through the dicts; #62 cured the rest.
 *
 * This guard pins the cure from three directions:
 *  1. Consumer contract — every `suites.*` key the seven t()-based
 *     suites request, plus every `ritual.utsav.*` key Utsav requests,
 *     resolves in en / hi / bn through the real t() fallback chain to a
 *     real, non-key string (no locale may fall back to a raw key).
 *  2. Authored-copy parity — the five new suite sections (sabha, yoga,
 *     tirth, satsang, nyas) carry authored leaves in hi and bn too, and
 *     each authored hi / bn leaf resolves through the merged dict to
 *     exactly its authored string (not silently to the English text).
 *  3. Source sweep — no showToast / window.confirm call in the seven
 *     suites may take a string- or template-literal first argument, and
 *     no <Empty text="…"> literal may reappear. The literal disease
 *     cannot come back without turning this test red.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getDict, loadLanguageDict } from '../translations';
import { suites as enSuites } from '../lang/en/suites';
import { suites as hiSuites } from '../lang/hi/suites';
import { suites as bnSuites } from '../lang/bn/suites';

/** Same traversal + en-fallback chain as LanguageContext's t(). */
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

function tLike(key: string, lang: string): string {
  const active = resolveKey(getDict(lang), key);
  if (active) return active;
  if (lang !== 'en') {
    const en = resolveKey(getDict('en'), key);
    if (en) return en;
  }
  return key;
}

/** Flatten a fragment into [dotPath, stringValue] leaf pairs. */
function leaves(obj: unknown, prefix: string, out: Array<[string, string]> = []): Array<[string, string]> {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      leaves(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (typeof obj === 'string') {
    out.push([prefix, obj]);
  }
  return out;
}

const REPO_SRC = path.resolve(__dirname, '..', '..');
const SEVEN_SUITES = ['matha', 'utsav', 'sabha', 'yoga', 'tirth', 'satsang', 'nyas'];
const NEW_SUITES = ['sabha', 'yoga', 'tirth', 'satsang', 'nyas'];

function suiteSources(suite: string): Array<[string, string]> {
  const dir = path.join(REPO_SRC, suite);
  const out: Array<[string, string]> = [];
  for (const file of fs.readdirSync(dir)) {
    if (!/\.tsx?$/.test(file)) continue;
    out.push([file, fs.readFileSync(path.join(dir, file), 'utf8')]);
  }
  return out;
}

describe('suite toast i18n (QUEUED #62)', () => {
  it('resolves every suites.* / ritual.utsav.* key the seven suites request, in en/hi/bn', async () => {
    await loadLanguageDict('hi');
    await loadLanguageDict('bn');
    let suitesKeys = 0;
    let ritualKeys = 0;
    for (const suite of SEVEN_SUITES) {
      for (const [, src] of suiteSources(suite)) {
        for (const m of src.matchAll(/['"`](suites\.[a-zA-Z0-9_.]+)['"`]/g)) {
          suitesKeys += 1;
          for (const lang of ['en', 'hi', 'bn']) {
            const resolved = tLike(m[1], lang);
            expect(resolved).not.toBe(m[1]);
            expect(resolved.length).toBeGreaterThan(0);
          }
        }
        for (const m of src.matchAll(/['"`](ritual\.utsav\.[a-zA-Z0-9_.]+)['"`]/g)) {
          ritualKeys += 1;
          for (const lang of ['en', 'hi', 'bn']) {
            const resolved = tLike(m[1], lang);
            expect(resolved).not.toBe(m[1]);
            expect(resolved.length).toBeGreaterThan(0);
          }
        }
      }
    }
    // Sanity: the scan must actually find the suites' key surface.
    expect(suitesKeys).toBeGreaterThan(400);
    expect(ritualKeys).toBeGreaterThan(150);
  });

  it('carries authored hi + bn leaves for the five new suite sections', async () => {
    await loadLanguageDict('hi');
    await loadLanguageDict('bn');
    for (const suite of NEW_SUITES) {
      const enLeaves = leaves((enSuites as Record<string, unknown>)[suite], `suites.${suite}`);
      expect(enLeaves.length).toBeGreaterThan(20);
      for (const [lang, fragment] of [
        ['hi', hiSuites],
        ['bn', bnSuites],
      ] as const) {
        const langLeaves = leaves((fragment as Record<string, unknown>)[suite], `suites.${suite}`);
        // Parity: every key authored in en is authored in hi and bn.
        expect(langLeaves.length).toBe(enLeaves.length);
        for (const [key, text] of langLeaves) {
          expect(resolveKey(getDict(lang), key)).toBe(text);
          expect(tLike(key, lang)).toBe(text);
        }
      }
    }
  });

  it('resolves the #62 utsav restore + budget keys in en/hi/bn', async () => {
    await loadLanguageDict('hi');
    await loadLanguageDict('bn');
    for (const key of [
      'ritual.utsav.reports.toastRestored',
      'ritual.utsav.reports.toastInvalidBackup',
      'ritual.utsav.budget.emptyIncomeHeads',
      'ritual.utsav.budget.emptyExpenseHeads',
    ]) {
      for (const lang of ['en', 'hi', 'bn']) {
        const resolved = resolveKey(getDict(lang), key);
        expect(typeof resolved).toBe('string');
        expect(resolved).not.toBe(key);
        expect((resolved as string).length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps hard-coded toast / confirm / empty-state literals out of the seven suites', () => {
    for (const suite of SEVEN_SUITES) {
      for (const [file, src] of suiteSources(suite)) {
        const where = `${suite}/${file}`;
        expect(src.match(/showToast\(\s*['"`]/g) ?? []).toEqual([]);
        expect(src.match(/window\.confirm\(\s*['"`]/g) ?? []).toEqual([]);
        // <Empty text="…"> with any real copy is the same disease;
        // the one intentional blank (nyas ReportsTab) carries text="".
        const empties = src.match(/<Empty text="[^"]+"/g) ?? [];
        expect(empties).toEqual([]);
        void where;
      }
    }
  });
});
