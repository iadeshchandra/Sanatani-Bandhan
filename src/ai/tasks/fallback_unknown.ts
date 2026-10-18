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

export function fallbackUnknownTask(ctx: TaskCtx): TaskOutcome {
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
  return {
    params: { capabilities: lines },
    variant: 'unknown',
    suggestions: suggestionsFor('fallback_unknown', ctx.lang),
  };
}
