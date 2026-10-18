/**
 * Sanatani Bandhan — AI Assistant Phase 1 · engine singleton
 * =====================================================================
 * One warm WebLLM engine per app session, created lazily and shared by
 * the renderer and the intent mapper. Rationale: creating the engine
 * compiles the model into the GPU (seconds, even from cache) — doing it
 * per question would make every answer feel broken.
 *
 * Lifecycle:
 *   downloaded → (first voice use) → ensureEngine() compiles once →
 *   warm for the session → unloadEngine() on voice removal / page hide.
 *
 * Everything here fails OPEN: any error returns null and the caller
 * falls back to the deterministic Phase-0 answer. The engine is an
 * enhancement, never a dependency.
 */

import type { MLCEngine } from '@mlc-ai/web-llm';
import { VOICE_MODEL } from './models';
import { isModelCached } from './capabilities';
import type { DownloadProgress } from './types';

let enginePromise: Promise<MLCEngine> | null = null;
let engineFailed = false;

async function createEngine(
  onProgress?: (p: DownloadProgress) => void
): Promise<MLCEngine> {
  // Dynamic import keeps @mlc-ai/web-llm OUT of the main bundle — it
  // becomes a separate chunk fetched only when the voice is touched.
  const webllm = await import('@mlc-ai/web-llm');
  const engine = await webllm.CreateMLCEngine(VOICE_MODEL.id, {
    initProgressCallback: (report) => {
      // WebLLM reports: "Fetching param cache [x/y]" then "Loading model…".
      const phase = /fetch/i.test(report.text) ? 'fetch' : 'load';
      onProgress?.({ progress: Math.min(1, Math.max(0, report.progress)), phase, text: report.text });
    },
  });
  return engine;
}

/**
 * Returns the warm engine, creating it on first call. Resolves null when
 * the model is not downloaded or creation fails (caller falls back).
 * Concurrent callers share the single creation promise.
 */
export function getEngine(
  onProgress?: (p: DownloadProgress) => void
): Promise<MLCEngine | null> {
  if (engineFailed) return Promise.resolve(null);
  if (!enginePromise) {
    enginePromise = (async () => {
      const cached = await isModelCached();
      if (!cached) return null;
      try {
        return await createEngine(onProgress);
      } catch {
        engineFailed = true;
        enginePromise = null;
        return null;
      }
    })();
  }
  return enginePromise;
}

/** Fire-and-forget warm-up after download completes (never blocks UI). */
export function warmEngine(): void {
  void getEngine().catch(() => {
    /* fail-open: first real use will retry */
  });
}

/** True when a warm engine is already available (no creation cost). */
export function isEngineWarm(): boolean {
  return enginePromise !== null && !engineFailed;
}

/** Release GPU memory — called on voice removal and page hide. */
export async function unloadEngine(): Promise<void> {
  const p = enginePromise;
  enginePromise = null;
  engineFailed = false;
  if (p) {
    try {
      const engine = await p;
      await engine?.unload();
    } catch {
      /* already gone — fine */
    }
  }
}

/** Reset the failure latch (e.g. after the user frees storage). */
export function resetEngineFailure(): void {
  engineFailed = false;
  enginePromise = null;
}
