/**
 * Margdarshan J4 — the Copilot learns the manual (2026-11-01).
 * =====================================================================
 * Pins the J4 contract end to end:
 *  · INDEX PARITY — the light index (ai/manualIndexData.ts) is a
 *    pure derivation of the manual model: re-derive every field
 *    from MANUAL_PAGES + resolveManualPage + joins + the locator
 *    map and demand equality. A stale index can never ship.
 *  · ISOLATION — the whole index is scanned against the
 *    never-surface list: public manual content only, by
 *    construction AND by scan (the 12-probe pack's spirit).
 *  · MATCHING DISCIPLINE — en/hi/bn how-tos MUST hit their page;
 *    stray-word collisions (the तीर्थ lesson) must NOT.
 *  · CITED ANSWERS — ask() composes from the page's real content,
 *    carries the provenance line + a citation whose slug resolves,
 *    and locates the guide-join (panjika → the Panchang page).
 *  · THE BRIDGE — the Your Voice offer appears ONLY on the no-hit
 *    path, kind by intent class, as inert data; a plain question
 *    earns no offer at all.
 */

import { ask } from '../assistant';
import {
  citationForGuide,
  citationForLocatorEntry,
  citationForSlug,
  composeManualAnswer,
  getManualIndexEntry,
  isHowShaped,
  isManualHit,
  isWishShaped,
  matchManualPage,
  manualIndexSize,
  suggestionTitleFromQuestion,
} from '../manualAnswers';
import { MANUAL_INDEX } from '../manualIndexData';
import { LOCATOR_MAP } from '../locator';
import { scanSurface } from '../surfaceGuard';
import {
  MANUAL_PAGES,
  effectiveGuideId,
  getManualPage,
  resolveManualPage,
} from '../../lib/margdarshan/manual';
import { GUIDE_JOINS } from '../../lib/margdarshan/joins';
import { createMemoryPort, type CallerScope } from '../org/port';
import { orgLocatorTask } from '../tasks/org_locator';
import type { AssistantCtx } from '../types';

const solo = (lang = 'en'): AssistantCtx => ({ uid: 'j4-solo', lang, role: 'devotee' });

/* ------------------------------------------------------------------ */
/* Index parity — the derivation, re-run as a test                     */
/* ------------------------------------------------------------------ */

describe('J4 index parity (index ↔ manual model)', () => {
  it('one index entry per manual page, no orphans either way', () => {
    expect(manualIndexSize()).toBe(MANUAL_PAGES.length);
    expect(MANUAL_PAGES.length).toBe(95);
    const slugs = new Set(MANUAL_INDEX.map((e) => e.slug));
    for (const p of MANUAL_PAGES) expect(slugs.has(p.slug)).toBe(true);
    for (const e of MANUAL_INDEX) {
      // every index slug resolves to a real, canonical page
      expect(getManualPage(e.slug)?.slug).toBe(e.slug);
    }
  });

  it('titles + sections + guideId are the model\u2019s own values', () => {
    for (const page of MANUAL_PAGES) {
      const e = getManualIndexEntry(page.slug)!;
      expect(e.titles.en).toBe(resolveManualPage(page, 'en').name);
      expect(e.titles.hi).toBe(resolveManualPage(page, 'hi').name);
      expect(e.titles.bn).toBe(resolveManualPage(page, 'bn').name);
      const r = resolveManualPage(page, 'en');
      const sections: string[] = [];
      if (r.whatItDoes) sections.push('whatItDoes');
      if (r.realLifeExample) sections.push('example');
      if (r.steps.length) sections.push('steps');
      if (r.proTips.length) sections.push('tips');
      if (r.commonMistakes.length) sections.push('mistakes');
      if (r.capabilities.length) sections.push('capabilities');
      expect(e.sections).toEqual(sections);
      expect(e.guideId).toBe(effectiveGuideId(page));
      expect(e.locatorEntryId).toBe(page.locatorEntryId);
      expect(e.deskId).toBe(page.deskId);
    }
  });

  it('every locator entry is reachable from some index entry', () => {
    const covered = new Set(
      MANUAL_INDEX.map((e) => e.locatorEntryId).filter(Boolean)
    );
    for (const loc of LOCATOR_MAP) expect(covered.has(loc.id)).toBe(true);
  });

  it('joined topic slugs are recorded as alsoSlugs of their desk page', () => {
    for (const [topic, desk] of Object.entries(GUIDE_JOINS)) {
      const e = getManualIndexEntry(desk)!;
      expect(e.alsoSlugs ?? []).toContain(topic);
      // and the alias lookup resolves the topic to the desk page
      expect(getManualIndexEntry(topic)?.slug).toBe(desk);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Isolation — the index can carry no platform-internal material       */
/* ------------------------------------------------------------------ */

describe('J4 isolation (index + cited answers stay public-clean)', () => {
  it('the index scans clean against the never-surface list — two documented exceptions', () => {
    for (const e of MANUAL_INDEX) {
      // What can ever be DISPLAYED or composed into an answer:
      // titles (citation + answer headings) and the match pools.
      const displayable = JSON.stringify({
        titles: e.titles,
        aliases: e.aliases,
        primary: e.primary,
      });
      const hits = scanSurface(displayable);
      if (e.slug === 'legalVault') {
        // DOCUMENTED EXCEPTION 1: "Security & Audit Log" is this
        // desk's own PUBLIC name — shipped in the locator map and
        // the world-readable manual since J1; it names an org desk
        // (a trustee's own audit trail), not the platform-internal
        // audit_logs collection. It may trip ONLY that one pattern,
        // and the pipeline guard provably contains it at the
        // surface (pinned below, and verified identical pre-J4).
        expect(hits.every((h) => h === 'audit-log')).toBe(true);
      } else {
        expect({ slug: e.slug, hits }).toEqual({ slug: e.slug, hits: [] });
      }
    }
    // DOCUMENTED EXCEPTION 2: the 'godmode' TOPIC page. Its public
    // titles are clean ("Owner Console" — asserted by the loop
    // above); only its id fields carry the word, and the slug is
    // itself a live public route (/margdarshan/manual/godmode)
    // since J1. The guide behind it is owner-gated end to end:
    // non-owners never reach its answer (role_denied), and the
    // citation renders the clean public title, never the id.
    const gm = getManualIndexEntry('godmode')!;
    expect(gm.titles.en).toBe('Owner Console');
    expect(scanSurface(gm.titles.en)).toEqual([]);
    expect(citationForGuide('godmode', 'en')?.title).toBe('Owner Console');
  });

  it('the guard still contains the audit-log desk for non-owners (pre-J4 behaviour, unchanged)', async () => {
    const scope: CallerScope = {
      uid: 'j4-g1',
      workspaceId: 'WS-J4',
      workspaceName: 'Test Mandir',
      role: 'trustee',
      workspaceRole: 'Trustee',
      templateId: null,
      deskScope: null,
      actorName: 'Test User',
    };
    const res = await ask('where is the audit log?', {
      uid: scope.uid,
      lang: 'en',
      role: 'trustee',
      org: { scope, port: createMemoryPort(scope, {}) },
    });
    // the safe fallback stands; no citation or bridge rider leaks
    // around the guard (the guard replaces the WHOLE answer)
    expect(res.text).not.toContain('Audit Log');
    expect(res.citation).toBeUndefined();
    expect(res.suggest).toBeUndefined();
  });

  it('a cited answer\u2019s text scans clean too', async () => {
    const res = await ask('How do I add a room in the dharamshala?', solo());
    expect(scanSurface(res.text)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Matching discipline — pinned both directions                        */
/* ------------------------------------------------------------------ */

describe('J4 matcher discipline', () => {
  it('en how-to hits its page', () => {
    const m = matchManualPage('How do I add a room in the dharamshala?');
    expect(m.best?.slug).toBe('dharamshala');
    expect(isManualHit(m)).toBe(true);
  });

  it('hi how-to hits its page', () => {
    const m = matchManualPage('धर्मशाला में कमरा कैसे जोड़ूँ?');
    expect(m.best?.slug).toBe('dharamshala');
    expect(isManualHit(m)).toBe(true);
  });

  it('bn how-to hits its page', () => {
    const m = matchManualPage('ধর্মশালা কীভাবে ব্যবহার করব?');
    expect(m.best?.slug).toBe('dharamshala');
    expect(isManualHit(m)).toBe(true);
  });

  it('a stray shared word does NOT hit (the aarti collision)', () => {
    const m = matchManualPage('How do I cook rice for the evening aarti?');
    expect(isManualHit(m)).toBe(false);
  });

  it('तीर्थ यात्रा does NOT hit any page (the तीर्थ lesson)', () => {
    const m = matchManualPage('तीर्थ यात्रा कैसे करें?');
    expect(isManualHit(m)).toBe(false);
  });

  it('an off-app question does NOT hit (word boundaries hold)', () => {
    const m = matchManualPage('How do I book a flight to Delhi?');
    expect(isManualHit(m)).toBe(false);
  });

  it('an ambiguous tie never answers', () => {
    const m = matchManualPage('students kothay?');
    expect(isManualHit(m)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Cited answers through the real pipeline                             */
/* ------------------------------------------------------------------ */

describe('J4 cited answers (ask-level)', () => {
  it('en: composed from the page, provenance line + resolving citation', async () => {
    const res = await ask('How do I add a room in the dharamshala?', solo());
    const page = getManualPage('dharamshala')!;
    const resolved = resolveManualPage(page, 'en');
    expect(res.type).toBe('answer');
    // the answer carries the page's OWN words — never invented prose
    expect(res.text).toContain(resolved.whatItDoes);
    expect(res.text).toContain(resolved.steps[0]);
    // provenance line present, in the reader's language
    expect(res.text).toContain('From the manual');
    expect(res.text).toContain(resolved.name);
    // the citation object: slug resolves, href is the public page
    expect(res.citation?.slug).toBe('dharamshala');
    expect(res.citation?.href).toBe('/margdarshan/manual/dharamshala');
    expect(getManualPage(res.citation!.slug)).toBeTruthy();
    // a hit earns NO bridge offer
    expect(res.suggest).toBeUndefined();
  });

  it('hi: the citation line renders in Hindi', async () => {
    const res = await ask('धर्मशाला में कमरा कैसे जोड़ूँ?', solo('hi'));
    expect(res.citation?.slug).toBe('dharamshala');
    expect(res.text).toContain('मार्गदर्शिका से');
  });

  it('bn: the citation line renders in Bengali', async () => {
    const res = await ask('ধর্মশালা কীভাবে ব্যবহার করব?', solo('bn'));
    expect(res.citation?.slug).toBe('dharamshala');
    expect(res.text).toContain('নির্দেশিকা থেকে');
  });

  it('guide answers cite through the join (panjika → Panchang page)', async () => {
    const res = await ask('how do I use the panjika?', solo());
    expect(res.text).toContain('From the manual');
    expect(res.citation?.slug).toBe('panchang');
    expect(res.citation?.href).toBe('/margdarshan/manual/panchang');
  });

  it('locator answers carry the citation of the place they found', async () => {
    const res = await ask('where is the treasury?', solo());
    expect(res.citation?.slug).toBe('treasury');
    expect(res.text).toContain('From the manual');
  });

  it('composeManualAnswer degrades honestly without new prose', async () => {
    const entry = getManualIndexEntry('dharamshala')!;
    const { answer, citation } = await composeManualAnswer(entry, 'en');
    expect(answer).toContain(resolveManualPage(getManualPage('dharamshala')!, 'en').whatItDoes);
    expect(citation.href).toBe('/margdarshan/manual/dharamshala');
  });

  it('citation helpers resolve by slug, guide and locator entry', () => {
    expect(citationForSlug('hr', 'en')?.slug).toBe('sevadar-roster');
    expect(citationForGuide('panjika', 'en')?.slug).toBe('panchang');
    expect(citationForLocatorEntry('loc.treasury', 'en')?.slug).toBe('treasury');
    expect(citationForSlug('no-such-page', 'en')).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* The ask-to-suggest bridge — only on the no-hit path                 */
/* ------------------------------------------------------------------ */

describe('J4 ask-to-suggest bridge', () => {
  it('a how-to the manual lacks → clarify + manual-gap offer', async () => {
    const res = await ask('How do I export my data to a spreadsheet?', solo());
    expect(res.type).toBe('clarify');
    expect(res.citation).toBeUndefined();
    expect(res.suggest?.kind).toBe('manual-gap');
    // title/body are the user's own question, rules-shaped
    expect(res.suggest?.title).toBe('How do I export my data to a spreadsheet?');
    expect(res.suggest?.body).toBe('How do I export my data to a spreadsheet?');
  });

  it('a feature wish → feature offer', async () => {
    const res = await ask('I wish the app had a dark mode', solo());
    expect(res.suggest?.kind).toBe('feature');
    expect(res.suggest?.title).toContain('dark mode');
  });

  it('a plain question earns NO offer', async () => {
    const res = await ask('What is the weather like today?', solo());
    expect(res.suggest).toBeUndefined();
    expect(res.citation).toBeUndefined();
  });

  it('an unanswerable where-is → manual-gap offer on BOTH no-hit paths', async () => {
    const scope: CallerScope = {
      uid: 'j4-org',
      workspaceId: 'WS-J4',
      workspaceName: 'Test Mandir',
      role: 'trustee',
      workspaceRole: 'Trustee',
      templateId: null,
      deskScope: null,
      actorName: 'Test User',
    };
    const ctx: AssistantCtx = {
      uid: scope.uid,
      lang: 'en',
      role: 'trustee',
      org: { scope, port: createMemoryPort(scope, {}) },
    };
    // ask-level: the router lands this on fallback_unknown, whose
    // how-shape detector offers the bridge (kind 'manual-gap')
    const res = await ask('where is the moon base?', ctx);
    expect(res.type).toBe('clarify');
    expect(res.text).toContain("beyond what I've been taught");
    expect(res.suggest?.kind).toBe('manual-gap');
    expect(res.citation).toBeUndefined();
    // executor-level: the locator's own dontKnow carries it too
    const out = orgLocatorTask({
      uid: scope.uid,
      lang: 'en',
      role: 'trustee',
      input: 'where is the moon base?',
      slots: {},
      org: ctx.org,
    });
    expect(out.variant).toBe('clarify');
    expect(String(out.params['answer'])).toContain('not been taught');
    expect(out.suggest?.kind).toBe('manual-gap');
  });

  it('shape detectors + title trimming obey the rules\u2019 limits', () => {
    expect(isWishShaped('please add a notice board')).toBe(true);
    expect(isWishShaped('how do I pay dakshina?')).toBe(false);
    expect(isHowShaped('how do I pay dakshina?')).toBe(true);
    const long = 'how do I ' + 'very '.repeat(60) + 'export everything?';
    const title = suggestionTitleFromQuestion(long);
    expect(title.length).toBeLessThanOrEqual(140);
    expect(title.length).toBeGreaterThan(40);
  });
});
