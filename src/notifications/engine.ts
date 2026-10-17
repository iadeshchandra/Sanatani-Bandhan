/**
 * notifications/engine.ts — the priority engine, pure logic.
 * ============================================================
 * No Firestore, no IndexedDB, no DOM. Every function is deterministic and
 * unit-testable: given (event, prefs, now), what should the center do?
 *
 * The four tiers, in one sentence each:
 *   critical  — nothing may delay it. Not quiet hours, not DND, not 'off'.
 *   important — promptly, unless the house is sleeping (quiet hours) or the
 *               devotee asked for stillness (DND): then held, never dropped.
 *   gentle    — batched into digests and the Suchana feed. No pings from a
 *               stale offline queue.
 *   silent    — written to the in-app center and nowhere else.
 */

import type {
  NotifyEvent,
  NotifyKind,
  NotifyPriority,
  QueuedEvent,
  RoutingDecision,
  TriText,
} from './types';
import {
  isInQuietHours,
  quietHoursEndMs,
  policyAllowsPing,
  type NotificationPrefs,
} from './preferences';

/** Smart-grouping window: cards collapse within 30 minutes. */
export const GROUP_WINDOW_MS = 30 * 60 * 1000;

/** Gentle items queued offline longer than this never ping — digest only. */
export const STALE_GENTLE_MS = 6 * 60 * 60 * 1000;

/** DND hold fallback: re-check in 30 minutes if quiet hours aren't active. */
export const DND_HOLD_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Priority engine
// ---------------------------------------------------------------------------

/**
 * Decide how one event should be delivered.
 * Priority outranks category policy; category 'off' outranks pings for
 * non-critical events; only critical breaks through quiet hours and DND.
 */
export function decideRouting(
  event: NotifyEvent,
  prefs: NotificationPrefs,
  now: number,
): RoutingDecision {
  const quiet = isInQuietHours(now, prefs.quietHours);
  const sleeping = quiet || prefs.dnd;

  if (event.priority === 'critical') {
    return {
      ping: true,
      inApp: true,
      toSuchana: false,
      persistent: true,
      holdUntil: null,
      holdReason: null,
      digestCandidate: false,
      digestWindow: null,
    };
  }

  if (event.priority === 'silent') {
    return {
      ping: false,
      inApp: true,
      toSuchana: false,
      persistent: false,
      holdUntil: null,
      holdReason: null,
      digestCandidate: false,
      digestWindow: null,
    };
  }

  if (event.priority === 'gentle') {
    // Gentle never pings — that is what makes it gentle. It joins the
    // digest and the Suchana stream, on the devotee's own time. The
    // category 'instant' policy only accelerates *important* events;
    // 'off' still suppresses the Suchana hook for this kind.
    const allowed = policyAllowsPing(event.kind, prefs);
    return {
      ping: false,
      inApp: true,
      toSuchana: allowed,
      persistent: false,
      holdUntil: null,
      holdReason: null,
      digestCandidate: true,
      digestWindow: digestWindowFor(event.kind, prefs),
    };
  }

  // important
  const allowed = policyAllowsPing(event.kind, prefs);
  if (!allowed) {
    return {
      ping: false,
      inApp: true,
      toSuchana: false,
      persistent: false,
      holdUntil: null,
      holdReason: null,
      digestCandidate: false,
      digestWindow: null,
    };
  }
  if (sleeping) {
    const holdUntil = quiet ? quietHoursEndMs(now, prefs.quietHours) : now + DND_HOLD_MS;
    return {
      ping: false,
      inApp: true,
      toSuchana: false,
      persistent: false,
      holdUntil,
      holdReason: quiet ? 'quiet' : 'dnd',
      digestCandidate: false,
      digestWindow: null,
    };
  }
  return {
    ping: true,
    inApp: true,
    toSuchana: false,
    persistent: false,
    holdUntil: null,
    holdReason: null,
    digestCandidate: false,
    digestWindow: null,
  };
}

function digestWindowFor(kind: NotifyKind, prefs: NotificationPrefs): 'morning' | 'evening' | null {
  if (kind === 'suchana') {
    if (prefs.suchana === 'morning') return 'morning';
    if (prefs.suchana === 'evening') return 'evening';
    return null;
  }
  return 'morning';
}

// ---------------------------------------------------------------------------
// Smart grouping / dedupe
// ---------------------------------------------------------------------------

/** The minimum shape the grouping engine needs from stored items. */
export interface GroupCandidate {
  id: string;
  dedupeKey: string;
  kind: NotifyKind;
  priority: NotifyPriority;
  actorUid?: string;
  createdAt: number;
  read: boolean;
  groupedCount: number;
}

/**
 * Find an existing card to merge into, or null to create a new card.
 * Rules (in order):
 *   1. Same dedupeKey + unread + within 30 min → exact dedupe. Retries,
 *      replays and double-emits never double-notify.
 *   2. Same actor + same kind + unread + within 30 min → one calm card
 *      with a count ("3 money requests from Rahim").
 * Critical SOS events never group — each one is its own banner.
 */
export function findGroupTarget(
  existing: GroupCandidate[],
  event: NotifyEvent,
  now: number,
): GroupCandidate | null {
  if (event.priority === 'critical') return null;
  const fresh = existing.filter(
    (c) => !c.read && now - c.createdAt <= GROUP_WINDOW_MS && c.priority !== 'critical',
  );
  const exact = fresh.find((c) => c.dedupeKey === event.dedupeKey);
  if (exact) return exact;
  if (!event.actor) return null;
  const collapsed = fresh.find(
    (c) => c.kind === event.kind && c.actorUid === event.actor?.uid,
  );
  return collapsed ?? null;
}

// ---------------------------------------------------------------------------
// Offline-outbox replay
// ---------------------------------------------------------------------------

export type ReplayVerdict = 'replay' | 'digest' | 'drop';

/**
 * What to do with one offline-queued event when connectivity returns:
 *   drop   — expired (expiresAt passed). Gone quietly.
 *   digest — gentle and queued > 6h ago. Goes straight to the digest and the
 *            Suchana feed; it NEVER pings. A stale nudge must not buzz.
 *   replay — everything else goes through the normal engine again
 *            (critical still breaks through, even if old).
 */
export function classifyReplay(item: QueuedEvent, now: number): ReplayVerdict {
  if (item.expiresAt !== undefined && item.expiresAt <= now) return 'drop';
  if (item.priority === 'gentle' && now - item.queuedAt > STALE_GENTLE_MS) return 'digest';
  return 'replay';
}

/** Digest-forced routing: in-app + Suchana, never a ping. */
export function digestOnlyDecision(window: 'morning' | 'evening' | null): RoutingDecision {
  return {
    ping: false,
    inApp: true,
    toSuchana: true,
    persistent: false,
    holdUntil: null,
    holdReason: null,
    digestCandidate: true,
    digestWindow: window,
  };
}

// ---------------------------------------------------------------------------
// Trilingual grouped-card copy (Sanatani voice)
// ---------------------------------------------------------------------------

const KIND_PLURAL: Record<NotifyKind, { en: string; bn: string; hi: string }> = {
  money_request: {
    en: 'money requests',
    bn: 'অর্থের অনুরোধ',
    hi: 'धन-अनुरोध',
  },
  chat: { en: 'new messages', bn: 'নতুন বার্তা', hi: 'नए संदेश' },
  wallet: { en: 'wallet updates', bn: 'ওয়ালেট খবর', hi: 'वॉलेट समाचार' },
  org: { en: 'updates', bn: 'আপডেট', hi: 'अपडेट' },
  blessing: { en: 'blessings', bn: 'আশীর্বাদ', hi: 'आशीर्वाद' },
  security: { en: 'security notices', bn: 'নিরাপত্তা বিজ্ঞপ্তি', hi: 'सुरक्षा सूचनाएँ' },
  suchana: { en: 'suchanas', bn: 'সূচনা', hi: 'सूचनाएँ' },
  sos: { en: 'SOS alerts', bn: 'SOS সতর্কতা', hi: 'SOS चेतावनी' },
};

/**
 * "3 money requests from Rahim" in all three languages, warm and dignified.
 * Used when actor+kind cards collapse.
 */
export function groupedCardText(count: number, actorName: string, kind: NotifyKind): TriText {
  const k = KIND_PLURAL[kind];
  return {
    en: `${count} ${k.en} from ${actorName}`,
    bn: `${actorName}-এর কাছ থেকে ${count}টি ${k.bn}`,
    hi: `${actorName} के ${count} ${k.hi}`,
  };
}

/** A calm digest header, e.g. the morning summary card. */
export function digestHeaderText(count: number, window: 'morning' | 'evening'): TriText {
  const when =
    window === 'morning'
      ? { en: 'This morning', bn: 'আজ সকালে', hi: 'आज सुबह' }
      : { en: 'This evening', bn: 'আজ সন্ধ্যায়', hi: 'आज शाम' };
  return {
    en: `${when.en}, ${count} gentle ${count === 1 ? 'note' : 'notes'} await you — in your own time, no hurry.`,
    bn: `${when.bn}, ${count}টি শান্ত খবর আপনার জন্য অপেক্ষা করছে — ধীরে দেখুন, কোনো তাড়া নেই।`,
    hi: `${when.hi}, ${count} शांत संदेश आपकी प्रतीक्षा में हैं — आराम से देखें, कोई जल्दी नहीं।`,
  };
}
