/**
 * margdarshan/deskPages.ts — the DeskPage builder + resolver (J0).
 * =====================================================================
 * buildDeskPages() derives the manual's page inventory from the two
 * knowledge sources, with NO hand-maintained lists:
 *
 *   1. One page per LOCATOR_MAP entry (72 desks + 7 nested + 2 solo
 *      + 1 public). Slug = the locator id minus its 'loc.' prefix.
 *   2. Guide attachment is a structural join: a MODULE_GUIDES guide
 *      attaches to the DESK page whose catalog deskId equals the
 *      guide id (treasury, devotees, inventory, goshala, pathshala).
 *      The guide library predates the catalog, so most of its ids
 *      live in their own module-id space — there is no source table
 *      joining them to desks, and this builder does not invent one.
 *   3. Every remaining guide becomes a 'topic' page of its own (the
 *      blueprint's Solo/platform topics: wallet, the P2P family,
 *      chat, godmode…), so EVERY guide attaches to exactly one page —
 *      the invariant the J0 tests pin.
 *
 * Domain titles are derived from the locator's generated desk place
 * fragments ("is in the desk list, under <Domain Title>"), which
 * embed the catalog's own titles; entries of a domain must agree
 * (the tests pin unanimity + the exact seven titles, so a template
 * change upstream fails loudly here instead of drifting silently).
 *
 * Resolution (resolveDeskPage) goes through the EXISTING machinery
 * only: the locator's entryNameFor / entryPlaceFor / entryUsedByFor
 * (which already honour the draft-language catalogue overlays) and,
 * for guides, the same overlay-first pick the Copilot's how-to task
 * performs (ai/tasks/howto.ts resolveGuide — mirrored here because
 * that helper is not exported and src/ai is not modified in J0;
 * keep the two in lockstep). en/hi/bn output is byte-identical to
 * the sources' own fields.
 */

import {
  LOCATOR_MAP,
  entryNameFor,
  entryPlaceFor,
  entryUsedByFor,
  usedByKeyOf,
  type LocatorEntry,
} from '../../ai/locator';
import { guideOverlay } from '../../ai/lang/shared';
import {
  MODULE_GUIDES,
  getGuide,
  type Lang3,
  type ModuleGuide,
} from '../moduleGuides';
import type { DeskPage, ResolvedDeskPage } from './types';

/* ------------------------------------------------------------------ */
/* Domain titles, derived                                              */
/* ------------------------------------------------------------------ */

/** The locator's generated desk place fragment, en form. */
const DESK_PLACE_PREFIX = 'is in the desk list, under ';

/**
 * Domain number → English domain title, derived from the desk
 * entries' generated place fragments. Entries whose place does not
 * follow the generated template contribute nothing; among those that
 * do, the first title wins (unanimity is a test invariant).
 */
export function deriveDomainTitles(
  entries: readonly LocatorEntry[] = LOCATOR_MAP
): Map<number, string> {
  const titles = new Map<number, string>();
  for (const e of entries) {
    if (e.kind !== 'desk' || e.domain == null) continue;
    if (titles.has(e.domain)) continue;
    const en = e.place.en;
    if (en.startsWith(DESK_PLACE_PREFIX)) {
      titles.set(e.domain, en.slice(DESK_PLACE_PREFIX.length));
    }
  }
  return titles;
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

function slugOfLocatorEntry(entry: LocatorEntry): string {
  return entry.id.startsWith('loc.') ? entry.id.slice(4) : entry.id;
}

/**
 * Build the full DeskPage inventory. Pure and deterministic: same
 * sources → identical output, in source order (locator pages in
 * LOCATOR_MAP order, then topic pages in MODULE_GUIDES order).
 */
export function buildDeskPages(): DeskPage[] {
  const domainTitles = deriveDomainTitles();

  // Structural guide join: guide id → the DESK page slug whose
  // catalog deskId equals it. First desk wins; desk ids are unique
  // in the locator map (pinned by tests).
  const deskSlugByDeskId = new Map<string, string>();
  for (const e of LOCATOR_MAP) {
    if (e.kind === 'desk' && e.deskId && !deskSlugByDeskId.has(e.deskId)) {
      deskSlugByDeskId.set(e.deskId, slugOfLocatorEntry(e));
    }
  }
  const guideIdByDeskSlug = new Map<string, string>();
  const attachedGuideIds = new Set<string>();
  for (const g of MODULE_GUIDES) {
    const slug = deskSlugByDeskId.get(g.id);
    if (slug) {
      guideIdByDeskSlug.set(slug, g.id);
      attachedGuideIds.add(g.id);
    }
  }

  const pages: DeskPage[] = [];

  for (const e of LOCATOR_MAP) {
    const slug = slugOfLocatorEntry(e);
    const isNested = e.kind === 'nested';
    pages.push({
      id: slug,
      slug,
      kind: e.kind,
      locatorEntryId: e.id,
      ...(e.deskId ? { deskId: e.deskId } : {}),
      ...(isNested && e.deskId && deskSlugByDeskId.has(e.deskId)
        ? { parentSlug: deskSlugByDeskId.get(e.deskId) }
        : {}),
      ...(e.domain != null ? { domain: e.domain } : {}),
      ...(e.domain != null && domainTitles.has(e.domain)
        ? { domainTitle: domainTitles.get(e.domain) }
        : {}),
      ...(usedByKeyOf(e.usedBy) ? { usedByKey: usedByKeyOf(e.usedBy) } : {}),
      ...(e.route ? { route: e.route } : {}),
      ...(guideIdByDeskSlug.has(slug)
        ? { guideId: guideIdByDeskSlug.get(slug) }
        : {}),
      relatedSlugs: [],
    });
  }

  // Guide-only topics: every guide the structural join did not place
  // becomes a page of its own, so the guide library's coverage (the
  // Solo/platform topics) is part of the same inventory.
  for (const g of MODULE_GUIDES) {
    if (attachedGuideIds.has(g.id)) continue;
    pages.push({
      id: g.id,
      slug: g.id,
      kind: 'topic',
      guideId: g.id,
      relatedSlugs: [],
    });
  }

  // Related links, derived from each attached guide's relatedModules:
  // a related id resolves to the page that OWNS that guide, else to
  // the desk page carrying that deskId, else to the topic page of
  // that slug. Unresolvable ids are dropped (the inventory in the
  // batch NOTES counts them); self-links are dropped.
  const pageByGuideId = new Map<string, DeskPage>();
  const pageByDeskId = new Map<string, DeskPage>();
  const pageBySlug = new Map<string, DeskPage>();
  for (const p of pages) {
    if (p.guideId) pageByGuideId.set(p.guideId, p);
    if (p.kind === 'desk' && p.deskId) pageByDeskId.set(p.deskId, p);
    pageBySlug.set(p.slug, p);
  }
  for (const p of pages) {
    if (!p.guideId) continue;
    const guide = getGuide(p.guideId);
    if (!guide) continue;
    const seen = new Set<string>();
    for (const rel of guide.relatedModules) {
      const target =
        pageByGuideId.get(rel) || pageByDeskId.get(rel) || pageBySlug.get(rel);
      if (target && target.slug !== p.slug && !seen.has(target.slug)) {
        seen.add(target.slug);
        p.relatedSlugs.push(target.slug);
      }
    }
  }

  return pages;
}

/** The inventory, built once at module load (pure derivation). */
export const DESK_PAGES: DeskPage[] = buildDeskPages();

export function getDeskPage(slug: string): DeskPage | undefined {
  return DESK_PAGES.find((p) => p.slug === slug);
}

/** Atlas grouping: domain number → its pages (desk + nested), 1–7. */
export function pagesByDomain(
  pages: readonly DeskPage[] = DESK_PAGES
): Map<number, DeskPage[]> {
  const out = new Map<number, DeskPage[]>();
  for (const p of pages) {
    if (p.domain == null) continue;
    const list = out.get(p.domain) || [];
    list.push(p);
    out.set(p.domain, list);
  }
  return new Map([...out.entries()].sort((a, b) => a[0] - b[0]));
}

/* ------------------------------------------------------------------ */
/* Resolution — existing overlay machinery only                        */
/* ------------------------------------------------------------------ */

type Lang3Code = 'en' | 'hi' | 'bn';
function l3(lang: string): Lang3Code {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}

interface ResolvedGuideFields {
  name: string;
  tagline: string;
  whatItIs: string;
  whyItMatters: string;
  firstSteps: string[];
  proTips: string[];
}

/** Overlay-first guide resolution — mirrors ai/tasks/howto.ts
 *  resolveGuide exactly (draft overlay wins; else the guide's own
 *  Lang3 fields, byte-identical). */
function resolveGuideFields(
  guide: ModuleGuide,
  lang: string
): ResolvedGuideFields {
  const o = guideOverlay(lang, guide.id);
  if (o) {
    return {
      name: o.name,
      tagline: o.tagline,
      whatItIs: o.whatItIs,
      whyItMatters: o.whyItMatters,
      firstSteps: o.firstSteps,
      proTips: o.proTips,
    };
  }
  const l = l3(lang);
  const pick = (t: Lang3) => t[l];
  return {
    name: pick(guide.name),
    tagline: pick(guide.tagline),
    whatItIs: pick(guide.whatItIs),
    whyItMatters: pick(guide.whyItMatters),
    firstSteps: guide.firstSteps.map(pick),
    proTips: guide.proTips.map(pick),
  };
}

/**
 * A page's display content in the reader's language. Locator fields
 * resolve through the locator's own overlay-aware resolvers; guide
 * fields through the guide overlay machinery. Nothing is paraphrased
 * and nothing is invented: absent source content stays absent.
 */
export function resolveDeskPage(page: DeskPage, lang: string): ResolvedDeskPage {
  const guide = page.guideId ? getGuide(page.guideId) : undefined;
  const g = guide ? resolveGuideFields(guide, lang) : undefined;

  let name: string;
  let place: string | undefined;
  let usedBy: string | undefined;
  if (page.locatorEntryId) {
    const entry = LOCATOR_MAP.find((e) => e.id === page.locatorEntryId);
    if (entry) {
      name = entryNameFor(entry, lang);
      place = entryPlaceFor(entry, lang);
      usedBy = entryUsedByFor(entry, lang);
    } else {
      name = g ? g.name : page.slug;
    }
  } else {
    name = g ? g.name : page.slug;
  }

  return {
    name,
    ...(place !== undefined ? { place } : {}),
    ...(usedBy !== undefined ? { usedBy } : {}),
    ...(g
      ? {
          tagline: g.tagline,
          purpose: g.whatItIs,
          whyItMatters: g.whyItMatters,
        }
      : {}),
    steps: g ? g.firstSteps : [],
    proTips: g ? g.proTips : [],
  };
}
