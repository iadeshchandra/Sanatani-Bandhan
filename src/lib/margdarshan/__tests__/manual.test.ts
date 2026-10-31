/**
 * Margdarshan J1 — manual completeness + join + atlas + wing pins.
 * =====================================================================
 * These pins hold the J1 contract the same way the J0 pins hold the
 * inventory:
 *
 *  - Every rendered manual page (95 = the 101-page J0 inventory
 *    minus the 6 joined topic aliases) carries a complete authored
 *    entry: a real-life example, 2–3 mistakes, 2–4 capability lines,
 *    an offline statement — in en AND hi AND bn, never one language
 *    deep.
 *  - The no-duplication law: guide-backed pages (J0 attach or J1
 *    join) must NOT re-author whatItDoes/steps (the guide serves);
 *    guide-less pages MUST author both.
 *  - The join table resolves: every joined guide exists, lands on a
 *    real desk page, and its topic slug aliases there; the two
 *    argued separations (purohit, sangam) stay separate.
 *  - The atlas is exactly the canonical 7 domains, every line a real
 *    human line, every plan label from plan data.
 *  - The wings' honest states: unbuilt wings carry NO navigation
 *    target (the no-dead-button law, at the model level — the centre
 *    renders their explanation card only).
 *  - The public mirror needs no auth: its source imports no auth
 *    context (structural pin; Playwright proves the live render).
 *  - marg.* chrome exists in all 10 dictionaries with identical key
 *    sets (en/hi/bn authored; 7 AI-draft, labelled class).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DESK_PAGES } from '../deskPages';
import { GUIDE_JOINS } from '../joins';
import {
  MANUAL_ENTRIES,
  MANUAL_PAGES,
  WINGS,
  buildAtlas,
  effectiveGuideId,
  getManualPage,
  resolveManualPage,
  searchManual,
} from '../manual';
import { MODULE_GUIDES, getGuide, type Lang3 } from '../../moduleGuides';

const LANGS = ['en', 'hi', 'bn'] as const;
const nonEmpty = (s?: string) => typeof s === 'string' && s.trim().length > 0;
const lang3Full = (t?: Lang3) =>
  !!t && LANGS.every((l) => nonEmpty(t[l]));

describe('manual inventory', () => {
  it('renders 95 pages: the 101-page inventory minus 6 joined aliases', () => {
    expect(DESK_PAGES).toHaveLength(101);
    expect(Object.keys(GUIDE_JOINS)).toHaveLength(6);
    expect(MANUAL_PAGES).toHaveLength(95);
  });

  it('has an authored entry for every rendered page — and no orphans', () => {
    for (const p of MANUAL_PAGES) {
      expect(MANUAL_ENTRIES[p.slug]).toBeDefined();
    }
    for (const slug of Object.keys(MANUAL_ENTRIES)) {
      expect(MANUAL_PAGES.some((p) => p.slug === slug)).toBe(true);
    }
  });
});

describe('entry completeness (en/hi/bn, every field)', () => {
  it('every entry carries example, mistakes, capabilities, offline', () => {
    for (const p of MANUAL_PAGES) {
      const e = MANUAL_ENTRIES[p.slug];
      expect(lang3Full(e.realLifeExample)).toBe(true);
      expect(e.commonMistakes.length).toBeGreaterThanOrEqual(2);
      expect(e.commonMistakes.length).toBeLessThanOrEqual(3);
      expect(e.commonMistakes.every(lang3Full)).toBe(true);
      expect(e.capabilities.length).toBeGreaterThanOrEqual(2);
      expect(e.capabilities.length).toBeLessThanOrEqual(4);
      expect(e.capabilities.every(lang3Full)).toBe(true);
      expect(typeof e.worksOffline).toBe('boolean');
    }
  });

  it('no-duplication law: guide-backed entries omit whatItDoes/steps; guide-less author both', () => {
    for (const p of MANUAL_PAGES) {
      const e = MANUAL_ENTRIES[p.slug];
      if (effectiveGuideId(p)) {
        expect(e.whatItDoes).toBeUndefined();
        expect(e.steps).toBeUndefined();
      } else {
        expect(lang3Full(e.whatItDoes)).toBe(true);
        expect(e.steps).toBeDefined();
        expect(e.steps!.length).toBeGreaterThanOrEqual(3);
        expect(e.steps!.length).toBeLessThanOrEqual(4);
        expect(e.steps!.every(lang3Full)).toBe(true);
      }
    }
  });

  it('every page resolves fully in en, hi and bn', () => {
    for (const p of MANUAL_PAGES) {
      for (const lang of LANGS) {
        const r = resolveManualPage(p, lang);
        expect(nonEmpty(r.name)).toBe(true);
        expect(nonEmpty(r.whatItDoes)).toBe(true);
        expect(nonEmpty(r.realLifeExample)).toBe(true);
        expect(r.steps.length).toBeGreaterThanOrEqual(3);
        expect(r.steps.every(nonEmpty)).toBe(true);
        expect(r.commonMistakes.length).toBeGreaterThanOrEqual(2);
        expect(r.capabilities.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('the join table', () => {
  it('every joined guide exists and lands on its desk page', () => {
    for (const [guideId, slug] of Object.entries(GUIDE_JOINS)) {
      expect(getGuide(guideId)).toBeDefined();
      const page = MANUAL_PAGES.find((p) => p.slug === slug);
      expect(page).toBeDefined();
      expect(effectiveGuideId(page!)).toBe(guideId);
    }
  });

  it('joined topic slugs alias to their desk pages', () => {
    for (const [guideId, slug] of Object.entries(GUIDE_JOINS)) {
      expect(getManualPage(guideId)?.slug).toBe(slug);
      // …and the alias slug is NOT itself a rendered page.
      expect(MANUAL_PAGES.some((p) => p.slug === guideId)).toBe(false);
    }
  });

  it('the argued separations stay separate (purohit, sangam)', () => {
    expect(GUIDE_JOINS).not.toHaveProperty('purohit');
    expect(GUIDE_JOINS).not.toHaveProperty('sangam');
    expect(getManualPage('purohit')?.kind).toBe('topic');
    expect(getManualPage('sangam')?.kind).toBe('topic');
  });

  it('every guide in the library is reachable: attached, joined, or its own topic page', () => {
    for (const g of MODULE_GUIDES) {
      const reachable =
        MANUAL_PAGES.some((p) => effectiveGuideId(p) === g.id) ||
        g.id in GUIDE_JOINS;
      expect(reachable).toBe(true);
    }
  });
});

describe('the atlas', () => {
  it('is exactly the canonical 7 domains, in order', () => {
    const atlas = buildAtlas('en');
    expect(atlas.map((d) => d.domain)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const total = atlas.reduce((n, d) => n + d.entries.length, 0);
    expect(total).toBe(79); // 72 desks + 7 nested
  });

  it('every entry has a human line and a plan-data tier (never hand-typed)', () => {
    for (const d of buildAtlas('en')) {
      for (const e of d.entries) {
        expect(nonEmpty(e.line)).toBe(true);
        expect(e.line.toLowerCase()).not.toBe(e.deskId.toLowerCase());
        // MODULE_PLAN_TIER is empty by design today: every tier is
        // null (no plan gate). If plan data ever gates a desk, the
        // label follows the data — this pin follows it too.
        expect(e.tier).toBeNull();
      }
    }
  });
});

describe('the wings — honest states, no dead buttons', () => {
  it('live wings carry targets; unbuilt wings carry none', () => {
    const byId = Object.fromEntries(WINGS.map((w) => [w.id, w]));
    expect(byId.manual.state).toBe('live');
    expect(byId.manual.target).toBe('manual');
    expect(byId.features.state).toBe('live');
    expect(byId.features.target).toBe('atlas');
    expect(byId.whatsnew.state).toBe('next');
    expect(byId.whatsnew.target).toBeUndefined();
    expect(byId.voice.state).toBe('works');
    expect(byId.voice.target).toBeUndefined();
    expect(byId.satsang.state).toBe('works');
    expect(byId.satsang.target).toBeUndefined();
  });
});

describe('search', () => {
  it('finds pages by name and by content words', () => {
    expect(searchManual('treasury', 'en').some((p) => p.slug === 'treasury')).toBe(true);
    expect(searchManual('zzzz-not-a-word', 'en')).toHaveLength(0);
    expect(searchManual('', 'en')).toHaveLength(0);
  });
});

describe('public mirror + route registration (structural pins)', () => {
  const root = resolve(__dirname, '..', '..', '..', '..');
  it('the public mirror imports no auth context — reading needs no account', () => {
    const src = readFileSync(
      resolve(root, 'src/components/margdarshan/PublicMargdarshan.tsx'),
      'utf8'
    );
    expect(src).not.toContain('AuthWorkspace');
    expect(src).not.toContain('useAuthWorkspace');
  });

  it('App.tsx registers the four public routes and the in-app mount', () => {
    const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
    expect(app).toContain('path="/margdarshan"');
    expect(app).toContain('path="/margdarshan/manual"');
    expect(app).toContain('path="/margdarshan/manual/:pageId"');
    expect(app).toContain('path="/margdarshan/features"');
    expect(app).toContain("activeModule === 'margdarshan'");
  });
});

describe('marg.* chrome in all 10 dictionaries', () => {
  it('every language carries the identical key set', async () => {
    const codes = ['en', 'hi', 'bn', 'sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml'];
    const keySets: Record<string, string[]> = {};
    for (const code of codes) {
      const mod = await import(`../../../i18n/lang/${code}/marg`);
      keySets[code] = Object.keys(mod.margNs.marg).sort();
      for (const k of keySets[code]) {
        expect(nonEmpty(mod.margNs.marg[k])).toBe(true);
      }
    }
    for (const code of codes) {
      expect(keySets[code]).toEqual(keySets.en);
    }
  });
});
