/**
 * lib/dueJobsService.ts — the client-side "run due jobs" runner (QUEUED #15).
 * ===========================================================================
 * Spark has no server cron and the Cloud Functions scheduler is not
 * deployed, so due work is dispatched opportunistically from the client —
 * the same self-listen pattern as tithi nudges, aarti reminders and org
 * broadcasts (see NotificationWiring). Jobs wired here — ONLY ones that
 * genuinely exist and can be due:
 *
 *   1. samskara-age / shraddha / ceremony reminders — computed by the
 *      Samskara suite's own pure engines (samskaraStore) from DEVICE-LOCAL
 *      family data. Until now they surfaced only while the Samskara desk
 *      was open; the runner delivers them through NotificationCenter.
 *   2. reminder-queue drain — the server scheduler's delivery half
 *      (functions/SCHEDULED_JOBS.md: "deliver on read"). If the backend
 *      ever enqueues, this device delivers its own queued reminders.
 *      The server writes `ownerUid` while the client originally keyed
 *      `targetUid`; the rules (2026-10-20 package) accept EITHER field
 *      as the recipient, so the drain fetches both keys and merges.
 *      After a successful delivery the item is marked `sent`
 *      server-side (recipient-only, status-pinned rule) so another
 *      device doesn't re-deliver it; the local ledger remains the
 *      per-device guard and the mark-sent update fails open.
 *
 * Deliberately NOT jobs: subscription expiry (derived at read — nothing
 * to execute; the owner expire action is its own queue item), P2P request
 * expiry (enforced at action time in p2pService), dues suspension
 * (owner-triggered per provider in GodMode).
 *
 * Idempotency law: the localStorage ledger (dueJobs.ts) is written ONLY
 * after a successful emit, and runs are single-flight — running the
 * runner twice can never double-send.
 */
import {
  discoverSamskaraScopes,
  planDeliveries,
  pruneLedger,
  summariseRun,
  appendRunLog,
  shouldAutoRun,
  mergeQueuedReminders,
  SAMSKARA_KEY_PREFIX,
  MAX_DELIVERIES_PER_RUN,
  type DueJobsLedger,
  type DueJobsRunReport,
  type JobOutcome,
  type QueuedReminder,
} from './dueJobs';
import { samskaraReminders, shraddhaReminders, ceremonyReminders, type Reminder } from '../samskara/samskaraStore';
import type { SamskaraState } from '../samskara/types';

/* NOTE: NotificationCenter + firebase are imported LAZILY inside the run —
 * the emit chain pulls in firebase ESM, which must not load for the pure
 * decision module or at app boot before it is needed. */

const LEDGER_KEY = (uid: string) => `sb.dueJobs.ledger.${uid}`;
const LAST_RUN_KEY = 'sb.dueJobs.lastRun.v1';
const RUN_LOG_KEY = 'sb.dueJobs.runs.v1';

const EMPTY_STATE: SamskaraState = { families: [], members: [], records: [], ancestors: [], plans: [] };

/* ------------------------------------------------------------------ */
/* Storage (fail-open everywhere: storage problems never break the app) */
/* ------------------------------------------------------------------ */

function loadLedger(uid: string): DueJobsLedger {
  try {
    const raw = localStorage.getItem(LEDGER_KEY(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as DueJobsLedger) : {};
  } catch {
    return {};
  }
}

function saveLedger(uid: string, ledger: DueJobsLedger): void {
  try {
    localStorage.setItem(LEDGER_KEY(uid), JSON.stringify(pruneLedger(ledger, Date.now())));
  } catch {
    /* storage unavailable — idempotency degrades to NotificationCenter dedupeKeys */
  }
}

function loadLastRuns(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_RUN_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function markRan(uid: string, atMs: number): void {
  try {
    const all = loadLastRuns();
    all[uid] = atMs;
    localStorage.setItem(LAST_RUN_KEY, JSON.stringify(all));
  } catch {
    /* quiet */
  }
}

export function getDueJobsRunLog(): DueJobsRunReport[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RUN_LOG_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as DueJobsRunReport[]) : [];
  } catch {
    return [];
  }
}

function saveRunLog(report: DueJobsRunReport): void {
  try {
    localStorage.setItem(RUN_LOG_KEY, JSON.stringify(appendRunLog(getDueJobsRunLog(), report)));
  } catch {
    /* quiet */
  }
}

/** Parse one scope's local samskara state (mirrors samskaraStore.loadState). */
function loadScopeState(scope: string): SamskaraState {
  try {
    const raw = localStorage.getItem(`${SAMSKARA_KEY_PREFIX}${scope}`);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY_STATE;
    return {
      families: Array.isArray(parsed.families) ? parsed.families : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      ancestors: Array.isArray(parsed.ancestors) ? parsed.ancestors : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

/* ------------------------------------------------------------------ */
/* The runner                                                          */
/* ------------------------------------------------------------------ */

let inFlight: Promise<DueJobsRunReport | null> | null = null;

export interface RunDueJobsOptions {
  uid: string;
  trigger: 'boot' | 'foreground' | 'manual';
}

/**
 * Run every due job once. Auto triggers (boot/foreground) are throttled
 * to once per 3h per user and return null when throttled; manual runs
 * always execute. Never throws — failures land in the report.
 */
export function runDueJobs(opts: RunDueJobsOptions): Promise<DueJobsRunReport | null> {
  if (inFlight) return inFlight;
  inFlight = executeRun(opts).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function executeRun(opts: RunDueJobsOptions): Promise<DueJobsRunReport | null> {
  const { uid, trigger } = opts;
  const now = Date.now();
  if (trigger !== 'manual' && !shouldAutoRun(loadLastRuns()[uid], now)) return null;

  const outcomes: JobOutcome[] = [];
  const ledger = loadLedger(uid);
  const { NotificationCenter } = await import('../notifications/NotificationCenter');
  const center = NotificationCenter.get();

  /* ---- Jobs 1–3: samskara family reminders (device-local) -------- */
  try {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }
    } catch {
      /* storage enumeration unavailable — no local jobs this run */
    }
    const scopes = discoverSamskaraScopes(keys, uid);
    const byKind: Record<Reminder['kind'], Reminder[]> = { 'samskara-age': [], shraddha: [], ceremony: [] };
    let members = 0;
    let ancestors = 0;
    let plans = 0;
    for (const scope of scopes) {
      const state = loadScopeState(scope);
      members += state.members.length;
      ancestors += state.ancestors.length;
      plans += state.plans.length;
      byKind.shraddha.push(...shraddhaReminders(state));
      byKind.ceremony.push(...ceremonyReminders(state));
      byKind['samskara-age'].push(...samskaraReminders(state));
    }
    const scannedFor: Record<Reminder['kind'], number> = {
      shraddha: ancestors,
      ceremony: plans,
      'samskara-age': members,
    };
    let capLeft = MAX_DELIVERIES_PER_RUN;
    // Most time-sensitive first — same order as samskaraStore.allReminders.
    for (const kind of ['shraddha', 'ceremony', 'samskara-age'] as const) {
      const reminders = byKind[kind];
      const plan = planDeliveries(reminders, ledger, now, capLeft);
      capLeft -= plan.deliver.length;
      let delivered = 0;
      let failed = 0;
      for (const { reminder, key } of plan.deliver) {
        try {
          await center.emit({
            kind: 'suchana',
            priority: 'gentle',
            // Family data is the devotee's own words — carried in all
            // three langs, exactly like org broadcast bodies.
            title: { en: reminder.title, bn: reminder.title, hi: reminder.title },
            body: { en: reminder.detail, bn: reminder.detail, hi: reminder.detail },
            dedupeKey: `duejobs:${key}`,
            deepLink: '/app/home/samskara',
            expiresAt: now + 7 * 86400000,
          });
          ledger[key] = Date.now();
          delivered++;
        } catch {
          failed++; // unmarked — a later run retries honestly
        }
      }
      outcomes.push({
        job: kind,
        scanned: scannedFor[kind],
        due: reminders.length,
        delivered,
        skipped: plan.skipped.length,
        failed,
        ...(scopes.length === 0 ? { note: 'No samskara family data on this device.' } : {}),
      });
    }
  } catch {
    outcomes.push({ job: 'samskara-age', scanned: 0, due: 0, delivered: 0, skipped: 0, failed: 1, note: 'Local reminder scan failed on this device.' });
  }

  /* ---- Job 4: reminder-queue drain (server scheduler delivery) ---- */
  try {
    const { collection, query, where, limit, getDocs, doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const queueCol = collection(db, 'reminderQueue');
    // The rules accept EITHER recipient key (the server writes ownerUid;
    // the client originally keyed targetUid). Two bounded queries —
    // 25 per key — merged + deduped by doc id, so an item carrying
    // both keys still drains exactly once.
    const fetchKeyed = async (field: 'targetUid' | 'ownerUid'): Promise<QueuedReminder[]> => {
      const snap = await getDocs(
        query(queueCol, where(field, '==', uid), where('status', '==', 'queued'), limit(25)),
      );
      return snap.docs.map((docSnap) => {
        const data = (docSnap.data() ?? {}) as { kind?: string; message?: string };
        return { id: docSnap.id, kind: data.kind, message: data.message };
      });
    };
    const items = mergeQueuedReminders([await fetchKeyed('targetUid'), await fetchKeyed('ownerUid')]);
    let delivered = 0;
    let skipped = 0;
    let failed = 0;
    for (const item of items) {
      const key = `queue:${item.id}`;
      if (ledger[key]) {
        skipped++;
        continue;
      }
      const title =
        item.kind === 'shraddha'
          ? { en: '🙏 Shraddha smaran', bn: '🙏 শ্রাদ্ধ স্মরণ', hi: '🙏 श्राद्ध स्मरण' }
          : { en: '🪔 Samskara reminder', bn: '🪔 সংস্কার স্মরণিকা', hi: '🪔 संस्कार स्मरण' };
      const message = typeof item.message === 'string' && item.message ? item.message : title.en;
      try {
        await center.emit({
          kind: 'suchana',
          priority: 'gentle',
          title,
          body: { en: message, bn: message, hi: message },
          dedupeKey: `reminderQueue:${item.id}`,
          deepLink: '/app/home/samskara',
          expiresAt: now + 7 * 86400000,
        });
        ledger[key] = Date.now();
        delivered++;
        // Mark sent server-side (recipient-only, status-pinned rule) so
        // the item doesn't re-deliver on a new device. Fail-open: if the
        // update is denied or the device is offline, the local ledger
        // above still prevents repeats on this device.
        try {
          await updateDoc(doc(db, 'reminderQueue', item.id), { status: 'sent' });
        } catch {
          /* fail-open — ledger remains the guard on this device */
        }
      } catch {
        failed++;
      }
    }
    outcomes.push({
      job: 'reminder-queue',
      scanned: items.length,
      due: items.length,
      delivered,
      skipped,
      failed,
      note: 'Delivered items are marked sent server-side; the local ledger guards this device if that update is unavailable.',
    });
  } catch {
    outcomes.push({ job: 'reminder-queue', scanned: 0, due: 0, delivered: 0, skipped: 0, failed: 1, note: 'Queue check failed (offline or rules).' });
  }

  saveLedger(uid, ledger);
  const report = summariseRun(uid, trigger, outcomes, now);
  markRan(uid, now);
  saveRunLog(report);
  return report;
}

/* ------------------------------------------------------------------ */
/* Self-listen watcher — boot + foreground (throttled inside the run)  */
/* ------------------------------------------------------------------ */

/**
 * Start the due-jobs watcher (mirrors startTithiNudgeNotify): runs once
 * on start and again on foreground return; the 3h throttle + ledger make
 * repeats harmless. No interval tick — due windows here are day-granular.
 * Returns a stop function.
 */
export function startDueJobsNotify(uid: string | null): () => void {
  if (!uid || uid === 'anon') return () => undefined;
  let stopped = false;
  const run = (trigger: 'boot' | 'foreground') => {
    if (stopped) return;
    void runDueJobs({ uid, trigger }).catch(() => undefined);
  };
  run('boot');
  const onForeground = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    run('foreground');
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
  };
}
