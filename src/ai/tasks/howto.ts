/**
 * TASK: howto
 * =====================================================================
 * DATA SOURCE: MODULE_GUIDES in src/lib/moduleGuides.ts (bundled,
 * human-authored, EN/HI/BN). The assistant never paraphrases doctrine —
 * it surfaces the guide's own words.
 * OFFLINE STORY: fully offline — guides ship in the bundle.
 * RBAC: the assistant layer filters guide ids via allowedGuides(role)
 * BEFORE this executor runs; a denied guide never reaches here.
 */
import { getGuide, type ModuleGuide } from '../../lib/moduleGuides';
import { tourIdForModuleGuide } from '../guideTours';
import { guideOverlay } from '../lang/shared';
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

export function howtoTask(ctx: TaskCtx): TaskOutcome {
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
    return {
      params: {
        guideName: resolved.name,
        whatItIs: resolved.whatItIs,
        steps,
        tips,
        hasTour: tourId ? '1' : '0',
      },
      variant: 'guide',
      ...(tourId ? { action: { kind: 'openGuide' as const, target: tourId } } : {}),
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
  return {
    params: { guides },
    variant: 'clarify',
    suggestions: suggestionsFor('howto', ctx.lang),
  };
}
