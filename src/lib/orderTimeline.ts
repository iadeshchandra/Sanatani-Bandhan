/**
 * orderTimeline.ts — pure stage → timeline model for marketplace orders.
 * =====================================================================
 * QUEUED #26. `sevaOrderStage()` (sangam/sevaBooking.ts) maps a status to
 * a one-word devotee stage for the Seva Bazar sheet/chat. This module is
 * the FULL journey model behind the order timeline UI: it knows the
 * order's payment path (wallet escrow / rail-1 direct / rail-2 advance /
 * Seva Bazar / pay-after-task), who acts at each stage, which timestamps
 * the order actually carries, and the honest terminal states
 * (cancelled / disputed / refunded) — never a fake happy path.
 *
 * Pure: no Firestore, no React, no copy. Language law (as in
 * sevaBooking.ts): this module returns data — stage keys, states,
 * actors, ISO timestamps. Callers build the words.
 */

/** How the dakshina moves for this order — decides the stage sequence. */
export type OrderPath = 'wallet' | 'rail1' | 'rail2' | 'seva_bazar' | 'after_task';

export type TimelinePerspective = 'client' | 'provider';

export type StageKey =
  | 'requested'
  | 'dakshina'
  | 'accepted'
  | 'in_seva'
  | 'contribution'
  | 'blessed';

export type StageState = 'done' | 'current' | 'upcoming' | 'skipped';

export type StageActor = 'client' | 'provider' | 'platform' | 'none';

export type TerminalKind = 'cancelled' | 'disputed' | 'refunded';

export interface OrderLike {
  status?: string;
  rail?: string;
  payWithWallet?: boolean;
  walletPaid?: boolean;
  payAfterTask?: boolean;
  /** Seva Bazar marker (orders booked from a feed service card). */
  sevaBazar?: unknown;
  createdAt?: unknown;
  paidAt?: unknown;
  completedAt?: unknown;
  taskCompletedAt?: unknown;
  updatedAt?: unknown;
  rail2Proof?: { submittedAt?: unknown; confirmedAt?: unknown } | null;
  [k: string]: unknown;
}

export interface TimelineStage {
  key: StageKey;
  state: StageState;
  /** Who moves the journey forward while this stage is current. */
  actor: StageActor;
  /** ISO time this stage was reached/completed — only when the order carries it. */
  at?: string;
  /** Copy discriminator for the current stage ('to_begin' | 'underway'). */
  detail?: string;
}

export interface OrderTimelineModel {
  path: OrderPath;
  outcome: 'in_journey' | 'complete' | TerminalKind;
  stages: TimelineStage[];
  /** The stage the journey is waiting on, when in_journey. */
  currentKey?: StageKey;
  terminal?: { kind: TerminalKind; at?: string };
}

/** Defensive timestamp → ISO. Firestore Timestamps, Dates, epoch ms, strings. */
export function tsToIso(v: unknown): string | undefined {
  try {
    if (v == null) return undefined;
    if (typeof v === 'string') {
      const t = Date.parse(v);
      return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
    }
    if (typeof v === 'number') {
      return Number.isFinite(v) && v > 0 ? new Date(v).toISOString() : undefined;
    }
    if (v instanceof Date) {
      const t = v.getTime();
      return Number.isFinite(t) ? v.toISOString() : undefined;
    }
    const o = v as { toDate?: () => Date; seconds?: number };
    if (typeof o.toDate === 'function') {
      const d = o.toDate();
      return d instanceof Date && Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
    }
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000).toISOString();
    return undefined;
  } catch {
    return undefined;
  }
}

/** Which payment path this order travels — decides the stage sequence. */
export function orderPathOf(order: OrderLike): OrderPath {
  if (order?.payAfterTask === true) return 'after_task';
  if (order?.sevaBazar) return 'seva_bazar';
  if (order?.payWithWallet === true || order?.walletPaid === true) return 'wallet';
  if (order?.rail === 'rail2') return 'rail2';
  return 'rail1';
}

/** Stage sequence for a path. Contribution appears only where it exists. */
function stageKeysFor(path: OrderPath, includeContribution: boolean): StageKey[] {
  const base: StageKey[] =
    path === 'after_task'
      ? ['requested', 'accepted', 'in_seva']
      : ['requested', 'dakshina', 'accepted', 'in_seva'];
  if (includeContribution) base.push('contribution');
  base.push('blessed');
  return base;
}

/** Who acts while a stage is current (rail-aware for the dakshina stage). */
function actorFor(key: StageKey, path: OrderPath): StageActor {
  switch (key) {
    case 'requested':
      return 'client';
    case 'dakshina':
      // Rail-1: money moves off-app; the PROVIDER's confirmation moves the
      // order. Wallet/rail-2: the CLIENT's payment moves it.
      return path === 'rail1' ? 'provider' : 'client';
    case 'accepted':
    case 'in_seva':
      return 'provider';
    case 'contribution':
      return 'client';
    case 'blessed':
      return 'none';
  }
}

/** Timestamp the order carries for a stage, when one exists — never invented. */
function atFor(key: StageKey, order: OrderLike): string | undefined {
  switch (key) {
    case 'requested':
      return tsToIso(order.createdAt);
    case 'dakshina':
      return tsToIso(order.paidAt) ?? tsToIso(order.rail2Proof?.submittedAt);
    case 'in_seva':
      return tsToIso(order.taskCompletedAt);
    case 'contribution':
      return tsToIso(order.completedAt);
    case 'blessed':
      return tsToIso(order.completedAt);
    default:
      return undefined;
  }
}

/** Index of the current stage for each live status, per stage list. */
function currentIndexFor(status: string, keys: StageKey[]): number {
  const idx = (k: StageKey) => keys.indexOf(k);
  switch (status) {
    case 'pending_payment':
      // Payment paths wait on dakshina; pay-after-task waits on acceptance.
      return idx('dakshina') >= 0 ? idx('dakshina') : idx('accepted');
    case 'paid':
      return idx('accepted');
    case 'accepted':
      return idx('in_seva');
    case 'in_progress':
      return idx('in_seva');
    case 'awaiting_commission':
      return idx('contribution');
    default:
      return 0; // unknown status: journey shown from the start, honestly
  }
}

/** Did the dakshina stage complete before a terminal state? Evidence only. */
function dakshinaWasPaid(order: OrderLike): boolean {
  return Boolean(
    order.walletPaid === true ||
      tsToIso(order.paidAt) ||
      tsToIso(order.rail2Proof?.submittedAt) ||
      tsToIso(order.rail2Proof?.confirmedAt),
  );
}

export function buildOrderTimeline(order: OrderLike): OrderTimelineModel {
  const o = order || {};
  const status = String(o.status || '');
  const path = orderPathOf(o);
  const includeContribution = path === 'after_task' || status === 'awaiting_commission';
  const keys = stageKeysFor(path, includeContribution);

  const mk = (key: StageKey, state: StageState, detail?: string): TimelineStage => ({
    key,
    state,
    actor: actorFor(key, path),
    at: atFor(key, o),
    ...(detail ? { detail } : {}),
  });

  /* ------------------------- terminal states ------------------------- */
  if (status === 'cancelled' || status === 'disputed' || status === 'refunded') {
    const kind = status as TerminalKind;
    const paid = kind === 'refunded' || kind === 'disputed' ? true : dakshinaWasPaid(o);
    const stages = keys.map((k) => {
      if (k === 'requested') return mk(k, 'done');
      if (k === 'dakshina') return mk(k, paid ? 'done' : 'skipped');
      return mk(k, 'skipped');
    });
    return {
      path,
      outcome: kind,
      stages,
      terminal: { kind, at: tsToIso(o.updatedAt) ?? tsToIso(o.completedAt) },
    };
  }

  /* ---------------------------- completed ---------------------------- */
  if (status === 'completed') {
    return {
      path,
      outcome: 'complete',
      stages: keys.map((k) => mk(k, 'done')),
    };
  }

  /* ---------------------------- in journey --------------------------- */
  const cur = Math.max(0, currentIndexFor(status, keys));
  const stages = keys.map((k, i) => {
    if (i < cur) return mk(k, 'done');
    if (i === cur) {
      const detail =
        k === 'in_seva' ? (status === 'in_progress' ? 'underway' : 'to_begin') : undefined;
      return mk(k, 'current', detail);
    }
    return mk(k, 'upcoming');
  });
  // Awaiting-commission: the seva itself is done — say so in the model.
  if (status === 'awaiting_commission') {
    const seva = stages.find((s) => s.key === 'in_seva');
    if (seva) seva.detail = 'offered';
  }
  return { path, outcome: 'in_journey', stages, currentKey: keys[cur] };
}
