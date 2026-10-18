/**
 * TASK: sos_help
 * =====================================================================
 * DATA SOURCE: static description of the Crisis/SOS module
 * (src/crisis/ — PanicButton, SOSFlow: 3-tap SOS, GPS broadcast at the
 * SOS moment only, crowd auto-escalation).
 * OFFLINE STORY: the on-device SOS steps work offline; GPS broadcast and
 * responder notification need connectivity — the template states the
 * privacy promise (location shared ONLY at the SOS moment).
 * This intent EXPLAINS SOS; it never triggers an alert.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

export function sosHelpTask(ctx: TaskCtx): TaskOutcome {
  return {
    params: {},
    variant: 'default',
    suggestions: suggestionsFor('sos_help', ctx.lang),
  };
}
