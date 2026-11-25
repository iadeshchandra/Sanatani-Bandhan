/**
 * withTimeout.ts — bound any promise with a hard deadline
 * (SPLASH & GODMODE BATCH, part C).
 * =====================================================================
 * Some awaits in this app can hang forever on a black-holed network:
 * the promise neither resolves nor rejects, so any UI waiting on it
 * spins forever (the 2026-11-22 GodMode finding: the console's role
 * lookup awaited a Firestore read with no bound). withTimeout races
 * the promise against a deadline and rejects with a TimeoutError, so
 * the caller can show an honest error state with a retry instead.
 *
 * Honest limits: a timeout does not cancel the underlying work (a
 * Firestore read cannot be cancelled from here) — it only stops the
 * WAITING. If the underlying promise settles later, its outcome is
 * ignored by the race (and its rejection is still handled, so it can
 * never surface as an unhandled rejection).
 */

export class TimeoutError extends Error {
  readonly code = 'sb/timeout';

  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function isTimeoutError(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'sb/timeout'
  );
}

/**
 * Resolve/reject with `promise`, or reject with TimeoutError after
 * `ms` — whichever comes first. The timer is always cleared when the
 * promise wins, so a settled race leaves nothing behind.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new TimeoutError(ms));
    }, ms);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
