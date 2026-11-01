/**
 * TASK: howto
 * =====================================================================
 * DATA SOURCE: MODULE_GUIDES in src/lib/moduleGuides.ts (bundled,
 * human-authored, EN/HI/BN). The assistant never paraphrases doctrine —
 * it surfaces the guide's own words.
 * OFFLINE STORY: guides ship in the bundle. J4's manual path matches
 * against the bundled light index (ai/manualIndexData.ts); composing
 * the cited answer loads the page from the margdarshan-content lazy
 * chunk (runtime-cached) and degrades to title + citation without it.
 * RBAC: the assistant layer filters guide ids via allowedGuides(role)
 * BEFORE this executor runs; a denied guide never reaches here — and
 * the manual path below runs only when NO guide was named, so it can
 * never become a side door around that filter.
 */
import { getGuide, type ModuleGuide } from '../../lib/moduleGuides';
import { tourIdForModuleGuide } from '../guideTours';
import { guideOverlay } from '../lang/shared';
import {
  citationForGuide,
  citationLine,
  composeManualAnswer,
  getManualIndexEntry,
  isManualHit,
  manualSources,
  matchManualPage,
  suggestDraftFor,
} from '../manualAnswers';
import { allowedGuides } from '../rbac';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

type Lang3 = 'en' | 'hi' | 'bn';
function l3(lang: string): Lang3 {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}

/** A guide's AI-consumed fields in the asker's full language. For
 *  en/hi/bn these are the guide's own Lang3 fields — byte-identical
 *  to the old l3() pick. For a draft language the GUIDES_<CODE>
 *  overlay wins when it authors the guide; anything unauthored falls
 *  back to the English Lang3 field, exactly as before the batch. */
interface ResolvedGuide {
  name: string;
  whatItIs: string;
  firstSteps: string[];
  proTips: string[];
}

function resolveGuide(guide: ModuleGuide, lang: string): ResolvedGuide {
  const o = guideOverlay(lang, guide.id);
  if (o) {
    return {
      name: o.name,
      whatItIs: o.whatItIs,
      firstSteps: o.firstSteps,
      proTips: o.proTips,
    };
  }
  const l = l3(lang);
  return {
    name: guide.name[l],
    whatItIs: guide.whatItIs[l],
    firstSteps: guide.firstSteps.map((s) => s[l]),
    proTips: guide.proTips.map((t) => t[l]),
  };
}

export async function howtoTask(ctx: TaskCtx): Promise<TaskOutcome> {
  const guideId = ctx.slots['guideId'];
  const guide = guideId ? getGuide(guideId) : undefined;

  if (guide && allowedGuides(ctx.role).includes(guide.id)) {
    const resolved = resolveGuide(guide, ctx.lang);
    const steps = resolved.firstSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const tips = resolved.proTips.map((t) => `• ${t}`).join('\n');
    // WORLD-READY (Exhibit 2): an `openGuide` action launches an
    // interactive TOUR, whose registry has a different id space from
    // these module guides. Offer the action ONLY where a tour twin
    // genuinely exists (ai/guideTours.ts) — otherwise the text guide
    // below is the complete answer and no button is rendered. The old
    // behaviour emitted the action for every guide, and nearly every
    // tap landed on a "still being written" dead end in the sheet.
    const tourId = tourIdForModuleGuide(guide.id);
    // J4: where a Margdarshan manual page is backed by this guide
    // (or joined to it — the panjika guide answers from the
    // Panchang page), the same words now carry the page's name and
    // a door to it. Guides with no manual page render byte-identical
    // to before (the citationLine param is simply absent).
    const citation = citationForGuide(guide.id, ctx.lang);
    const citedEntry = citation ? getManualIndexEntry(citation.slug) : undefined;
    return {
      params: {
        guideName: resolved.name,
        whatItIs: resolved.whatItIs,
        steps,
        tips,
        hasTour: tourId ? '1' : '0',
        ...(citation
          ? { citationLine: citationLine(ctx.lang, citation.title) }
          : {}),
      },
      variant: 'guide',
      ...(tourId ? { action: { kind: 'openGuide' as const, target: tourId } } : {}),
      ...(citation ? { citation } : {}),
      ...(citedEntry ? { sources: manualSources(citedEntry) } : {}),
      suggestions: suggestionsFor('howto', ctx.lang),
    };
  }

  // No module named (or named module not found): offer the role's guides.
  const guides = allowedGuides(ctx.role)
    .map((id) => getGuide(id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .slice(0, 8)
    .map((g) => `• ${resolveGuide(g, ctx.lang).name}`)
    .join('\n');

  // J4 — no module guide was named, but a Margdarshan manual page
  // may teach exactly this (the manual covers all 95 desk + topic
  // pages; the guides cover 24 modules). A named-but-denied guide
  // NEVER reaches this branch: routing its question to the manual
  // instead would walk around allowedGuides, so the `!guideId`
  // guard below is the RBAC door staying shut.
  if (!guideId) {
    const m = matchManualPage(ctx.input);
    if (isManualHit(m) && m.best) {
      const { answer, citation } = await composeManualAnswer(m.best, ctx.lang);
      return {
        params: { answer },
        variant: 'manual',
        citation,
        sources: manualSources(m.best),
        suggestions: suggestionsFor('howto', ctx.lang),
      };
    }
    // Below threshold or ambiguous: today's clarify stands — and the
    // ask-to-suggest bridge rides along (kind 'manual-gap': a how-to
    // the manual could not answer). The draft is inert; only the
    // sheet's File tap files it (J3 suggestions service).
    return {
      params: { guides },
      variant: 'clarify',
      suggest: suggestDraftFor(ctx, 'manual-gap'),
      suggestions: suggestionsFor('howto', ctx.lang),
    };
  }

  return {
    params: { guides },
    variant: 'clarify',
    suggestions: suggestionsFor('howto', ctx.lang),
  };
}
