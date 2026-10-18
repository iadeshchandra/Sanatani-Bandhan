/**
 * notifications/tithiNudges.ts — tithi-timed devotional giving reminders.
 * ======================================================================
 * Phase 3 devotional giving layer (Tithe.ly teardown §4: nobody has built
 * giving as a devotional act — Panjika-timed reminders are our moat).
 *
 * Collects Ekadashi / Purnima / Amavasya approaching within the reminder
 * window from the same location-correct Panjika engines the Panjika tab
 * uses, runs them through the nudge engine (gentle tier, quiet-hours
 * safe, dismissible, dedupe-keyed — suggestions only, never nagging),
 * and publishes fired nudges into the NotificationCenter via emitNotify
 * (kind 'suchana' → the calm Suchana digest, never a ping).
 *
 * Self-listen watcher: startTithiNudgeNotify(uid) runs once on boot and
 * on foreground return, but publishes at most once per day — a devotee
 * must never feel chased by their own dharma.
 */

import { generateNudges, NudgeStore, UPCOMING_TITHI_WITHIN_DAYS, type Nudge, type UpcomingTithiSignal } from './nudgeEngine';
import type { NotifyEvent } from './types';
import { findEkadashis } from '../lib/vrataSchedule';
import { drikTithiAt } from '../lib/drikPanchang';
import { getCachedRegion } from '../lib/geoDetect';

/* NOTE: emitNotify is imported LAZILY inside publishTithiNudges — the
 * collector above stays pure and side-effect-free at module load (the
 * emit chain pulls in firebase, which has no business loading for pure
 * Panjika math or for tests of the collector). */

export const TITHI_NUDGE_WINDOW_DAYS = UPCOMING_TITHI_WITHIN_DAYS;
const LAST_RUN_KEY = 'sb.notifications.tithiNudge.lastRun.v1';
const CITY_STORAGE = 'sb_panjika_city';

/** Location for tithi math: the devotee's Panjika city when chosen,
 * else the geo-detected region default — mirrors PanjikaTab's defaulting. */
function locForUser(): { lat: number; lon: number; tz: number } {
  const DHAKA = { lat: 23.8103, lon: 90.4125, tz: 6 };
  const KOLKATA = { lat: 22.5726, lon: 88.3639, tz: 5.5 };
  try {
    const cityId = localStorage.getItem(CITY_STORAGE);
    if (cityId === 'dhaka') return DHAKA;
    if (cityId === 'kolkata') return KOLKATA;
  } catch {
    /* storage unavailable — fall through to region default */
  }
  let region: string | null = null;
  try {
    region = getCachedRegion();
  } catch {
    /* geo cache unavailable */
  }
  return region === 'BD' ? DHAKA : KOLKATA;
}

/** Civil-day ISO (YYYY-MM-DD) in the target timezone. */
function isoInTz(d: Date, tz: number): string {
  const s = new Date(d.getTime() + tz * 3600000);
  return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, '0')}-${String(s.getUTCDate()).padStart(2, '0')}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

/**
 * Collect upcoming Ekadashi / Purnima / Amavasya signals within the
 * reminder window. Pure + testable; never throws (Panjika math failing
 * must never break notifications — callers get an empty list instead).
 */
export function collectUpcomingTithiSignals(now: Date = new Date()): UpcomingTithiSignal[] {
  const loc = locForUser();
  const todayIso = isoInTz(now, loc.tz);
  const out: UpcomingTithiSignal[] = [];

  // 1. Ekadashi — the same sunrise-anchored engine the Panjika tab renders.
  try {
    const to = new Date(now.getTime() + TITHI_NUDGE_WINDOW_DAYS * 86400000);
    for (const e of findEkadashis(now, to, loc)) {
      const days = daysBetween(todayIso, e.smartaIso);
      if (days < 1 || days > TITHI_NUDGE_WINDOW_DAYS) continue;
      out.push({ id: `ekadashi-${e.smartaIso}`, tithi: 'Ekadashi', daysUntil: days, dateIso: e.smartaIso });
    }
  } catch {
    /* skip Ekadashi this run */
  }

  // 2. Purnima / Amavasya — Drik tithi at each coming day's local noon;
  //    the first-seen day of each observance wins (one signal each).
  try {
    const [ty, tm, td] = todayIso.split('-').map(Number);
    const seen = new Set<string>();
    for (let d = 1; d <= TITHI_NUDGE_WINDOW_DAYS; d++) {
      const localNoonMs = Date.UTC(ty, tm - 1, td) + d * 86400000 + 12 * 3600000 - loc.tz * 3600000;
      const tithi = drikTithiAt(new Date(localNoonMs));
      if (tithi.name !== 'Purnima' && tithi.name !== 'Amavasya') continue;
      if (seen.has(tithi.name)) continue;
      seen.add(tithi.name);
      const iso = isoInTz(new Date(localNoonMs), loc.tz);
      const days = daysBetween(todayIso, iso);
      if (days < 1 || days > TITHI_NUDGE_WINDOW_DAYS) continue;
      out.push({ id: `${tithi.name.toLowerCase()}-${iso}`, tithi: tithi.name as 'Purnima' | 'Amavasya', daysUntil: days, dateIso: iso });
    }
  } catch {
    /* skip Purnima/Amavasya this run */
  }

  return out;
}

/** Bridge: a fired Nudge becomes a NotificationCenter event. */
function nudgeToEvent(n: Nudge): NotifyEvent {
  return {
    kind: 'suchana',
    priority: 'gentle',
    title: n.title,
    body: n.body,
    dedupeKey: n.id,
    deepLink: n.action.deepLink,
  };
}

/**
 * Collect tithi signals, run the nudge engine, and publish every fired
 * nudge into the NotificationCenter. Fire-and-forget — a notification
 * failure must never break the product flow.
 *
 * @returns how many nudges were actually emitted this run.
 */
export async function publishTithiNudges(
  uid: string | null | undefined,
  opts: { now?: Date; store?: NudgeStore } = {},
): Promise<number> {
  if (!uid || uid === 'anon') return 0;
  const now = opts.now ?? new Date();
  const store = opts.store ?? new NudgeStore();
  const nudges = generateNudges(
    {
      moneyRequests: [],
      digestUnopenedHours: null,
      digestPendingCount: 0,
      unreadAnnouncements: [],
      upcomingTithis: collectUpcomingTithiSignals(now),
    },
    { now, store },
  );
  // Lazy: the emit chain pulls in firebase — only needed when we actually
  // publish, never for pure signal collection.
  const { emitNotify } = await import('./emit');
  let sent = 0;
  for (const n of nudges) {
    try {
      const r = await emitNotify(uid, nudgeToEvent(n));
      if (r.status !== 'dropped') sent++;
    } catch {
      /* one failed emit must not stop the others */
    }
  }
  return sent;
}

/**
 * Self-listen watcher (same pattern as chat/P2P/wallet): runs once on
 * boot and whenever the app returns to the foreground, but publishes at
 * most once per calendar day. The nudge engine's ledger guarantees an
 * observance is never suggested twice even across reinstalls of the run.
 */
export function startTithiNudgeNotify(uid: string | null): () => void {
  if (!uid || uid === 'anon') return () => undefined;

  const run = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(LAST_RUN_KEY) === today) return; // once a day — never nagging
      localStorage.setItem(LAST_RUN_KEY, today);
      void publishTithiNudges(uid);
    } catch {
      /* storage unavailable — the watcher simply stays quiet */
    }
  };

  run();
  const onForeground = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    run();
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  return () => {
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
  };
}
