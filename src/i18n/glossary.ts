/**
 * i18n/glossary.ts — translator's glossary for the GodMode Translations tab.
 * ==========================================================================
 * Two parts:
 *
 * 1. NEVER_TRANSLATE — sacred terms are handled by the canonical termbase
 *    (src/i18n/termbase.ts: Tier A = identical everywhere, Tier B =
 *    transliterate, never translate). This module re-exports the guardrails
 *    so the Translations editor can show them as reference; it does NOT
 *    redefine them.
 *
 * 2. APPROVED_TERMS — a small STARTER table of ordinary (Tier C) words that
 *    recur in the guide strings under review (donation, blessing, goal…).
 *    These are reference hints for the owner/reviewer, not law. Every entry
 *    is marked starter: confirm with a native speaker before treating it as
 *    final. When a namespace graduates from draft → verified, its reviewer
 *    should confirm or correct these terms.
 */

import { term, termKeys, FORBIDDEN_TRANSLATIONS } from './termbase';
import type { SupportedLang } from './translationQuality';
import { REGIONAL_TERMS } from './regionalTerms';

export { term, termKeys, FORBIDDEN_TRANSLATIONS };

/**
 * Regional vocabulary — the GodMode Translations editor's source of truth
 * for community terms that vary by (language, region). Re-exported from
 * `./regionalTerms` (NOT redefined here). Pan-Sanatani sacred terms never
 * appear here — they never vary.
 */
export { REGIONAL_TERMS, REGIONAL_TERM_KEYS, REGIONS } from './regionalTerms';

/** Languages that currently carry draft (unreviewed) guide strings. */
export type DraftLang = 'sa' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml';

export const DRAFT_LANGS: DraftLang[] = ['sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml'];

/**
 * Terms that must NEVER be translated — enforced by the termbase:
 * - Tier A (identical in every language, Devanagari canonical): ॐ, Aarti,
 *   Prasad, Mantra, Havan, Yajna, Shloka, Stotra, Bhajan, Kirtan, Sankalp,
 *   Tithi, Nakshatra, Panchang, Gau Mata, Tulsi, Dhoop, Deep, Tilak…
 * - SAN-XXXXXX IDs and VDA aliases (name@scope): identifiers, not words.
 * - Deity names and mantra phrases: proper nouns, never translated.
 *
 * Tier B terms (transliterate, never translate): dakshina (never "fee"),
 * seva (never "service"), yajman (never "client"), ashirvad (never
 * "rating"), purohit (never "vendor"), bhakt, sevadar, mandir…
 * See FORBIDDEN_TRANSLATIONS for the CI-lint word list.
 */
export const NEVER_TRANSLATE_GUIDANCE: string[] = [
  'Tier A sacred terms stay in their canonical form in EVERY language (see termbase).',
  'SAN-XXXXXX IDs and name@scope aliases are identifiers — never translate or transliterate them.',
  'Deity names and mantra phrases are proper nouns — never translate them.',
  'Tier B domain terms keep their Sanskrit root in the local script — dakshina is never "fee", seva is never "service".',
];

/** One approved term: the concept + per-language starter renderings. */
export interface GlossaryTerm {
  /** Concept key, e.g. 'donation'. */
  concept: string;
  /** English reference. */
  en: string;
  /** Starter renderings for the draft languages. Confirm with a native speaker. */
  forms: Record<DraftLang, string>;
  note?: string;
}

/**
 * STARTER approved terms — reference hints, not law. A reviewer should
 * confirm or correct each before the namespace graduates to verified.
 */
export const APPROVED_TERMS: GlossaryTerm[] = [
  {
    concept: 'donation',
    en: 'dana (donation)',
    forms: {
      sa: 'दानम्', ta: 'தானம்', te: 'దానం', mr: 'दान',
      gu: 'દાન', kn: 'ದಾನ', ml: 'ദാനം',
    },
    note: 'Pan-Indic word — prefer दान-family over any loanword for "donation".',
  },
  {
    concept: 'blessing',
    en: 'blessing',
    forms: {
      sa: 'आशीर्वादः', ta: 'ஆசீர்வாதம்', te: 'ఆశీర్వాదం', mr: 'आशीर्वाद',
      gu: 'આશીર્વાદ', kn: 'ಆಶೀರ್ವಾದ', ml: 'ആശീർവാദം',
    },
  },
  {
    concept: 'merit',
    en: 'punya (spiritual merit)',
    forms: {
      sa: 'पुण्यम्', ta: 'புண்ணியம்', te: 'పుణ్యం', mr: 'पुण्य',
      gu: 'પુણ્ય', kn: 'ಪುಣ್ಯ', ml: 'പുണ്യം',
    },
    note: 'Keep the Sanskrit root — never render as "points" or "score".',
  },
  {
    concept: 'goal',
    en: 'goal (fundraising target)',
    forms: {
      sa: 'लक्ष्यम्', ta: 'இலக்கு', te: 'లక్ష్యం', mr: 'लक्ष्य',
      gu: 'લક્ષ્ય', kn: 'ಗುರಿ', ml: 'ലക്ഷ്യം',
    },
  },
  {
    concept: 'alias',
    en: 'alias (speakable ID)',
    forms: {
      sa: 'अलियास्', ta: 'அலியாஸ்', te: 'అలియాస్', mr: 'अलियास',
      gu: 'અલિયાસ', kn: 'ಅಲಿಯಾಸ್', ml: 'അലിയാസ്',
    },
    note: 'Transliterate — do not translate. The alias itself (aarav@kashi) is an identifier.',
  },
  {
    concept: 'share',
    en: 'share (verb, e.g. "share receipt")',
    forms: {
      sa: 'प्रेषयतु', ta: 'பகிரவும்', te: 'పంచుకోండి', mr: 'शेअर करा',
      gu: 'શેઅર કરો', kn: 'ಹಂಚಿಕೊಳ್ಳಿ', ml: 'പങ്കിടുക',
    },
  },
  {
    concept: 'tour',
    en: 'tour (as in "take the tour")',
    forms: {
      sa: 'परिचयः', ta: 'அறிமுகம்', te: 'పరిచయం', mr: 'ओळख',
      gu: 'પરિચય', kn: 'ಪರಿಚಯ', ml: 'പരിചയം',
    },
    note: 'Prefer "introduction/walkthrough" sense over transliterated "tour".',
  },
];

/** Look up a glossary term by concept. */
export function glossaryTerm(concept: string): GlossaryTerm | undefined {
  return APPROVED_TERMS.find((t) => t.concept === concept);
}

/** Approved starter rendering of a concept in a draft language (en fallback). */
export function approvedTerm(concept: string, lang: string): string {
  const t = glossaryTerm(concept);
  if (!t) return concept;
  return t.forms[lang as DraftLang] || t.en;
}

/** Guard: every glossary term is keyed by a SupportedLang-safe lookup. */
export function isDraftLang(lang: string): lang is DraftLang {
  return (DRAFT_LANGS as string[]).includes((lang || '').toLowerCase());
}

/**
 * Curator's guidance for a regional term: WHY this word varies by region
 * plus the review confidence ('high' = certain, 'medium' = curated, wants
 * a native check). The Translations editor shows these beside each term.
 * Unknown keys degrade to an empty note — never a crash.
 */
export function regionalTermHint(termKey: string): { note: string; confidence: 'high' | 'medium' } {
  const def = REGIONAL_TERMS[termKey];
  if (!def) return { note: '', confidence: 'medium' };
  return { note: def.note, confidence: def.confidence };
}

export type { SupportedLang };
