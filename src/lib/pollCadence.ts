/**
 * lib/pollCadence.ts — shared poll scheduling for self-listen watchers.
 * ============================================================================
 * QUEUED #38 (scale & surge hardening). The app's watchers (order news,
 * referral thanks, org broadcasts, aarti, wallet dues) historically ticked
 * on fixed setInterval phases — every device in the same second — and
 * retried failures at full rate forever. On a festival morning, thousands
 * of devices booting together become a synchronised hammer on Firestore's
 * daily read quota.
 *
 * startPollLoop replaces the bare interval with a self-rescheduling timer:
 *   - JITTER: every delay is spread symmetrically (±spread, default 25%),
 *     so a fleet of devices de-synchronises and stays de-synchronised.
 *   - BACKOFF: a run that reports failure (returns false or throws /
 *     rejects) doubles the next delay per consecutive failure, capped at
 *     maxBackoffMs (default 8 × base); any success resets to base.
 *   - VISIBILITY: ticks are skipped while the document is hidden (the
 *     schedule itself keeps running, so foregrounding resumes promptly —
 *     callers also re-run on foreground events as before).
 *
 * The module is timer- and document-agnostic (both injectable) so the
 * cadence maths is unit-testable without a browser.
 */

export interface PollTimers {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface PollLoopOptions {
  /** Base cadence in ms (the historical fixed interval). */
  baseMs: number;
  /** Symmetric jitter fraction, 0..1. Default 0.25 (±25%). */
  spread?: number;
  /** Backoff cap in ms. Default 8 × baseMs. */
  maxBackoffMs?: number;
  /** Random source, injectable for tests. Default Math.random. */
  rng?: () => number;
  /**
   * Gate consulted at each tick; false = skip this tick (NOT a failure —
   * backoff does not engage). Default: document visibility when a document
   * exists, always-true otherwise.
   */
  shouldRun?: () => boolean;
  /** Timer implementation, injectable for tests. Default: globals. */
  timers?: PollTimers;
}

const defaultTimers: PollTimers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

function defaultShouldRun(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/** baseMs spread symmetrically by ±spread (clamped at spread 0..1). */
export function jitteredDelay(baseMs: number, spread = 0.25, rng: () => number = Math.random): number {
  const s = Math.min(1, Math.max(0, spread));
  if (s === 0 || baseMs <= 0) return Math.max(0, Math.round(baseMs));
  const factor = 1 - s + rng() * 2 * s;
  return Math.max(0, Math.round(baseMs * factor));
}

/**
 * Delay after `failures` consecutive failures: base × 2^failures, capped,
 * then jittered. failures = 0 is the normal (jittered base) cadence.
 */
export function backoffDelay(
  baseMs: number,
  failures: number,
  maxBackoffMs?: number,
  spread = 0.25,
  rng: () => number = Math.random,
): number {
  const cap = maxBackoffMs ?? baseMs * 8;
  const grown = Math.min(cap, baseMs * Math.pow(2, Math.max(0, failures)));
  return jitteredDelay(grown, spread, rng);
}

/**
 * Start a poll loop. `run` is invoked on each due tick (never immediately —
 * callers run once at start themselves, as the watchers always have).
 * A run returning/resolving `false`, throwing, or rejecting counts as a
 * failure for backoff; anything else is a success.
 * Returns a stop function.
 */
export function startPollLoop(run: () => unknown, opts: PollLoopOptions): () => void {
  const timers = opts.timers ?? defaultTimers;
  const shouldRun = opts.shouldRun ?? defaultShouldRun;
  const rng = opts.rng ?? Math.random;
  const spread = opts.spread ?? 0.25;

  let stopped = false;
  let failures = 0;
  let handle: unknown = null;

  const schedule = () => {
    if (stopped) return;
    const delay =
      failures === 0
        ? jitteredDelay(opts.baseMs, spread, rng)
        : backoffDelay(opts.baseMs, failures, opts.maxBackoffMs, spread, rng);
    handle = timers.setTimeout(tick, delay);
  };

  const settle = (ok: boolean) => {
    failures = ok ? 0 : failures + 1;
    schedule();
  };

  const tick = () => {
    if (stopped) return;
    if (!shouldRun()) {
      // Hidden tab etc. — skip without penalising the backoff state.
      schedule();
      return;
    }
    let result: unknown;
    try {
      result = run();
    } catch {
      settle(false);
      return;
    }
    if (result && typeof (result as { then?: unknown }).then === 'function') {
      (result as Promise<unknown>).then(
        (v) => {
          if (!stopped) settle(v !== false);
        },
        () => {
          if (!stopped) settle(false);
        },
      );
    } else {
      settle(result !== false);
    }
  };

  schedule();

  return () => {
    stopped = true;
    if (handle !== null) timers.clearTimeout(handle);
  };
}
