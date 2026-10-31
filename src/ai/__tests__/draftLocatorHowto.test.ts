/**
 * Draft-language locator catalogue + module-guide completeness pins
 * (Locator/Howto completion batch, 2026-10-31).
 * =====================================================================
 * Before this batch the Copilot's desk-finder (locator) and how-to
 * guides had FRAMES in all 7 AI-draft languages but CONTENT only in
 * en/hi/bn: langOf()/l3() clamped draft languages to English, and not
 * one alias existed in Gujarati/Tamil/Telugu/Kannada/Malayalam script,
 * so a native-script "where is X?" could never match an entry.
 *
 * These pins hold the fix the same way draftLangs.test.ts holds the
 * other draft corpora: every draft language authors a catalogue
 * overlay for ALL 82 locator entries (name + matching layer + the 10
 * long place sentences + 7 domain titles + template + 11 usedBy
 * phrases + where-patterns) and a guide overlay for ALL 24 module
 * guides (9 strings each), in the language's own script, never an
 * English copy. Functional proofs: a Gujarati and a Malayalam
 * native-script treasury question now MATCH and ANSWER in-language,
 * and a Malayalam how-to lookup returns the Malayalam guide.
 *
 * Honesty class (same as every draft corpus): AI-authored DRAFT —
 * native-speaker proofread is the registered human follow-up.
 */

import { LOCATOR_MAP, isLocatable, isLocatorQuestion, matchLocator, usedByKeyOf } from '../locator';
import {
  DRAFT_LANGS,
  guideOverlay,
  locatorCatalogOverlay,
  locatorEntryOverlay,
  type DraftLang,
} from '../lang/shared';
import { MODULE_GUIDES } from '../../lib/moduleGuides';
import { orgLocatorTask } from '../tasks/org_locator';
import { howtoTask } from '../tasks/howto';
import { createMemoryPort, type CallerScope } from '../org/port';
import type { TaskCtx } from '../types';

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const SCRIPT: Record<DraftLang, RegExp> = {
  ta: /[\u0B80-\u0BFF]/,
  te: /[\u0C00-\u0C7F]/,
  mr: /[\u0900-\u097F]/,
  gu: /[\u0A80-\u0AFF]/,
  kn: /[\u0C80-\u0CFF]/,
  ml: /[\u0D00-\u0D7F]/,
  sa: /[\u0900-\u097F]/,
};

/** The 10 entries whose `place` is a hand-authored sentence (7 nested
 *  + 2 solo + 1 public); desk entries compose place from the template. */
const NON_DESK_IDS = new Set([
  'loc.bahi-khata',
  'loc.voice-entry',
  'loc.pending-approvals',
  'loc.published-accounts',
  'loc.practice-mode',
  'loc.access-review',
  'loc.festival-journey',
  'loc.suchana-controls',
  'loc.privacy-notice',
  'loc.ask-ai',
]);

const ALL_IDS = LOCATOR_MAP.map((e) => e.id).sort();
const BY_ID = new Map(LOCATOR_MAP.map((e) => [e.id, e]));

/** usedBy key → English phrase, derived from the catalogue itself. */
const USED_BY_EN = new Map<string, string>();
for (const e of LOCATOR_MAP) {
  const k = usedByKeyOf(e.usedBy);
  if (k) USED_BY_EN.set(k, e.usedBy.en);
}

/** Domain number → English title, derived from the desk entries'
 *  composed English place sentences ("is in the desk list, under X"). */
const DOMAIN_EN = new Map<string, string>();
const EN_PLACE_PREFIX = 'is in the desk list, under ';
for (const e of LOCATOR_MAP) {
  if (e.kind === 'desk' && e.domain != null && e.place.en.startsWith(EN_PLACE_PREFIX)) {
    DOMAIN_EN.set(String(e.domain), e.place.en.slice(EN_PLACE_PREFIX.length));
  }
}

const EN_PLACE_TEMPLATE = 'is in the desk list, under {domain}';

function guideStrings(lang: DraftLang, guideId: string): string[] {
  const o = guideOverlay(lang, guideId);
  if (!o) return [];
  return [o.name, o.tagline, o.whatItIs, o.whyItMatters, ...o.firstSteps, ...o.proTips];
}

/* ------------------------------------------------------------------ */
/* 1 — Locator catalogue overlays: complete, in-script, not English    */
/* ------------------------------------------------------------------ */

describe('draft locator catalogue overlays (7 languages × 82 entries)', () => {
  for (const lang of DRAFT_LANGS) {
    describe(lang, () => {
      const cat = locatorCatalogOverlay(lang);
      const script = SCRIPT[lang];

      test('catalogue exists and covers exactly the 82 catalogue ids', () => {
        expect(cat).toBeDefined();
        expect(Object.keys(cat!.entries).sort()).toEqual(ALL_IDS);
      });

      test('every entry: in-script name, ≥1 in-script primary, ≥3 aliases (≥2 in-script)', () => {
        for (const id of ALL_IDS) {
          const o = locatorEntryOverlay(lang, id);
          const src = BY_ID.get(id)!;
          expect(o).toBeDefined();
          expect(o!.name.length).toBeGreaterThan(0);
          expect(o!.name).not.toBe(src.name.en);
          expect(script.test(o!.name)).toBe(true);
          expect(o!.primary.length).toBeGreaterThanOrEqual(1);
          expect(o!.primary.some((p) => script.test(p))).toBe(true);
          expect(o!.aliases.length).toBeGreaterThanOrEqual(3);
          expect(o!.aliases.filter((a) => script.test(a)).length).toBeGreaterThanOrEqual(2);
        }
      });

      test('place sentences exist for exactly the 10 non-desk entries', () => {
        for (const id of ALL_IDS) {
          const o = locatorEntryOverlay(lang, id)!;
          if (NON_DESK_IDS.has(id)) {
            expect(o.place).toBeTruthy();
            expect(o.place).not.toBe(BY_ID.get(id)!.place.en);
            expect(script.test(o.place!)).toBe(true);
          } else {
            expect(o.place).toBeUndefined();
          }
        }
      });

      test('7 domain titles + template + 11 usedBy phrases + where-patterns', () => {
        expect(DOMAIN_EN.size).toBe(7);
        expect(Object.keys(cat!.domains).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7']);
        for (const [k, en] of DOMAIN_EN) {
          expect(cat!.domains[k]).toBeTruthy();
          expect(cat!.domains[k]).not.toBe(en);
        }
        expect(cat!.placeTemplate).toContain('{domain}');
        expect(cat!.placeTemplate).not.toBe(EN_PLACE_TEMPLATE);
        expect(Object.keys(cat!.usedBy).sort()).toEqual([...USED_BY_EN.keys()].sort());
        for (const [k, en] of USED_BY_EN) {
          expect(cat!.usedBy[k]).toBeTruthy();
          expect(cat!.usedBy[k]).not.toBe(en);
        }
        expect(cat!.where.length).toBeGreaterThanOrEqual(4);
        for (const w of cat!.where) expect(script.test(w)).toBe(true);
      });
    });
  }
});

/* ------------------------------------------------------------------ */
/* 2 — Module-guide overlays: complete 24 × 9, in-script, not copies   */
/* ------------------------------------------------------------------ */

describe('draft module-guide overlays (7 languages × 24 guides × 9 strings)', () => {
  for (const lang of DRAFT_LANGS) {
    describe(lang, () => {
      test('every guide authored with all 9 fields (3 steps, 2 tips)', () => {
        for (const g of MODULE_GUIDES) {
          const o = guideOverlay(lang, g.id);
          expect(o).toBeDefined();
          for (const f of [o!.name, o!.tagline, o!.whatItIs, o!.whyItMatters]) {
            expect(f && f.length).toBeGreaterThan(0);
          }
          expect(o!.firstSteps.length).toBe(3);
          expect(o!.proTips.length).toBe(2);
          expect(o!.name).not.toBe(g.name.en);
          expect(o!.whatItIs).not.toBe(g.whatItIs.en);
        }
      });

      test('guide strings are in the language, not transplanted', () => {
        const all: string[] = [];
        const hindi: string[] = [];
        for (const g of MODULE_GUIDES) {
          all.push(...guideStrings(lang, g.id));
          hindi.push(
            g.name.hi, g.tagline.hi, g.whatItIs.hi, g.whyItMatters.hi,
            ...g.firstSteps.map((s) => s.hi),
            ...g.proTips.map((t) => t.hi)
          );
        }
        expect(all.length).toBe(24 * 9);
        if (lang === 'mr' || lang === 'sa') {
          // Devanagari siblings: genuinely Marathi/Sanskrit — ≥90% of
          // strings must DIFFER from the Hindi source (same bar as the
          // draftLangs corpus pins).
          const differ = all.filter((s, i) => s !== hindi[i]).length;
          expect(differ / all.length).toBeGreaterThanOrEqual(0.9);
        } else {
          const inScript = all.filter((s) => SCRIPT[lang].test(s)).length;
          expect(inScript / all.length).toBeGreaterThanOrEqual(0.9);
        }
      });
    });
  }
});

/* ------------------------------------------------------------------ */
/* 3 — Functional proof: native-script questions match + answer local  */
/* ------------------------------------------------------------------ */

const trusteeScope: CallerScope = {
  uid: 'u1',
  workspaceId: 'WS-TEST-1',
  workspaceName: 'Test Mandir',
  role: 'trustee',
  workspaceRole: 'Trustee',
  templateId: null,
  deskScope: null,
  actorName: 'Test User',
};

function locatorCtx(input: string, lang: string): TaskCtx {
  return {
    uid: 't',
    lang,
    role: 'trustee',
    input,
    slots: {},
    org: { scope: trusteeScope, port: createMemoryPort(trusteeScope, {}) },
  };
}

describe('functional proof — Gujarati + Malayalam (the sweep-deepened pair)', () => {
  test('Gujarati native-script treasury question routes + matches', () => {
    expect(isLocatorQuestion('તિજોરી ક્યાં છે?')).toBe(true);
    const m = matchLocator('તિજોરી ક્યાં છે?');
    expect(m.best?.id).toBe('loc.treasury');
  });

  test('Malayalam native-script treasury question routes + matches', () => {
    expect(isLocatorQuestion('ട്രഷറി എവിടെയാണ്?')).toBe(true);
    const m = matchLocator('ട്രഷറി എവിടെയാണ്?');
    expect(m.best?.id).toBe('loc.treasury');
  });

  test('orgLocatorTask answers a Gujarati question in Gujarati', () => {
    const out = orgLocatorTask(locatorCtx('તિજોરી ક્યાં છે?', 'gu'));
    expect(out.variant).toBe('answer');
    const overlay = locatorEntryOverlay('gu', 'loc.treasury')!;
    expect(String(out.params['answer'])).toContain(overlay.name);
    expect(String(out.params['answer'])).not.toContain('is in the desk list, under');
  });

  test('orgLocatorTask answers a Malayalam question in Malayalam', () => {
    const out = orgLocatorTask(locatorCtx('ട്രഷറി എവിടെയാണ്?', 'ml'));
    expect(out.variant).toBe('answer');
    const overlay = locatorEntryOverlay('ml', 'loc.treasury')!;
    expect(String(out.params['answer'])).toContain(overlay.name);
  });

  test('howtoTask returns the Malayalam guide, not English', () => {
    const out = howtoTask({
      uid: 't',
      lang: 'ml',
      role: 'trustee',
      input: 'how does the treasury work?',
      slots: { guideId: 'treasury' },
    });
    expect(out.variant).toBe('guide');
    const overlay = guideOverlay('ml', 'treasury')!;
    expect(out.params['guideName']).toBe(overlay.name);
    expect(out.params['guideName']).not.toBe('Treasury');
    expect(out.params['whatItIs']).toBe(overlay.whatItIs);
  });

  test('Hindi-vocabulary guard: a Hindi diary question is NOT stolen by Devanagari overlays', () => {
    // "तीर्थ डायरी कहाँ है?" belongs to the navigation corpus (Solo
    // Tirtha Diary). The mr/sa overlay word तीर्थ must not let the
    // Tirth One org desk claim it — the regression chipRouting caught.
    const m = matchLocator('तीर्थ डायरी कहाँ है?');
    expect(m.best?.id).not.toBe('loc.tirth-one');
    expect(isLocatable(m)).toBe(false);
  });

  test('genuinely Marathi words still match (guard blocks only shared Hindi words)', () => {
    expect(isLocatorQuestion('खजिना कुठे आहे?')).toBe(true);
    const m = matchLocator('खजिना कुठे आहे?');
    expect(m.best?.id).toBe('loc.treasury');
  });

  test('en resolution is unchanged (byte-identical fallback)', () => {
    const out = orgLocatorTask(locatorCtx('where is the treasury?', 'en'));
    expect(out.variant).toBe('answer');
    expect(String(out.params['answer'])).toContain('Treasury & Expense Ledger');
    expect(String(out.params['answer'])).toContain('is in the desk list, under Financials & Assets');
  });
});
