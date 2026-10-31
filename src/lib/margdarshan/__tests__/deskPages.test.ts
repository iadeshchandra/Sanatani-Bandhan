/**
 * Margdarshan J0 — DeskPage inventory invariants.
 *
 * Every expected count here is DERIVED from the sources (LOCATOR_MAP,
 * MODULE_GUIDES) inside the test, so the suite tracks the knowledge
 * layer as it grows: a new desk or guide changes the inventory, not
 * the assertions. The only literals pinned are the seven catalog
 * domain titles (a deliberate tripwire — if the catalog's titles or
 * the locator's generated place template change, this fails loudly
 * instead of letting the manual's grouping drift in silence).
 */
import { LOCATOR_MAP, entryNameFor, getLocatorEntry } from '../../../ai/locator';
import { guideOverlay, locatorEntryOverlay } from '../../../ai/lang/shared';
import { MODULE_GUIDES, getGuide } from '../../moduleGuides';
import {
  buildDeskPages,
  deriveDomainTitles,
  DESK_PAGES,
  getDeskPage,
  pagesByDomain,
  resolveDeskPage,
} from '../deskPages';

const deskEntries = LOCATOR_MAP.filter((e) => e.kind === 'desk');
const guidesWithDeskPage = MODULE_GUIDES.filter((g) =>
  deskEntries.some((e) => e.deskId === g.id)
);
const guidesWithoutDeskPage = MODULE_GUIDES.filter(
  (g) => !deskEntries.some((e) => e.deskId === g.id)
);

describe('inventory shape', () => {
  it('has exactly one page per locator entry plus one topic page per unplaced guide', () => {
    expect(DESK_PAGES.length).toBe(
      LOCATOR_MAP.length + guidesWithoutDeskPage.length
    );
  });

  it('every locator entry resolves to exactly one page', () => {
    for (const e of LOCATOR_MAP) {
      const matches = DESK_PAGES.filter((p) => p.locatorEntryId === e.id);
      expect(matches.length).toBe(1);
    }
  });

  it('every guide attaches to exactly one page', () => {
    for (const g of MODULE_GUIDES) {
      const matches = DESK_PAGES.filter((p) => p.guideId === g.id);
      expect(matches.length).toBe(1);
    }
  });

  it('guide attachment follows the structural join (deskId equality on desk pages)', () => {
    for (const g of guidesWithDeskPage) {
      const owner = DESK_PAGES.find((p) => p.guideId === g.id);
      expect(owner).toBeDefined();
      expect(owner!.kind).toBe('desk');
      expect(owner!.deskId).toBe(g.id);
    }
    for (const g of guidesWithoutDeskPage) {
      const owner = DESK_PAGES.find((p) => p.guideId === g.id);
      expect(owner).toBeDefined();
      expect(owner!.kind).toBe('topic');
      expect(owner!.locatorEntryId).toBeUndefined();
    }
  });

  it('slugs are unique and non-empty', () => {
    const slugs = DESK_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s.length).toBeGreaterThan(0);
    for (const p of DESK_PAGES) expect(p.id).toBe(p.slug);
  });

  it('kind counts mirror the sources', () => {
    const byKind = (k: string) => DESK_PAGES.filter((p) => p.kind === k).length;
    expect(byKind('desk')).toBe(deskEntries.length);
    expect(byKind('nested')).toBe(LOCATOR_MAP.filter((e) => e.kind === 'nested').length);
    expect(byKind('solo')).toBe(LOCATOR_MAP.filter((e) => e.kind === 'solo').length);
    expect(byKind('public')).toBe(LOCATOR_MAP.filter((e) => e.kind === 'public').length);
    expect(byKind('topic')).toBe(guidesWithoutDeskPage.length);
  });

  it('nested pages point at their parent desk page', () => {
    for (const p of DESK_PAGES.filter((x) => x.kind === 'nested')) {
      expect(p.parentSlug).toBeDefined();
      const parent = getDeskPage(p.parentSlug!);
      expect(parent).toBeDefined();
      expect(parent!.kind).toBe('desk');
      expect(parent!.deskId).toBe(p.deskId);
    }
  });

  it('J0 authors nothing: manual-only fields are absent everywhere', () => {
    for (const p of DESK_PAGES) {
      expect(p.realLifeExample).toBeUndefined();
      expect(p.commonMistakes).toBeUndefined();
    }
  });

  it('related slugs always resolve to real pages and never self-link', () => {
    for (const p of DESK_PAGES) {
      for (const rel of p.relatedSlugs) {
        expect(getDeskPage(rel)).toBeDefined();
        expect(rel).not.toBe(p.slug);
      }
    }
  });

  it('builder is deterministic', () => {
    expect(buildDeskPages()).toEqual(DESK_PAGES);
    expect(buildDeskPages()).toEqual(buildDeskPages());
  });
});

describe('domains', () => {
  it('derives exactly the seven catalog domain titles', () => {
    const titles = deriveDomainTitles();
    expect([...titles.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(titles.get(1)).toBe('Core Command & CRM');
    expect(titles.get(2)).toBe('Financials & Assets');
    expect(titles.get(3)).toBe('Vedic Rituals & Ephemeris');
    expect(titles.get(4)).toBe('Specialized Desks');
    expect(titles.get(5)).toBe('Matrimony & Outreach');
    expect(titles.get(6)).toBe('Governance & Security');
    expect(titles.get(7)).toBe('Sanatani Life & Connect');
  });

  it('desk entries unanimously agree on their domain title', () => {
    const prefix = 'is in the desk list, under ';
    const seen = new Map<number, string>();
    for (const e of deskEntries) {
      expect(e.domain).not.toBeNull();
      expect(e.place.en.startsWith(prefix)).toBe(true);
      const title = e.place.en.slice(prefix.length);
      if (seen.has(e.domain!)) expect(seen.get(e.domain!)).toBe(title);
      else seen.set(e.domain!, title);
    }
  });

  it('every desk and nested page carries its domain and title', () => {
    const titles = deriveDomainTitles();
    for (const p of DESK_PAGES) {
      if (p.kind === 'desk' || p.kind === 'nested') {
        expect(p.domain).toBeDefined();
        expect(p.domainTitle).toBe(titles.get(p.domain!));
      }
    }
  });

  it('pagesByDomain covers every desk + nested page exactly once', () => {
    const grouped = pagesByDomain();
    const total = [...grouped.values()].reduce((n, l) => n + l.length, 0);
    expect(total).toBe(
      DESK_PAGES.filter((p) => p.kind === 'desk' || p.kind === 'nested').length
    );
    expect([...grouped.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('resolution through the existing overlay machinery', () => {
  it('en name/place/usedBy are the locator’s own resolved values', () => {
    const page = getDeskPage('treasury')!;
    const entry = getLocatorEntry('loc.treasury')!;
    const r = resolveDeskPage(page, 'en');
    expect(r.name).toBe(entryNameFor(entry, 'en'));
    expect(r.name).toBe('Treasury & Expense Ledger');
    expect(r.place).toBe(entry.place.en);
    expect(r.usedBy).toBe(entry.usedBy.en);
  });

  it('hi/bn resolution is byte-identical to the TriText fields', () => {
    const page = getDeskPage('treasury')!;
    const entry = getLocatorEntry('loc.treasury')!;
    for (const lang of ['hi', 'bn'] as const) {
      const r = resolveDeskPage(page, lang);
      expect(r.name).toBe(entry.name[lang]);
      expect(r.place).toBe(entry.place[lang]);
      expect(r.usedBy).toBe(entry.usedBy[lang]);
    }
  });

  it('draft-language names resolve through the catalogue overlay', () => {
    const page = getDeskPage('treasury')!;
    const overlay = locatorEntryOverlay('gu', 'loc.treasury');
    expect(overlay).toBeDefined();
    expect(resolveDeskPage(page, 'gu').name).toBe(overlay!.name);
  });

  it('attached guide content resolves byte-identically in en/hi/bn', () => {
    const page = getDeskPage('treasury')!;
    const guide = getGuide('treasury')!;
    for (const lang of ['en', 'hi', 'bn'] as const) {
      const r = resolveDeskPage(page, lang);
      expect(r.purpose).toBe(guide.whatItIs[lang]);
      expect(r.tagline).toBe(guide.tagline[lang]);
      expect(r.steps).toEqual(guide.firstSteps.map((s) => s[lang]));
      expect(r.proTips).toEqual(guide.proTips.map((s) => s[lang]));
    }
  });

  it('attached guide content resolves through the guide overlay in draft languages', () => {
    const page = getDeskPage('treasury')!;
    const overlay = guideOverlay('gu', 'treasury');
    expect(overlay).toBeDefined();
    const r = resolveDeskPage(page, 'gu');
    expect(r.purpose).toBe(overlay!.whatItIs);
    expect(r.steps).toEqual(overlay!.firstSteps);
  });

  it('a desk page without a guide exposes no invented steps', () => {
    const page = getDeskPage('dashboard')!;
    expect(page.guideId).toBeUndefined();
    const r = resolveDeskPage(page, 'en');
    expect(r.steps).toEqual([]);
    expect(r.proTips).toEqual([]);
    expect(r.purpose).toBeUndefined();
  });

  it('a topic page resolves its name and steps from its guide', () => {
    const page = getDeskPage('p2p-safety')!;
    expect(page.kind).toBe('topic');
    const guide = getGuide('p2p-safety')!;
    const r = resolveDeskPage(page, 'en');
    expect(r.name).toBe(guide.name.en);
    expect(r.steps).toEqual(guide.firstSteps.map((s) => s.en));
    expect(r.place).toBeUndefined();
  });
});
