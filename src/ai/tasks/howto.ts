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
import { getGuide } from '../../lib/moduleGuides';
import { allowedGuides } from '../rbac';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

type Lang3 = 'en' | 'hi' | 'bn';
function l3(lang: string): Lang3 {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}

export function howtoTask(ctx: TaskCtx): TaskOutcome {
  const lang = l3(ctx.lang);
  const guideId = ctx.slots['guideId'];
  const guide = guideId ? getGuide(guideId) : undefined;

  if (guide && allowedGuides(ctx.role).includes(guide.id)) {
    const steps = guide.firstSteps.map((s, i) => `${i + 1}. ${s[lang]}`).join('\n');
    const tips = guide.proTips.map((t) => `• ${t[lang]}`).join('\n');
    return {
      params: {
        guideName: guide.name[lang],
        whatItIs: guide.whatItIs[lang],
        steps,
        tips,
      },
      variant: 'guide',
      action: { kind: 'openGuide', target: guide.id },
      suggestions: suggestionsFor('howto', ctx.lang),
    };
  }

  // No module named (or named module not found): offer the role's guides.
  const guides = allowedGuides(ctx.role)
    .map((id) => getGuide(id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .slice(0, 8)
    .map((g) => `• ${g.name[lang]}`)
    .join('\n');
  return {
    params: { guides },
    variant: 'clarify',
    suggestions: suggestionsFor('howto', ctx.lang),
  };
}
