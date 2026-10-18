/**
 * TASK: navigation_question
 * =====================================================================
 * DATA SOURCE: the navigation corpus (src/ai/corpus/navigation.ts) —
 * static, bundled, offline. The matcher is deterministic keyword/phrase
 * logic, same as dharma.ts.
 *
 * Two outcomes:
 *  - 'answer': confident corpus match → location answer in the user's
 *    language + a "Take me there" deep-link action (real react-router
 *    navigation, handled by AssistantSheet).
 *  - 'clarify': weak match → warm honesty + the most likely candidates.
 *
 * NEVER invents a destination. If the corpus cannot answer, it says so.
 */
import { getNavigationEntry, isNavigable, matchNavigation } from '../navigation';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

export function navigationQuestionTask(ctx: TaskCtx): TaskOutcome {
  const lang = ctx.lang === 'hi' || ctx.lang === 'bn' ? ctx.lang : 'en';

  // Prefer the router's pre-matched entry; re-match as fallback.
  const fromSlot = ctx.slots['entryId'] ? getNavigationEntry(ctx.slots['entryId']) : undefined;
  const match = fromSlot ? matchNavigation(ctx.input) : matchNavigation(ctx.input);
  const entry = fromSlot ?? match?.entry;

  if (entry && match && isNavigable(match)) {
    const answerText = entry.answer[lang] || entry.answer.en;
    const label = (entry.actionLabel?.[lang] || entry.actionLabel?.en) ?? '';
    return {
      params: {
        answer: answerText,
        destination: entry.target.route,
        section: entry.target.section || '',
      },
      variant: 'answer',
      // Real navigation: AssistantSheet performs navigate(action.target).
      // Entries without a route (e.g. the ever-present SOS button) carry
      // no action — the answer text describes where to look.
      action: label ? { kind: 'navigate', target: entry.target.route } : undefined,
      suggestions: suggestionsFor('navigation_question', ctx.lang),
    };
  }

  // Weak or no match: warm honesty, never a guessed destination.
  return {
    params: {},
    variant: 'clarify',
    suggestions: suggestionsFor('navigation_question', ctx.lang),
  };
}
