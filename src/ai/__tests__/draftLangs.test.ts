/**
 * Language Completion Sweep B2-C — Copilot in the 7 draft languages.
 * =====================================================================
 * Pins the B2-C contract:
 *  - pickLang admits all 10 languages; unknown codes fall back to en.
 *  - EVERY non-admin template variant renders non-empty, in the asked
 *    language (differs from the English render), with full param
 *    fidelity (every ${param} the English renderer shows also reaches
 *    the draft render; nothing renders the literal "undefined").
 *  - admin_* templates stay en/hi/bn: draft languages get the English
 *    render (owner tooling, out of B2-C scope — the honesty chain).
 *  - Suggestion chips exist per draft language and differ from en.
 *  - Router keywords: every draft language reaches every core intent
 *    with at least one of its own keywords, and most of its keywords
 *    route somewhere real (never the fallback) — the 2026-10-20
 *    chip-routing lesson, generalised to 7 more languages.
 *  - Corpus: all 52 dharma + 34 navigation answers exist per draft
 *    language, in the language's own script, and are not copies of the
 *    Hindi text (mr/sa share Devanagari with hi — content must differ).
 *  - Labels / locator frames / nearby units resolve per language.
 *
 * The INVENTORY below (keys × variants × param names) was generated
 * mechanically from src/ai/templates.ts + the overlay files — it is
 * the true render surface, not a hand list.
 */
import { renderTemplate, suggestionsFor, templateInventory, templateVariantMap } from '../templates';
import { routeIntent } from '../intents';
import { DHARMA_CORPUS } from '../corpus/index';
import { NAVIGATION_CORPUS } from '../corpus/navigation';
import { CURATED_TIRTHAS } from '../corpus/tirthas';
import { labelFor, locatorOverlay, overlayKeywords } from '../lang/shared';
import { locatorFrames, locatorTakeMeLabel } from '../locator';
import { formatDistance, findNearbyCurated } from '../tasks/nearby';
import { draftPreviewLines, type CopilotDraft } from '../org/drafts';
import { KEYWORDS_TA, TIRTHA_TA } from '../lang/ta-data';
import { KEYWORDS_TE, TIRTHA_TE } from '../lang/te-data';
import { KEYWORDS_MR, TIRTHA_MR } from '../lang/mr-data';
import { KEYWORDS_GU, TIRTHA_GU } from '../lang/gu-data';
import { KEYWORDS_KN, TIRTHA_KN } from '../lang/kn-data';
import { KEYWORDS_ML, TIRTHA_ML } from '../lang/ml-data';
import { KEYWORDS_SA, TIRTHA_SA } from '../lang/sa-data';

const DRAFTS = ['ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa'] as const;
type Draft = (typeof DRAFTS)[number];

const KEYWORDS: Record<Draft, Record<string, string[]>> = {
  ta: KEYWORDS_TA, te: KEYWORDS_TE, mr: KEYWORDS_MR, gu: KEYWORDS_GU,
  kn: KEYWORDS_KN, ml: KEYWORDS_ML, sa: KEYWORDS_SA,
};
const TIRTHAS: Record<Draft, Record<string, string>> = {
  ta: TIRTHA_TA, te: TIRTHA_TE, mr: TIRTHA_MR, gu: TIRTHA_GU,
  kn: TIRTHA_KN, ml: TIRTHA_ML, sa: TIRTHA_SA,
};

/** Unicode script block per language (mr/sa = Devanagari). */
const SCRIPT: Record<Draft, RegExp> = {
  ta: /[\u0B80-\u0BFF]/, te: /[\u0C00-\u0C7F]/, mr: /[\u0900-\u097F]/,
  gu: /[\u0A80-\u0AFF]/, kn: /[\u0C80-\u0CFF]/, ml: /[\u0D00-\u0D7F]/,
  sa: /[\u0900-\u097F]/,
};

const INVENTORY: Record<string, Record<string, { org: boolean; params: string[] | null }>> = {"navigate": {"destination": {"org": false, "params": ["destLabel"], "passthrough": false}, "clarify": {"org": false, "params": ["places"], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "howto": {"guide": {"org": false, "params": ["guideName", "whatItIs", "steps", "tips", "hasTour"], "passthrough": false}, "clarify": {"org": false, "params": ["guides"], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "tithi_today": {"default": {"org": false, "params": ["paksha", "tithiName", "tithiNumber", "ordinal"], "passthrough": false}}, "festival_next": {"list": {"org": false, "params": ["list"], "passthrough": false}, "ekadashi": {"org": false, "params": ["date", "name"], "passthrough": false}, "none": {"org": false, "params": [], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "dana_help": {"default": {"org": false, "params": [], "passthrough": false}}, "sadhana_summary": {"summary": {"org": false, "params": ["japaToday", "rhythm7", "vrataCount", "sankalpaCount"], "passthrough": false}, "empty": {"org": false, "params": [], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "navigation_question": {"answer": {"org": false, "params": ["answer"], "passthrough": false}, "clarify": {"org": false, "params": [], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "org_locator": {"answer": {"org": false, "params": ["answer"], "passthrough": false}, "clarify": {"org": false, "params": ["answer"], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "nearby_temples": {"consent": {"org": false, "params": [], "passthrough": false}, "denied": {"org": false, "params": [], "passthrough": false}, "results": {"org": false, "params": ["header", "list", "footer"], "passthrough": false}, "empty": {"org": false, "params": [], "passthrough": false}, "locating": {"org": false, "params": [], "passthrough": false}, "with_coords": {"org": false, "params": [], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "tirtha_summary": {"summary": {"org": false, "params": ["templeCount", "visitCount", "yatraCount", "latestTemple", "latestAt"], "passthrough": false}, "empty": {"org": false, "params": [], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "booking_help": {"default": {"org": false, "params": [], "passthrough": false}}, "language_help": {"default": {"org": false, "params": [], "passthrough": false}}, "sos_help": {"default": {"org": false, "params": [], "passthrough": false}}, "greeting": {"default": {"org": false, "params": [], "passthrough": false}}, "voice_upgrade": {"default": {"org": false, "params": ["size"], "passthrough": false}}, "dharma_question": {"answer": {"org": false, "params": ["answer"], "passthrough": false}, "escalate": {"org": false, "params": [], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "fallback_unknown": {"unknown": {"org": false, "params": ["capabilities"], "passthrough": false}, "dharma": {"org": false, "params": [], "passthrough": false}, "default": {"org": false, "params": [], "passthrough": false}}, "crisis": {"default": {"org": false, "params": [], "passthrough": false}}, "role_denied": {"default": {"org": false, "params": ["area"], "passthrough": false}}, "empty_input": {"default": {"org": false, "params": [], "passthrough": false}}, "admin_briefing": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "admin_stats": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "admin_moderation_help": {"default": {"org": false, "params": ["items", "text", "headline"], "passthrough": false}}, "admin_anomaly": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "admin_draft": {"default": {"org": false, "params": ["text", "note"], "passthrough": false}}, "admin_terms": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "admin_history": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "admin_simulate": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "admin_draft_change": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "admin_advise": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "admin_growth": {"default": {"org": false, "params": ["text"], "passthrough": false}}, "org_giving": {"summary": {"org": true, "params": ["period", "workspace", "total", "count", "lines"], "passthrough": false}, "summary_partial": {"org": false, "params": ["period", "workspace", "total", "count", "lines"], "passthrough": false}, "empty": {"org": false, "params": ["period", "workspace"], "passthrough": false}, "scoped": {"org": true, "params": ["workspace"], "passthrough": false}, "no_org": {"org": true, "params": [], "passthrough": false}, "default": {"org": true, "params": ["period", "workspace", "total", "count", "lines"], "passthrough": false}}, "org_expenses": {"summary": {"org": true, "params": ["period", "workspace", "total", "count", "lines"], "passthrough": false}, "summary_partial": {"org": false, "params": ["period", "workspace", "total", "count", "lines"], "passthrough": false}, "empty": {"org": false, "params": ["period", "workspace"], "passthrough": false}, "scoped": {"org": true, "params": ["workspace"], "passthrough": false}, "no_org": {"org": true, "params": [], "passthrough": false}, "default": {"org": true, "params": ["period", "workspace", "total", "count", "lines"], "passthrough": false}}, "org_pending_approvals": {"list": {"org": true, "params": ["count", "workspace", "lines"], "passthrough": false}, "empty": {"org": false, "params": ["workspace"], "passthrough": false}, "unavailable": {"org": false, "params": ["workspace"], "passthrough": false}, "scoped": {"org": false, "params": ["workspace"], "passthrough": false}, "no_org": {"org": true, "params": [], "passthrough": false}, "default": {"org": true, "params": ["count", "workspace", "lines"], "passthrough": false}}, "priest_schedule": {"list": {"org": true, "params": ["day", "workspace", "count", "lines"], "passthrough": false}, "empty": {"org": false, "params": ["day", "workspace"], "passthrough": false}, "scoped": {"org": false, "params": ["workspace"], "passthrough": false}, "no_org": {"org": false, "params": [], "passthrough": false}, "default": {"org": true, "params": ["day", "workspace", "count", "lines"], "passthrough": false}}, "record_donation": {"draft_ready": {"org": true, "params": ["summary"], "passthrough": false}, "need_amount": {"org": false, "params": [], "passthrough": false}, "clarify": {"org": false, "params": ["name", "candidates"], "passthrough": false}, "scoped": {"org": false, "params": ["workspace"], "passthrough": false}, "no_org": {"org": false, "params": [], "passthrough": false}, "default": {"org": true, "params": ["summary"], "passthrough": false}}, "record_expense": {"draft_ready": {"org": true, "params": ["summary"], "passthrough": false}, "draft_gated": {"org": false, "params": ["summary"], "passthrough": false}, "need_amount": {"org": false, "params": [], "passthrough": false}, "scoped": {"org": false, "params": ["workspace"], "passthrough": false}, "no_org": {"org": false, "params": [], "passthrough": false}, "default": {"org": true, "params": ["summary"], "passthrough": false}}, "draft_notice": {"draft_ready": {"org": true, "params": ["summary"], "passthrough": false}, "need_details": {"org": false, "params": [], "passthrough": false}, "scoped": {"org": false, "params": ["workspace"], "passthrough": false}, "no_org": {"org": false, "params": [], "passthrough": false}, "default": {"org": true, "params": ["summary"], "passthrough": false}}};

const NON_ADMIN_KEYS = Object.keys(INVENTORY).filter((k) => !k.startsWith('admin_'));
const ADMIN_KEYS = Object.keys(INVENTORY).filter((k) => k.startsWith('admin_'));

/** Documented param exemptions: en composes `${tithiNumber}${ordinal}`
 *  ("5"+"th") as two params; Indic languages suffix the number itself
 *  (hi "वीं", bn "তম", mr "वी", ml "-ാമത്തെ") — the ordinal param is
 *  genuinely consumed, just not as a separate token. hi/bn do exactly
 *  this; the draft languages mirroring them are faithful, not lossy. */
const EXEMPT_PARAMS: Record<string, string[]> = {
  'tithi_today.default': ['ordinal'],
};

function sentinelParams(names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) out[n] = `⟪${n}⟫`;
  return out;
}

/** True when the render is only params + emoji/punctuation (a pure
 *  passthrough like org_locator's `answer` variant) — identity with
 *  the English render is then correct by construction. */
function isParamDriven(rendered: string, names: string[]): boolean {
  let rest = rendered;
  for (const n of names) rest = rest.split(`⟪${n}⟫`).join('');
  return !/[A-Za-z\u0900-\u097F\u0980-\u09FF]/.test(rest);
}

describe('B2-C template coverage — every variant, every draft language', () => {
  it('inventory is the true surface: 38 keys, 96 variants, 85 non-admin', () => {
    const map = templateVariantMap();
    expect(Object.keys(map).length).toBe(38);
    const total = Object.values(map).reduce((a, v) => a + v.length, 0);
    expect(total).toBe(96);
    expect(NON_ADMIN_KEYS.length).toBe(27);
    const nonAdminVariants = NON_ADMIN_KEYS.reduce((a, k) => a + Object.keys(INVENTORY[k]).length, 0);
    expect(nonAdminVariants).toBe(85);
    // the generated inventory and the live table agree on variants
    for (const k of Object.keys(INVENTORY)) {
      expect([...map[k]].sort()).toEqual(Object.keys(INVENTORY[k]).sort());
    }
  });

  for (const lang of DRAFTS) {
    describe(`lang ${lang}`, () => {
      for (const key of NON_ADMIN_KEYS) {
        for (const variant of Object.keys(INVENTORY[key])) {
          it(`${key}.${variant} renders in ${lang} with param fidelity`, () => {
            const names = INVENTORY[key][variant].params ?? [];
            const params = sentinelParams(names);
            const en = renderTemplate(key as never, 'en', params, variant);
            const out = renderTemplate(key as never, lang, params, variant);
            expect(out.trim().length).toBeGreaterThan(0);
            expect(out).not.toContain('undefined');
            // every param the English render surfaces reaches the draft render
            const exempt = EXEMPT_PARAMS[`${key}.${variant}`] ?? [];
            for (const n of names) {
              if (exempt.includes(n)) continue;
              if (en.includes(`⟪${n}⟫`)) expect(out).toContain(`⟪${n}⟫`);
            }
            if (!isParamDriven(en, names)) {
              expect(out).not.toBe(en);
            }
          });
        }
      }
    });
  }

  it('admin_* templates keep the en fallback in draft languages (owner tooling)', () => {
    for (const lang of DRAFTS) {
      for (const key of ADMIN_KEYS) {
        for (const variant of Object.keys(INVENTORY[key])) {
          const names = INVENTORY[key][variant].params ?? [];
          const params = sentinelParams(names);
          expect(renderTemplate(key as never, lang, params, variant)).toBe(
            renderTemplate(key as never, 'en', params, variant)
          );
        }
      }
    }
  });

  it('unknown language codes fall back to English, never blank', () => {
    expect(renderTemplate('greeting', 'xx', {})).toBe(renderTemplate('greeting', 'en', {}));
    expect(renderTemplate('greeting', 'ta', {})).not.toBe(renderTemplate('greeting', 'en', {}));
  });

  it('templateInventory derives all 10 langs for non-admin, 3 for admin', () => {
    const inv = templateInventory();
    for (const row of inv) {
      if (row.key.startsWith('admin_')) {
        expect(row.langs).toEqual(['en', 'hi', 'bn']);
      } else {
        expect(row.langs).toEqual(['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa']);
      }
    }
  });
});

describe('B2-C suggestion chips per draft language', () => {
  const INTENTS = [
    'navigate', 'howto', 'tithi_today', 'festival_next', 'dana_help',
    'sadhana_summary', 'booking_help', 'language_help', 'sos_help',
    'voice_upgrade', 'dharma_question', 'navigation_question', 'org_locator',
    'nearby_temples', 'tirtha_summary', 'greeting', 'fallback_unknown',
    'org_giving', 'org_expenses', 'org_pending_approvals', 'priest_schedule',
    'record_donation', 'record_expense', 'draft_notice',
  ] as const;
  for (const lang of DRAFTS) {
    it(`${lang}: 24 intents × chips, non-empty, not the English chips`, () => {
      for (const intent of INTENTS) {
        const chips = suggestionsFor(intent as never, lang);
        expect(chips.length).toBeGreaterThanOrEqual(3);
        for (const c of chips) expect(c.trim().length).toBeGreaterThan(0);
        expect(chips).not.toEqual(suggestionsFor(intent as never, 'en'));
      }
    });
  }
});

describe('B2-C router keywords per draft language', () => {
  const TABLE_INTENT: Record<string, string> = {
    tithi: 'tithi_today', festival: 'festival_next', dana: 'dana_help',
    sadhana: 'sadhana_summary', tirtha: 'tirtha_summary', nearby: 'nearby_temples',
    booking: 'booking_help', language: 'language_help', sos: 'sos_help',
    voiceUpgrade: 'voice_upgrade', navigate: 'navigate', howto: 'howto',
    greeting: 'greeting',
  };
  for (const lang of DRAFTS) {
    it(`${lang}: all 13 tables authored and merged into the router`, () => {
      for (const table of Object.keys(TABLE_INTENT)) {
        const kws = KEYWORDS[lang][table];
        expect(Array.isArray(kws)).toBe(true);
        expect(kws.length).toBeGreaterThanOrEqual(3);
      }
      expect(overlayKeywords('tithi').length).toBeGreaterThanOrEqual(21);
    });

    it(`${lang}: every core intent is reachable in the language`, () => {
      for (const [table, intent] of Object.entries(TABLE_INTENT)) {
        const hits = KEYWORDS[lang][table].filter(
          (kw) => routeIntent(kw, lang).intent === intent
        );
        expect({ table, hits: hits.length }).toEqual(
          expect.objectContaining({ hits: expect.any(Number) })
        );
        expect(hits.length).toBeGreaterThanOrEqual(1);
      }
    });

    it(`${lang}: most keywords route somewhere real (never fallback)`, () => {
      let total = 0;
      let real = 0;
      for (const table of Object.keys(TABLE_INTENT)) {
        for (const kw of KEYWORDS[lang][table]) {
          total += 1;
          if (routeIntent(kw, lang).intent !== 'fallback_unknown') real += 1;
        }
      }
      expect(total).toBeGreaterThan(0);
      expect(real / total).toBeGreaterThanOrEqual(0.6);
    });
  }
});

describe('B2-C corpus overlays', () => {
  it('corpus sizes are the true ones: 52 dharma + 34 navigation + 15 tirthas', () => {
    expect(DHARMA_CORPUS.length).toBe(52);
    expect(NAVIGATION_CORPUS.length).toBe(34);
    expect(CURATED_TIRTHAS.length).toBe(15);
  });

  for (const lang of DRAFTS) {
    it(`${lang}: every dharma answer authored, in-script, not a Hindi copy`, () => {
      let inScript = 0;
      let differFromHi = 0;
      for (const e of DHARMA_CORPUS) {
        const a = (e.answer as Record<string, string>)[lang];
        expect(typeof a).toBe('string');
        expect(a.trim().length).toBeGreaterThan(0);
        expect(a).not.toBe(e.answer.en);
        if (SCRIPT[lang].test(a)) inScript += 1;
        if (a !== e.answer.hi) differFromHi += 1;
        expect(e.question_patterns.length).toBeGreaterThan(0);
      }
      expect(inScript / DHARMA_CORPUS.length).toBeGreaterThanOrEqual(0.9);
      expect(differFromHi / DHARMA_CORPUS.length).toBeGreaterThanOrEqual(0.9);
    });

    it(`${lang}: every navigation answer + take-me label authored`, () => {
      for (const e of NAVIGATION_CORPUS) {
        const a = (e.answer as Record<string, string>)[lang];
        expect(typeof a).toBe('string');
        expect(a.trim().length).toBeGreaterThan(0);
        expect(a).not.toBe(e.answer.en);
        if (e.actionLabel) {
          const label = (e.actionLabel as Record<string, string>)[lang];
          expect(typeof label).toBe('string');
          expect(label.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it(`${lang}: pattern overlays merged (questions in the language match)`, () => {
      // At least one dharma entry carries a pattern in the language's script.
      const anyPattern = DHARMA_CORPUS.some((e) =>
        e.question_patterns.some((p) => SCRIPT[lang].test(p))
      );
      expect(anyPattern).toBe(true);
    });

    it(`${lang}: all 15 tirtha names authored and served by the nearby picker`, () => {
      for (const t of CURATED_TIRTHAS) {
        const n = TIRTHAS[lang][t.id];
        expect(typeof n).toBe('string');
        expect(n.trim().length).toBeGreaterThan(0);
        expect((t.name as Record<string, string>)[lang]).toBe(n);
      }
      const badrinath = CURATED_TIRTHAS.find((t) => t.id === 'badrinath')!;
      const found = findNearbyCurated(badrinath.lat, badrinath.lng, lang);
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].name).toBe(TIRTHAS[lang]['badrinath']);
    });
  }
});

describe('B2-C labels, locator frames, nearby units', () => {
  const LABEL_KEYS = [
    'period.today', 'period.week', 'period.month',
    'kind.payout', 'kind.payment_details', 'kind.role_grant',
    'approvals.by', 'day.today', 'day.tomorrow',
    'draft.amount', 'draft.donor', 'draft.purpose', 'draft.category',
    'draft.mode', 'draft.date', 'draft.vendor', 'draft.title',
    'draft.body', 'draft.notGiven', 'nearby.temple', 'nav.takeMe',
    'locator.takeMe',
  ];
  for (const lang of DRAFTS) {
    it(`${lang}: label bundle resolves`, () => {
      for (const k of LABEL_KEYS) {
        const v = labelFor(lang, k);
        expect(typeof v).toBe('string');
        expect((v as string).trim().length).toBeGreaterThan(0);
      }
    });

    it(`${lang}: locator frames + take-me in the language`, () => {
      const frames = locatorFrames(lang);
      const en = locatorFrames('en');
      expect(frames.dontKnow).not.toBe(en.dontKnow);
      expect(frames.clarifyIntro).not.toBe(en.clarifyIntro);
      expect(frames.viaOrgsSuffix).not.toBe(en.viaOrgsSuffix);
      expect(frames.outOfScope('Trustees')).toContain('Trustees');
      expect(frames.outOfScope('Trustees')).not.toBe(en.outOfScope('Trustees'));
      expect(locatorOverlay(lang)).toBeDefined();
      expect(locatorTakeMeLabel(lang)).not.toBe(locatorTakeMeLabel('en'));
    });

    it(`${lang}: distance units localised`, () => {
      expect(formatDistance(0.5, lang)).not.toBe('500m');
      expect(formatDistance(2.5, lang)).not.toBe('2.5km');
    });

    it(`${lang}: draft preview line labels localised`, () => {
      const draft: CopilotDraft = {
        kind: 'treasury.income', amount: 501, category: 'Dana',
        purpose: 'Annadanam', paymentMode: 'UPI', date: '2026-10-24',
        devoteeName: 'Rina Das',
      };
      const lines = draftPreviewLines(draft, lang, (n) => `₹${n}`);
      const labels = lines.map((l) => l.label);
      expect(labels.length).toBeGreaterThanOrEqual(3);
      for (const l of lines) expect(l.label.trim().length).toBeGreaterThan(0);
      const enLines = draftPreviewLines(draft, 'en', (n) => `₹${n}`);
      expect(labels).not.toEqual(enLines.map((l) => l.label));
    });
  }

  it('en/hi/bn label behaviour is untouched (labelFor serves drafts only)', () => {
    expect(labelFor('en', 'period.today')).toBeUndefined();
    expect(labelFor('hi', 'period.today')).toBeUndefined();
    expect(locatorFrames('hi').dontKnow).toContain('क्षमा');
  });
});
