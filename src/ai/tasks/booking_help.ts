/**
 * TASK: booking_help
 * =====================================================================
 * DATA SOURCE: static guidance for the Seva Pro marketplace
 * (src/lib/sevaPro/ — booking rails: wallet escrow / pay-now /
 * pay-after-task; /seva/journeys catalog of 12 life events).
 * OFFLINE STORY: guidance is bundled and works offline; booking itself
 * needs connectivity — the template is honest about the journey.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

export function bookingHelpTask(ctx: TaskCtx): TaskOutcome {
  return {
    params: {},
    variant: 'default',
    action: { kind: 'navigate', target: '/seva/journeys' },
    suggestions: suggestionsFor('booking_help', ctx.lang),
  };
}
