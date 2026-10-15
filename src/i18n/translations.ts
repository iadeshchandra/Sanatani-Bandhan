/**
 * Sanatani Bandhan — i18n Lazy Loader (namespace-split, Phase 2d1)
 *
 * Per-language dictionaries live in src/i18n/lang/{code}/ as four
 * namespace fragments — core, professional, devotee, org, ritual — each small
 * enough to stay under push-size limits. They are deep-merged here into
 * the full TranslationSchema before being cached.
 *
 * Loading behaviour is unchanged from the monolithic era:
 *  - English is bundled eagerly as the fallback.
 *  - Other languages load on demand via dynamic import(), so a Hindi
 *    user never downloads Tamil/Telugu/… strings. Vite code-splits each
 *    namespace fragment into its own chunk.
 *
 * Fragment-level fallback (new in 2d1): if ONE fragment fails to load
 * (offline chunk miss, bad deploy), that namespace alone falls back to
 * English instead of the whole language degrading. The app never shows
 * a blank string because of a single failed chunk.
 *
 * Backward compatibility:
 *  - `translations` (sync Record proxy) still exists for legacy importers;
 *    read `translations[code]` only after `loadLanguageDict` has resolved
 *    for that code, or use `getDict`.
 *  - Default export preserved.
 *  - The t() fallback chain (lang → en → key) is untouched.
 */

import type { TranslationSchema } from './schema';
import { SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES, bcp47For } from './schema';

// English fragments are bundled eagerly — the sync fallback for everything.
import { core as enCore } from './lang/en/core';
import { professional as enProfessional } from './lang/en/professional';
import { devoteeNs as enDevotee } from './lang/en/devotee';
import { orgNs as enOrg } from './lang/en/org';
import { ritual as enRitual } from './lang/en/ritual';
import { suites as enSuites } from './lang/en/suites';

export type { TranslationSchema };
export { SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES, bcp47For };

/**
 * Recursive deep merge. Namespace fragments never overlap at the top
 * level (each top-level key lives in exactly one fragment), but nested
 * merges keep this robust if that ever changes.
 */
function deepMerge(target: Record<string, any>, ...sources: Record<string, any>[]): Record<string, any> {
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const key of Object.keys(src)) {
      const v = (src as Record<string, any>)[key];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const existing = target[key];
        target[key] = deepMerge(
          existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {},
          v
        );
      } else {
        target[key] = v;
      }
    }
  }
  return target;
}

/** Merge the four namespace fragments of one language into a full dict. */
function mergeFragments(
  core: Partial<TranslationSchema>,
  professional: Partial<TranslationSchema>,
  devoteeNs: Partial<TranslationSchema>,
  orgNs: Partial<TranslationSchema>,
  ritualNs?: Partial<TranslationSchema>,
  suitesNs?: Partial<TranslationSchema>
): TranslationSchema {
  return deepMerge({}, core, professional, devoteeNs, orgNs, ritualNs, suitesNs) as TranslationSchema;
}

/** Eagerly merged English dictionary — the sync fallback. */
const enDict: TranslationSchema = mergeFragments(enCore, enProfessional, enDevotee, enOrg, enRitual, enSuites);

/**
 * Load one namespace fragment for a language, falling back to the
 * English fragment when the import fails. Never throws — worst case
 * returns English for that namespace.
 */
function loadFragment<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.then((mod) => mod ?? fallback).catch(() => fallback);
}

/**
 * Per-language fragment loaders — fully static import paths so Vite
 * code-splits precisely (one chunk per fragment), each with an English
 * fallback on failure. Fragment-level fallback means one failed chunk
 * degrades only its own namespace, never the whole language.
 */
function splitLang(
  loadCore: () => Promise<{ core: Partial<TranslationSchema> }>,
  loadProfessional: () => Promise<{ professional: Partial<TranslationSchema> }>,
  loadDevotee: () => Promise<{ devoteeNs: Partial<TranslationSchema> }>,
  loadOrg: () => Promise<{ orgNs: Partial<TranslationSchema> }>,
  loadRitual?: () => Promise<{ ritual: Partial<TranslationSchema> }>,
  loadSuites?: () => Promise<{ suites: Partial<TranslationSchema> }>
): () => Promise<{ default: TranslationSchema }> {
  return () =>
    Promise.all([
      loadFragment(loadCore(), { core: enCore }),
      loadFragment(loadProfessional(), { professional: enProfessional }),
      loadFragment(loadDevotee(), { devoteeNs: enDevotee }),
      loadFragment(loadOrg(), { orgNs: enOrg }),
      loadRitual ? loadFragment(loadRitual(), { ritual: enRitual }) : Promise.resolve({ ritual: enRitual }),
      loadSuites ? loadFragment(loadSuites(), { suites: enSuites }) : Promise.resolve({ suites: enSuites }),
    ]).then(([c, p, d, o, r, s]) => ({ default: mergeFragments(c.core, p.professional, d.devoteeNs, o.orgNs, r.ritual, s.suites) }));
}

/**
 * Dynamic loader map — one entry per language; each loads its four
 * namespace fragments. Static import paths keep Vite's code-splitting
 * precise (one chunk per fragment).
 */
const LANG_LOADERS: Record<string, () => Promise<{ default: TranslationSchema }>> = {
  en: () => Promise.resolve({ default: enDict }),
  hi: splitLang(
    () => import('./lang/hi/core'),
    () => import('./lang/hi/professional'),
    () => import('./lang/hi/devotee'),
    () => import('./lang/hi/org'),
    () => import('./lang/hi/ritual'),
    () => import('./lang/hi/suites')
  ),
  bn: splitLang(
    () => import('./lang/bn/core'),
    () => import('./lang/bn/professional'),
    () => import('./lang/bn/devotee'),
    () => import('./lang/bn/org'),
    () => import('./lang/bn/ritual'),
    () => import('./lang/bn/suites')
  ),
  sa: splitLang(
    () => import('./lang/sa/core'),
    () => import('./lang/sa/professional'),
    () => import('./lang/sa/devotee'),
    () => import('./lang/sa/org'),
    () => import('./lang/sa/ritual'),
    () => import('./lang/sa/suites')
  ),
  ta: splitLang(
    () => import('./lang/ta/core'),
    () => import('./lang/ta/professional'),
    () => import('./lang/ta/devotee'),
    () => import('./lang/ta/org'),
    () => import('./lang/ta/ritual'),
    () => import('./lang/ta/suites')
  ),
  te: splitLang(
    () => import('./lang/te/core'),
    () => import('./lang/te/professional'),
    () => import('./lang/te/devotee'),
    () => import('./lang/te/org'),
    () => import('./lang/te/ritual'),
    () => import('./lang/te/suites')
  ),
  mr: splitLang(
    () => import('./lang/mr/core'),
    () => import('./lang/mr/professional'),
    () => import('./lang/mr/devotee'),
    () => import('./lang/mr/org'),
    () => import('./lang/mr/ritual'),
    () => import('./lang/mr/suites')
  ),
  gu: splitLang(
    () => import('./lang/gu/core'),
    () => import('./lang/gu/professional'),
    () => import('./lang/gu/devotee'),
    () => import('./lang/gu/org'),
    () => import('./lang/gu/ritual'),
    () => import('./lang/gu/suites')
  ),
  kn: splitLang(
    () => import('./lang/kn/core'),
    () => import('./lang/kn/professional'),
    () => import('./lang/kn/devotee'),
    () => import('./lang/kn/org'),
    () => import('./lang/kn/ritual'),
    () => import('./lang/kn/suites')
  ),
  ml: splitLang(
    () => import('./lang/ml/core'),
    () => import('./lang/ml/professional'),
    () => import('./lang/ml/devotee'),
    () => import('./lang/ml/org'),
    () => import('./lang/ml/ritual'),
    () => import('./lang/ml/suites')
  ),
};

/** In-memory cache of loaded dictionaries. English is pre-seeded. */
const dictCache: Record<string, TranslationSchema> = { en: enDict };

/** In-flight load promises (dedupe concurrent requests for the same code). */
const pendingLoads: Record<string, Promise<TranslationSchema> | undefined> = {};

/**
 * Load the dictionary for a language code. Resolves to the English dict
 * for unknown codes. Safe to call repeatedly — cached after first load.
 */
export async function loadLanguageDict(code: string): Promise<TranslationSchema> {
  const normalized = (code || 'en').toLowerCase();
  if (dictCache[normalized]) return dictCache[normalized];

  const loader = LANG_LOADERS[normalized];
  if (!loader) return enDict;

  if (!pendingLoads[normalized]) {
    pendingLoads[normalized] = loader()
      .then((mod) => {
        dictCache[normalized] = mod.default;
        pendingLoads[normalized] = undefined;
        return mod.default;
      })
      .catch(() => {
        // Should not happen (fragments already fall back), but degrade
        // to English rather than leave the app without a dictionary.
        pendingLoads[normalized] = undefined;
        return enDict;
      });
  }
  return pendingLoads[normalized] as Promise<TranslationSchema>;
}

/** Synchronous read — returns the cached dict or English if not yet loaded. */
export function getDict(code: string): TranslationSchema {
  const normalized = (code || 'en').toLowerCase();
  return dictCache[normalized] || enDict;
}

/** Is this a language code we ship a dictionary for? */
export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGE_CODES.includes((code || '').toLowerCase());
}

/** BCP-47 locale tag for Intl APIs, e.g. 'hi' → 'hi'. */
export function localeFor(code: string): string {
  return bcp47For(code);
}

/**
 * Legacy synchronous export — hydrated as languages load.
 * Prefer loadLanguageDict/getDict in new code.
 */
export const translations: Record<string, TranslationSchema> = new Proxy(
  {} as Record<string, TranslationSchema>,
  {
    get(_target, prop: string) {
      return getDict(prop);
    },
    has(_target, prop: string) {
      return isSupportedLanguage(prop);
    },
    ownKeys() {
      return Object.keys(dictCache);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (dictCache[prop]) {
        return { enumerable: true, configurable: true, value: dictCache[prop] };
      }
      return undefined;
    },
  }
);

export default translations;
