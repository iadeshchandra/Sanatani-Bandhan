/**
 * margdarshan/manual.ts — the J1 manual registry + resolver.
 * =====================================================================
 * Assembles the manual layer over the J0 inventory:
 *
 *   MANUAL_PAGES  — the pages the manual actually renders: the J0
 *                   inventory minus the topic pages whose guides were
 *                   joined onto a desk page (joins.ts). A joined topic
 *                   slug stays resolvable as an ALIAS to its desk
 *                   page, so a forwarded link never dies.
 *   resolveManualPage(page, lang)
 *                 — the full §4 desk-page view model in one language:
 *                   locator fields via J0's resolver, guide fields
 *                   from the attached OR joined guide, manual fields
 *                   from the authored entries. Precedence is the
 *                   no-duplication law: entry.whatItDoes/steps are
 *                   used ONLY when no guide backs the page.
 *   buildAtlas()  — the Feature Atlas model: the 7 canonical domains,
 *                   each desk's human line (the directory's own
 *                   module copy, falling back to the manual's
 *                   what-it-does) and its plan label TAKEN FROM plan
 *                   data (requiredTierForModule) — never hand-typed.
 *   WINGS         — the centre home's four wings as data, with their
 *                   honest states. Unbuilt wings carry NO navigation
 *                   target: the centre renders their explanation card
 *                   and a door into the manual, never an empty screen
 *                   (the no-dead-button law, pinned by tests).
 *   searchManual()— one search over manual + atlas (they are the same
 *                   corpus: pages), in the reader's language with the
 *                   English corpus behind it.
 */

import { DESK_PAGES, resolveDeskPage } from './deskPages';
import type { DeskPage } from './types';
import {
  GUIDE_JOINS,
  JOINED_GUIDE_BY_DESK_SLUG,
} from './joins';
import { getGuide, type Lang3, type ModuleGuide } from '../moduleGuides';
import { guideOverlay } from '../../ai/lang/shared';
import { getModuleCopy } from '../../suggestions/moduleCopy';
import { requiredTierForModule } from '../workspaceRegistry';
import type { ManualEntry, ResolvedManualPage } from './manualTypes';

import { MANUAL_D1 } from './content/manual-d1';
import { MANUAL_D2A } from './content/manual-d2a';
import { MANUAL_D2B } from './content/manual-d2b';
import { MANUAL_D3D7 } from './content/manual-d3d7';
import { MANUAL_D4A } from './content/manual-d4a';
import { MANUAL_D4B } from './content/manual-d4b';
import { MANUAL_D5D6A } from './content/manual-d5d6a';
import { MANUAL_D5D6B } from './content/manual-d5d6b';
import { MANUAL_TOPICS } from './content/manual-topics';

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

/** All authored manual entries, keyed by page slug. */
export const MANUAL_ENTRIES: Readonly<Record<string, ManualEntry>> = {
  ...MANUAL_D1,
  ...MANUAL_D2A,
  ...MANUAL_D2B,
  ...MANUAL_D3D7,
  ...MANUAL_D4A,
  ...MANUAL_D4B,
  ...MANUAL_D5D6A,
  ...MANUAL_D5D6B,
  ...MANUAL_TOPICS,
};

export function getManualEntry(slug: string): ManualEntry | undefined {
  return MANUAL_ENTRIES[slug];
}

/** The guide that backs a page: J0-attached, else J1-joined. */
export function effectiveGuideId(page: DeskPage): string | undefined {
  return page.guideId ?? JOINED_GUIDE_BY_DESK_SLUG.get(page.slug);
}

/**
 * The manual's rendered pages: the full J0 inventory minus joined
 * topic pages (their guides now live on the desk pages they joined).
 */
export const MANUAL_PAGES: DeskPage[] = DESK_PAGES.filter(
  (p) => !(p.slug in GUIDE_JOINS)
);

/** A slug → its rendered page; joined topic slugs alias to the desk. */
export function getManualPage(slug: string): DeskPage | undefined {
  const direct = MANUAL_PAGES.find((p) => p.slug === slug);
  if (direct) return direct;
  const target = GUIDE_JOINS[slug];
  return target
    ? MANUAL_PAGES.find((p) => p.slug === target)
    : undefined;
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

type Lang3Code = 'en' | 'hi' | 'bn';
function l3(lang: string): Lang3Code {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}
const pick3 = (t: Lang3, lang: string): string => t[l3(lang)];

/** Guide fields in one language — the same overlay-first pick the
 *  Copilot's how-to task performs (mirrored in deskPages.ts for the
 *  attached guides; repeated here for joined guides, which the J0
 *  resolver does not know about). */
function resolveGuide(
  guide: ModuleGuide,
  lang: string
): { tagline: string; whatItIs: string; whyItMatters: string; steps: string[]; proTips: string[] } {
  const o = guideOverlay(lang, guide.id);
  if (o) {
    return {
      tagline: o.tagline,
      whatItIs: o.whatItIs,
      whyItMatters: o.whyItMatters,
      steps: o.firstSteps,
      proTips: o.proTips,
    };
  }
  const pick = (t: Lang3) => pick3(t, lang);
  return {
    tagline: pick(guide.tagline),
    whatItIs: pick(guide.whatItIs),
    whyItMatters: pick(guide.whyItMatters),
    steps: guide.firstSteps.map(pick),
    proTips: guide.proTips.map(pick),
  };
}

/**
 * The full desk-page view model in the reader's language. Throws
 * nothing: a page with no manual entry resolves with empty manual
 * fields (the completeness tests exist to prove that never ships).
 */
export function resolveManualPage(
  page: DeskPage,
  lang: string
): ResolvedManualPage {
  const base = resolveDeskPage(page, lang);
  const entry = getManualEntry(page.slug);
  const guideId = effectiveGuideId(page);
  const guide = guideId ? getGuide(guideId) : undefined;
  const g = guide ? resolveGuide(guide, lang) : undefined;

  // Guide-backed pages take purpose/steps from the guide (J0 resolver
  // already does this for attached guides; joined guides resolve
  // here). Guide-less pages take them from the manual entry.
  const whatItDoes = g
    ? g.whatItIs
    : entry?.whatItDoes
      ? pick3(entry.whatItDoes, lang)
      : base.purpose ?? '';
  const steps = g
    ? g.steps
    : entry?.steps
      ? entry.steps.map((s) => pick3(s, lang))
      : base.steps;

  return {
    slug: page.slug,
    kind: page.kind,
    ...(page.domain != null ? { domain: page.domain } : {}),
    ...(page.domainTitle ? { domainTitle: page.domainTitle } : {}),
    name: base.name,
    ...(base.place !== undefined ? { place: base.place } : {}),
    ...(base.usedBy !== undefined ? { usedBy: base.usedBy } : {}),
    ...(g ? { tagline: g.tagline, whyItMatters: g.whyItMatters } : {}),
    whatItDoes,
    realLifeExample: entry ? pick3(entry.realLifeExample, lang) : '',
    steps,
    proTips: g ? g.proTips : [],
    commonMistakes: entry
      ? entry.commonMistakes.map((s) => pick3(s, lang))
      : [],
    capabilities: entry ? entry.capabilities.map((s) => pick3(s, lang)) : [],
    worksOffline: entry ? entry.worksOffline : true,
    guideBacked: !!g,
    ...(page.deskId ? { deskId: page.deskId } : {}),
    ...(page.parentSlug ? { parentSlug: page.parentSlug } : {}),
    ...(page.route ? { route: page.route } : {}),
    relatedSlugs: page.relatedSlugs,
  };
}

/* ------------------------------------------------------------------ */
/* Feature Atlas                                                       */
/* ------------------------------------------------------------------ */

export interface AtlasEntry {
  slug: string;
  deskId: string;
  name: string;
  /** One human line — directory module copy, else the manual line. */
  line: string;
  /** Plan tier from plan data; null = no plan gate (every plan). */
  tier: string | null;
}

export interface AtlasDomain {
  domain: number;
  title: string;
  entries: AtlasEntry[];
}

/** The atlas: the canonical 7 domains, in order, from the model. */
export function buildAtlas(lang: string): AtlasDomain[] {
  const byDomain = new Map<number, AtlasEntry[]>();
  const titles = new Map<number, string>();
  for (const page of MANUAL_PAGES) {
    if (page.domain == null || !page.deskId) continue;
    if (page.domainTitle) titles.set(page.domain, page.domainTitle);
    const resolved = resolveManualPage(page, lang);
    const copy = getModuleCopy(page.deskId, lang);
    const entry: AtlasEntry = {
      slug: page.slug,
      deskId: page.deskId,
      name: resolved.name,
      // getModuleCopy falls back to a pretty-printed id when the
      // dictionary has no line; that is not a human line — fall back
      // to the manual's what-it-does instead in that case.
      line:
        copy && copy.toLowerCase() !== page.deskId.toLowerCase()
          ? copy
          : resolved.whatItDoes,
      tier: requiredTierForModule(page.deskId),
    };
    const list = byDomain.get(page.domain) || [];
    list.push(entry);
    byDomain.set(page.domain, list);
  }
  return [...byDomain.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([domain, entries]) => ({
      domain,
      title: titles.get(domain) || `Domain ${domain}`,
      entries,
    }));
}

/* ------------------------------------------------------------------ */
/* Centre wings — honest states as data                                */
/* ------------------------------------------------------------------ */

export type WingState = 'live' | 'next' | 'works';

export interface Wing {
  id: 'manual' | 'features' | 'whatsnew' | 'voice' | 'satsang';
  state: WingState;
  /** marg.* dictionary keys for the wing's label + living detail. */
  labelKey: string;
  detailKey: string;
  /**
   * In-centre navigation target for LIVE wings only. Unbuilt wings
   * have none — the centre renders their explanation and a manual
   * door instead (no dead buttons; pinned by tests).
   */
  target?: 'manual' | 'atlas';
}

export const WINGS: readonly Wing[] = [
  { id: 'manual', state: 'live', labelKey: 'marg.wingManual', detailKey: 'marg.wingManualDesc', target: 'manual' },
  { id: 'features', state: 'live', labelKey: 'marg.wingFeatures', detailKey: 'marg.wingFeaturesDesc', target: 'atlas' },
  { id: 'whatsnew', state: 'next', labelKey: 'marg.wingWhatsNew', detailKey: 'marg.wingWhatsNewDesc' },
  { id: 'voice', state: 'works', labelKey: 'marg.wingVoice', detailKey: 'marg.wingVoiceDesc' },
  { id: 'satsang', state: 'works', labelKey: 'marg.wingSatsang', detailKey: 'marg.wingSatsangDesc' },
];

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/**
 * One search over the manual + atlas corpus (the same pages). Matches
 * the resolved name / what-it-does / example in the reader's language,
 * plus the English name and line behind them, plus the locator's
 * alias haystack via the page name in English. Returns pages in
 * inventory order.
 */
export function searchManual(query: string, lang: string): DeskPage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MANUAL_PAGES.filter((page) => {
    const here = resolveManualPage(page, lang);
    const en = resolveManualPage(page, 'en');
    const hay = [
      here.name,
      here.whatItDoes,
      here.realLifeExample,
      en.name,
      en.whatItDoes,
      page.slug,
      page.deskId || '',
    ]
      .join(' ')
      .toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  });
}

/** Starter "most needed" pages when the device has no usage history:
 *  the desks a new institution touches in its first week. */
export const STARTER_SLUGS: readonly string[] = [
  'devotees',
  'treasury',
  'utsav-one',
  'panchang',
  'wallet',
  'donorCare',
];
