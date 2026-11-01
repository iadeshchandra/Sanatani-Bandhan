/**
 * TASK: fallback_unknown
 * =====================================================================
 * DATA SOURCE: none — this is the warm-honesty path. Two variants:
 *  - 'dharma': the input smells like a scripture/ritual/ruling question.
 *    Design law: NEVER improvise on dharma. Offer Purohitji instead, with
 *    a deep link to Seva Journeys (human path). Response type: 'escalate'.
 *  - 'unknown': honest "I don't know that yet" + the capability menu.
 * OFFLINE STORY: n/a — no data involved.
 */
import { detectDharmaQuery, INTENTS } from '../intents';
import {
  composeManualAnswer,
  isHowShaped,
  isManualHit,
  isWishShaped,
  manualSources,
  matchManualPage,
  suggestDraftFor,
} from '../manualAnswers';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome, IntentId } from '../types';

const CAPABILITY_LABELS: Partial<Record<IntentId, string>> = {
  tithi_today: "today's tithi",
  festival_next: 'upcoming festivals & Ekadashi',
  dana_help: 'giving dana',
  sadhana_summary: 'your sadhana journal',
  booking_help: 'booking a purohit or jyotishi',
  howto: 'guides for every part of the app',
  navigate: 'taking you around the app',
  language_help: 'changing the app language',
  sos_help: 'how SOS protects you',
};

export async function fallbackUnknownTask(ctx: TaskCtx): Promise<TaskOutcome> {
  if (detectDharmaQuery(ctx.input)) {
    return {
      params: {},
      variant: 'dharma',
      // Human path: connect with Purohitji via the Seva Journeys catalog.
      action: { kind: 'navigate', target: '/seva/journeys' },
      suggestions: suggestionsFor('fallback_unknown', ctx.lang),
    };
  }
  const lines = INTENTS.map((i) => CAPABILITY_LABELS[i.id])
    .filter(Boolean)
    .map((c) => `• ${c}`)
    .join('\n');
  // J4 — before the honest unknown: a how-shaped or wish-shaped
  // question may still be answered by the manual (the router's
  // keyword table is narrower than the manual's 95 pages). And when
  // the manual is silent too, the ask-to-suggest bridge rides the
  // answer — kind by the question's shape: a wish is a 'feature'
  // voice; a how-to nobody could teach is a 'manual-gap' voice.
  const wish = isWishShaped(ctx.input);
  const how = !wish && isHowShaped(ctx.input);
  if (wish || how) {
    const m = matchManualPage(ctx.input);
    if (isManualHit(m) && m.best) {
      const { answer, citation } = await composeManualAnswer(m.best, ctx.lang);
      return {
        params: { answer },
        variant: 'manual',
        citation,
        sources: manualSources(m.best),
        suggestions: suggestionsFor('fallback_unknown', ctx.lang),
      };
    }
    return {
      params: { capabilities: lines },
      variant: 'unknown',
      suggest: suggestDraftFor(ctx, wish ? 'feature' : 'manual-gap'),
      suggestions: suggestionsFor('fallback_unknown', ctx.lang),
    };
  }
  return {
    params: { capabilities: lines },
    variant: 'unknown',
    suggestions: suggestionsFor('fallback_unknown', ctx.lang),
  };
}
