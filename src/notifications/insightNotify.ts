/**
 * notifications/insightNotify.ts — Suchana → NotificationCenter bridge.
 * =======================================================================
 * App Intelligence (src/lib/appIntelligence.ts) is pure logic — it never
 * touches Firestore. This module is its voice: it turns generated Insights
 * into notification emits.
 *
 *   digest    → GENTLE batch (morning Suchana card, "in your own time")
 *   "needs care" (urgent / attention) → IMPORTANT
 *
 * Once-per-day discipline: every insight carries a date-scoped dedupeKey
 * (`insight:<dedupeKey>:<YYYY-MM-DD>`), and a localStorage ledger records
 * which keys were already emitted today. Opening the digest ten times
 * notifies once. The ledger is per-uid and fail-open (a corrupted ledger
 * simply re-allows — never blocks).
 *
 * Callers pass ALREADY-GENERATED insights (generateAllInsights output) —
 * this module never builds snapshots itself.
 */
import type { Insight } from '../lib/appIntelligence';
import type { NotifyEvent } from './types';
import { emitNotify } from './emit';
import { copyFor, renderCopy } from './warmCopy';

const LEDGER_KEY = (uid: string) => `sb.notify.insights.v1:${uid}`;

function todayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function readLedger(uid: string): { date: string; keys: string[] } {
  try {
    const raw = localStorage.getItem(LEDGER_KEY(uid));
    if (!raw) return { date: '', keys: [] };
    const p = JSON.parse(raw) as { date?: string; keys?: string[] };
    if (p.date !== todayKey()) return { date: todayKey(), keys: [] };
    return { date: p.date ?? todayKey(), keys: Array.isArray(p.keys) ? p.keys : [] };
  } catch {
    return { date: todayKey(), keys: [] };
  }
}

function markNotified(uid: string, keys: string[]): void {
  try {
    const cur = readLedger(uid);
    const next = Array.from(new Set([...cur.keys, ...keys])).slice(-200);
    localStorage.setItem(LEDGER_KEY(uid), JSON.stringify({ date: todayKey(), keys: next }));
  } catch {
    /* fail-open */
  }
}

function isNeedsCare(i: Insight): boolean {
  return i.severity === 'urgent' || i.severity === 'attention';
}

function insightEvent(i: Insight, day: string): NotifyEvent {
  return {
    kind: 'suchana',
    priority: isNeedsCare(i) ? 'important' : 'gentle',
    title: { en: i.title.en, bn: i.title.bn, hi: i.title.hi },
    body: { en: i.message.en, bn: i.message.bn, hi: i.message.hi },
    dedupeKey: `insight:${i.dedupeKey}:${day}`,
    deepLink: i.actionRoute || '/suchana',
    payload: { insightId: i.id, module: i.module, severity: i.severity },
  };
}

/**
 * Emit one batch of insights for a user. Returns how many were emitted
 * (after the once-per-day guard). Fire-and-forget safe.
 */
export async function notifyInsights(recipientUid: string, insights: Insight[]): Promise<number> {
  if (!recipientUid || recipientUid === 'anon' || !Array.isArray(insights) || insights.length === 0) {
    return 0;
  }
  const day = todayKey();
  const ledger = readLedger(recipientUid);
  const fresh = insights.filter((i) => {
    const k = `insight:${i.dedupeKey}:${day}`;
    return i.dedupeKey && !ledger.keys.includes(k);
  });
  if (fresh.length === 0) return 0;

  let emitted = 0;
  const marked: string[] = [];
  for (const i of fresh) {
    const key = `insight:${i.dedupeKey}:${day}`;
    try {
      const r = await emitNotify(recipientUid, insightEvent(i, day));
      if (r.status !== 'dropped') {
        emitted += 1;
        marked.push(key);
      }
    } catch {
      /* one bad insight never blocks the rest */
    }
  }
  if (marked.length > 0) markNotified(recipientUid, marked);
  return emitted;
}

/**
 * The morning digest card → GENTLE batch. `count` = items in the digest.
 * Emitted at most once per day per user.
 */
export async function notifyDigest(recipientUid: string, count: number): Promise<boolean> {
  if (!recipientUid || recipientUid === 'anon' || count <= 0) return false;
  const day = todayKey();
  const key = `digest:morning:${day}`;
  if (readLedger(recipientUid).keys.includes(key)) return false;

  const entry = copyFor('suchana', 'morningDigest');
  const title = { en: '', bn: '', hi: '' } as { en: string; bn: string; hi: string };
  const body = { en: '', bn: '', hi: '' } as { en: string; bn: string; hi: string };
  (['en', 'bn', 'hi'] as const).forEach((l) => {
    const r = renderCopy(entry, { count }, l);
    title[l] = r.title;
    body[l] = r.body;
  });
  try {
    const r = await emitNotify(recipientUid, {
      kind: 'suchana',
      priority: 'gentle',
      title,
      body,
      dedupeKey: key,
      deepLink: '/app/suchana',
      payload: { count, window: 'morning' },
    });
    if (r.status === 'dropped') return false;
    markNotified(recipientUid, [key]);
    return true;
  } catch {
    return false;
  }
}
