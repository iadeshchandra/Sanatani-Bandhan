/**
 * lib/suggestionNotify.ts — Your Voice loop-closure picker (pure).
 * ============================================================================
 * Margdarshan J3. When the Triage Desk moves a suggestion — Received
 * → Under Review → Planned → Shipped, or answers it with an official
 * reply — the author should hear about it. Cross-user inbox writes
 * are impossible under the self-write-only notifications rules, so
 * the house pattern applies (orderNotify #29, jyotishNotify JY-08):
 * SELF-LISTEN. The author's own device reads their own suggestions
 * (the rules' author read path) and emits the bell into their own
 * Suchana inbox.
 *
 * Ledger law (mirrors the other watchers): per-suggestion status +
 * reply-count + history-length are recorded per device; the first
 * check on a device is a BASELINE — it records everything and rings
 * nothing, so history never arrives as a backlog of bells. One bell
 * per transition, ever, per device; the NotificationCenter's
 * dedupeKey is the second lock.
 *
 * This file is firebase-free and jest-safe.
 */

export interface SuggestionLite {
  id: string;
  title: string;
  status: string;
  replyCount: number;
  historyLength: number;
}

/** suggestionId → last recorded shape. */
export type SuggestionLedger = Record<
  string,
  { s: string; r: number; h: number }
>;

export type SuggestionNotifyEventKind = 'status' | 'reply';

export interface SuggestionNotifyEvent {
  kind: SuggestionNotifyEventKind;
  suggestionId: string;
  title: string;
  /** The new status (status events). */
  status: string;
}

export function pickSuggestionNotifyEvents(args: {
  suggestions: SuggestionLite[];
  ledger: SuggestionLedger;
  baseline: boolean;
}): { events: SuggestionNotifyEvent[]; nextLedger: SuggestionLedger } {
  const { suggestions, ledger, baseline } = args;
  const events: SuggestionNotifyEvent[] = [];
  const nextLedger: SuggestionLedger = {};

  for (const s of suggestions) {
    const prev = ledger[s.id];
    nextLedger[s.id] = { s: s.status, r: s.replyCount, h: s.historyLength };
    if (baseline || !prev) continue;
    if (prev.s !== s.status) {
      events.push({
        kind: 'status',
        suggestionId: s.id,
        title: s.title,
        status: s.status,
      });
    } else if (s.replyCount > prev.r) {
      // A reply without a status move still closes the loop — but
      // never two bells for one triage touch: a status change that
      // also carried a reply rings once, for the status.
      events.push({
        kind: 'reply',
        suggestionId: s.id,
        title: s.title,
        status: s.status,
      });
    }
  }

  return { events, nextLedger };
}

/** Stable dedupe identity per bell. The history length rides along
 *  so a status revisited later (planned → received → planned) is a
 *  new bell, not a swallowed repeat. */
export function suggestionDedupeKey(
  ev: SuggestionNotifyEvent,
  historyLength: number,
  replyCount: number
): string {
  return ev.kind === 'status'
    ? `suggestion:status:${ev.suggestionId}:${ev.status}:${historyLength}`
    : `suggestion:reply:${ev.suggestionId}:${replyCount}`;
}
