/**
 * Sanatani Bandhan — AI Assistant · B2-C draft-language overlay access
 * =====================================================================
 * Single access point for the per-language overlay data authored in
 * src/ai/lang/<code>.ts (templates, corpus answers, labels, locator
 * frames, router keywords). Consumers (templates.ts, corpus, intents,
 * locator, task label tables) read through here so the overlay shape
 * lives in exactly one place.
 *
 * HONESTY: these are AI-authored DRAFT translations (the same honesty
 * class as the draft UI dictionaries); native-speaker proofread is the
 * registered human follow-up. Anything an overlay does not author
 * resolves to English through the callers' fallback chains — never
 * blank, never a wrong-language render.
 */
import { LABELS_TA, LOCATOR_TA } from './ta';
import { DHARMA_TA, NAV_TA, NAV_TAKEME_TA, TIRTHA_TA, KEYWORDS_TA, DEST_TA } from './ta-data';
import { LABELS_TE, LOCATOR_TE } from './te';
import { DHARMA_TE, NAV_TE, NAV_TAKEME_TE, TIRTHA_TE, KEYWORDS_TE, DEST_TE } from './te-data';
import { LABELS_MR, LOCATOR_MR } from './mr';
import { DHARMA_MR, NAV_MR, NAV_TAKEME_MR, TIRTHA_MR, KEYWORDS_MR, DEST_MR } from './mr-data';
import { LABELS_GU, LOCATOR_GU } from './gu';
import { DHARMA_GU, NAV_GU, NAV_TAKEME_GU, TIRTHA_GU, KEYWORDS_GU, DEST_GU } from './gu-data';
import { LABELS_KN, LOCATOR_KN } from './kn';
import { DHARMA_KN, NAV_KN, NAV_TAKEME_KN, TIRTHA_KN, KEYWORDS_KN, DEST_KN } from './kn-data';
import { LABELS_ML, LOCATOR_ML } from './ml';
import { DHARMA_ML, NAV_ML, NAV_TAKEME_ML, TIRTHA_ML, KEYWORDS_ML, DEST_ML } from './ml-data';
import { LABELS_SA, LOCATOR_SA } from './sa';
import { DHARMA_SA, NAV_SA, NAV_TAKEME_SA, TIRTHA_SA, KEYWORDS_SA, DEST_SA } from './sa-data';
import { LOCATOR_CATALOG_TA } from './ta-locator';
import { GUIDES_TA } from './ta-howto';
import { LOCATOR_CATALOG_TE } from './te-locator';
import { GUIDES_TE } from './te-howto';
import { LOCATOR_CATALOG_MR } from './mr-locator';
import { GUIDES_MR } from './mr-howto';
import { LOCATOR_CATALOG_GU } from './gu-locator';
import { GUIDES_GU } from './gu-howto';
import { LOCATOR_CATALOG_KN } from './kn-locator';
import { GUIDES_KN } from './kn-howto';
import { LOCATOR_CATALOG_ML } from './ml-locator';
import { GUIDES_ML } from './ml-howto';
import { LOCATOR_CATALOG_SA } from './sa-locator';
import { GUIDES_SA } from './sa-howto';

export const DRAFT_LANGS = ['ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa'] as const;
export type DraftLang = (typeof DRAFT_LANGS)[number];

export function isDraftLang(lang: string): lang is DraftLang {
  return (DRAFT_LANGS as readonly string[]).includes((lang || '').toLowerCase());
}

export interface CorpusOverlayEntry {
  answer: string;
  patterns: string[];
}

export interface LocatorOverlay {
  outOfScope: (usedBy: string) => string;
  viaOrgsSuffix: string;
  clarifyIntro: string;
  dontKnow: string;
}

/** One locator-catalogue entry in a draft language (Locator/Howto
 *  completion batch): the feature's name in the language's own script,
 *  the match layer (primary = name-forms, aliases = concept words —
 *  unioned into matchLocator across all draft languages, exactly like
 *  overlayKeywords), and, for nested/solo/public entries, the full
 *  place sentence. Desk entries compose place from domains +
 *  placeTemplate instead. */
export interface LocatorEntryOverlay {
  name: string;
  place?: string;
  aliases: string[];
  primary: string[];
}

/** The whole locator catalogue overlay for one draft language. */
export interface LocatorCatalogOverlay {
  entries: Record<string, LocatorEntryOverlay>;
  /** Sidebar domain number ('1'..'7') → its title in this language. */
  domains: Record<string, string>;
  /** Desk place fragment with a literal '{domain}' placeholder. */
  placeTemplate: string;
  /** The 11 shared "used by" role phrases, by locator.ts key. */
  usedBy: Record<string, string>;
  /** "Where is…" / "how do I reach…" interrogatives in this language —
   *  unioned into isLocatorQuestion so a native-script question can
   *  reach the locator executor at all. */
  where: string[];
}

/** One module guide in a draft language — full ModuleGuide parity
 *  (name/tagline/whatItIs/whyItMatters + 3 first steps + 2 pro tips). */
export interface GuideOverlay {
  name: string;
  tagline: string;
  whatItIs: string;
  whyItMatters: string;
  firstSteps: string[];
  proTips: string[];
}

interface LangBundle {
  labels: Record<string, string>;
  locator: LocatorOverlay;
  locatorCatalog: LocatorCatalogOverlay;
  guides: Record<string, GuideOverlay>;
  dharma: Record<string, CorpusOverlayEntry>;
  nav: Record<string, CorpusOverlayEntry>;
  navTakeMe: string;
  tirtha: Record<string, string>;
  keywords: Record<string, string[]>;
  dest: Record<string, string[]>;
}

const BUNDLES: Record<DraftLang, LangBundle> = {
  ta: { labels: LABELS_TA, locator: LOCATOR_TA, locatorCatalog: LOCATOR_CATALOG_TA, guides: GUIDES_TA, dharma: DHARMA_TA, nav: NAV_TA, navTakeMe: NAV_TAKEME_TA, tirtha: TIRTHA_TA, keywords: KEYWORDS_TA, dest: DEST_TA },
  te: { labels: LABELS_TE, locator: LOCATOR_TE, locatorCatalog: LOCATOR_CATALOG_TE, guides: GUIDES_TE, dharma: DHARMA_TE, nav: NAV_TE, navTakeMe: NAV_TAKEME_TE, tirtha: TIRTHA_TE, keywords: KEYWORDS_TE, dest: DEST_TE },
  mr: { labels: LABELS_MR, locator: LOCATOR_MR, locatorCatalog: LOCATOR_CATALOG_MR, guides: GUIDES_MR, dharma: DHARMA_MR, nav: NAV_MR, navTakeMe: NAV_TAKEME_MR, tirtha: TIRTHA_MR, keywords: KEYWORDS_MR, dest: DEST_MR },
  gu: { labels: LABELS_GU, locator: LOCATOR_GU, locatorCatalog: LOCATOR_CATALOG_GU, guides: GUIDES_GU, dharma: DHARMA_GU, nav: NAV_GU, navTakeMe: NAV_TAKEME_GU, tirtha: TIRTHA_GU, keywords: KEYWORDS_GU, dest: DEST_GU },
  kn: { labels: LABELS_KN, locator: LOCATOR_KN, locatorCatalog: LOCATOR_CATALOG_KN, guides: GUIDES_KN, dharma: DHARMA_KN, nav: NAV_KN, navTakeMe: NAV_TAKEME_KN, tirtha: TIRTHA_KN, keywords: KEYWORDS_KN, dest: DEST_KN },
  ml: { labels: LABELS_ML, locator: LOCATOR_ML, locatorCatalog: LOCATOR_CATALOG_ML, guides: GUIDES_ML, dharma: DHARMA_ML, nav: NAV_ML, navTakeMe: NAV_TAKEME_ML, tirtha: TIRTHA_ML, keywords: KEYWORDS_ML, dest: DEST_ML },
  sa: { labels: LABELS_SA, locator: LOCATOR_SA, locatorCatalog: LOCATOR_CATALOG_SA, guides: GUIDES_SA, dharma: DHARMA_SA, nav: NAV_SA, navTakeMe: NAV_TAKEME_SA, tirtha: TIRTHA_SA, keywords: KEYWORDS_SA, dest: DEST_SA },
};

function bundle(lang: string): LangBundle | undefined {
  const l = (lang || '').toLowerCase();
  return isDraftLang(l) ? BUNDLES[l] : undefined;
}

/** One flat label (period / kind / draft-line / day / nearby…) in a
 *  draft language, or undefined → the caller falls back to en/hi/bn. */
export function labelFor(lang: string, key: string): string | undefined {
  return bundle(lang)?.labels[key];
}

/** The four locator sentence-frames in a draft language, if authored. */
export function locatorOverlay(lang: string): LocatorOverlay | undefined {
  return bundle(lang)?.locator;
}

/** Dharma-corpus overlay entry for one entry id in one draft language. */
export function dharmaOverlay(lang: string, entryId: string): CorpusOverlayEntry | undefined {
  return bundle(lang)?.dharma[entryId];
}

/** Navigation-corpus overlay entry for one entry id in one draft language. */
export function navOverlay(lang: string, entryId: string): CorpusOverlayEntry | undefined {
  return bundle(lang)?.nav[entryId];
}

/** The shared "Take me there" CTA in a draft language. */
export function navTakeMeOverlay(lang: string): string | undefined {
  return bundle(lang)?.navTakeMe;
}

/** A curated tirtha's display name in a draft language. */
export function tirthaNameOverlay(lang: string, tirthaId: string): string | undefined {
  return bundle(lang)?.tirtha[tirthaId];
}

/** Router keywords for one table, unioned across all 7 draft languages.
 *  Matching is language-agnostic (a Tamil keyword matches Tamil input
 *  whatever the UI language), exactly like the hi/bn forms today. */
export function overlayKeywords(table: string): string[] {
  const out: string[] = [];
  for (const l of DRAFT_LANGS) {
    const kws = BUNDLES[l].keywords[table];
    if (Array.isArray(kws)) out.push(...kws);
  }
  return out;
}

/** DESTINATION_MAP script keywords for one route path, unioned across
 *  all 7 draft languages. */
export function overlayDestKeywords(path: string): string[] {
  const out: string[] = [];
  for (const l of DRAFT_LANGS) {
    const kws = BUNDLES[l].dest[path];
    if (Array.isArray(kws)) out.push(...kws);
  }
  return out;
}

/** The locator catalogue overlay for one draft language. */
export function locatorCatalogOverlay(lang: string): LocatorCatalogOverlay | undefined {
  return bundle(lang)?.locatorCatalog;
}

/** One locator entry's overlay in one draft language. */
export function locatorEntryOverlay(lang: string, entryId: string): LocatorEntryOverlay | undefined {
  return bundle(lang)?.locatorCatalog.entries[entryId];
}

/** Every draft language's overlay for one locator entry — the matcher
 *  unions these into the entry's pools (matching is language-agnostic,
 *  exactly like overlayKeywords: a Gujarati alias matches Gujarati
 *  input whatever the UI language). */
export function allLocatorEntryOverlays(entryId: string): LocatorEntryOverlay[] {
  const out: LocatorEntryOverlay[] = [];
  for (const l of DRAFT_LANGS) {
    const e = BUNDLES[l].locatorCatalog.entries[entryId];
    if (e) out.push(e);
  }
  return out;
}

/** "Where is…" interrogatives in every draft language, unioned for
 *  isLocatorQuestion (language-agnostic, like overlayKeywords). */
export function overlayWherePatterns(): string[] {
  const out: string[] = [];
  for (const l of DRAFT_LANGS) out.push(...BUNDLES[l].locatorCatalog.where);
  return out;
}

/** One module guide's overlay in one draft language. */
export function guideOverlay(lang: string, guideId: string): GuideOverlay | undefined {
  return bundle(lang)?.guides[guideId];
}
