/**
 * notifications/notifyCopy.ts — the Suchana centre's copy resolver.
 * ============================================================================
 * NOTIFICATION WAVE 3 (2026-11-24). Notification copy used to live in the
 * trilingual warmCopy store (en/bn/hi only — the other seven languages of
 * the app silently fell back to English). It now lives in the app's
 * 10-language dictionary, under `surfaces.notify` (176 leaves: 88 entries
 * x title/body), and this module is the single bridge between the
 * notification centre and that dictionary:
 *
 *   - en/hi/bn values were carried over from warmCopy VERBATIM (authored).
 *   - ta/te/mr/gu/kn/ml/sa are careful drafts, labelled as such, in the
 *     standing native-speaker proofread follow-up (the house pattern
 *     since the Language Sweep). Sacred terms stay untranslated.
 *
 * RESOLUTION LAW (house fallback chain: dictionary → en):
 *   - The three guaranteed slots (en/bn/hi — the emit validator's floor)
 *     are always filled: from the language's own dictionary when that
 *     dictionary is genuinely loaded on this device, else from English.
 *   - A draft-language slot is included ONLY when that language's real
 *     dictionary supplied the string on this device. English text is
 *     never stamped under another language's code — a missing slot is
 *     honest, and readers fall back to English at render (NT.pick).
 *   - Watchers (Waves 1+2) produce on the recipient's own device, whose
 *     dictionary IS their language — so a Tamil sevadar and a Marathi
 *     trustee read their Suchana in their own language.
 *
 * Placeholder semantics are warmCopy's, unchanged: `{name}`-style tokens
 * are filled from params; unknown placeholders stay visibly intact so a
 * missing param never silently produces a broken sentence.
 */

import { getDict } from '../i18n/translations';
import type { TranslationSchema } from '../i18n/schema';
import type { NotifyKind, TriText } from './types';

/** The app's ten languages, in the dictionary's canonical order. */
export const NOTIFY_LANGS = [
  'en', 'bn', 'hi', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa',
] as const;
export type NotifyLangCode = (typeof NOTIFY_LANGS)[number];

/** The emit validator's floor: these three slots are always present. */
const GUARANTEED_LANGS = ['en', 'bn', 'hi'] as const;
const DRAFT_LANGS = ['ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa'] as const;

type Params = Record<string, string | number>;

function camelKind(kind: string): string {
  return kind.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

/**
 * The dictionary leaf for one half of one copy entry, e.g.
 * ('seva_order', 'ticketPurchased', 'title') → 'sevaOrderTicketPurchasedTitle'.
 * The naming is mechanical and total: all 88 warmCopy entries map to
 * exactly 176 leaves under `surfaces.notify`.
 */
export function notifyLeafKey(kind: NotifyKind, entryKey: string, part: 'title' | 'body'): string {
  const head = entryKey.charAt(0).toUpperCase() + entryKey.slice(1);
  return camelKind(kind) + head + (part === 'title' ? 'Title' : 'Body');
}

/** Pure template read over one dictionary object (testable, no loader). */
export function notifyTemplateFrom(
  dict: Partial<TranslationSchema> | null | undefined,
  leaf: string,
): string | undefined {
  const bucket = dict?.surfaces?.notify;
  const v = bucket ? bucket[leaf] : undefined;
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/**
 * The language's OWN template — present only when that language's real
 * dictionary is loaded on this device. `getDict` returns the shared
 * English dict for a language that was never loaded, so the reference
 * check is what keeps English from being stamped under another code.
 */
export function notifyOwnTemplate(leaf: string, lang: string): string | undefined {
  if (lang === 'en') return notifyTemplateFrom(getDict('en'), leaf);
  const dict = getDict(lang);
  if (dict === getDict('en')) return undefined;
  return notifyTemplateFrom(dict, leaf);
}

/** Own template, else the English template (the house fallback chain). */
export function notifyTemplate(leaf: string, lang: string): string | undefined {
  return notifyOwnTemplate(leaf, lang) ?? notifyTemplateFrom(getDict('en'), leaf);
}

/** Fill `{placeholders}`; unknown ones stay visibly intact (warmCopy law). */
export function fillNotifyTemplate(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}

/**
 * Build the stored text map for one copy entry — the dictionary-era
 * successor of warmCopy's copyFor+renderCopy+tri pipeline:
 *   - unknown kind/key → the visible marker title `[copy:kind/key]`
 *     and an empty body, exactly as copyFor's fallback behaved;
 *   - a guaranteed slot whose filled value is empty falls back to the
 *     English fill (tri's standing rule);
 *   - draft slots ride along only when genuinely resolved (see header).
 */
export function buildNotifyText(
  kind: NotifyKind,
  key: string,
  params: Params = {},
): { title: TriText; body: TriText } {
  const build = (part: 'title' | 'body'): TriText => {
    const leaf = notifyLeafKey(kind, key, part);
    const enTemplate = notifyTemplateFrom(getDict('en'), leaf);
    const enFill =
      enTemplate !== undefined
        ? fillNotifyTemplate(enTemplate, params)
        : part === 'title'
          ? `[copy:${kind}/${key}]`
          : '';
    const out: TriText = { en: enFill, bn: enFill, hi: enFill };
    for (const lang of GUARANTEED_LANGS) {
      if (lang === 'en') continue;
      const own = notifyOwnTemplate(leaf, lang);
      const filled = own !== undefined ? fillNotifyTemplate(own, params) : enFill;
      out[lang] = filled || enFill;
    }
    for (const lang of DRAFT_LANGS) {
      const own = notifyOwnTemplate(leaf, lang);
      if (own !== undefined) out[lang] = fillNotifyTemplate(own, params);
    }
    return out;
  };
  return { title: build('title'), body: build('body') };
}

/**
 * One entry rendered in ONE language (settings previews, tests, and any
 * render-side resolution): own dictionary → English → the visible
 * missing-copy marker for the title / empty body.
 */
export function renderNotifyText(
  kind: NotifyKind,
  key: string,
  params: Params,
  lang: string,
): { title: string; body: string } {
  const one = (part: 'title' | 'body'): string => {
    const leaf = notifyLeafKey(kind, key, part);
    const template = notifyTemplate(leaf, lang);
    if (template === undefined) return part === 'title' ? `[copy:${kind}/${key}]` : '';
    return fillNotifyTemplate(template, params);
  };
  return { title: one('title'), body: one('body') };
}
