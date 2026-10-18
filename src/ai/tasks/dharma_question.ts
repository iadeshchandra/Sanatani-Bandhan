/**
 * TASK: dharma_question
 * =====================================================================
 * DATA SOURCE: the restricted Dharma corpus (src/ai/corpus/) — static,
 * bundled, offline. The matcher is deterministic keyword/phrase logic.
 *
 * Two outcomes:
 *  - 'answer': confident corpus match, not escalation-flagged → the
 *    corpus answer in the user's language, with related-question chips.
 *  - 'escalate': low confidence OR purohit_escalation → warm handoff to
 *    a human purohit via Seva Pro. Response type: 'escalate'.
 *
 * NEVER invents. If the corpus cannot answer, it says so and offers
 * the human path.
 */
import { getDharmaEntry, isAnswerable, matchDharma } from '../dharma';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

export function dharmaQuestionTask(ctx: TaskCtx): TaskOutcome {
  const lang = ctx.lang === 'hi' || ctx.lang === 'bn' ? ctx.lang : 'en';

  // Prefer the router's pre-matched entry; re-match as fallback.
  const fromSlot = ctx.slots['entryId'] ? getDharmaEntry(ctx.slots['entryId']) : undefined;
  const match = fromSlot
    ? matchDharma(ctx.input)
    : matchDharma(ctx.input);
  const entry = fromSlot ?? match?.entry;

  if (entry && match && isAnswerable(match)) {
    const answerText = entry.answer[lang as 'en' | 'hi' | 'bn'] || entry.answer.en;
    const relatedLabels = match.related
      .map((r) => r.question_patterns[0])
      .filter(Boolean)
      .slice(0, 3);
    return {
      params: {
        answer: answerText,
        topic: entry.topic,
      },
      variant: 'answer',
      suggestions: relatedLabels.length > 0 ? relatedLabels : suggestionsFor('dharma_question', ctx.lang),
    };
  }

  // Escalate: either no confident match, or the entry needs a human.
  const escalatedTopic = entry ? entry.topic : '';
  return {
    params: { topic: escalatedTopic },
    variant: 'escalate',
    // Human path: find a purohit on Seva Pro.
    action: { kind: 'navigate', target: '/seva/pro' },
    suggestions: suggestionsFor('dharma_question', ctx.lang),
  };
}
