/**
 * suitesResolution.test.ts — QUEUED #47 regression guard.
 * ================================================================
 * The disease: translations.ts merged the `suites` fragment UNWRAPPED,
 * so the fragment's top-level keys (seva / samskara / goshala / matha /
 * pathshala) landed at the dictionary root, no `dict.suites` node ever
 * existed, and every t('suites.…') lookup fell back to the raw key —
 * Goshala One, Matha One and Pathshala One desks rendered literal i18n
 * keys in production while their copy sat complete in the dict files.
 *
 * This guard pins the cure from three directions:
 *  1. Mount shape — the merged English dict carries a `suites` node with
 *     all five suites, and no suite is mounted at the root.
 *  2. Fragment completeness — EVERY leaf of the authored en suites
 *     fragment resolves through the merged dictionary, at its
 *     `suites.`-prefixed path, to exactly its authored string (so the
 *     t() fallback chain can never return the raw key for them). The
 *     same is asserted for the hi and bn fragments through the lazy
 *     loader (which exercises the splitLang wrap).
 *  3. Consumer contract — every `suites.*` key the Goshala / Matha /
 *     Pathshala sources actually request (string literals plus the
 *     `${K}.…` key-map expansions) resolves in English to a real,
 *     non-key string.
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

/** Every suites.* key a suite's sources request: literals + `${K}.…` map expansions. */
function requestedKeys(suiteDir: string): Set<string> {
  const keys = new Set<string>();
  for (const file of fs.readdirSync(suiteDir)) {
    if (!/\.tsx?$/.test(file)) continue;
    const src = fs.readFileSync(path.join(suiteDir, file), 'utf8');
    for (const m of src.matchAll(/['"`](suites\.[a-zA-Z0-9_.]+)['"`]/g)) keys.add(m[1]);
    const kDecl = src.match(/const K\s*=\s*'([^']+)'/);
    if (kDecl) {
      const K = kDecl[1];
      for (const m of src.matchAll(/\$\{K\}\.([a-zA-Z0-9_.]+)/g)) keys.add(`${K}.${m[1]}`);
      for (const m of src.matchAll(/K\s*\+\s*['"`](\.[a-zA-Z0-9_.]+)/g)) keys.add(`${K}${m[1]}`);
    }
  }
  // Drop bare namespace roots (the `const K = 'suites.goshala'` declaration itself).
  for (const k of [...keys]) if (k.split('.').length <= 2) keys.delete(k);
  return keys;
}

const REPO_SRC = path.resolve(__dirname, '..', '..');

describe('suites namespace resolution (QUEUED #47)', () => {
  it('mounts the suites fragment under dict.suites, never at the root', () => {
    const dict = getDict('en') as unknown as Record<string, unknown>;
    const suites = dict.suites as Record<string, unknown>;
    expect(suites).toBeDefined();
    for (const suite of ['seva', 'samskara', 'goshala', 'matha', 'pathshala']) {
      expect(suites[suite]).toBeDefined();
    }
    // The disease itself: suites must not leak onto the dictionary root.
    expect(dict.goshala).toBeUndefined();
    expect(dict.matha).toBeUndefined();
    expect(dict.pathshala).toBeUndefined();
  });

  it('resolves every authored en suites leaf at its suites.* path', () => {
    const all = leaves(enSuites, 'suites');
    expect(all.length).toBeGreaterThan(1300);
    for (const [key, text] of all) {
      expect(resolveKey(getDict('en'), key)).toBe(text);
      expect(tLike(key, 'en')).not.toBe(key);
    }
  });

  it('resolves the audit-evidenced raw keys to real copy', () => {
    for (const key of [
      'suites.goshala.common.deskTitle',
      'suites.goshala.common.tabDashboard',
      'suites.goshala.common.tabNandi',
      'suites.goshala.dashboard.headcount',
      'suites.matha.common.title',
      'suites.matha.tabs.dashboard',
      'suites.matha.tabs.sannyasi',
      'suites.matha.tabs.parampara',
      'suites.matha.dashboard.statResidents',
      'suites.pathshala.common.deskTitle',
    ]) {
      const resolved = tLike(key, 'en');
      expect(typeof resolved).toBe('string');
      expect(resolved.length).toBeGreaterThan(0);
      expect(resolved).not.toBe(key);
    }
  });

  it('resolves every key the three t()-based suites request', () => {
    let total = 0;
    for (const suite of ['goshala', 'matha', 'pathshala']) {
      const keys = requestedKeys(path.join(REPO_SRC, suite));
      total += keys.size;
      for (const key of keys) {
        expect(key.startsWith(`suites.${suite}.`)).toBe(true);
        const resolved = tLike(key, 'en');
        expect(resolved).not.toBe(key);
        expect(resolved.length).toBeGreaterThan(0);
      }
    }
    // Sanity: the scan must actually find the suites' key surface.
    expect(total).toBeGreaterThan(400);
  });

  it('resolves hi and bn suites leaves through the lazy loader', async () => {
    await loadLanguageDict('hi');
    await loadLanguageDict('bn');
    for (const [lang, fragment] of [
      ['hi', hiSuites],
      ['bn', bnSuites],
    ] as const) {
      const all = leaves(fragment, 'suites');
      expect(all.length).toBeGreaterThan(1300);
      for (const [key, text] of all) {
        // The language's own dict must carry its authored copy…
        expect(resolveKey(getDict(lang), key)).toBe(text);
        // …and the t() chain must therefore never surface the raw key.
        expect(tLike(key, lang)).toBe(text);
      }
    }
  });
});
