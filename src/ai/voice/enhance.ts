/**
 * Sanatani Bandhan — AI Assistant Phase 1 · ask() integration
 * =====================================================================
 * `enhanceWithVoice` is the ONLY touchpoint between the on-device voice
 * and the Phase-0 pipeline (wired in assistant.ts as the final step).
 *
 * Iron rule, enforced structurally: this function may replace `text`
 * with a warmer rephrasing — it may NEVER change `type`, `action`, or
 * `suggestions`. Those are deterministic decisions. A test pins this.
 *
 * Enhancement is skipped (deterministic answer returned untouched) when:
 * - the response type is 'sos' or 'escalate' (safety-critical copy),
 * - the model is not downloaded,
 * - the engine is not warm,
 * - the rephrase times out or fails.
 */

import type { AssistantResponse } from '../types';
import { isEngineWarm } from './engine';
import { isModelCached } from './capabilities';
import { warmRephrase } from './renderer';

/** Response types whose copy must never be rephrased. */
const PROTECTED_TYPES = new Set(['sos', 'escalate']);

/**
 * Warm the prose of a deterministic answer. Never throws — any failure
 * returns the input response unchanged.
 */
export async function enhanceWithVoice(
  base: AssistantResponse,
  lang: string,
  region?: string
): Promise<AssistantResponse> {
  try {
    if (PROTECTED_TYPES.has(base.type)) return base;
    if (!isEngineWarm()) {
      // Engine not warm — do not pay compilation cost inside a question.
      return base;
    }
    const cached = await isModelCached().catch(() => false);
    if (!cached) return base;
    const warmer = await warmRephrase({ original: base.text, lang, region });
    if (!warmer) return base;
    return { ...base, text: warmer };
  } catch {
    return base;
  }
}
