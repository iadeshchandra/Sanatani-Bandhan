/**
 * Sanatani Bandhan — AI Assistant Phase 1 · model record
 * =====================================================================
 * Single source of truth for the on-device model choice.
 *
 * CHOICE: Qwen2.5-3B-Instruct (q4f16_1, MLC build)
 * ---------------------------------------------------------------------
 * Why this model — the multilingual criterion decides:
 * 1. **10-language quality.** Qwen2.5-Instruct is trained on 29 languages
 *    with strong coverage of Hindi, Bengali, Tamil, Telugu — the app's
 *    core languages. In the 3B class it consistently outscores Llama-3.2-3B
 *    on multilingual benchmarks (the fallback below is weaker outside
 *    English/Chinese/Spanish).
 * 2. **No accounts, no gates.** Apache 2.0, ungated on HuggingFace —
 *    `mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC` downloads with zero sign-in,
 *    honoring the $0 / no-accounts rule. (Llama-family MLC builds inherit
 *    Meta's gated license — a sign-in wall we refuse.)
 * 3. **Fits the browser.** q4f16_1 ≈ 1.74 GB weights; ~2.2 GB working
 *    memory — inside the practical browser ceiling (~8B params).
 * 4. **Prebuilt for WebLLM.** Present in `@mlc-ai/web-llm`'s
 *    `prebuiltAppConfig.model_list` (verified in v0.2.86 source) — no
 *    custom compilation, no extra WASM to ship.
 *
 * Fallback (if the primary ever disappears from the prebuilt list):
 * `Llama-3.2-3B-Instruct-q4f16_1-MLC` — same size class, weaker
 * multilinguality, license-gated upstream (kept as fallback only).
 *
 * The model is a RENDERER, never a reasoner: it rephrases deterministic
 * answers and maps queries to existing intents. See renderer.ts for the
 * guardrail that enforces this at the prompt level.
 */

export interface VoiceModelRecord {
  /** Exact id in web-llm's prebuiltAppConfig.model_list. */
  id: string;
  /** Display name for settings UI. */
  displayName: string;
  /** Weight bytes from the MLC artifact manifest (ndarray-cache.json). */
  weightBytes: number;
  /** Bumped when the blessed model changes — drives 'update-available'. */
  version: string;
  /** Runtime library. */
  runtime: '@mlc-ai/web-llm';
  runtimeVersion: string;
  license: string;
  gated: false;
  fallbackId: string;
}

export const VOICE_MODEL: VoiceModelRecord = {
  id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  displayName: 'Qwen2.5 3B · on-device voice',
  weightBytes: 1736187904, // ParamBytes from mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC manifest
  version: '1',
  runtime: '@mlc-ai/web-llm',
  runtimeVersion: '0.2.86',
  license: 'Apache-2.0',
  gated: false,
  fallbackId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
};

/** Human size for the consent screen — computed from the manifest bytes. */
export function modelSizeGB(): number {
  return VOICE_MODEL.weightBytes / 1073741824;
}

/** One-line size for UI, e.g. "≈1.8 GB". */
export function modelSizeLabel(): string {
  return `≈${modelSizeGB().toFixed(1)} GB`;
}

/**
 * Free space we ask the device to have before offering download:
 * weights + compile headroom + safety margin.
 */
export const REQUIRED_FREE_BYTES = VOICE_MODEL.weightBytes + 768 * 1048576;
