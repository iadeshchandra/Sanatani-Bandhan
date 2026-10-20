/**
 * Sanatani Bandhan — AI Assistant Phase 1 · LLM intent router
 * =====================================================================
 * Implements Phase 0's `IntentRouter` interface with the on-device voice.
 *
 * Contract (from the Phase-1 brief):
 * - The LLM mapping is used ONLY above INTENT_CONFIDENCE_THRESHOLD.
 * - Below the threshold (or when the voice is absent/not warm) the
 *   deterministic keyword router's answer stands — byte for byte.
 * - The engine is never created for routing: routing only runs when the
 *   engine is already warm (post-download warm-up or a prior voice use),
 *   so no question ever waits on model compilation.
 *
 * Crisis scanning still happens BEFORE routing in assistant.ts — the LLM
 * never sees crisis inputs through this path.
 */

import { deterministicRouter, INTENTS, type IntentRouter, type RouteResult } from '../intents';
import { isCopilotIntent } from '../godmode/copilot';
import type { Role } from '../types';
import { isEngineWarm } from './engine';
import { INTENT_CONFIDENCE_THRESHOLD, mapToIntent } from './renderer';

/**
 * H1 (QUEUED #32): the intent catalogue offered to the LLM is scoped by
 * role. Non-owner sessions are never even SHOWN the owner-only admin
 * intents — the model cannot map a devotee's words onto a catalogue
 * entry it has never seen. (canOffer still gates afterwards: defence in
 * depth, not trust.)
 */
export function catalogueForRole(role?: Role) {
  const all = INTENTS.map((i) => ({ id: i.id, description: i.description }));
  if (role === 'owner') return all;
  return all.filter((i) => !isCopilotIntent(i.id));
}

/**
 * Try the LLM mapping. Returns null when the voice should not be
 * consulted — the caller then uses the deterministic result.
 */
export async function tryLlmRoute(
  input: string,
  lang: string,
  role?: Role
): Promise<RouteResult | null> {
  if (!isEngineWarm()) return null;
  const mapping = await mapToIntent(input, catalogueForRole(role));
  if (!mapping || mapping.confidence < INTENT_CONFIDENCE_THRESHOLD) return null;
  return {
    intent: mapping.intent as RouteResult['intent'],
    confidence: 'high',
    slots: {},
    evidence: [`llm:${mapping.confidence.toFixed(2)}`],
  };
}

/**
 * Drop-in IntentRouter: LLM first (warm engine + high confidence only),
 * deterministic keyword router otherwise. Pass to ask() as the router.
 */
export const llmRouter: IntentRouter = {
  route(input: string, lang: string): RouteResult {
    // Synchronous contract — the async refinement happens in
    // refineRoute(); this sync entry keeps the interface honest and
    // always returns the deterministic answer immediately.
    return deterministicRouter.route(input, lang);
  },
};

/**
 * Async refinement used by assistant.ts: deterministic result first,
 * replaced only by a high-confidence LLM mapping.
 */
export async function refineRoute(input: string, lang: string): Promise<RouteResult> {
  const base = deterministicRouter.route(input, lang);
  try {
    const refined = await tryLlmRoute(input, lang);
    if (refined) return refined;
  } catch {
    /* voice hiccup — deterministic stands */
  }
  return base;
}
