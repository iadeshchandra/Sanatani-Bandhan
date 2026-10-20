/**
 * lib/dueJobs.ts — pure decision logic for the client-side "run due jobs"
 * runner (QUEUED #15). No imports from firebase or React — jest-safe.
 * ===========================================================================
 * Why this exists: on Spark there is no server cron, and the Cloud
 * Functions scheduler (functions/src/routes/scheduledRoutes.ts) is not
 * deployed. Worse, those endpoints scan cloud collections
 * (`samskaraFamilies`, `pitraRecords`) the client never writes — samskara
 * family data is DEVICE-LOCAL by the sacred-data law. So the only place
 * genuinely-due reminder work can be computed today is on the device,
 * from the local samskara store, through the same self-listen pattern as
 * tithi nudges / aarti reminders / org broadcasts:
 *
 *   compute locally → emit via NotificationCenter → dedupe by ledger.
 *
 * This module owns ONLY the decisions: which storage scopes belong to the
 * signed-in user, what the idempotency key of one reminder occurrence is,
 * whether the ledger says deliver / skip, and how a run is summarised.
 * The service (dueJobsService.ts) owns the side effects.
 */
import type { Reminder } from '../samskara/samskaraStore';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** localStorage prefix of every samskara store scope (`sb_samskara_<scope>`). */
export const SAMSKARA_KEY_PREFIX = 'sb_samskara_';

/** Solo scopes are `sb_samskara_solo_<uid>` (see SamskaraDesk). */
const SOLO_SCOPE_PREFIX = 'solo_';

/** Gentle cap: never emit more than this many bells in one run. */
export const MAX_DELIVERIES_PER_RUN = 5;

/** Samskara-age nudges re-emit at most once per this window while due. */
export const SAMSKARA_AGE_REEMIT_MS = 90 * 86400000;

/** Opportunistic (boot/foreground) runs are throttled to once per 3h. */
export const AUTO_RUN_THROTTLE_MS = 3 * 3600000;

/** Ledger entries older than this are pruned (shraddha cycle is annual). */
export const LEDGER_PRUNE_MS = 400 * 86400000;

/** Run log keeps at most this many entries. */
export const RUN_LOG_CAP = 10;

/* ------------------------------------------------------------------ */
/* Scope discovery                                                     */
/* ------------------------------------------------------------------ */

/**
 * From raw localStorage keys, pick the samskara scopes whose reminders
 * belong to `uid`:
 *  - the user's own solo scope (`solo_<uid>`) — included;
 *  - another user's solo scope (`solo_<otherUid>`) — EXCLUDED (shared
 *    devices must not cross-notify family data);
 *  - workspace scopes (org desks) — included: desk data on this device
 *    is shared-by-design, exactly as the desk itself renders it.
 */
export function discoverSamskaraScopes(keys: string[], uid: string): string[] {
  const out: string[] = [];
  for (const key of keys) {
    if (!key.startsWith(SAMSKARA_KEY_PREFIX)) continue;
    const scope = key.slice(SAMSKARA_KEY_PREFIX.length);
    if (!scope) continue;
    if (scope.startsWith(SOLO_SCOPE_PREFIX) && scope !== `${SOLO_SCOPE_PREFIX}${uid}`) continue;
    out.push(scope);
  }
  return out.sort();
}

/* ------------------------------------------------------------------ */
/* Occurrence keys — the idempotency heart                             */
/* ------------------------------------------------------------------ */

/**
 * Stable identity of ONE deliverable occurrence of a reminder.
 *  - shraddha: per annual occurrence (key carries the next date);
 *  - ceremony: per plan date, in two gentleness buckets — one early
 *    heads-up (>14 days out) and one near reminder (≤14 days);
 *  - samskara-age: per member+samskara (re-emit window handled by the
 *    ledger decision, not the key).
 */
export function occurrenceKey(reminder: Reminder): string {
  switch (reminder.kind) {
    case 'shraddha':
      return `shraddha:${reminder.id}:${reminder.date ?? 'nodate'}`;
    case 'ceremony': {
      const bucket = (reminder.inDays ?? 999) <= 14 ? 'near' : 'far';
      return `ceremony:${reminder.id}:${reminder.date ?? 'nodate'}:${bucket}`;
    }
    case 'samskara-age':
    default:
      return `samskara-age:${reminder.id}`;
  }
}

/* ------------------------------------------------------------------ */
/* Delivery planning                                                   */
/* ------------------------------------------------------------------ */

/** key → epoch ms last delivered. */
export type DueJobsLedger = Record<string, number>;

export interface PlannedDelivery {
  reminder: Reminder;
  key: string;
}

export interface DeliveryPlan {
  deliver: PlannedDelivery[];
  /** Due but held back this run, with the honest reason. */
  skipped: Array<{ reminder: Reminder; key: string; reason: 'already-delivered' | 'reminded-recently' | 'run-cap' }>;
}

/**
 * Decide, purely, what one run should deliver. The ledger is the ONLY
 * idempotency source: a key present in the ledger means "this occurrence
 * was already announced" — running the runner twice can never
 * double-send. Samskara-age reminders are the one exception: their
 * window spans up to 2 years, so they may re-deliver after
 * SAMSKARA_AGE_REEMIT_MS (a gentle quarterly nudge, never a nag).
 */
export function planDeliveries(
  reminders: Reminder[],
  ledger: DueJobsLedger,
  nowMs: number,
  cap: number = MAX_DELIVERIES_PER_RUN,
): DeliveryPlan {
  const deliver: PlannedDelivery[] = [];
  const skipped: DeliveryPlan['skipped'] = [];
  const seenThisRun = new Set<string>();
  for (const reminder of reminders) {
    const key = occurrenceKey(reminder);
    if (seenThisRun.has(key)) {
      skipped.push({ reminder, key, reason: 'already-delivered' });
      continue;
    }
    seenThisRun.add(key);
    const last = ledger[key];
    if (typeof last === 'number') {
      if (reminder.kind === 'samskara-age' && nowMs - last >= SAMSKARA_AGE_REEMIT_MS) {
        // fall through — due again after the gentle window
      } else if (reminder.kind === 'samskara-age') {
        skipped.push({ reminder, key, reason: 'reminded-recently' });
        continue;
      } else {
        skipped.push({ reminder, key, reason: 'already-delivered' });
        continue;
      }
    }
    if (deliver.length >= cap) {
      skipped.push({ reminder, key, reason: 'run-cap' });
      continue;
    }
    deliver.push({ reminder, key });
  }
  return { deliver, skipped };
}

/* ------------------------------------------------------------------ */
/* Reminder-queue drain — merging the two recipient keys (pure)        */
/* ------------------------------------------------------------------ */

/**
 * One queued reminder as the drain consumes it. The server scheduler
 * writes `ownerUid`; the client originally keyed `targetUid`. The
 * rules (2026-10-20 package) accept EITHER field as the recipient, so
 * the drain fetches both keys and merges the results here.
 */
export interface QueuedReminder {
  id: string;
  kind?: string;
  message?: string;
}

/**
 * Merge the per-key result lists into one drain list: stable order
 * (earlier lists first), deduped by doc id — an item carrying BOTH
 * recipient keys drains exactly once. Entries without a usable id are
 * dropped rather than delivered anonymously.
 */
export function mergeQueuedReminders(lists: QueuedReminder[][]): QueuedReminder[] {
  const seen = new Set<string>();
  const out: QueuedReminder[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (!item || typeof item.id !== 'string' || item.id.length === 0) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ledger + run-log maintenance (pure transforms)                      */
/* ------------------------------------------------------------------ */

/** Drop entries older than LEDGER_PRUNE_MS; hard-cap the ledger size. */
export function pruneLedger(ledger: DueJobsLedger, nowMs: number): DueJobsLedger {
  const cutoff = nowMs - LEDGER_PRUNE_MS;
  const kept = Object.entries(ledger).filter(([, v]) => typeof v === 'number' && v > cutoff);
  kept.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(kept.slice(0, 500));
}

export type DueJobId = 'samskara-age' | 'shraddha' | 'ceremony' | 'reminder-queue';

export interface JobOutcome {
  job: DueJobId;
  /** Records examined while looking for due work. */
  scanned: number;
  /** Items whose time had come. */
  due: number;
  delivered: number;
  skipped: number;
  failed: number;
  note?: string;
}

export interface DueJobsRunReport {
  at: number;
  trigger: 'boot' | 'foreground' | 'manual';
  uid: string;
  outcomes: JobOutcome[];
}

export function summariseRun(
  uid: string,
  trigger: DueJobsRunReport['trigger'],
  outcomes: JobOutcome[],
  nowMs: number,
): DueJobsRunReport {
  return { at: nowMs, trigger, uid, outcomes };
}

/** Newest-first, capped. */
export function appendRunLog(log: DueJobsRunReport[], report: DueJobsRunReport): DueJobsRunReport[] {
  return [report, ...log].slice(0, RUN_LOG_CAP);
}

/** Should an opportunistic (non-manual) run fire now? */
export function shouldAutoRun(lastRunMs: number | undefined, nowMs: number): boolean {
  if (typeof lastRunMs !== 'number' || !Number.isFinite(lastRunMs)) return true;
  return nowMs - lastRunMs >= AUTO_RUN_THROTTLE_MS;
}

/** Totals across one report — for compact GodMode rendering. */
export function runTotals(report: DueJobsRunReport): { scanned: number; due: number; delivered: number; skipped: number; failed: number } {
  const t = { scanned: 0, due: 0, delivered: 0, skipped: 0, failed: 0 };
  for (const o of report.outcomes) {
    t.scanned += o.scanned;
    t.due += o.due;
    t.delivered += o.delivered;
    t.skipped += o.skipped;
    t.failed += o.failed;
  }
  return t;
}
