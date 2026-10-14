/**
 * Sanatani Bandhan — i18n Lazy Loader (Phase 1)
 *
 * Per-language dictionaries now live in src/i18n/lang/{code}.ts and are
 * loaded on demand via dynamic import(), so a Hindi user never downloads
 * Tamil/Telugu/… strings. English is bundled eagerly as the fallback.
 *
 * Backward compatibility:
 *  - `translations` (sync Record) still exists for legacy importers; it is
 *    hydrated lazily — read `translations[code]` only after `loadLanguageDict`
 *    has resolved for that code, or use `getDict`.
 *  - Default export preserved.
 */

import type { TranslationSchema } from './schema';
import { SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES, bcp47For } from './schema';
import enDict from './lang/en';

export type { TranslationSchema };
export { SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES, bcp47For };

/** Dynamic import map — Vite code-splits each language into its own chunk. */
const LANG_LOADERS: Record<string, () => Promise<{ default: TranslationSchema }>> = {
  en: () => import('./lang/en'),
  hi: () => import('./lang/hi'),
  bn: () => import('./lang/bn'),
  sa: () => import('./lang/sa'),
  ta: () => import('./lang/ta'),
  te: () => import('./lang/te'),
  mr: () => import('./lang/mr'),
  gu: () => import('./lang/gu'),
  kn: () => import('./lang/kn'),
  ml: () => import('./lang/ml'),
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
        // Offline or chunk failure — degrade to English, never blank.
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
