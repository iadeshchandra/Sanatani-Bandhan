/**
 * walletLowBalance.test.ts — QUEUED #43.
 * ============================================================================
 * The wallet-low fired-ledger. The bug: the watcher's fired-state lived
 * in RAM, so every relaunch/remount re-fired "Seva Wallet is running
 * low" for a wallet sitting at ৳0 — ~21 identical bells in the live
 * audit. These pins hold the episode semantics:
 *
 *   first sighting baselines silently → entering low fires once →
 *   continuously low re-fires at most once per 24h → recovery re-arms.
 */
import {
  decideLowBalance,
  loadLowBalanceState,
  saveLowBalanceState,
  LOW_BALANCE_INITIAL_STATE,
  LOW_BALANCE_REFIRE_MS,
  type LowBalanceState,
  type StorageLike,
} from '../walletLowBalance';

const THRESHOLD = 200;
const T0 = 1_760_000_000_000;
const HOUR = 60 * 60 * 1000;

function memStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

/** Run one observation through the machine, threading the state. */
function observe(
  state: LowBalanceState,
  balance: number,
  now: number,
): { fire: boolean; state: LowBalanceState } {
  const v = decideLowBalance(state, balance, THRESHOLD, now);
  return { fire: v.fire, state: v.next };
}

describe('decideLowBalance — episode semantics', () => {
  test('first-ever sighting of a low wallet baselines silently, the next sighting fires', () => {
    const s0: LowBalanceState = { ...LOW_BALANCE_INITIAL_STATE };
    const first = observe(s0, 0, T0);
    expect(first.fire).toBe(false); // baseline law — history is not news
    expect(first.state).toEqual({ phase: 'low', lastFiredAt: null });

    const second = observe(first.state, 0, T0 + HOUR);
    expect(second.fire).toBe(true); // episode confirmed live
    expect(second.state).toEqual({ phase: 'low', lastFiredAt: T0 + HOUR });
  });

  test('crossing from ok into low fires exactly once, then stays quiet', () => {
    let s: LowBalanceState = { phase: 'ok', lastFiredAt: null };
    s = observe(s, 500, T0).state;
    const cross = observe(s, 150, T0 + HOUR);
    expect(cross.fire).toBe(true);
    s = cross.state;
    // Repeated snapshots while low (the watcher hears every wallet write)…
    for (let i = 2; i <= 6; i++) {
      const again = observe(s, 150, T0 + i * HOUR);
      expect(again.fire).toBe(false);
      s = again.state;
    }
  });

  test('the audit scenario: 21 observations of a ৳0 wallet ring once, never 21 times', () => {
    let s: LowBalanceState = { ...LOW_BALANCE_INITIAL_STATE };
    let fires = 0;
    for (let i = 0; i < 21; i++) {
      const r = observe(s, 0, T0 + i * HOUR);
      if (r.fire) fires++;
      s = r.state;
    }
    // One baseline-confirm bell — never 21.
    expect(fires).toBe(1);
  });

  test('continuously low re-fires at most once per 24h', () => {
    let s: LowBalanceState = { phase: 'low', lastFiredAt: T0 };
    const early = observe(s, 0, T0 + LOW_BALANCE_REFIRE_MS - 1);
    expect(early.fire).toBe(false);
    const due = observe(early.state, 0, T0 + LOW_BALANCE_REFIRE_MS);
    expect(due.fire).toBe(true);
    expect(due.state.lastFiredAt).toBe(T0 + LOW_BALANCE_REFIRE_MS);
    const again = observe(due.state, 0, T0 + LOW_BALANCE_REFIRE_MS + HOUR);
    expect(again.fire).toBe(false);
  });

  test('recovery re-arms: a fresh dip after topping up fires immediately', () => {
    let s: LowBalanceState = { phase: 'low', lastFiredAt: T0 };
    const recovered = observe(s, 1_000, T0 + HOUR);
    expect(recovered.fire).toBe(false);
    expect(recovered.state.phase).toBe('ok');
    // Only an hour later the wallet dips again — a NEW episode, bell now,
    // not after a 24h wait.
    const dip = observe(recovered.state, 50, T0 + 2 * HOUR);
    expect(dip.fire).toBe(true);
  });

  test('balance exactly at the threshold is not low', () => {
    const s: LowBalanceState = { phase: 'low', lastFiredAt: T0 };
    const r = observe(s, THRESHOLD, T0 + HOUR);
    expect(r.fire).toBe(false);
    expect(r.state.phase).toBe('ok');
  });

  test('a fresh device baselines even mid-episode (no history blast)', () => {
    // Storage wiped / new phone: state is 'unknown' while the wallet has
    // been low for weeks. First sighting must not ring.
    const r = observe({ ...LOW_BALANCE_INITIAL_STATE }, 0, T0);
    expect(r.fire).toBe(false);
  });
});

describe('low-balance ledger persistence', () => {
  test('round-trips through storage; a "restart" (reload) keeps the episode', () => {
    const storage = memStorage();
    const fired: LowBalanceState = { phase: 'low', lastFiredAt: T0 };
    saveLowBalanceState('uid-a', fired, storage);
    expect(loadLowBalanceState('uid-a', storage)).toEqual(fired);

    // Simulate the watcher restarting (new JS session, same device):
    // state loads from storage, so the still-low wallet stays quiet.
    const loaded = loadLowBalanceState('uid-a', storage);
    const r = decideLowBalance(loaded, 0, THRESHOLD, T0 + 3 * HOUR);
    expect(r.fire).toBe(false);
  });

  test('ledgers are per-uid', () => {
    const storage = memStorage();
    saveLowBalanceState('uid-a', { phase: 'low', lastFiredAt: T0 }, storage);
    expect(loadLowBalanceState('uid-b', storage)).toEqual(LOW_BALANCE_INITIAL_STATE);
  });

  test('corrupt or missing storage degrades to the initial state, never throws', () => {
    const storage = memStorage();
    storage.setItem('sb.wallet.lowBalance.v1.uid-a', '{not json');
    expect(loadLowBalanceState('uid-a', storage)).toEqual(LOW_BALANCE_INITIAL_STATE);
    storage.setItem('sb.wallet.lowBalance.v1.uid-a', '{"phase":"bogus","lastFiredAt":"x"}');
    expect(loadLowBalanceState('uid-a', storage)).toEqual({
      phase: 'unknown',
      lastFiredAt: null,
    });
    expect(loadLowBalanceState('uid-a', null)).toEqual(LOW_BALANCE_INITIAL_STATE);
    expect(() =>
      saveLowBalanceState('uid-a', { phase: 'low', lastFiredAt: 1 }, null),
    ).not.toThrow();
  });
});
