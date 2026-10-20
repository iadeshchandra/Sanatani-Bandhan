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
 * H2b (QUEUED #32): numeric preservation. A voice rephrase may warm
 * prose but must never ALTER facts — and the cheapest fact to corrupt
 * silently is a number (a tithi count, a time, a price). Extract the
 * numeric tokens of both texts (commas stripped, decimals and %
 * preserved); if the warmed text introduces ANY numeric token that was
 * not in the original (multiset comparison), the rephrase is rejected.
 */
export function extractNumericTokens(text: string): string[] {
  const out: string[] = [];
  const re = /\d[\d,]*(?:\.\d+)?%?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || '')) !== null) {
    out.push(m[0].replace(/,/g, ''));
  }
  return out;
}

export function introducesNewNumbers(original: string, warmed: string): boolean {
  const available = new Map<string, number>();
  for (const t of extractNumericTokens(original)) {
    available.set(t, (available.get(t) ?? 0) + 1);
  }
  for (const t of extractNumericTokens(warmed)) {
    const left = available.get(t) ?? 0;
    if (left <= 0) return true;
    available.set(t, left - 1);
  }
  return false;
}

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
    // H2b: a rephrase that changes the numbers is not a rephrase — it
    // is a different (invented) answer. Keep the deterministic text.
    if (introducesNewNumbers(base.text, warmer)) return base;
    return { ...base, text: warmer };
  } catch {
    return base;
  }
}
