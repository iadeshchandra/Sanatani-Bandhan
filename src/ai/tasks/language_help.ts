/**
 * TASK: language_help
 * =====================================================================
 * DATA SOURCE: the app's language list (src/i18n/translationQuality.ts
 * SUPPORTED_LANGS — 10 languages; src/context/LanguageContext.tsx).
 * OFFLINE STORY: fully offline — the language switcher is a local
 * setting; the template points at Profile where it lives.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

export function languageHelpTask(ctx: TaskCtx): TaskOutcome {
  return {
    params: {},
    variant: 'default',
    action: { kind: 'navigate', target: '/app/profile' },
    suggestions: suggestionsFor('language_help', ctx.lang),
  };
}
