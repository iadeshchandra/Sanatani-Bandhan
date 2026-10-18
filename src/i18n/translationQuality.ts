/**
 * i18n/translationQuality.ts — translation quality metadata.
 * ============================================================
 * Every user-facing string in the app carries a quality status:
 *
 *   'verified' — the English source, or a string a native speaker reviewed.
 *   'draft'    — shipped but unreviewed (the AI-written sa/ta/te/mr/gu/kn/ml
 *                guide strings). Drafts DISPLAY normally — an imperfect Tamil
 *                string beats English for a Tamil elder who doesn't read
 *                English. Never fall back, never blank, never raw key.
 *
 * Status is cheap metadata: language + namespace prefix. When a native
 * speaker reviews a namespace (via the GodMode Translations tab), the
 * prefix is removed from DRAFT_NAMESPACES and the whole namespace flips
 * to verified — no per-key bookkeeping.
 */

export type SupportedLang =
  | 'en' | 'hi' | 'bn' | 'sa' | 'ta'
  | 'te' | 'mr' | 'gu' | 'kn' | 'ml';

export const SUPPORTED_LANGS: SupportedLang[] = [
  'en', 'hi', 'bn', 'sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml',
];

export type TranslationStatus = 'verified' | 'draft';

/**
 * Namespace prefixes whose bundled strings are unreviewed drafts, per
 * language. en is the source (always verified); hi/bn were human-solid
 * from the start. Everything else ships as draft until a native speaker
 * reviews it in GodMode → Translations.
 */
export const DRAFT_NAMESPACES: Record<SupportedLang, string[]> = {
  en: [],
  hi: [],
  bn: [],
  sa: ['guide.devotional', 'guide.vda', 'guide.sevacards', 'assistant'],
  ta: ['guide.devotional', 'guide.vda', 'guide.sevacards', 'assistant'],
  te: ['guide.devotional', 'guide.vda', 'guide.sevacards', 'assistant'],
  mr: ['guide.devotional', 'guide.vda', 'guide.sevacards', 'assistant'],
  gu: ['guide.devotional', 'guide.vda', 'guide.sevacards', 'assistant'],
  kn: ['guide.devotional', 'guide.vda', 'guide.sevacards', 'assistant'],
  ml: ['guide.devotional', 'guide.vda', 'guide.sevacards', 'assistant'],
};

/** The draft namespaces across all languages (for the GodMode editor). */
export const ALL_DRAFT_NAMESPACES = ['guide.devotional', 'guide.vda', 'guide.sevacards', 'guide.sevabazar'] as const;

/**
 * Quality status of one dot-delimited key (e.g. 'guide.vda.s1t') in a
 * language. Prefix match: 'guide.vda' covers 'guide.vda.s1t'.
 */
export function translationStatus(lang: string, key: string): TranslationStatus {
  const prefixes = DRAFT_NAMESPACES[(lang || 'en').toLowerCase() as SupportedLang];
  if (!prefixes || prefixes.length === 0 || !key) return 'verified';
  for (const p of prefixes) {
    if (key === p || key.startsWith(p + '.')) return 'draft';
  }
  return 'verified';
}

/** True when the key is an unreviewed draft in this language. */
export function isDraftKey(lang: string, key: string): boolean {
  return translationStatus(lang, key) === 'draft';
}

/** Draft namespace prefixes for one language (empty = all verified). */
export function draftNamespacesFor(lang: string): string[] {
  return DRAFT_NAMESPACES[(lang || 'en').toLowerCase() as SupportedLang] || [];
}

/**
 * Flatten a nested dictionary to dot-delimited keys.
 * { guide: { vda: { s1t: '…' } } } → ['guide.vda.s1t']
 */
export function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const out: string[] = [];
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    const v = (obj as Record<string, unknown>)[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenKeys(v, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

/** Count of bundled keys under a namespace prefix (for the quality dashboard). */
export function countKeysUnder(dict: unknown, prefix: string): number {
  return flattenKeys(dict).filter(
    (k) => k === prefix || k.startsWith(prefix + '.')
  ).length;
}

/** Resolve a dot-delimited key inside a nested dict (string leaves only). */
export function resolveNestedKey(dict: unknown, key: string): string | undefined {
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
