/**
 * threadProfile.ts — QUEUED #28: in-thread counterpart profile + the
 * book-from-chat eligibility boundary. PURE — no firebase, no React.
 * ======================================================================
 *
 * THE BOUNDARY (scope guard, pinned by threadProfile.test.ts):
 *
 * - PROFILE surface (tappable header → profile sheet) exists ONLY for
 *   `direct` 1:1 threads with a resolved counterpart. Org threads are
 *   excluded: their counterpart key is an organisation id, not a person,
 *   and orgs already have their own public surfaces. Group threads use
 *   a different component entirely and never reach this code.
 *
 * - BOOK surface ("🙏 Book a seva" + services list) exists ONLY when the
 *   counterpart POSITIVELY resolves as a marketplace provider:
 *   a purohit/jyotish professional identity, OR ≥1 active marketplace
 *   gig, OR ≥1 active Seva Bazar service card. A personal chat with a
 *   family member (a pure devotee — probe all-empty) can NEVER gain a
 *   book button from this module: `isMarketplaceProvider` is the single
 *   gate, and the sheet renders commerce UI only from its `true`.
 *
 * - The probe defaults to EMPTY (no commerce) and must be earned by
 *   data. While the probe is unresolved the sheet shows no book UI.
 *
 * ORDER CONTEXT: threads carry no order fields. The only order anchor
 * inside a thread is the Seva Bazar token-advance receipt message
 * (`receiptMeta.orderId`). `latestOrderContext` reads it from messages
 * the thread view has already loaded — no new queries. Gig orders post
 * no chat messages, so they honestly produce no context.
 */
import type { ChatMessage, ChatParticipant, ChatThread } from './types';

/* ------------------------------------------------------------------ */
/* Counterpart + profile surface                                       */
/* ------------------------------------------------------------------ */

export interface CounterpartSurface {
  counterpartUid: string;
  person: ChatParticipant;
}

/**
 * The profile surface for a thread, or null when this thread must keep
 * today's header exactly as it is (org threads, unresolved threads,
 * missing counterpart info).
 */
export function counterpartSurface(
  thread: Pick<ChatThread, 'type' | 'participants' | 'participantInfo'> | null | undefined,
  viewerUid: string,
): CounterpartSurface | null {
  if (!thread || !viewerUid) return null;
  if (thread.type !== 'direct') return null;
  const others = (thread.participants ?? []).filter((p) => !!p && p !== viewerUid);
  if (others.length !== 1) return null;
  const key = others[0];
  const person = thread.participantInfo?.[key];
  if (!person) return null;
  return { counterpartUid: key, person };
}

/* ------------------------------------------------------------------ */
/* Provider probe — the book-surface gate                              */
/* ------------------------------------------------------------------ */

export interface ProviderProbe {
  /** Counterpart holds a Purohit professional identity. */
  hasPurohit: boolean;
  /** Counterpart holds a Jyotishi professional identity. */
  hasJyotish: boolean;
  /** Active marketplace gigs listed by the counterpart. */
  activeGigs: number;
  /** Active Seva Bazar service cards published by the counterpart. */
  activeCards: number;
}

/** The default probe: NO commerce. A family member's probe stays here. */
export const EMPTY_PROVIDER_PROBE: ProviderProbe = {
  hasPurohit: false,
  hasJyotish: false,
  activeGigs: 0,
  activeCards: 0,
};

/**
 * THE book-surface gate. True only on positive provider evidence —
 * professional identity or live listings. Null/undefined/empty probes
 * (devotees, family, unresolved) are always false.
 */
export function isMarketplaceProvider(
  probe: ProviderProbe | null | undefined,
): boolean {
  if (!probe) return false;
  return (
    probe.hasPurohit ||
    probe.hasJyotish ||
    probe.activeGigs > 0 ||
    probe.activeCards > 0
  );
}

export type ProviderRole = 'purohit' | 'jyotish';

/** Declared professional roles from the probe (gig/card-only sevaks have none). */
export function providerRoles(
  probe: ProviderProbe | null | undefined,
): ProviderRole[] {
  const roles: ProviderRole[] = [];
  if (probe?.hasPurohit) roles.push('purohit');
  if (probe?.hasJyotish) roles.push('jyotish');
  return roles;
}

/* ------------------------------------------------------------------ */
/* Order context — from receipt messages already in the thread         */
/* ------------------------------------------------------------------ */

export interface ThreadOrderContext {
  orderId: string;
  providerUid: string;
  providerName: string;
  amount: number;
  currency: string;
}

/**
 * The most recent Seva Bazar order this thread carries, read from its
 * token-advance receipt messages. Null when the thread has no receipt
 * (personal chats, gig-order chats — gig orders post no messages).
 */
export function latestOrderContext(
  messages: readonly ChatMessage[] | null | undefined,
): ThreadOrderContext | null {
  if (!messages) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.kind !== 'receipt' || !m.receiptMeta) continue;
    const r = m.receiptMeta;
    if (!r.orderId) continue;
    return {
      orderId: r.orderId,
      providerUid: r.providerUid || '',
      providerName: r.providerName || '',
      amount: Number(r.amount) || 0,
      currency: r.currency || 'BDT',
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Warm stage labels for the pinned order strip                        */
/* ------------------------------------------------------------------ */

export type OrderStageKey =
  | 'awaiting_advance'
  | 'advance_received'
  | 'accepted'
  | 'in_seva'
  | 'complete'
  | 'unknown';

const ORDER_STAGE_LABEL: Record<
  Exclude<OrderStageKey, 'unknown'>,
  { en: string; bn: string; hi: string }
> = {
  awaiting_advance: { en: 'Advance awaited', bn: 'অগ্রিমের অপেক্ষায়', hi: 'अग्रिम की प्रतीक्षा' },
  advance_received: { en: 'Advance received', bn: 'অগ্রিম গৃহীত হয়েছে', hi: 'अग्रिम प्राप्त हुआ' },
  accepted: { en: 'Muhurat held 🪔', bn: 'মুহূর্ত সংরক্ষিত 🪔', hi: 'मुहूर्त सुरक्षित 🪔' },
  in_seva: { en: 'Seva in progress', bn: 'সেবা চলমান', hi: 'सेवा जारी है' },
  complete: { en: 'Seva complete 🙏', bn: 'সেবা সম্পন্ন 🙏', hi: 'सेवा पूर्ण 🙏' },
};

/** Warm label for a stage key; null for 'unknown' (strip hides itself). */
export function orderStageLabel(
  stage: OrderStageKey,
  lang: string,
): string | null {
  if (stage === 'unknown') return null;
  const row = ORDER_STAGE_LABEL[stage];
  return lang === 'bn' ? row.bn : lang === 'hi' ? row.hi : row.en;
}
