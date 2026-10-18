/**
 * TASK: greeting
 * =====================================================================
 * DATA SOURCE: none — a warm, capability-led greeting. The capability
 * list is derived from the intent catalog so it can never promise what
 * the assistant cannot do.
 * OFFLINE STORY: n/a — no data involved.
 */
import { INTENTS } from '../intents';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome, IntentId } from '../types';

const CAPABILITY_LABELS: Partial<Record<IntentId, string>> = {
  tithi_today: "today's tithi",
  festival_next: 'upcoming festivals',
  dana_help: 'giving dana',
  sadhana_summary: 'your sadhana journal',
  booking_help: 'booking a purohit or jyotishi',
  howto: 'guides for every part of the app',
  navigate: 'taking you around the app',
  language_help: 'changing language',
};

export function greetingTask(ctx: TaskCtx): TaskOutcome {
  const offered = INTENTS.map((i) => CAPABILITY_LABELS[i.id]).filter(Boolean) as string[];
  return {
    params: { capabilities: offered.join(', ') },
    variant: 'default',
    suggestions: suggestionsFor('greeting', ctx.lang),
  };
}
