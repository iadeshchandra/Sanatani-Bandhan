/**
 * lib/jyotishNotify.ts — Suchana learns the consultation journey (pure).
 * ============================================================================
 * JY-FIX-B (JY-08). The Jyotish audit found the consultation lifecycle
 * was silent: a devotee's request could be accepted, completed, and
 * their dakshina released without a single Suchana bell; chat messages
 * notified nobody either. This picker decides the bells; the Firestore
 * + ledger + timer shell lives in jyotishNotifyService.ts.
 *
 * Observation model — SELF-LISTEN, the only pattern the self-write-only
 * notifications rules allow (same as orderNotify #29 and the event
 * reminders): my own device reads the consultations I am party to
 * (rules already allow party reads — zero new collections, zero rules
 * changes) and emits to my OWN inbox.
 *
 * The four bells (the audit's list):
 *  - accepted  → the DEVOTEE, when their OPEN request leaves OPEN with
 *                a jyotishi attached (ASSIGNED or beyond).
 *  - completed → the DEVOTEE, when an active consultation completes.
 *  - dakshina  → the JYOTISHI, when a completed consultation reaches
 *                DAKSHINA_RELEASED. (The dakshina ORDER's own journey —
 *                recorded → received — is already covered by the order
 *                watcher; this bell is the consultation-side release.)
 *  - message   → the OTHER party, when the consultation thread's
 *                latest message is from them and new to this device.
 *
 * Ledger law (mirrors orderNotify): a per-consultation STATUS ledger
 * plus a per-consultation last-message-id ledger. Baseline law: the
 * first check on a device records everything and rings nothing —
 * history is a baseline, not a backlog. One bell per transition, ever,
 * per device.
 *
 * This file is firebase-free and jest-safe.
 */

export interface JyotishConsultationLite {
  id: string;
  status: string;
  devoteeUid: string;
  assignedJyotishUid?: string;
  devoteeName?: string;
  assignedJyotishName?: string;
  consultationType?: string;
  updatedAtMs: number;
}

export interface JyotishMessageLite {
  consultationId: string;
  messageId: string;
  senderUid: string;
}

export interface JyotishLedger {
  /** consultationId → last recorded status. */
  s: Record<string, string>;
  /** consultationId → last recorded latest-message id. */
  m: Record<string, string>;
}

export type JyotishNotifyEventKind = 'accepted' | 'completed' | 'dakshina' | 'message';

export interface JyotishNotifyEvent {
  kind: JyotishNotifyEventKind;
  consultationId: string;
  /** The other party's display name ('' when unknown). */
  otherName: string;
  consultationType: string;
  /** Present for message events — part of the dedupe identity. */
  messageId?: string;
}

const ACTIVE_FOR_CHAT = new Set(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']);

export function pickJyotishNotifyEvents(args: {
  uid: string;
  consultations: JyotishConsultationLite[];
  latestMessages: JyotishMessageLite[];
  ledger: JyotishLedger;
  baseline: boolean;
}): { events: JyotishNotifyEvent[]; nextLedger: JyotishLedger } {
  const { uid, consultations, latestMessages, ledger, baseline } = args;
  const events: JyotishNotifyEvent[] = [];
  const nextLedger: JyotishLedger = { s: {}, m: {} };
  const byId = new Map(consultations.map((c) => [c.id, c]));

  for (const c of consultations) {
    const prev = ledger.s[c.id];
    nextLedger.s[c.id] = c.status;
    // Keep the message ledger for still-observed consultations.
    if (ledger.m[c.id]) nextLedger.m[c.id] = ledger.m[c.id];
    if (baseline || !prev || prev === c.status) continue;

    if (c.devoteeUid === uid) {
      const type = c.consultationType || 'consultation';
      const otherName = c.assignedJyotishName || '';
      if (prev === 'OPEN' && c.status !== 'OPEN' && c.status !== 'CANCELLED') {
        events.push({ kind: 'accepted', consultationId: c.id, otherName, consultationType: type });
      }
      if (
        (prev === 'ASSIGNED' || prev === 'IN_PROGRESS' || prev === 'OPEN') &&
        c.status === 'COMPLETED'
      ) {
        events.push({ kind: 'completed', consultationId: c.id, otherName, consultationType: type });
      }
    }
    if (c.assignedJyotishUid === uid) {
      if (prev === 'COMPLETED' && c.status === 'DAKSHINA_RELEASED') {
        events.push({
          kind: 'dakshina',
          consultationId: c.id,
          otherName: c.devoteeName || '',
          consultationType: c.consultationType || 'consultation',
        });
      }
    }
  }

  for (const msg of latestMessages) {
    const c = byId.get(msg.consultationId);
    if (!c) continue;
    nextLedger.m[msg.consultationId] = msg.messageId;
    if (baseline) continue;
    if (msg.senderUid === uid) continue; // my own message is not news to me
    if (!ACTIVE_FOR_CHAT.has(c.status) && c.status !== 'DAKSHINA_RELEASED') continue;
    if (ledger.m[msg.consultationId] === msg.messageId) continue; // already rung
    const otherName =
      c.devoteeUid === uid ? c.assignedJyotishName || '' : c.devoteeName || '';
    events.push({
      kind: 'message',
      consultationId: c.id,
      otherName,
      consultationType: c.consultationType || 'consultation',
      messageId: msg.messageId,
    });
  }

  return { events, nextLedger };
}

/** Stable dedupe identity per bell (mirrors the codebase's key style). */
export function jyotishDedupeKey(ev: JyotishNotifyEvent): string {
  switch (ev.kind) {
    case 'accepted':
      return `jyotish:accepted:${ev.consultationId}`;
    case 'completed':
      return `jyotish:completed:${ev.consultationId}`;
    case 'dakshina':
      return `jyotish:dakshina:${ev.consultationId}`;
    case 'message':
      return `jyotish:msg:${ev.consultationId}:${ev.messageId || ''}`;
  }
}
