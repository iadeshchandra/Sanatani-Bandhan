/**
 * lib/walletLowBalance.ts — the wallet-low fired-ledger (QUEUED #43).
 * ============================================================================
 * THE BUG THIS KILLS: the wallet watcher's low-balance state (`wasLow`,
 * `lowNotifiedDay`) lived in RAM inside `startWalletNotify`. Every app
 * relaunch, shell remount, or watcher restart reset it — and the branch
 * had no baseline law, so the FIRST wallet snapshot of every session
 * fired the "Seva Wallet is running low" bell again. A wallet sitting
 * at ৳0 (permanently below the threshold) earned its owner one fresh
 * bell per session, forever — the live audit counted ~21 identical
 * bells in one inbox.
 *
 * THE FIX (mirroring the #29 orderNotify pattern: a pure decision fn +
 * a persisted device-local ledger in the shell):
 *
 *  - The episode state is PERSISTED per uid in localStorage, so it
 *    survives relaunches and remounts — a condition this device has
 *    already rung for cannot ring again just because the JS restarted.
 *  - Fire semantics (one bell per low-episode, calmly):
 *      · entering low (balance crosses below the threshold) → fire;
 *      · still low → re-fire at most once per 24h (a gentle reminder
 *        the wallet is still empty — never a stream);
 *      · recovery (balance back at/above threshold) re-arms the
 *        episode: the next dip fires immediately;
 *      · the FIRST-EVER sighting on a device baselines silently (the
 *        #29 baseline law — history is not news); if the wallet is
 *        still low at the next observation, that sighting fires.
 *  - Fail-open: storage problems degrade to the initial state, never
 *    to a crash and never to a bell storm (worst case the baseline law
 *    absorbs the first sighting again).
 *
 * This file is firebase-free and jest-safe; wallet.ts is the shell
 * that subscribes and persists.
 */

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface LowBalanceState {
  /**
   * 'unknown' — this device has never recorded an observation.
   * 'ok'      — last observation was at/above the threshold.
   * 'low'     — last observation was below the threshold (an episode).
   */
  phase: 'unknown' | 'ok' | 'low';
  /** Epoch ms of the last low-balance bell this device fired, or null. */
  lastFiredAt: number | null;
}

export const LOW_BALANCE_INITIAL_STATE: LowBalanceState = {
  phase: 'unknown',
  lastFiredAt: null,
};

/** While an episode runs continuously, re-ring at most once per day. */
export const LOW_BALANCE_REFIRE_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Decision (pure)                                                     */
/* ------------------------------------------------------------------ */

/**
 * Decide whether THIS balance observation earns a bell, and the state
 * to persist either way. Call on every wallet snapshot; persist `next`
 * unconditionally — the ledger is what makes the NEXT call honest.
 */
export function decideLowBalance(
  state: LowBalanceState,
  balance: number,
  threshold: number,
  now: number,
): { fire: boolean; next: LowBalanceState } {
  const bal = Number.isFinite(balance) ? balance : 0;

  // Recovery (or comfortable): the episode is over; re-arm.
  if (bal >= threshold) {
    return { fire: false, next: { phase: 'ok', lastFiredAt: state.lastFiredAt } };
  }

  // Below the threshold — an episode is in progress.
  switch (state.phase) {
    case 'ok':
      // A genuine crossing into low — the one bell an episode starts with.
      return { fire: true, next: { phase: 'low', lastFiredAt: now } };
    case 'unknown':
      // Baseline law: the first-ever sighting records the state and
      // rings nothing — a wallet that has been low for months is
      // history on this device, not news. The NEXT sighting (below)
      // confirms the episode is live and rings once.
      return { fire: false, next: { phase: 'low', lastFiredAt: null } };
    case 'low':
      if (state.lastFiredAt == null) {
        // Baselined low, still low at the next observation — the
        // episode is real and current; ring its one starting bell.
        return { fire: true, next: { phase: 'low', lastFiredAt: now } };
      }
      if (now - state.lastFiredAt >= LOW_BALANCE_REFIRE_MS) {
        // Continuously low for a full day — one calm re-reminder.
        return { fire: true, next: { phase: 'low', lastFiredAt: now } };
      }
      return { fire: false, next: state };
    default:
      return { fire: false, next: state };
  }
}

/* ------------------------------------------------------------------ */
/* Persistence (device-local ledger, fail-open)                        */
/* ------------------------------------------------------------------ */

const LEDGER_KEY_PREFIX = 'sb.wallet.lowBalance.v1.';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* non-browser / denied */
  }
  return null;
}

function ledgerKey(uid: string): string {
  return `${LEDGER_KEY_PREFIX}${uid}`;
}

/** Load the persisted episode state for this uid (initial if none/corrupt). */
export function loadLowBalanceState(
  uid: string,
  storage: StorageLike | null = defaultStorage(),
): LowBalanceState {
  if (!storage || !uid) return { ...LOW_BALANCE_INITIAL_STATE };
  try {
    const raw = storage.getItem(ledgerKey(uid));
    if (!raw) return { ...LOW_BALANCE_INITIAL_STATE };
    const parsed = JSON.parse(raw) as Partial<LowBalanceState>;
    const phase =
      parsed.phase === 'ok' || parsed.phase === 'low' || parsed.phase === 'unknown'
        ? parsed.phase
        : 'unknown';
    const lastFiredAt =
      typeof parsed.lastFiredAt === 'number' && Number.isFinite(parsed.lastFiredAt)
        ? parsed.lastFiredAt
        : null;
    return { phase, lastFiredAt };
  } catch {
    return { ...LOW_BALANCE_INITIAL_STATE };
  }
}

/** Persist the episode state (best-effort — never throws). */
export function saveLowBalanceState(
  uid: string,
  state: LowBalanceState,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage || !uid) return;
  try {
    storage.setItem(ledgerKey(uid), JSON.stringify(state));
  } catch {
    /* storage full or unavailable — the baseline law absorbs it */
  }
}
