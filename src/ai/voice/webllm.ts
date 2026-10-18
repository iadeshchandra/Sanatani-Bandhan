/**
 * Sanatani Bandhan — AI Assistant Phase 1 · web-llm gateway
 * =====================================================================
 * SINGLE gateway for the `@mlc-ai/web-llm` dynamic import.
 *
 * Why one gateway: `@mlc-ai/web-llm` is a CommonJS-only package. When three
 * modules each did their own `await import('@mlc-ai/web-llm')`, Rollup's
 * CJS interop duplicated the lib (incl. the tvmjs runtime) into the main
 * chunk — 11MB, breaking the PWA precache build (2026-10-18). One gateway
 * = one async chunk, main bundle stays lean.
 *
 * Nothing here runs at import time; the lib loads only when called.
 */

type WebLlmModule = typeof import('@mlc-ai/web-llm');

let cached: Promise<WebLlmModule> | null = null;

/** The @mlc-ai/web-llm module, loaded once and shared. */
export function getWebLlm(): Promise<WebLlmModule> {
  if (!cached) cached = import('@mlc-ai/web-llm');
  return cached;
}
