/**
 * adminApiFallback.test.ts — pins the withFallback stub convention (fix 2026-10-20).
 *
 * Bug: native-only endpoints pass `() => Promise.resolve({ ok: false, code: 'backendDown' })`
 * as the httpCall placeholder, but withFallback only checked `r.backendDown`.
 * The stub has no `backendDown` flag, so the Spark-native fallback NEVER ran —
 * every tab wired through these endpoints (QR Intel, Payment Insights, Top-ups,
 * Wallets, Bypass flags/rules, Provider payments/strikes, tier rates) returned
 * { ok: false } permanently.
 *
 * Fix: withFallback also treats the 'backendDown' code marker (with ok:false)
 * as a backend-down signal.
 */
import { withFallback, type ApiResult } from '../apiFallback';

// apiFallback is a pure module (no Firebase imports) — no mocks needed.
// The import.meta in adminApi.ts cannot be compiled by ts-jest to CJS, so we
// pin the extracted function directly; adminApi re-exports it unchanged.

const stubHttp = () => Promise.resolve({ ok: false, code: 'backendDown' } as ApiResult<any>);

describe('withFallback native-only stub convention', () => {
  it('runs the native fallback when the http stub carries the backendDown marker', async () => {
    let nativeRan = false;
    const r = await withFallback(stubHttp, async () => {
      nativeRan = true;
      return { ok: true, data: { methods: [] } };
    });
    expect(nativeRan).toBe(true);
    expect(r.ok).toBe(true);
  });

  it('runs the native fallback on a real backendDown result', async () => {
    let nativeRan = false;
    const r = await withFallback(
      async () => ({ ok: false, error: 'down', code: 'BACKEND_DOWN', backendDown: true }),
      async () => { nativeRan = true; return { ok: true, data: {} }; }
    );
    expect(nativeRan).toBe(true);
    expect(r.ok).toBe(true);
  });

  it('does NOT run the native fallback when the HTTP path succeeds', async () => {
    let nativeRan = false;
    const r = await withFallback(
      async () => ({ ok: true, data: { from: 'http' } }),
      async () => { nativeRan = true; return { ok: true, data: { from: 'native' } }; }
    );
    expect(nativeRan).toBe(false);
    expect(r.data).toEqual({ from: 'http' });
  });

  it('does NOT run the native fallback on a genuine HTTP error (e.g. 403)', async () => {
    let nativeRan = false;
    const r = await withFallback(
      async () => ({ ok: false, error: 'Forbidden', code: 'HTTP_403' }),
      async () => { nativeRan = true; return { ok: true, data: {} }; }
    );
    expect(nativeRan).toBe(false);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('HTTP_403');
  });

  it('returns the marker result itself when native fails after the marker', async () => {
    const r = await withFallback(stubHttp, async () => {
      throw new Error('native exploded');
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NATIVE_FAILED');
  });
});
