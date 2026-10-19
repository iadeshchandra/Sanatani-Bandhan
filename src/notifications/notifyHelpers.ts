/**
 * notifications/notifyHelpers.ts — per-module event builders for emitNotify.
 * ============================================================================
 * Every builder returns a Phase 1 NotifyEvent (kind, priority, trilingual
 * title/body, dedupeKey, deepLink). Copy comes from warmCopy.ts — the
 * single source of truth for notification strings — via renderCopy.
 *
 * Rules every builder honours:
 *   - dedupeKey is stable per logical event (retries/replays never double).
 *   - title/body are trilingual, warm Sanatani voice, never corporate-cold.
 *   - priority follows the calm-chronology contract (critical = SOS only).
 *
 * Emitters call `void notifyX(...)` — a notification failure must never
 * break the product flow (especially money flows). Each notify* catches
 * internally and resolves to the EmitResult.
 */
import type { EmitResult, NotifyEvent, NotifyKind, NotifyPriority, TriText } from './types';
import { emitNotify } from './emit';
import { copyFor, renderCopy } from './warmCopy';
import { summarizeActors, type SocialSummary } from './socialBatcher';

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

type Params = Record<string, string | number>;

function tri(kind: NotifyKind, key: string, params: Params = {}): { title: TriText; body: TriText } {
  const entry = copyFor(kind, key);
  const fallback = (t: TriText): string =>
    t.en.replace(/\{(\w+)\}/g, (whole, k: string) => (k in params ? String(params[k]) : whole));
  // renderCopy fills placeholders per language; fall back to EN fill on miss.
  const langs = ['en', 'bn', 'hi'] as const;
  const title = {} as TriText;
  const body = {} as TriText;
  for (const l of langs) {
    const r = renderCopy(entry, params, l);
    title[l] = r.title || fallback(entry.title);
    body[l] = r.body || fallback(entry.body);
  }
  return { title, body };
}

function base(
  kind: NotifyKind,
  priority: NotifyPriority,
  copyKey: string,
  params: Params,
  dedupeKey: string,
  opts: { actorUid?: string; actorName?: string; actorPhoto?: string; deepLink?: string; payload?: Record<string, unknown> } = {},
): NotifyEvent {
  const { title, body } = tri(kind, copyKey, params);
  return {
    kind,
    priority,
    ...(opts.actorUid ? { actor: { uid: opts.actorUid, name: opts.actorName ?? 'A devotee', ...(opts.actorPhoto ? { photo: opts.actorPhoto } : {}) } } : {}),
    title,
    body,
    dedupeKey,
    ...(opts.deepLink ? { deepLink: opts.deepLink } : {}),
    ...(opts.payload ? { payload: opts.payload } : {}),
  };
}

/** Fire-and-forget: never throws, never blocks the caller. */
async function send(uid: string | null | undefined, event: NotifyEvent): Promise<EmitResult> {
  try {
    return await emitNotify(uid, event);
  } catch (e) {
    console.warn('[notify] helper failed:', e instanceof Error ? e.message : String(e));
    // Return a synthetic dropped result; emitNotify itself never throws,
    // but a belt-and-braces guard keeps money flows safe.
    return { status: 'dropped', itemId: '', decision: undefined as never };
  }
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export interface ChatNotifyInput {
  senderUid: string;
  senderName: string;
  senderPhoto?: string;
  /** 'text' | 'blessing' | 'request_card' | 'system' */
  kind: string;
  preview: string;
  messageId: string;
  chatId: string;
  threadLabel?: string;
}

/** New chat message → IMPORTANT; blessing card → GENTLE. */
export function notifyChatMessage(recipientUid: string, m: ChatNotifyInput): Promise<EmitResult> {
  const isBlessing = m.kind === 'blessing';
  const event = base(
    'chat',
    isBlessing ? 'gentle' : 'important',
    isBlessing ? 'blessingCard' : 'message',
    { name: m.senderName, preview: m.preview.slice(0, 120), thread: m.threadLabel ?? 'chat' },
    `chatmsg:${m.messageId}`,
    {
      actorUid: m.senderUid,
      actorName: m.senderName,
      actorPhoto: m.senderPhoto,
      deepLink: `/chat/${m.chatId}`,
      payload: { chatId: m.chatId, messageId: m.messageId, messageKind: m.kind },
    },
  );
  return send(recipientUid, event);
}

/* ------------------------------------------------------------------ */
/* P2P money requests                                                  */
/* ------------------------------------------------------------------ */

export interface MoneyNotifyInput {
  /** The OTHER party's display name (the human the copy is about). */
  name: string;
  otherUid: string;
  amount: string;
  requestId: string;
  chatId?: string;
  via?: string;
}

const p2pLink = (chatId?: string, requestId?: string) =>
  chatId ? `/chat/${chatId}${requestId ? `?request=${requestId}` : ''}` : '/chat';

/** New request → IMPORTANT to the receiver (payee). */
export function notifyMoneyRequestReceived(recipientUid: string, m: MoneyNotifyInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base('money_request', 'important', 'received', { name: m.name, amount: m.amount }, `moneyreq:${m.requestId}`, {
      actorUid: m.otherUid,
      actorName: m.name,
      deepLink: p2pLink(m.chatId, m.requestId),
      payload: { requestId: m.requestId },
    }),
  );
}

/** Receiver accepted → IMPORTANT to the sender (payer). */
export function notifyMoneyRequestAccepted(recipientUid: string, m: MoneyNotifyInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base('money_request', 'important', 'accepted', { name: m.name, amount: m.amount }, `moneyreq:${m.requestId}:accepted`, {
      actorUid: m.otherUid,
      actorName: m.name,
      deepLink: p2pLink(m.chatId, m.requestId),
      payload: { requestId: m.requestId },
    }),
  );
}

/** Receiver declined → IMPORTANT to the sender (payer). */
export function notifyMoneyRequestDeclined(recipientUid: string, m: MoneyNotifyInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base('money_request', 'important', 'declined', { name: m.name, amount: m.amount }, `moneyreq:${m.requestId}:declined`, {
      actorUid: m.otherUid,
      actorName: m.name,
      deepLink: p2pLink(m.chatId, m.requestId),
      payload: { requestId: m.requestId },
    }),
  );
}

/** Receiver countered → IMPORTANT to the original sender. */
export function notifyMoneyRequestCountered(recipientUid: string, m: MoneyNotifyInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base('money_request', 'important', 'countered', { name: m.name, amount: m.amount }, `moneyreq:${m.requestId}:countered`, {
      actorUid: m.otherUid,
      actorName: m.name,
      deepLink: p2pLink(m.chatId, m.requestId),
      payload: { requestId: m.requestId },
    }),
  );
}

/** Payer marked paid → IMPORTANT to the receiver (payee). */
export function notifyMoneyMarkedPaid(recipientUid: string, m: MoneyNotifyInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base('money_request', 'important', 'paid', { name: m.name, amount: m.amount, via: m.via ?? 'their payment app' }, `moneyreq:${m.requestId}:paid`, {
      actorUid: m.otherUid,
      actorName: m.name,
      deepLink: p2pLink(m.chatId, m.requestId),
      payload: { requestId: m.requestId },
    }),
  );
}

/** Payee confirmed receipt → GENTLE to the sender ("{name} has settled their obligation 🙏"). */
export function notifyMoneySettled(recipientUid: string, m: MoneyNotifyInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base('money_request', 'gentle', 'settled', { name: m.name, amount: m.amount }, `moneyreq:${m.requestId}:settled`, {
      actorUid: m.otherUid,
      actorName: m.name,
      deepLink: p2pLink(m.chatId, m.requestId),
      payload: { requestId: m.requestId },
    }),
  );
}

/* ------------------------------------------------------------------ */
/* SOS                                                                 */
/* ------------------------------------------------------------------ */

export interface SosAlertInput {
  senderUid: string;
  senderName: string;
  eventId: string;
  situation: string;
  details?: string;
}

/** SOS sent → CRITICAL reassurance to the SENDER ("Help is on the way"). */
export function notifySOSSent(recipientUid: string, eventId: string): Promise<EmitResult> {
  return send(
    recipientUid,
    base('sos', 'critical', 'alertSent', {}, `sos:${eventId}:sent`, {
      deepLink: `/safety/sos/${eventId}`,
      payload: { eventId },
    }),
  );
}

/** SOS alert → CRITICAL to the viewer (a nearby devotee). */
export function notifySOSAlert(recipientUid: string, s: SosAlertInput): Promise<EmitResult> {
  const details = s.details?.trim() ? ` — ${s.details.trim().slice(0, 140)}` : '';
  return send(
    recipientUid,
    base(
      'sos',
      'critical',
      'responderAlert',
      { name: s.senderName, situation: s.situation.replace(/_/g, ' '), details },
      `sos:${s.eventId}`,
      {
        actorUid: s.senderUid,
        actorName: s.senderName,
        deepLink: `/safety/sos/${s.eventId}`,
        payload: { eventId: s.eventId, situation: s.situation },
      },
    ),
  );
}

/** Someone answered the SOS → CRITICAL to the sender. */
export function notifySOSAcknowledged(recipientUid: string, s: SosAlertInput & { responderName: string; responderUid: string }): Promise<EmitResult> {
  return send(
    recipientUid,
    base('sos', 'critical', 'ackReceived', { name: s.responderName }, `sos:${s.eventId}:ack:${s.responderUid}`, {
      actorUid: s.responderUid,
      actorName: s.responderName,
      deepLink: `/safety/sos/${s.eventId}`,
      payload: { eventId: s.eventId },
    }),
  );
}

/** "I'm safe" stand-down → IMPORTANT (sender reassurance + responder all-clear). */
export function notifySOSResolved(recipientUid: string, s: SosAlertInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base('sos', 'important', 'resolved', {}, `sos:${s.eventId}:resolved`, {
      actorUid: s.senderUid,
      actorName: s.senderName,
      deepLink: `/safety`,
      payload: { eventId: s.eventId },
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Wallet                                                              */
/* ------------------------------------------------------------------ */

/** Top-up approved → IMPORTANT. */
export function notifyTopupApproved(recipientUid: string, amount: string, claimId: string): Promise<EmitResult> {
  return send(
    recipientUid,
    base('wallet', 'important', 'topupCredited', { amount }, `topup:${claimId}:approved`, {
      deepLink: '/wallet',
      payload: { claimId },
    }),
  );
}

/** Top-up rejected → IMPORTANT (calm: money is safe, resubmit). */
export function notifyTopupRejected(recipientUid: string, amount: string, claimId: string): Promise<EmitResult> {
  return send(
    recipientUid,
    base('wallet', 'important', 'topupRejected', { amount }, `topup:${claimId}:rejected`, {
      deepLink: '/wallet',
      payload: { claimId },
    }),
  );
}

/** Escrow payout received → GENTLE. */
export function notifyPayoutReceived(recipientUid: string, amount: string, orderId: string): Promise<EmitResult> {
  return send(
    recipientUid,
    base('wallet', 'gentle', 'payoutReceived', { amount }, `payout:${orderId}`, {
      deepLink: '/wallet',
      payload: { orderId },
    }),
  );
}

/** Seva contribution (commission) due → IMPORTANT. */
export function notifyCommissionDue(recipientUid: string, amount: string, orderId: string, dayKey: string): Promise<EmitResult> {
  return send(
    recipientUid,
    base('wallet', 'important', 'commissionDue', { amount }, `commissiondue:${orderId}:${dayKey}`, {
      deepLink: '/marketplace/dues',
      payload: { orderId },
    }),
  );
}

/** Wallet running low → IMPORTANT. */
export function notifyLowBalance(recipientUid: string, amount: string, dayKey: string): Promise<EmitResult> {
  return send(
    recipientUid,
    base('wallet', 'important', 'lowBalance', { amount }, `lowbalance:${dayKey}`, {
      deepLink: '/wallet',
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Org announcements                                                   */
/* ------------------------------------------------------------------ */

export interface OrgAnnouncementInput {
  orgId: string;
  orgName: string;
  title: string;
  announcementId: string;
}

/**
 * Trustee broadcast → IMPORTANT. Called by the (future) trustee broadcast
 * module per member uid — the org's own fan-out, one emit per devotee.
 */
export function notifyOrgAnnouncement(recipientUid: string, a: OrgAnnouncementInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base('org', 'important', 'announcement', { orgName: a.orgName, title: a.title }, `organn:${a.announcementId}`, {
      deepLink: `/org/${a.orgId}`,
      payload: { orgId: a.orgId, announcementId: a.announcementId },
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Social — community warmth. All GENTLE: batched into digests, fed to  */
/* the Suchana stream, never pings, never breaks quiet hours.          */
/* ------------------------------------------------------------------ */

/** Batched Ashirvad summary → GENTLE. One card per 90-second window. */
export function notifySocialAshirvad(recipientUid: string, s: SocialSummary): Promise<EmitResult> {
  const names = s.actors.map((a) => a.name);
  const many = names.length > 3;
  const params = many
    ? {
        names: summarizeActors(names, 'en'),
        // Per-language names are rendered below via explicit title override.
        count: s.actors.length,
      }
    : { names: names.join(', ') };
  const event = base('social', 'gentle', many ? 'ashirvadMany' : 'ashirvad', params, s.dedupeKey, {
    actorUid: s.actors[0]?.uid,
    actorName: s.actors[0]?.name,
    deepLink: '/sangam',
    payload: { postId: s.targetId, count: s.actors.length },
  });
  if (many) {
    // The {names} placeholder needs per-language "X and N others" phrasing.
    event.title = {
      en: `🪔 ${summarizeActors(names, 'en')} sent Ashirvad`,
      bn: `🪔 ${summarizeActors(names, 'bn')} আশীর্বাদ পাঠিয়েছেন`,
      hi: `🪔 ${summarizeActors(names, 'hi')} ने आशीर्वाद भेजा है`,
    };
  }
  return send(recipientUid, event);
}

export interface SocialCommentInput {
  commentId: string;
  postId: string;
  authorUid: string;
  authorName: string;
  preview: string;
}

/** New comment on your post → GENTLE (individual; center groups same-actor). */
export function notifySocialComment(recipientUid: string, c: SocialCommentInput): Promise<EmitResult> {
  return send(
    recipientUid,
    base(
      'social',
      'gentle',
      'comment',
      { name: c.authorName, preview: c.preview.slice(0, 120) },
      `social:comment:${c.commentId}`,
      {
        actorUid: c.authorUid,
        actorName: c.authorName,
        deepLink: '/sangam',
        payload: { postId: c.postId, commentId: c.commentId },
      },
    ),
  );
}

/** New follower → GENTLE. No name (we only observe the count change). */
export function notifySocialFollow(recipientUid: string, followerCount: number, dayKey: string): Promise<EmitResult> {
  return send(
    recipientUid,
    base('social', 'gentle', 'follow', {}, `social:follow:${recipientUid}:${dayKey}:${followerCount}`, {
      deepLink: `/u/${recipientUid}`,
    }),
  );
}

export interface SocialRsvpInput extends SocialSummary {
  eventTitle: string;
}

/** Batched RSVP summary → GENTLE. One card per 90-second window. */
export function notifySocialRsvp(recipientUid: string, s: SocialRsvpInput): Promise<EmitResult> {
  const names = s.actors.map((a) => a.name);
  const many = names.length > 3;
  const event = base(
    'social',
    'gentle',
    many ? 'rsvpMany' : 'rsvp',
    many
      ? { names: summarizeActors(names, 'en'), event: s.eventTitle, count: s.actors.length }
      : { names: names.join(', '), event: s.eventTitle },
    s.dedupeKey,
    {
      actorUid: s.actors[0]?.uid,
      actorName: s.actors[0]?.name,
      deepLink: '/sangam',
      payload: { eventId: s.targetId, count: s.actors.length },
    },
  );
  if (many) {
    event.title = {
      en: `📿 ${summarizeActors(names, 'en')} will join ${s.eventTitle}`,
      bn: `📿 ${summarizeActors(names, 'bn')} ${s.eventTitle}-এ যোগ দেবেন`,
      hi: `📿 ${summarizeActors(names, 'hi')} ${s.eventTitle} में शामिल होंगे`,
    };
  }
  return send(recipientUid, event);
}
