/**
 * Seva Suggestions — outcome-focused module copy (i18n).
 * ============================================================================
 * Every module in MODULE_CATALOG gets ONE line that says what it DOES for the
 * institution — no jargon, no "enhance your operational capabilities".
 *
 * i18n: names and one-line descriptions resolve through the suites.seva
 * dictionary (suites.seva.catalog.<moduleId>.name / .desc) with the same
 * fallback chain as t(): current language → English → module id.
 * This module is hook-free on purpose — getModuleCopy(id, lang) is called
 * from components AND from non-component call sites (e.g. RoleHome), so it
 * reads the synchronously-cached dictionary via getDict() instead of the
 * useLanguage() hook. Components re-render (and re-resolve) once the
 * language chunk finishes loading, exactly like t().
 *
 * Institution-neutral language throughout.
 */
import { getDict } from '../i18n/translations';

/**
 * Hook-free dictionary lookup with the t() fallback chain:
 * requested language → English → undefined.
 */
function dictText(key: string, lang?: string): string | undefined {
  const l = (lang || 'en').toLowerCase();
  const segs = key.split('.');
  const read = (dict: any): string | undefined => {
    let cur: any = dict;
    for (const s of segs) {
      if (cur && typeof cur === 'object' && s in cur) cur = cur[s];
      else return undefined;
    }
    return typeof cur === 'string' ? cur : undefined;
  };
  return read(getDict(l)) || (l === 'en' ? undefined : read(getDict('en')));
}

/** Fallback display text for a module id with no authored copy — never blank. */
function prettyId(id: string): string {
  return id.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * Localised one-line outcome copy for a module.
 * Falls back: requested language → English → pretty-printed id.
 */
export function getModuleCopy(id: string, lang?: string): string {
  return dictText(`suites.seva.catalog.${id}.desc`, lang) || prettyId(id);
}

/**
 * Localised module display name (transliterated per the 3-tier termbase).
 * Falls back: requested language → English → module id.
 */
export function getModuleName(id: string, lang?: string): string {
  return dictText(`suites.seva.catalog.${id}.name`, lang) || id;
}
