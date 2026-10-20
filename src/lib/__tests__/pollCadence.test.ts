/**
 * pollCadence.test.ts — QUEUED #38 cadence maths + loop behaviour.
 * Uses injected fake timers (a manual clock) and fixed rng values so the
 * scheduling contract is pinned deterministically.
 */
import { backoffDelay, jitteredDelay, startPollLoop, type PollTimers } from '../pollCadence';

/* Manual timer registry: setTimeout records {fn, ms}; fireNext() runs the
   earliest-scheduled pending callback. */
function fakeTimers() {
  let nextId = 1;
  const pending = new Map<number, { fn: () => void; ms: number }>();
  const delays: number[] = [];
  const timers: PollTimers = {
    setTimeout: (fn, ms) => {
      const id = nextId++;
      pending.set(id, { fn, ms });
      delays.push(ms);
      return id;
    },
    clearTimeout: (h) => {
      pending.delete(h as number);
    },
  };
  const fireNext = () => {
    const first = pending.entries().next();
    if (first.done) throw new Error('no pending timer');
    const [id, t] = first.value as [number, { fn: () => void; ms: number }];
    pending.delete(id);
    t.fn();
  };
  return { timers, delays, fireNext, pendingCount: () => pending.size };
}

describe('jitteredDelay', () => {
  it('rng 0.5 lands exactly on the base', () => {
    expect(jitteredDelay(60_000, 0.25, () => 0.5)).toBe(60_000);
  });
  it('spreads symmetrically to the band edges', () => {
    expect(jitteredDelay(60_000, 0.25, () => 0)).toBe(45_000);
    expect(jitteredDelay(60_000, 0.25, () => 1)).toBe(75_000);
  });
  it('spread 0 returns the base untouched', () => {
    expect(jitteredDelay(60_000, 0, () => 0.9)).toBe(60_000);
  });
  it('clamps out-of-range spread', () => {
    expect(jitteredDelay(1000, 5, () => 1)).toBe(2000);
    expect(jitteredDelay(1000, -1, () => 1)).toBe(1000);
  });
});

describe('backoffDelay', () => {
  const mid = () => 0.5; // neutral jitter → exact grown value
  it('failures 0 = base; doubles per failure', () => {
    expect(backoffDelay(1000, 0, undefined, 0.25, mid)).toBe(1000);
    expect(backoffDelay(1000, 1, undefined, 0.25, mid)).toBe(2000);
    expect(backoffDelay(1000, 2, undefined, 0.25, mid)).toBe(4000);
    expect(backoffDelay(1000, 3, undefined, 0.25, mid)).toBe(8000);
  });
  it('caps at 8× base by default and at an explicit cap', () => {
    expect(backoffDelay(1000, 10, undefined, 0.25, mid)).toBe(8000);
    expect(backoffDelay(1000, 10, 3000, 0.25, mid)).toBe(3000);
  });
});

describe('startPollLoop', () => {
  it('does not run immediately; first tick is the jittered base', () => {
    const { timers, delays, fireNext } = fakeTimers();
    let runs = 0;
    const stop = startPollLoop(() => { runs++; }, { baseMs: 60_000, timers, rng: () => 0.5 });
    expect(runs).toBe(0);
    expect(delays).toEqual([60_000]);
    fireNext();
    expect(runs).toBe(1);
    stop();
  });

  it('backs off on false results and resets on success', () => {
    const { timers, delays, fireNext } = fakeTimers();
    const outcomes: unknown[] = [false, false, true];
    const stop = startPollLoop(() => outcomes.shift(), { baseMs: 1000, timers, rng: () => 0.5 });
    fireNext(); // run → false → next delay 2000
    fireNext(); // run → false → next delay 4000
    fireNext(); // run → true  → next delay 1000
    expect(delays).toEqual([1000, 2000, 4000, 1000]);
    stop();
  });

  it('backs off on thrown errors and rejected promises', async () => {
    const { timers, delays, fireNext } = fakeTimers();
    let mode = 0;
    const stop = startPollLoop(
      () => {
        mode++;
        if (mode === 1) throw new Error('boom');
        return Promise.reject(new Error('nope'));
      },
      { baseMs: 1000, timers, rng: () => 0.5 },
    );
    fireNext(); // throws → 2000
    fireNext(); // rejects → settles async
    await Promise.resolve();
    await Promise.resolve();
    expect(delays).toEqual([1000, 2000, 4000]);
    stop();
  });

  it('skips ticks while shouldRun is false, without engaging backoff', () => {
    const { timers, delays, fireNext } = fakeTimers();
    let visible = false;
    let runs = 0;
    const stop = startPollLoop(() => { runs++; }, {
      baseMs: 1000, timers, rng: () => 0.5, shouldRun: () => visible,
    });
    fireNext(); // skipped
    fireNext(); // skipped
    expect(runs).toBe(0);
    expect(delays).toEqual([1000, 1000, 1000]); // cadence unchanged, no growth
    visible = true;
    fireNext();
    expect(runs).toBe(1);
    stop();
  });

  it('stop() clears the pending timer and ends the loop', () => {
    const { timers, pendingCount } = fakeTimers();
    let runs = 0;
    const stop = startPollLoop(() => { runs++; }, { baseMs: 1000, timers, rng: () => 0.5 });
    expect(pendingCount()).toBe(1);
    stop();
    expect(pendingCount()).toBe(0);
    expect(runs).toBe(0);
  });
});
