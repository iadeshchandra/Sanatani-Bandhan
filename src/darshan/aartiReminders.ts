/**
 * darshan/aartiReminders.ts — "🔔 Remind me" for scheduled aartis.
 * ============================================================================
 * Design laws (owner-directed):
 *  - GENTLE, never nagging: ONE reminder per aarti occurrence, lead 15 min,
 *    emitted through NotificationCenter (quiet hours 05:00–07:00 are held
 *    by the center's priority engine — no manual quiet-hours math here).
 *  - Local-first: subscriptions live on the devotee's device only
 *    (localStorage). No new Firestore collection, no server state.
 *  - Honest PWA limit: a PWA has no reliable background timer, so reminders
 *    fire while the app is open/foregrounded within the lead window
 *    (same self-listen pattern as tithiNudges). The dedupe ledger makes
 *    sure an occurrence is never announced twice.
 */
import { dt, fill, type Lang } from './i18n';
import { dueWithin, localDateKey, type AartiSlot } from './aartiSchedule';

/* NOTE: NotificationCenter is imported LAZILY inside checkAartiReminders —
 * the module stays jest-safe at import time (the emit chain pulls in
 * firebase, which breaks jest ESM). Pure helpers and storage stay testable. */

/** Minutes before the aarti when the gentle bell rings. */
export const AARTI_LEAD_MIN = 15;

const SUBS_KEY = 'sb.aartiReminders.v1';
const FIRED_KEY = 'sb.aartiReminders.fired.v1';

/** A devotee's reminder subscription — a snapshot of the published slot. */
export interface AartiSubscription extends AartiSlot {
  orgId: string;
  orgName: string;
}

/** Stable identity of one subscription. */
export function subKey(sub: Pick<AartiSubscription, 'orgId' | 'name' | 'time'>): string {
  return `${sub.orgId}::${sub.name}::${sub.time}`;
}

/* ------------------------------------------------------------------ */
/* Storage (fail-open: storage problems never break the app)           */
/* ------------------------------------------------------------------ */

export function listSubscriptions(): AartiSubscription[] {
  try {
    const raw = localStorage.getItem(SUBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is AartiSubscription =>
        !!s && typeof s.orgId === 'string' && typeof s.name === 'string' && typeof s.time === 'string',
    );
  } catch {
    return [];
  }
}

function saveSubscriptions(subs: AartiSubscription[]): void {
  try {
    localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
  } catch {
    /* storage unavailable — subscriptions simply don't persist */
  }
}

export function isSubscribed(sub: Pick<AartiSubscription, 'orgId' | 'name' | 'time'>): boolean {
  const k = subKey(sub);
  return listSubscriptions().some((s) => subKey(s) === k);
}

/** Toggle a subscription. Returns the new subscribed state. */
export function toggleSubscription(sub: AartiSubscription): boolean {
  const k = subKey(sub);
  const subs = listSubscriptions();
  const idx = subs.findIndex((s) => subKey(s) === k);
  if (idx >= 0) {
    subs.splice(idx, 1);
    saveSubscriptions(subs);
    return false;
  }
  subs.push(sub);
  saveSubscriptions(subs);
  return true;
}

export function removeSubscription(key: string): void {
  saveSubscriptions(listSubscriptions().filter((s) => subKey(s) !== key));
}

/* ------------------------------------------------------------------ */
/* Fired ledger — one bell per aarti occurrence                        */
/* ------------------------------------------------------------------ */

function loadFired(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveFired(fired: Record<string, number>): void {
  try {
    // Prune anything older than 8 days so the ledger never grows.
    const cutoff = Date.now() - 8 * 86400000;
    const pruned: Record<string, number> = {};
    for (const [k, v] of Object.entries(fired)) if (v > cutoff) pruned[k] = v;
    localStorage.setItem(FIRED_KEY, JSON.stringify(pruned));
  } catch {
    /* quiet */
  }
}

/** Dedupe key for one occurrence: org + aarti + local date + start time. */
export function occurrenceKey(sub: AartiSubscription, at: Date): string {
  return `${sub.orgId}:${sub.name}:${localDateKey(at)}:${sub.time}`;
}

/* ------------------------------------------------------------------ */
/* Checker — emits gentle bells for aartis starting within the lead    */
/* ------------------------------------------------------------------ */

/**
 * Fire reminders for subscribed aartis whose next occurrence starts within
 * AARTI_LEAD_MIN minutes. Returns how many bells were emitted.
 * Fire-and-forget safe: never throws.
 */
export async function checkAartiReminders(
  opts: { now?: Date; lang?: Lang } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const lang = opts.lang ?? 'en';
  const subs = listSubscriptions();
  if (subs.length === 0) return 0;
  const fired = loadFired();
  // Lazy: the emit chain pulls in firebase — only needed when we publish.
  const { NotificationCenter } = await import('../notifications/NotificationCenter');
  let sent = 0;
  for (const sub of subs) {
    try {
      const due = dueWithin([sub], AARTI_LEAD_MIN, now);
      if (due.length === 0) continue;
      const { at, startsInMin } = due[0];
      const key = occurrenceKey(sub, at);
      if (fired[key]) continue; // one bell per occurrence — never nagging
      fired[key] = Date.now();
      await NotificationCenter.get().emit({
        kind: 'aarti_reminder',
        priority: 'gentle',
        title: {
          en: fill(dt('darshan.aartiReminderTitle', 'en'), { aarti: sub.name, temple: sub.orgName, mins: String(startsInMin) }),
          hi: fill(dt('darshan.aartiReminderTitle', 'hi'), { aarti: sub.name, temple: sub.orgName, mins: String(startsInMin) }),
          bn: fill(dt('darshan.aartiReminderTitle', 'bn'), { aarti: sub.name, temple: sub.orgName, mins: String(startsInMin) }),
        },
        body: {
          en: dt('darshan.aartiReminderBody', 'en'),
          hi: dt('darshan.aartiReminderBody', 'hi'),
          bn: dt('darshan.aartiReminderBody', 'bn'),
        },
        dedupeKey: `aarti_reminder:${key}`,
        deepLink: `/org/${sub.orgId}`,
        expiresAt: at.getTime() + 30 * 60000, // meaningless 30 min after start
      });
      sent++;
    } catch {
      /* one failed bell must not stop the others */
    }
  }
  if (sent > 0) saveFired(fired);
  return sent;
}

/* ------------------------------------------------------------------ */
/* Self-listen watcher — boot + foreground + gentle tick               */
/* ------------------------------------------------------------------ */

/**
 * Start the reminder watcher (mirrors startTithiNudgeNotify):
 * runs once on start, again whenever the app returns to the foreground,
 * and ticks every 60s while visible. Returns a stop function.
 */
export function startAartiReminderNotify(uid: string | null): () => void {
  if (!uid || uid === 'anon') return () => undefined;

  let stopped = false;
  const run = () => {
    if (stopped) return;
    void checkAartiReminders();
  };

  run();
  const onForeground = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    run();
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  const tick =
    typeof window !== 'undefined'
      ? window.setInterval(() => {
          if (typeof document === 'undefined' || document.visibilityState !== 'hidden') run();
        }, 60000)
      : null;

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
    if (tick !== null) window.clearInterval(tick);
  };
}
