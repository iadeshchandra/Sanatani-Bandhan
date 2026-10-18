/**
 * TASK: dana_help
 * =====================================================================
 * DATA SOURCE: static guidance describing the ExpressDanaSheet flow
 * (src/solo/ExpressDanaSheet.tsx — UPI-intent first, ₹51/101/501/1100
 * presets, shradhā slider, "we never hold a rupee"). No amounts are
 * invented; the sheet itself is the source of truth at tap time.
 * OFFLINE STORY: guidance is bundled and works offline; the actual
 * payment needs connectivity (UPI intent) — the template says so
 * honestly via the sheet's own behaviour.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

export function danaHelpTask(ctx: TaskCtx): TaskOutcome {
  return {
    params: {},
    variant: 'default',
    // Host shell opens the ExpressDanaSheet bottom sheet (UI wiring pending).
    action: { kind: 'openSheet', target: 'express-dana' },
    suggestions: suggestionsFor('dana_help', ctx.lang),
  };
}
