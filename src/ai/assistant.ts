/**
 * Sanatani Bandhan — AI Assistant Phase 0 · pipeline
 * =====================================================================
 * ask(input, ctx): Promise<AssistantResponse>
 *
 * Pipeline (deterministic, no generative model anywhere):
 *   1. Crisis-keyword scan → { type: 'sos' } immediately, no chit-chat.
 *   2. Intent router (swappable via IntentRouter — default: keyword router).
 *   3. Role-capability gate (canOffer) → warm 'role_denied' when the role
 *      may not be offered this intent/guide.
 *   4. Executor (pure, user-scoped reads only).
 *   5. Template renderer (Sanatani vibe, lang → en fallback, never blank).
 *
 * The "100% accurate" guarantee: every fact in the response comes from an
 * executor reading app data. When nothing can answer, the assistant says so
 * warmly and offers the human path — it never invents.
 */

import type {
  AssistantCtx,
  AssistantResponse,
  IntentId,
  ResponseType,
  TaskCtx,
} from './types';
import { detectCrisis } from './crisisKeywords';
import { deterministicRouter, type IntentRouter, type RouteResult } from './intents';
import { canOffer } from './rbac';
import { renderTemplate, suggestionsFor, type TemplateKey } from './templates';
import { TASKS } from './tasks/index';

/** Map an intent (+ executor outcome) to the response type. */
function responseTypeFor(intent: IntentId, hasAction: boolean, variant?: string): ResponseType {
  if (intent === 'fallback_unknown' && variant === 'dharma') return 'escalate';
  if (intent === 'fallback_unknown') return 'clarify';
  if (intent === 'navigate' && !hasAction) return 'clarify';
  if (intent === 'howto' && !hasAction) return 'clarify';
  if (hasAction) return 'action';
  return 'answer';
}

export async function ask(
  input: string,
  ctx: AssistantCtx,
  router: IntentRouter = deterministicRouter
): Promise<AssistantResponse> {
  const text = (input || '').trim();
  const lang = ctx.lang || 'en';
  const region = ctx.region || 'other';
  const role = ctx.role || 'devotee';

  // 0. Empty input — gentle prompt, never an error.
  if (!text) {
    return {
      type: 'clarify',
      text: renderTemplate('empty_input', lang, {}, 'default', region),
      suggestions: suggestionsFor('greeting', lang),
    };
  }

  // 1. Crisis scan — before everything, no chit-chat.
  const crisis = detectCrisis(text);
  if (crisis) {
    return {
      type: 'sos',
      text: renderTemplate('crisis', lang, {}, 'default', region),
      action: { kind: 'navigate', target: '/app/home' },
      suggestions: suggestionsFor('sos_help', lang),
    };
  }

  // 2. Route.
  const route: RouteResult = router.route(text, lang);

  // 3. Role-capability gate.
  const guideId = route.slots['guideId'];
  if (!canOffer(route.intent, role, guideId)) {
    return {
      type: 'clarify',
      text: renderTemplate(
        'role_denied',
        lang,
        { area: guideId ? guideId : route.intent.replace(/_/g, ' ') },
        'default',
        region
      ),
      suggestions: suggestionsFor('greeting', lang),
    };
  }

  // 4. Execute (pure, user-scoped).
  const taskCtx: TaskCtx = {
    uid: ctx.uid,
    lang,
    region,
    role,
    input: text,
    slots: route.slots,
  };
  const outcome = await TASKS[route.intent](taskCtx);

  // 5. Render — fallback chain guarantees non-blank text.
  const rendered = renderTemplate(
    route.intent as TemplateKey,
    lang,
    outcome.params,
    outcome.variant,
    region
  );
  const suggestions = outcome.suggestions ?? suggestionsFor(route.intent, lang);

  return {
    type: responseTypeFor(route.intent, !!outcome.action, outcome.variant),
    text: rendered,
    action: outcome.action,
    suggestions,
  };
}
