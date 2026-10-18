/**
 * TASK: voice_upgrade
 * =====================================================================
 * DATA SOURCE: none — self-service deep link to the permanent on-device
 * voice card (Profile → "🙏 On-device AI voice", anchor #ai-voice).
 * The assistant helps you upgrade the assistant.
 * OFFLINE STORY: fully offline — the card, the download state machine,
 * and the capability probe are all device-local.
 */
import { suggestionsFor } from '../templates';
import { modelSizeLabel } from '../voice/models';
import type { TaskCtx, TaskOutcome } from '../types';

export function voiceUpgradeTask(ctx: TaskCtx): TaskOutcome {
  return {
    params: { size: modelSizeLabel() },
    variant: 'default',
    action: { kind: 'navigate', target: '/app/profile#ai-voice' },
    suggestions: suggestionsFor('voice_upgrade', ctx.lang),
  };
}
