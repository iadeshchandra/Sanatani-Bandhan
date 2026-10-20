/**
 * apiFallback.ts — the Spark-native fallback strategy for adminApi.
 * =================================================================
 * Pure module (no Firebase imports) so it stays unit-testable:
 * pinned by src/lib/__tests__/adminApiFallback.test.ts.
 *
 * The HTTP backend is tried FIRST. Only when the fetch fails with
 * backendDown (functions not deployed / unreachable) do we fall back to
 * the Spark-native Firestore implementation. This makes migration
 * automatic: deploy functions + set VITE_BACKEND_URL and the HTTP path wins.
 *
 * NATIVE-ONLY STUB CONVENTION: endpoints with no HTTP route yet pass
 * `() => Promise.resolve({ ok: false, code: 'backendDown' })` as the
 * httpCall placeholder. That marker has no `backendDown` flag, so
 * withFallback must ALSO treat `code === 'backendDown'` (with ok:false)
 * as a backend-down signal — otherwise the native fallback silently
 * never runs and the tab returns { ok:false } permanently
 * (bug found 2026-10-20: QR Intel, Payment Insights, Top-ups, Wallets,
 * Bypass flags/rules, Provider payments/strikes, tier rates all dead).
 */
export interface ApiResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  backendDown?: boolean;
  /** Set when the op genuinely needs the Express backend (Admin SDK). */
  requiresBackend?: boolean;
}

export async function withFallback<T>(
  httpCall: () => Promise<ApiResult<T>>,
  nativeCall: () => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const r = await httpCall();
  if (r.backendDown || (r.code === 'backendDown' && !r.ok)) {
    try {
      return await nativeCall();
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Spark-native operation failed.', code: 'NATIVE_FAILED' };
    }
  }
  return r;
}
