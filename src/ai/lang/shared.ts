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

interface LangBundle {
  labels: Record<string, string>;
  locator: LocatorOverlay;
  dharma: Record<string, CorpusOverlayEntry>;
  nav: Record<string, CorpusOverlayEntry>;
  navTakeMe: string;
  tirtha: Record<string, string>;
  keywords: Record<string, string[]>;
  dest: Record<string, string[]>;
}

const BUNDLES: Record<DraftLang, LangBundle> = {
  ta: { labels: LABELS_TA, locator: LOCATOR_TA, dharma: DHARMA_TA, nav: NAV_TA, navTakeMe: NAV_TAKEME_TA, tirtha: TIRTHA_TA, keywords: KEYWORDS_TA, dest: DEST_TA },
  te: { labels: LABELS_TE, locator: LOCATOR_TE, dharma: DHARMA_TE, nav: NAV_TE, navTakeMe: NAV_TAKEME_TE, tirtha: TIRTHA_TE, keywords: KEYWORDS_TE, dest: DEST_TE },
  mr: { labels: LABELS_MR, locator: LOCATOR_MR, dharma: DHARMA_MR, nav: NAV_MR, navTakeMe: NAV_TAKEME_MR, tirtha: TIRTHA_MR, keywords: KEYWORDS_MR, dest: DEST_MR },
  gu: { labels: LABELS_GU, locator: LOCATOR_GU, dharma: DHARMA_GU, nav: NAV_GU, navTakeMe: NAV_TAKEME_GU, tirtha: TIRTHA_GU, keywords: KEYWORDS_GU, dest: DEST_GU },
  kn: { labels: LABELS_KN, locator: LOCATOR_KN, dharma: DHARMA_KN, nav: NAV_KN, navTakeMe: NAV_TAKEME_KN, tirtha: TIRTHA_KN, keywords: KEYWORDS_KN, dest: DEST_KN },
  ml: { labels: LABELS_ML, locator: LOCATOR_ML, dharma: DHARMA_ML, nav: NAV_ML, navTakeMe: NAV_TAKEME_ML, tirtha: TIRTHA_ML, keywords: KEYWORDS_ML, dest: DEST_ML },
  sa: { labels: LABELS_SA, locator: LOCATOR_SA, dharma: DHARMA_SA, nav: NAV_SA, navTakeMe: NAV_TAKEME_SA, tirtha: TIRTHA_SA, keywords: KEYWORDS_SA, dest: DEST_SA },
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
