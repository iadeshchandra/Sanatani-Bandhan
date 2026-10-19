/**
 * notifications/types.ts — the typed event contract for the NotificationCenter.
 * ============================================================================
 * PHASE 1 — NotificationCenter core service (unified notification system).
 *
 * Every module (chat, P2P money requests, SOS, wallet, Suchana, org, blessings,
 * security) speaks to the notification brain through one shape: `NotifyEvent`.
 * The center never invents copy — emitters supply trilingual title/body in the
 * Sanatani voice (warm, dignified, never corporate). The center decides *when*
 * and *how* it reaches the devotee.
 *
 * Priority tiers (the calm-chronology contract):
 *   critical  — breaks through quiet hours AND DND. Sound + vibration +
 *               persistent banner until acknowledged. Reserved for SOS.
 *   important — delivered promptly: push + in-app now (unless held).
 *   gentle    — batched into digests; feeds the Suchana stream. Never pings
 *               from the offline outbox if stale.
 *   silent    — in-app center only. No ping, no Suchana, no digest.
 */

export type NotifyPriority = 'critical' | 'important' | 'gentle' | 'silent';

export type NotifyKind =
  | 'sos'
  | 'chat'
  | 'money_request'
  | 'wallet'
  | 'suchana'
  | 'org'
  | 'blessing'
  | 'security'
  | 'darshan_live'
  | 'social';

export type NotifyLang = 'en' | 'bn' | 'hi';

/** Every user-facing string in the center is trilingual. No exceptions. */
export interface TriText {
  en: string;
  bn: string;
  hi: string;
}

export interface NotifyActor {
  uid: string;
  name: string;
  photo?: string;
}

/**
 * The contract every emitter fulfils. All fields are plain JSON — safe to
 * persist to Firestore and to the IndexedDB offline outbox.
 */
export interface NotifyEvent {
  kind: NotifyKind;
  priority: NotifyPriority;
  actor?: NotifyActor;
  /** Trilingual, Sanatani voice. E.g. "Money request from Rahim". */
  title: TriText;
  /** Trilingual, Sanatani voice. One calm line, never alarming. */
  body: TriText;
  /**
   * Stable identity for dedupe. Emitters SHOULD reuse the same key for the
   * same logical event (e.g. `moneyreq:<requestId>`), so retries and replays
   * never double-notify.
   */
  dedupeKey: string;
  /** Where the app should land when the card is tapped. */
  deepLink?: string;
  payload?: Record<string, unknown>;
  /** Epoch ms after which the event is meaningless (e.g. a meeting reminder). */
  expiresAt?: number;
}

/** Where the item was/will be delivered. */
export type DeliveryRoute = 'push' | 'inapp' | 'suchana' | 'persistent';

/**
 * What the priority engine decided for one event — the single source of truth
 * for the delivery router AND for Phase 3 UI (which renders banners/badges).
 */
export interface RoutingDecision {
  /** Attempt an FCM push (server-side dispatch; see delivery.ts). */
  ping: boolean;
  /** Persist to the in-app notification center (Firestore). */
  inApp: boolean;
  /** Emit into the Suchana feed (gentle items only; never duplicated). */
  toSuchana: boolean;
  /** Critical banner stays on screen until acknowledged. */
  persistent: boolean;
  /**
   * Quiet hours / DND hold: push must wait until this epoch ms.
   * The in-app item is still written immediately (marked quietHold).
   */
  holdUntil: number | null;
  /** Why the push is held: quiet hours window or manual DND. */
  holdReason: 'quiet' | 'dnd' | null;
  /** Eligible for digest batching instead of an immediate ping. */
  digestCandidate: boolean;
  /** Which Suchana digest window this belongs to (morning/evening). */
  digestWindow: 'morning' | 'evening' | null;
}

/**
 * A NotificationItem is a NotifyEvent plus the center's bookkeeping —
 * what Firestore `notifications/{uid}/items/{id}` stores.
 */
export interface NotificationItem extends NotifyEvent {
  id: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
  read: boolean;
  /** Critical banners flip this when the devotee acknowledges. */
  acknowledged: boolean;
  /** Smart-grouping: how many events this one card represents. */
  groupedCount: number;
  /** True while the push is held for quiet hours / DND. */
  quietHold: boolean;
  holdUntil: number | null;
  routes: DeliveryRoute[];
  decision: RoutingDecision;
}

/** Result of a single `emit()` call — what the caller can report/log. */
export type EmitStatus = 'delivered' | 'grouped' | 'held' | 'queued' | 'dropped';

export interface EmitResult {
  status: EmitStatus;
  itemId: string;
  decision: RoutingDecision;
  /** Present when status === 'queued' (offline). */
  queuedAt?: number;
}

/** Offline-outbox record: the event plus when it was queued. */
export interface QueuedEvent extends NotifyEvent {
  id: string;
  uid: string;
  queuedAt: number;
  /**
   * Replay attempts since the event was queued. Drives exponential backoff
   * (see backoffMs in outbox.ts). An undelivered event is NEVER deleted —
   * it waits with a growing delay instead of being dropped.
   */
  attempts?: number;
  /** Epoch ms after which this event becomes eligible for replay again. */
  nextRetryAt?: number;
}
