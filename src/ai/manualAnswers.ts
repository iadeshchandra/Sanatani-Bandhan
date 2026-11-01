/**
 * ai/manualAnswers.ts — Margdarshan J4: the Copilot learns the manual.
 * =====================================================================
 * Blueprint §10 (J4). Two capabilities, both extending the EXISTING
 * locator/howto path — no parallel brain:
 *
 *  1. CITED MANUAL ANSWERS. A how-to / where-is question that a
 *     manual page answers gets an answer composed from that page's
 *     own resolved content (what-it-does + steps — renderer-only,
 *     never invented) plus a citation: the page's title and a deep
 *     link (ManualCitation) the sheet turns into a door.
 *
 *     Retrieval is two-tier, honestly:
 *       · Tier 1 — the LIGHT index (manualIndexData.ts, ~45 KB):
 *         pageId, titles + locator aliases in en/hi/bn, and the
 *         sections each page carries. Derived mechanically from the
 *         manual model; a parity suite re-derives it and fails on
 *         drift. Matching reuses the locator's machinery
 *         (normaliseLocatorText, the same scoring weights and the
 *         same confidence thresholds — high ≥ 6, medium ≥ 4) and
 *         its ambiguity law: a second page within a point of the
 *         best means NO manual answer, never a guess. Below
 *         threshold likewise falls through to the caller's existing
 *         behaviour. The one-line summary is NOT duplicated into
 *         the index (+93 KB measured): it is served from the page.
 *       · Tier 2 — on a match only, the composer dynamic-imports
 *         the manual model from the margdarshan-content lazy chunk
 *         (runtime-cached, never precached — the J1 law) and
 *         resolves the real page. If that chunk cannot load (first
 *         offline run), the answer degrades to the page title +
 *         the citation door with an honest frame — never to
 *         invented prose.
 *
 *     Matching pools are en/hi/bn (the base locator pools); the 7
 *     draft languages keep today's behaviour (their catalogue
 *     overlays are the future home of draft manual matching, the
 *     ai-draft-content pattern). A Hindi question can never be
 *     stolen by a stray shared word: a single weak hit scores
 *     'low' and low never answers (the तीर्थ lesson, pinned).
 *
 *  2. ASK-TO-SUGGEST BRIDGE. A how-to / feature question with NO
 *     manual page (and no locator answer) earns an OFFER — never an
 *     auto-filing: "Shall I add this to Your Voice as a suggestion?"
 *     The draft rides the response as inert data (the Blueprint C
 *     draft law); only the sheet's File tap writes, through J3's
 *     own buildSuggestionCreate + createSuggestion. Kind rule:
 *     a how-to/where-is the manual lacked → 'manual-gap' (the team
 *     learns where the manual is silent); a wish ("I wish the app
 *     could…") → 'feature'. Title = the user's question trimmed to
 *     the rules' 140; body = the question in their own words.
 *
 * ISOLATION: the index derives ONLY from the public manual model —
 * the manual is world-readable by the owner's read law, so a
 * citation is safe on every surface. Nothing here reads GodMode or
 * platform data; surfaceGuard still runs last in the pipeline, and
 * the J4 suite scans the whole index against its never-surface
 * list. Role doors are untouched: the manual page is public, and
 * the desk door INSIDE the page is judged by the centre as always —
 * answering from the manual grants no desk access.
 */

import {
  MANUAL_INDEX,
  type ManualIndexEntry,
} from './manualIndexData';
import { normaliseLocatorText } from './locator';
import type {
  ManualCitation,
  SuggestBridgeDraft,
  TaskCtx,
} from './types';

export type { ManualIndexEntry };

type Lang3 = 'en' | 'hi' | 'bn';
function l3(lang: string): Lang3 {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}

/* ------------------------------------------------------------------ */
/* The matcher — the locator's scoring discipline, mirrored          */
/* (locator.ts confidenceFor + scoreEntry weights; its pools here    */
/* are the index's titles/primary/aliases instead of overlay pools). */
/* ------------------------------------------------------------------ */

export type ManualConfidence = 'high' | 'medium' | 'low' | 'none';

export interface ManualMatch {
  best: ManualIndexEntry | null;
  confidence: ManualConfidence;
  evidence: string[];
  /** 2+ pages tied at the top — the matcher refuses to guess. */
  ambiguous: ManualIndexEntry[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hit(text: string, pat: string): boolean {
  return new RegExp(`(?<!\\p{L})${escapeRegExp(pat)}(?!\\p{L})`, 'u').test(text);
}

function scoreEntry(
  entry: ManualIndexEntry,
  text: string
): { score: number; evidence: string[] } {
  let score = 0;
  const evidence: string[] = [];
  const primary = new Set(entry.primary.map(normaliseLocatorText));
  const seen = new Set<string>();
  const pools: Array<{ pats: string[]; isPrimaryPool: boolean }> = [
    // The page's own titles ARE its name — primary pool, exactly as
    // the locator scores an entry's name.
    {
      pats: [entry.titles.en, entry.titles.hi, entry.titles.bn],
      isPrimaryPool: true,
    },
    { pats: entry.primary, isPrimaryPool: true },
    { pats: entry.aliases, isPrimaryPool: false },
    // The slug / desk id / guide id as matchable tokens (the locator
    // likewise pools a desk entry's name + deskId).
    {
      pats: [entry.slug.replace(/-/g, ' '), entry.deskId ?? '', entry.guideId ?? ''],
      isPrimaryPool: false,
    },
  ];
  for (const { pats, isPrimaryPool } of pools) {
    for (const raw of pats) {
      const pat = normaliseLocatorText(raw);
      if (!pat || seen.has(pat)) continue;
      seen.add(pat);
      if (!hit(text, pat)) continue;
      const isPhrase = pat.includes(' ');
      let pts = isPhrase ? 4 : 2;
      if (isPrimaryPool || primary.has(pat)) pts += 2;
      // A single Indic-script word is a whole concept — as
      // distinctive as a name (the locator's own rule).
      if (!isPhrase && /[^\x00-\x7F]/.test(pat)) pts += 2;
      score += pts;
      evidence.push(raw);
    }
  }
  return { score, evidence };
}

function confidenceFor(score: number): ManualConfidence {
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 2) return 'low';
  return 'none';
}

/** Find the manual page a question is about — or refuse, honestly. */
export function matchManualPage(input: string): ManualMatch {
  const text = normaliseLocatorText(input);
  if (!text) return { best: null, confidence: 'none', evidence: [], ambiguous: [] };
  const scored = MANUAL_INDEX.map((entry) => ({
    entry,
    ...scoreEntry(entry, text),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) {
    return { best: null, confidence: 'none', evidence: [], ambiguous: [] };
  }
  const top = scored[0];
  const confidence = confidenceFor(top.score);
  let ambiguous: ManualIndexEntry[] = [];
  if (confidence === 'high' || confidence === 'medium') {
    const tied = scored.filter((s) => s.score >= 4 && s.score >= top.score - 1);
    if (tied.length >= 2) ambiguous = tied.slice(0, 3).map((s) => s.entry);
  } else if (
    scored.length >= 2 &&
    scored[1].score === top.score &&
    top.score >= 2
  ) {
    ambiguous = scored
      .filter((s) => s.score === top.score)
      .slice(0, 3)
      .map((s) => s.entry);
  }
  return { best: top.entry, confidence, evidence: top.evidence, ambiguous };
}

/** True only for a confident, unambiguous match — the answer bar. */
export function isManualHit(m: ManualMatch): boolean {
  return (
    !!m.best &&
    (m.confidence === 'high' || m.confidence === 'medium') &&
    m.ambiguous.length < 2
  );
}

export function manualIndexSize(): number {
  return MANUAL_INDEX.length;
}

export function getManualIndexEntry(slug: string): ManualIndexEntry | undefined {
  return (
    MANUAL_INDEX.find((e) => e.slug === slug) ??
    MANUAL_INDEX.find((e) => e.alsoSlugs?.includes(slug))
  );
}

/* ------------------------------------------------------------------ */
/* Citations                                                          */
/* ------------------------------------------------------------------ */

function citationOf(entry: ManualIndexEntry, lang: string): ManualCitation {
  return {
    slug: entry.slug,
    title: entry.titles[l3(lang)],
    href: `/margdarshan/manual/${entry.slug}`,
  };
}

export function citationForSlug(slug: string, lang: string): ManualCitation | undefined {
  const e = getManualIndexEntry(slug);
  return e ? citationOf(e, lang) : undefined;
}

export function citationForGuide(guideId: string, lang: string): ManualCitation | undefined {
  const e = MANUAL_INDEX.find((x) => x.guideId === guideId);
  return e ? citationOf(e, lang) : undefined;
}

export function manualEntryForLocatorEntry(
  locatorEntryId: string
): ManualIndexEntry | undefined {
  return MANUAL_INDEX.find((x) => x.locatorEntryId === locatorEntryId);
}

export function citationForLocatorEntry(
  locatorEntryId: string,
  lang: string
): ManualCitation | undefined {
  const e = manualEntryForLocatorEntry(locatorEntryId);
  return e ? citationOf(e, lang) : undefined;
}

/** The in-text provenance line (en/hi/bn authored, the locator's
 *  TriText idiom; draft languages fall back to the English line,
 *  exactly as unauthored locator fields do — the citation CARD in
 *  the sheet carries the label in all 10 via marg.* keys). */
const CITATION_LINE: Record<Lang3, (title: string) => string> = {
  en: (title) => `📖 From the manual — **${title}**`,
  hi: (title) => `📖 मार्गदर्शिका से — **${title}**`,
  bn: (title) => `📖 নির্দেশিকা থেকে — **${title}**`,
};

export function citationLine(lang: string, title: string): string {
  return CITATION_LINE[l3(lang)](title);
}

/* ------------------------------------------------------------------ */
/* The composed manual answer (tier 2)                                */
/* ------------------------------------------------------------------ */

const HOW_HEADING: Record<Lang3, string> = {
  en: 'How to',
  hi: 'कैसे करें',
  bn: 'কীভাবে করবেন',
};

const CHUNK_FALLBACK_FRAME: Record<Lang3, string> = {
  en: 'The manual explains this page step by step — open it below and walk through it with the phone in your hand.',
  hi: 'मार्गदर्शिका इस पृष्ठ को कदम-दर-कदम समझाती है — नीचे खोलकर फ़ोन हाथ में लेकर साथ चलें।',
  bn: 'নির্দেশিকা এই পৃষ্ঠাটি ধাপে ধাপে বুঝিয়ে দেয় — নিচে খুলে ফোন হাতে নিয়ে সাথে এগোন।',
};

export interface ComposedManualAnswer {
  /** Fully composed answer text (the caller renders it verbatim). */
  answer: string;
  citation: ManualCitation;
}

/**
 * Compose the cited answer for a matched page. Loads the resolved
 * page from the lazy manual chunk; on any load failure, degrades
 * to title + honest frame + citation — never invented prose.
 */
export async function composeManualAnswer(
  entry: ManualIndexEntry,
  lang: string
): Promise<ComposedManualAnswer> {
  const citation = citationOf(entry, lang);
  const tri = l3(lang);
  try {
    const mod = await import('../lib/margdarshan/manual');
    const page = mod.getManualPage(entry.slug);
    if (page) {
      const r = mod.resolveManualPage(page, lang);
      const steps = r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      const answer =
        `🙏 **${r.name}**\n\n${r.whatItDoes}` +
        (steps ? `\n\n**${HOW_HEADING[tri]}:**\n${steps}` : '') +
        `\n\n${citationLine(lang, citation.title)}`;
      return { answer, citation };
    }
  } catch {
    /* chunk unreachable (first offline run) — degrade honestly */
  }
  return {
    answer:
      `🙏 **${citation.title}**\n\n${CHUNK_FALLBACK_FRAME[tri]}` +
      `\n\n${citationLine(lang, citation.title)}`,
    citation,
  };
}

/** Owner-surface provenance for a manual-sourced answer: the manual
 *  is bundled content, so the snapshot is labelled not-live. */
export function manualSources(entry: ManualIndexEntry) {
  return [
    {
      label: `Margdarshan manual — ${entry.slug}`,
      readAt: Date.now(),
      live: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Ask-to-suggest bridge                                              */
/* ------------------------------------------------------------------ */

/** Wish phrasing (en/hi/bn + common transliterations): the user is
 *  asking for something the app does not have — a feature voice. */
const WISH_PATTERNS = [
  'i wish', 'wish the app', 'please add', 'can you add', 'could you add',
  'should have', 'would be nice', 'feature request', 'add a feature',
  'kaash', 'काश', 'जोड़ दीजिए', 'जोड़ दें', 'होना चाहिए',
  'যদি থাকত', 'যোগ করুন', 'যোগ করা যায়', 'থাকলে ভালো হত', 'jodi thakto',
];

/** How-to / where-is phrasing: the user is asking how the app works
 *  — a manual-gap voice when nobody could answer. Mirrors the core
 *  of intents.ts HOWTO_KW + the locator's reach/where markers. */
const HOW_PATTERNS = [
  'how to', 'how do', 'how can', 'how is', 'where is', 'where are',
  'where do', 'steps to', 'guide', 'kaise', 'कैसे',
  'কীভাবে', 'কিভাবে', 'কেমনে', 'কোথায়', 'कहाँ', 'किधर',
];

function anyHit(input: string, patterns: string[]): boolean {
  const text = normaliseLocatorText(input);
  if (!text) return false;
  return patterns.some((p) => hit(text, normaliseLocatorText(p)));
}

export function isWishShaped(input: string): boolean {
  return anyHit(input, WISH_PATTERNS);
}

export function isHowShaped(input: string): boolean {
  return anyHit(input, HOW_PATTERNS);
}

/** Trim a question into a rules-shaped suggestion title (≤140). */
export function suggestionTitleFromQuestion(question: string): string {
  const flat = (question || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= 140) return flat;
  const cut = flat.slice(0, 140);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
}

/**
 * Build the inert bridge draft for a question nobody could answer.
 * kind: the caller decides by intent class (see the header) — this
 * builder only shapes the user's own words to the rules' limits.
 */
export function suggestDraftFor(
  ctx: TaskCtx,
  kind: SuggestBridgeDraft['kind']
): SuggestBridgeDraft {
  const body = (ctx.input || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  return {
    kind,
    title: suggestionTitleFromQuestion(ctx.input),
    body,
  };
}
