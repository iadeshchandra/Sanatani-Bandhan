/**
 * ai/threadFreshness.ts — honest age labels for the saved Ask thread.
 * =====================================================================
 * UIUX Batch 2 (D-04): the AssistantSheet reloads the devotee's saved
 * thread on every open, and until now presented it with no sense of
 * time — a day-old money figure read as the current answer. The thread
 * itself is NOT wiped or hidden (history stays one tap away, as
 * designed); it is LABELLED. Every message already carries `createdAt`
 * (assistantHistory.ts), so the fix is purely derivational:
 *
 *   threadDayDividers(messages, now) → one divider per past-day group,
 *   placed before that group's first message. The first divider is the
 *   "Earlier conversation" one; today's messages never get a divider.
 *
 * Messages whose createdAt is missing/not a finite positive number
 * (possible in threads saved by very old builds) are treated as
 * unknown-age: they never earn a divider and never reset the day
 * tracking — the UI must not claim an age it cannot prove.
 */

import type { ChatMessage } from './assistantHistory';

export interface ThreadDayDivider {
  /** Id of the message the divider renders before. */
  beforeId: string;
  /** Local start-of-day timestamp of that message's day. */
  dayStart: number;
  /** True for the first (oldest) divider in the thread. */
  first: boolean;
}

/** Local start-of-day (00:00) for a millisecond timestamp. */
export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function threadDayDividers(
  messages: Pick<ChatMessage, 'id' | 'createdAt'>[],
  now: number
): ThreadDayDivider[] {
  const todayStart = startOfLocalDay(now);
  const out: ThreadDayDivider[] = [];
  let lastDay: number | null = null;
  for (const m of messages) {
    if (!Number.isFinite(m.createdAt) || m.createdAt <= 0) continue;
    const day = startOfLocalDay(m.createdAt);
    if (day === lastDay) continue;
    lastDay = day;
    if (day < todayStart) {
      out.push({ beforeId: m.id, dayStart: day, first: out.length === 0 });
    }
  }
  return out;
}
