/**
 * apiUsage.ts — our own call ledger for keyed APIs (QUEUED #35).
 * ============================================================================
 * Providers do not report live quota usage back to an API key, so the
 * GodMode Health desk's quota bars are fed by counting OUR OWN calls:
 *   - `youtubeLive.isChannelLive`  → 1 call / 100 units per answered request
 *   - `callGeminiDirect`           → 1 call per answered request
 *   - the desk's own YouTube probe → 1 unit (counted honestly, too)
 *
 * Storage layers, in order of truth:
 *  1. THIS DEVICE — counters in localStorage, bucketed by Pacific day
 *     (Google's quota day). Always available, always labeled "this device".
 *  2. ALL DEVICES — the same deltas flushed (batched, fail-silent) to
 *     `apiUsageDaily/{apiId}_{pacificDay}`. Firestore rules currently have
 *     NO match for that collection, so every non-owner write is denied and
 *     the flush simply stops trying for the session; the desk then shows
 *     device numbers with an honest label. When the owner approves the
 *     flagged rules block, global numbers start flowing with no code
 *     change. (See the #35 report for the exact proposed block.)
 *
 * Nothing here may ever break a feature: every entry point is guarded,
 * async work is fire-and-forget, and storage failures are swallowed.
 */
import { bucketIdFor, pacificDayKey } from './apiHealth';

export interface UsageBucket {
  calls: number;
  units: number;
}

/** bucketId (`{apiId}_{YYYY-MM-DD}`) → counts. */
export type UsageLedger = Record<string, UsageBucket>;

const LS_KEY = 'sb.apiUsage.v1';
const KEEP_DAYS = 40;

let memLedger: UsageLedger | null = null;
let dirty = new Map<string, UsageBucket>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushDenied = false;

/* ------------------------------------------------------------ pure core */

/** A fresh ledger with one zeroed bucket — used by tests and first runs. */
export function emptyBucket(): UsageBucket {
  return { calls: 0, units: 0 };
}

/** Add one batch of usage to a ledger (pure — returns a new ledger). */
export function applyUse(
  ledger: UsageLedger,
  apiId: string,
  calls: number,
  units: number,
  nowMs: number,
): UsageLedger {
  if (calls <= 0 && units <= 0) return ledger;
  const id = bucketIdFor(apiId, nowMs);
  const cur = ledger[id] ?? emptyBucket();
  return {
    ...ledger,
    [id]: { calls: cur.calls + Math.max(0, calls), units: cur.units + Math.max(0, units) },
  };
}

/** Drop buckets older than KEEP_DAYS Pacific days (pure). */
export function pruneLedger(ledger: UsageLedger, nowMs: number): UsageLedger {
  const cutoff = pacificDayKey(nowMs - KEEP_DAYS * 24 * 60 * 60 * 1000);
  const out: UsageLedger = {};
  for (const [id, bucket] of Object.entries(ledger)) {
    const day = id.slice(id.lastIndexOf('_') + 1);
    if (day >= cutoff) out[id] = bucket;
  }
  return out;
}

/** Today's (Pacific) bucket for an API from any ledger. */
export function todayBucket(ledger: UsageLedger, apiId: string, nowMs: number): UsageBucket {
  return ledger[bucketIdFor(apiId, nowMs)] ?? emptyBucket();
}

/* ------------------------------------------------------- device storage */

function loadLocal(): UsageLedger {
  if (memLedger) return memLedger;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    memLedger = raw ? (JSON.parse(raw) as UsageLedger) : {};
    if (!memLedger || typeof memLedger !== 'object') memLedger = {};
  } catch {
    memLedger = {};
  }
  return memLedger;
}

function persistLocal(): void {
  try {
    if (typeof localStorage !== 'undefined' && memLedger) {
      localStorage.setItem(LS_KEY, JSON.stringify(memLedger));
    }
  } catch {
    /* storage full/unavailable — in-memory counts still work */
  }
}

/** This device's ledger (synchronous, never throws). */
export function deviceUsage(): UsageLedger {
  return loadLocal();
}

/* -------------------------------------------------------------- recording */

/**
 * Count real API usage. Fire-and-forget; NEVER throws, NEVER blocks the
 * caller. `units` is the provider-quota cost (YouTube search.list = 100);
 * for request-metered APIs pass units = calls.
 */
export function recordApiUse(apiId: string, calls: number, units: number): void {
  try {
    const now = Date.now();
    memLedger = pruneLedger(applyUse(loadLocal(), apiId, calls, units, now), now);
    persistLocal();
    const id = bucketIdFor(apiId, now);
    const prev = dirty.get(id) ?? emptyBucket();
    dirty.set(id, { calls: prev.calls + Math.max(0, calls), units: prev.units + Math.max(0, units) });
    scheduleFlush();
  } catch {
    /* the ledger must never break the feature it counts */
  }
}

function scheduleFlush(): void {
  if (flushTimer || flushDenied) return;
  try {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushDirty();
    }, 5000);
    // In non-browser hosts (tests) don't hold the process open.
    (flushTimer as unknown as { unref?: () => void }).unref?.();
  } catch {
    /* ignore */
  }
}

/**
 * Batched global flush. Expected to be DENIED until the owner approves the
 * apiUsageDaily rules block — denial is silent and stops further attempts
 * for this session (no console spam, no retry storms).
 */
async function flushDirty(): Promise<void> {
  if (flushDenied || dirty.size === 0) return;
  const batch = dirty;
  dirty = new Map();
  try {
    const { doc, setDoc, serverTimestamp, increment } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    for (const [id, delta] of batch.entries()) {
      const apiId = id.slice(0, id.lastIndexOf('_'));
      const day = id.slice(id.lastIndexOf('_') + 1);
      await setDoc(
        doc(db, 'apiUsageDaily', id),
        {
          api: apiId,
          day,
          calls: increment(delta.calls),
          units: increment(delta.units),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch {
    flushDenied = true; // rules deny today — stay silent until next session
  }
}

/**
 * Global (all-devices) buckets for the APIs the desk meters, for the
 * current Pacific day. Returns null when unreadable (the normal state
 * until the apiUsageDaily rules block lands) — the desk then labels its
 * numbers "this device".
 */
export async function globalUsageToday(
  apiIds: string[],
  nowMs: number,
): Promise<UsageLedger | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    const out: UsageLedger = {};
    let any = false;
    for (const apiId of apiIds) {
      const id = bucketIdFor(apiId, nowMs);
      const snap = await getDoc(doc(db, 'apiUsageDaily', id));
      if (snap.exists()) {
        const d = snap.data() as { calls?: unknown; units?: unknown };
        out[id] = {
          calls: typeof d.calls === 'number' ? d.calls : 0,
          units: typeof d.units === 'number' ? d.units : 0,
        };
        any = true;
      }
    }
    return any ? out : null;
  } catch {
    return null;
  }
}
