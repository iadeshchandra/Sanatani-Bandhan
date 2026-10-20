/**
 * Sanatani Bandhan — AI Assistant Phase 0 · pipeline
 * =====================================================================
 * ask(input, ctx): Promise<AssistantResponse>
 *
 * Pipeline (deterministic, no generative model anywhere):
 *   1. Crisis-keyword scan → { type: 'sos' } immediately, no chit-chat.
 *   2. Intent router (swappable via IntentRouter — default: keyword router).
 *      Phase 1: when the on-device voice is warm, a high-confidence LLM
 *      mapping may refine the route; otherwise the deterministic result
 *      stands byte for byte.
 *   3. Role-capability gate (canOffer) → warm 'role_denied' when the role
 *      may not be offered this intent/guide.
 *   4. Executor (pure, user-scoped reads only).
 *   5. Template renderer (Sanatani vibe, lang → en fallback, never blank).
 *   6. Phase 1 (optional): the on-device voice may warm the prose of
 *      `text` only — never `type`, `action`, or `suggestions`. Any
 *      failure returns the deterministic answer untouched.
 *   7. QUEUED #32 (H2): the never-surface guard runs LAST for every
 *      non-owner role — if the final text (executor + voice combined)
 *      contains GodMode/platform-internal content, the whole answer is
 *      replaced with a safe fallback. Owner answers are untouched.
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
import { guardSurface } from './surfaceGuard';
import { renderTemplate, suggestionsFor, type TemplateKey } from './templates';
import { TASKS } from './tasks/index';

/** Map an intent (+ executor outcome) to the response type. */
function responseTypeFor(intent: IntentId, hasAction: boolean, variant?: string): ResponseType {
  if (intent === 'fallback_unknown' && variant === 'dharma') return 'escalate';
  if (intent === 'dharma_question' && variant === 'escalate') return 'escalate';
  if (intent === 'nearby_temples' && variant === 'consent') return 'location_consent';
  if (intent === 'fallback_unknown') return 'clarify';
  if (intent === 'navigate' && !hasAction) return 'clarify';
  if (intent === 'howto' && !hasAction) return 'clarify';
  if (hasAction) return 'action';
  return 'answer';
}

/**
 * Phase-1 voice routing refinement. Deterministic result is computed
 * FIRST and always stands unless the on-device voice is warm AND maps
 * with high confidence. Injected routers (tests) bypass the voice
 * entirely — their result is used verbatim.
 */
async function routeInput(
  text: string,
  lang: string,
  router: IntentRouter,
  role: AssistantCtx['role']
): Promise<RouteResult> {
  const base = router.route(text, lang);
  if (router !== deterministicRouter) return base;
  try {
    const mod = await import('./voice/llmRouter');
    // H1 (QUEUED #32): the LLM's intent catalogue is scoped by role —
    // non-owner sessions never even see the admin intents as options.
    const refined = await mod.tryLlmRoute(text, lang, role);
    if (refined) return refined;
  } catch {
    /* voice absent or hiccup — deterministic stands */
  }
  return base;
}

/**
 * Phase-1 voice prose enhancement. The deterministic response is fully
 * built FIRST; the LLM may only warm its `text`. Never throws — any
 * failure returns the base response untouched.
 */
async function maybeEnhanceWithVoice(
  base: AssistantResponse,
  lang: string,
  region: string
): Promise<AssistantResponse> {
  try {
    const mod = await import('./voice/enhance');
    return await mod.enhanceWithVoice(base, lang, region);
  } catch {
    return base; // voice module missing/failed — Phase 0 stands alone
  }
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

  // 2. Route — deterministic first; the on-device voice may refine the
  //    mapping when warm and highly confident (see routeInput).
  const route: RouteResult = await routeInput(text, lang, router, role);

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

  // 6. Optional Phase-1 voice enhancement — the deterministic answer above
  //    is complete and correct; the LLM may only warm its prose, never its
  //    type, action, or suggestions. Fail-open to the deterministic text.
  const base: AssistantResponse = {
    type: responseTypeFor(route.intent, !!outcome.action, outcome.variant),
    text: rendered,
    action: outcome.action,
    suggestions,
    data: outcome.params,
  };
  const enhanced = await maybeEnhanceWithVoice(base, lang, region);

  // 7. Never-surface guard (H2) — the final step. For non-owner roles,
  //    any internal-content hit replaces the WHOLE answer (and drops
  //    the data payload); the owner is never guarded.
  if (role !== 'owner') {
    const guarded = guardSurface(enhanced.text, role, lang);
    if (guarded !== enhanced.text) {
      return { ...enhanced, text: guarded, data: undefined };
    }
  }
  return enhanced;
}
