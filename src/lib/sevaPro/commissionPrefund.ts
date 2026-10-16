/**
 * commissionPrefund.ts — Seva Professional Phase 3: commission pre-funding.
 * =========================================================================
 * "Dakshina, handled with dignity" — never "pre-funded escrow".
 *
 * THE MECHANISM: before a provider marks a seva complete and receives
 * payment, their Platform (earning) Wallet must hold >= the commission
 * amount. The commission moves to platform revenue atomically with
 * completion — in ONE batched write. This eliminates post-task commission
 * chasing entirely (the Pathao 40%-bypass problem).
 *
 * Design invariants (read before touching):
 *  1. PHASE-2 SHAPES ARE CANONICAL. Professional profiles live in
 *     `purohits` / `jyotishProfiles` (queried by their `uid` field).
 *     Free sevas: `freeSevasRemaining` (>0 → zero commission). Schedule:
 *     `prathamSevaConfigSnapshot.commissionSchedule` — bracket MULTIPLIERS
 *     of the standard rate. The schedule math below mirrors the Phase-2
 *     spec (imported from ./prathamSeva and ./tiers — the canonical
 *     Phase-2 implementations); it is never reimplemented differently.
 *  2. The due NEVER exceeds the booking-time snapshot (commissionAmount).
 *     min(scheduled, snapshot): the booking screen's promise is the ceiling.
 *     "Later rule changes never rewrite history" — and never raise a price.
 *  3. ATOMICITY: one writeBatch — order -> completed, wallet debit (when
 *     due > 0), commission txn, platformRevenue doc, profile counters
 *     (completedSevasSinceVerified +1 always; freeSevasRemaining -1 on free
 *     sevas). All-or-nothing: never take commission without completing,
 *     never complete without securing commission.
 *  4. IDEMPOTENCY: the wallet leg is order-anchored via lastCommissionOrderId
 *     and the profile leg via the same key on the profile doc. Replaying the
 *     batch fails safely (anchors unchanged + order no longer completable).
 *  5. Wallet-escrow orders (payWithWallet): commission is already secured in
 *     CLIENT escrow — no provider pre-fund needed. Completion delegates to
 *     the existing atomic releaseEscrow(). This module extends, never
 *     rewrites, marketplace/wallet logic. (Known residual: escrow-path
 *     completions don't advance the Pratham counters — fail-safe toward the
 *     provider; owner can backfill.)
 *  6. Absent profile / absent fields => FULL snapshot commission. Never a
 *     free pass from missing data.
 *
 * Firestore rules companion: firestore-commissionPrefund.rules (staged
 * alongside). The rules validate every leg server-side (bounded debit,
 * exact-once anchors, narrow profile-counter arm); this lib is the honest
 * client half. Known residual, documented in HANDOFF: the exact due within
 * [1, snapshot] is client-computed — consistent with the existing trust
 * model (the booking client already computes the snapshot the rules pin).
 */
import {
  collection, doc, getDoc, getDocs, query, where, limit,
  setDoc, updateDoc, deleteField, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getWallet, releaseEscrow, type Wallet, type WalletCurrency } from '../wallet';
import type { MarketplaceOrder } from '../marketplace';

/* ------------------------------------------------------------------
 * Phase-2 imports — Pratham Seva schedule math (canonical).
 * ------------------------------------------------------------------
 * The schedule math used to be vendored here (PHASE-2 MIRROR) because the
 * Phase-2 modules were absent from the working tree at staging time.
 * They have since landed (src/lib/sevaPro/prathamSeva.ts, tiers.ts), so
 * this module imports the canonical implementations directly.
 * ------------------------------------------------------------------ */
import {
  effectiveCommissionPercent, consumeFreeSeva, scheduleMultiplierFor,
  DEFAULT_PRATHAM_CONFIG,
  type CommissionScheduleBracket, type PrathamSevaConfig,
} from './prathamSeva';
import { canAcceptPaidSevas } from './tiers';

// Re-export the shared schedule types/config for consumers of this module
// (drop-in compatibility with the former vendored section).
export type { CommissionScheduleBracket, PrathamSevaConfig };
export { DEFAULT_PRATHAM_CONFIG };
export { effectiveCommissionPercent, consumeFreeSeva, scheduleMultiplierFor, canAcceptPaidSevas };

/** Order statuses from which a provider may complete (pre-batch state). */
export const COMPLETABLE_STATUSES = ['paid', 'accepted', 'in_progress'] as const;
const COMPLETABLE: readonly string[] = COMPLETABLE_STATUSES;

/** Profile collections by marketplace providerType. */
const PROFILE_COLLECTIONS = [
  { providerType: 'purohit', collection: 'purohits' },
  { providerType: 'jyotishi', collection: 'jyotishProfiles' },
] as const;

/* ------------------------------ Types ------------------------------ */

/** Phase-2 professional commission profile (defensive: every field optional). */
export interface ProfessionalCommissionProfile {
  uid: string;
  kind: 'purohit' | 'jyotish';
  /** Firestore doc id in the kind's collection (NOT the uid). */
  profileId: string;
  collection: string;
  verificationTier: string;
  /** Welcome free sevas remaining (Pratham Seva). Absent => 0. */
  freeSevasRemaining: number;
  /** Completed sevas since VERIFIED — drives the schedule brackets. */
  completedSevasSinceVerified: number;
  /** Owner-granted schedule snapshot (bracket multipliers). */
  prathamSevaConfigSnapshot?: {
    commissionSchedule?: PrathamSevaConfig['commissionSchedule'];
  };
}

/** Structural view of a marketplace order — only the fields this module needs. */
export interface OrderLike {
  id: string;
  providerUid: string;
  clientUid: string;
  gigTitle?: string;
  amountGross?: number;
  currency?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  providerNet?: number;
  status?: string;
  walletPaid?: boolean;
  payWithWallet?: boolean;
  payAfterTask?: boolean;
}

export interface CommissionDue {
  amount: number;
  currency: string;
  /** Effective percent shown to the provider (schedule-adjusted or snapshot). */
  percent: number;
  isFreeSeva: boolean;
  /**
   * Free sevas remaining AFTER this completion consumes one (free seva),
   * or the current remaining count (non-free). 0 when no profile.
   */
  sevasRemaining: number;
  source: 'free_seva' | 'schedule_tier' | 'order_snapshot';
}

/** Structured shortfall — the UI catches this to show the warm top-up prompt. */
export class PrefundShortfallError extends Error {
  readonly orderId: string;
  readonly due: CommissionDue;
  readonly balance: number;
  readonly shortfall: number;
  constructor(orderId: string, due: CommissionDue, balance: number) {
    super(`Earning wallet shortfall: needs ${due.amount} ${due.currency}, holds ${balance}.`);
    this.name = 'PrefundShortfallError';
    this.orderId = orderId;
    this.due = due;
    this.balance = balance;
    this.shortfall = Math.max(0, due.amount - balance);
  }
}

/* ------------------------------ Pure logic ------------------------------ */

/**
 * Compute the commission due at completion, honoring Phase-2 free sevas and
 * the Pratham Seva schedule tiers (via prathamSeva.ts — never reimplemented).
 * Defensive: a missing profile (or missing fields) means FULL commission
 * from the order snapshot — never a free pass from missing data.
 * The due never exceeds the booking-time snapshot.
 */
export function getCommissionDue(
  order: OrderLike,
  professional?: ProfessionalCommissionProfile | null
): CommissionDue {
  const currency = order.currency || 'BDT';
  const gross = Math.max(0, Math.round(Number(order.amountGross || 0)));
  const snapshot = Math.max(0, Math.round(Number(order.commissionAmount || 0)));
  const snapshotPct = Number(order.commissionPercent || 0);
  const free = Math.max(0, Math.floor(Number(professional?.freeSevasRemaining ?? 0)));

  // Pratham Seva welcome: a remaining free seva zeroes the due.
  if (free > 0) {
    return {
      amount: 0, currency, percent: 0,
      isFreeSeva: true, sevasRemaining: free - 1, source: 'free_seva',
    };
  }

  // Schedule easing: multiplier of the standard (snapshotted) percent.
  // Free-seva zeroing is handled above with the LIVE counter, so pass 0
  // here — the schedule position alone decides the percent.
  if (professional && canAcceptPaidSevas(professional.verificationTier)) {
    const sched = professional.prathamSevaConfigSnapshot?.commissionSchedule;
    const config: PrathamSevaConfig = Array.isArray(sched) && sched.length > 0
      ? { ...DEFAULT_PRATHAM_CONFIG, commissionSchedule: sched }
      : DEFAULT_PRATHAM_CONFIG;
    const effPct = effectiveCommissionPercent(
      snapshotPct, config, professional.completedSevasSinceVerified, 0
    );
    const scheduled = Math.round((gross * effPct) / 100);
    return {
      amount: Math.min(scheduled, snapshot), // booking promise is the ceiling
      currency, percent: effPct,
      isFreeSeva: false, sevasRemaining: 0, source: 'schedule_tier',
    };
  }

  return {
    amount: snapshot, currency, percent: snapshotPct,
    isFreeSeva: false, sevasRemaining: 0, source: 'order_snapshot',
  };
}

/** Can the provider complete right now? Returns ok + shortfall amount. */
export function canCompleteSeva(
  walletBalance: number, due: CommissionDue
): { ok: boolean; shortfall: number } {
  const balance = Math.max(0, Math.floor(Number(walletBalance || 0)));
  const shortfall = Math.max(0, due.amount - balance);
  return { ok: shortfall === 0, shortfall };
}

/** "~N sevas": how many average commissions the balance covers. */
export function estimateSevasCovered(walletBalance: number, avgCommissionPerSeva: number): number {
  const avg = Number(avgCommissionPerSeva || 0);
  if (!(avg > 0)) return 0;
  return Math.floor(Math.max(0, Number(walletBalance || 0)) / avg);
}

/* ------------------------------ Reads ------------------------------ */

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  return uid;
}

/**
 * Find the professional's commission profile by uid. Tries the providerType's
 * collection first, then the other kind (a professional may serve both).
 * Fail-soft: null => full snapshot commission. Profiles are public-read.
 */
export async function findProfessionalProfile(
  uid: string, providerType?: string
): Promise<ProfessionalCommissionProfile | null> {
  const ordered = [...PROFILE_COLLECTIONS].sort(
    (a, b) => Number(b.providerType === providerType) - Number(a.providerType === providerType)
  );
  for (const { providerType: pt, collection: collectionName } of ordered) {
    try {
      const snap = await getDocs(query(collection(db, collectionName), where('uid', '==', uid), limit(1)));
      if (!snap.empty) {
        const d = snap.docs[0].data() as any;
        const cfgSnap = d.prathamSevaConfigSnapshot;
        return {
          uid,
          kind: pt === 'purohit' ? 'purohit' : 'jyotish',
          profileId: snap.docs[0].id,
          collection: collectionName,
          verificationTier: typeof d.verificationTier === 'string' ? d.verificationTier : 'REGISTERED',
          freeSevasRemaining: Math.max(0, Math.floor(Number(d.freeSevasRemaining || 0))),
          completedSevasSinceVerified: Math.max(0, Math.floor(Number(d.completedSevasSinceVerified || 0))),
          prathamSevaConfigSnapshot:
            cfgSnap && typeof cfgSnap === 'object' ? { commissionSchedule: cfgSnap.commissionSchedule } : undefined,
        };
      }
    } catch {
      /* try the next collection */
    }
  }
  return null;
}

export interface CompletionReadiness {
  order: OrderLike;
  professional: ProfessionalCommissionProfile | null;
  due: CommissionDue;
  wallet: Wallet;
  check: { ok: boolean; shortfall: number };
}

function toOrderLike(orderId: string, o: any): OrderLike {
  return {
    id: orderId,
    providerUid: o.providerUid, clientUid: o.clientUid,
    gigTitle: o.gigTitle, amountGross: o.amountGross, currency: o.currency,
    commissionPercent: o.commissionPercent, commissionAmount: o.commissionAmount,
    providerNet: o.providerNet, status: String(o.status || ''),
    walletPaid: o.walletPaid === true, payWithWallet: o.payWithWallet === true,
    payAfterTask: o.payAfterTask === true,
  };
}

/**
 * Check whether the signed-in provider can complete an order right now.
 * Throws (warm message) when the order is not completable or not theirs.
 * Returns readiness (including shortfall) — does NOT throw on shortfall.
 */
export async function checkCompletionReadiness(orderId: string): Promise<CompletionReadiness> {
  const uid = requireUid();
  const orderSnap = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!orderSnap.exists()) throw new Error('Order not found.');
  const o = orderSnap.data() as any;
  if (o.providerUid !== uid) throw new Error('Only the seva provider can complete this seva.');
  const status = String(o.status || '');
  if (status === 'commission_held') {
    throw new Error('This seva is under review — the contribution is on hold until the review completes.');
  }
  if (status === 'completed') throw new Error('This seva is already complete. 🙏');
  if (!COMPLETABLE.includes(status)) {
    throw new Error('This seva cannot be completed from its current state.');
  }
  const order = toOrderLike(orderId, o);
  const [professional, wallet] = await Promise.all([
    findProfessionalProfile(uid, o.providerType),
    getWallet(),
  ]);
  const due = getCommissionDue(order, professional);
  const check = canCompleteSeva(wallet.balance, due);
  return { order, professional, due, wallet, check };
}

/* ------------------------------ Batch planning (pure) ------------------------------ */

export interface ProfileCounterPlan {
  collection: string;
  profileId: string;
  /** Present only when a free seva is consumed. */
  freeSevasRemaining?: number;
  completedSevasSinceVerified: number;
  decrementFreeSeva: boolean;
}

export interface CompletionPlan {
  orderId: string;
  providerUid: string;
  clientUid: string;
  gigTitle: string;
  currency: string;
  due: CommissionDue;
  /** False for free sevas / zero commission — no wallet leg in the batch. */
  debitFromWallet: boolean;
  walletNewBalance: number;
  walletNewTotalSpent: number;
  /** Null when no professional profile was found (counters skipped). */
  profile: ProfileCounterPlan | null;
}

/**
 * Pure: turn readiness into an exact batch plan. Throws PrefundShortfallError
 * when the wallet cannot cover the due. No Firebase calls — fully unit-testable.
 */
export function planCompletion(input: {
  order: OrderLike; professional: ProfessionalCommissionProfile | null; wallet: Wallet;
}): CompletionPlan {
  const { order, professional, wallet } = input;
  const due = getCommissionDue(order, professional);
  const balance = Math.max(0, Math.floor(Number(wallet.balance || 0)));
  const check = canCompleteSeva(balance, due);
  if (!check.ok) throw new PrefundShortfallError(order.id, due, balance);
  const freeSeva = due.isFreeSeva;
  return {
    orderId: order.id,
    providerUid: order.providerUid,
    clientUid: order.clientUid,
    gigTitle: order.gigTitle || 'Seva',
    currency: due.currency,
    due,
    debitFromWallet: due.amount > 0,
    walletNewBalance: balance - due.amount,
    walletNewTotalSpent: Math.max(0, Math.floor(Number(wallet.totalSpent || 0))) + due.amount,
    profile: professional
      ? {
          collection: professional.collection,
          profileId: professional.profileId,
          ...(freeSeva ? { freeSevasRemaining: consumeFreeSeva(professional.freeSevasRemaining) } : {}),
          completedSevasSinceVerified: professional.completedSevasSinceVerified + 1,
          decrementFreeSeva: freeSeva,
        }
      : null,
  };
}

/* ------------------------------ Atomic commit ------------------------------ */

/**
 * Commit the completion batch (all-or-nothing):
 *  1. order -> completed (+ completedVia, commissionCollected, freeSevaApplied?)
 *  2. provider wallet: balance -= due, totalSpent += due, lastCommissionOrderId
 *     (skipped for free seva / zero commission)
 *  3. walletTransactions: 'commission' record (skipped when no debit)
 *  4. platformRevenue/{orderId}: due (0 + waived flags for free seva)
 *  5. profile counters: completedSevasSinceVerified +1 (always);
 *     freeSevasRemaining -1 (free seva only)
 *
 * Rules validate every leg (see firestore-commissionPrefund.rules). A replay
 * fails: the wallet/profile anchors are unchanged on replay and the order is
 * no longer in a completable status. Concurrent completions of two orders
 * fail closed on the profile counter (old+1 mismatch) — safe to retry.
 */
export async function commitCompletionBatch(plan: CompletionPlan): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, 'marketplaceOrders', plan.orderId), {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedVia: 'prefunded_commission',
    commissionCollected: plan.due.amount,
    ...(plan.due.isFreeSeva ? { freeSevaApplied: true } : {}),
    updatedAt: serverTimestamp(),
  });

  if (plan.debitFromWallet) {
    batch.update(doc(db, 'wallets', plan.providerUid), {
      balance: plan.walletNewBalance,
      totalSpent: plan.walletNewTotalSpent,
      lastCommissionOrderId: plan.orderId,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'walletTransactions')), {
      uid: plan.providerUid,
      type: 'commission',
      amount: plan.due.amount,
      currency: plan.currency,
      orderId: plan.orderId,
      note: `Seva contribution for completed seva: ${plan.gigTitle}`,
      createdAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'platformRevenue', plan.orderId), {
    orderId: plan.orderId,
    amount: plan.due.amount,
    currency: plan.currency,
    providerUid: plan.providerUid,
    clientUid: plan.clientUid,
    recordedBy: plan.providerUid,
    ...(plan.due.isFreeSeva ? { commissionWaived: true, waivedReason: 'free_seva' } : {}),
    createdAt: serverTimestamp(),
  });

  if (plan.profile) {
    const pUpdate: Record<string, any> = {
      completedSevasSinceVerified: plan.profile.completedSevasSinceVerified,
      lastCommissionOrderId: plan.orderId,
      updatedAt: serverTimestamp(),
    };
    if (plan.profile.decrementFreeSeva && plan.profile.freeSevasRemaining !== undefined) {
      pUpdate.freeSevasRemaining = plan.profile.freeSevasRemaining;
    }
    batch.update(doc(db, plan.profile.collection, plan.profile.profileId), pUpdate);
  }

  await batch.commit();
}

export interface CompletionResult {
  orderId: string;
  via: 'prefunded' | 'escrow';
  due: CommissionDue;
}

/**
 * The one call the provider UI makes. Routes wallet-escrow orders to the
 * existing atomic releaseEscrow() (commission already secured in client
 * escrow); everything else — including pay-after-task (Path B's post-task
 * chasing is exactly what pre-funding replaces) — goes through the
 * pre-funded batch.
 */
export async function completeSevaWithPrefundedCommission(orderId: string): Promise<CompletionResult> {
  const r = await checkCompletionReadiness(orderId);
  if (r.order.walletPaid === true && r.order.payWithWallet === true) {
    await releaseEscrow(orderId);
    return { orderId, via: 'escrow', due: r.due };
  }
  const plan = planCompletion({ order: r.order, professional: r.professional, wallet: r.wallet });
  await commitCompletionBatch(plan);
  return { orderId, via: 'prefunded', due: r.due };
}

/* ------------------------------ Dispute: freeze, don't take ------------------------------ */

export interface CommissionHold {
  frozenAt?: any;
  frozenByUid?: string;
  disputeId?: string;
  reason?: string;
}

/**
 * Freeze (don't take) the commission when a seva is disputed BEFORE
 * completion. Order -> 'commission_held'; the provider's wallet is untouched
 * and completion is blocked until the hold is released.
 * Creates the dispute doc in the same batch (atomic with the freeze).
 */
export async function freezeCommissionOnDispute(orderId: string, reason: string): Promise<string> {
  const uid = requireUid();
  const orderSnap = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!orderSnap.exists()) throw new Error('Order not found.');
  const o = orderSnap.data() as any;
  if (o.providerUid !== uid && o.clientUid !== uid) throw new Error('Not your order.');
  const status = String(o.status || '');
  if (!COMPLETABLE.includes(status)) {
    throw new Error('Only an active seva can be put on hold.');
  }
  const cleanReason = (reason || '').trim().slice(0, 500);
  if (!cleanReason) throw new Error('Please say what the issue is.');

  const batch = writeBatch(db);
  const disputeRef = doc(collection(db, 'marketplaceDisputes'));
  batch.set(disputeRef, {
    orderId,
    raisedByUid: uid,
    providerUid: o.providerUid,
    clientUid: o.clientUid,
    reason: 'commission_hold',
    details: cleanReason,
    status: 'open',
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'marketplaceOrders', orderId), {
    status: 'commission_held',
    commissionHold: {
      frozenAt: serverTimestamp(),
      frozenByUid: uid,
      disputeId: disputeRef.id,
      reason: cleanReason.slice(0, 280),
    } as CommissionHold,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return disputeRef.id;
}

/**
 * Release a commission hold after dispute resolution. OWNER ONLY (rules
 * enforce; non-owners get a permission error).
 *  - 'provider': hold released -> order back to 'in_progress'; the provider
 *    then completes via the normal pre-funded flow (commission taken then).
 *  - 'client': order -> 'cancelled'; hold cleared; no free seva is consumed.
 *    (Wallet-escrow refunds, if any, are handled via existing owner tooling.)
 */
export async function releaseCommissionHold(
  orderId: string, outcome: 'provider' | 'client', note = ''
): Promise<void> {
  requireUid();
  const orderSnap = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!orderSnap.exists()) throw new Error('Order not found.');
  const o = orderSnap.data() as any;
  if (String(o.status || '') !== 'commission_held') {
    throw new Error('This seva is not on hold.');
  }
  await updateDoc(doc(db, 'marketplaceOrders', orderId), {
    status: outcome === 'provider' ? 'in_progress' : 'cancelled',
    holdReleased: {
      at: serverTimestamp(),
      outcome,
      note: note.slice(0, 280),
    },
    commissionHold: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Request a freeze of commission that was ALREADY taken (dispute on a
 * COMPLETED order). Money has moved, so only the owner can freeze the
 * revenue ledger — this records an idempotent request (doc id = orderId)
 * for the owner to act on (approving sets
 * platformRevenue.{orderId}.commissionFrozen via owner tooling; that
 * collection's update is already owner-only).
 */
export async function requestCommissionFreeze(orderId: string, reason: string): Promise<void> {
  const uid = requireUid();
  const orderSnap = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!orderSnap.exists()) throw new Error('Order not found.');
  const o = orderSnap.data() as any;
  if (o.providerUid !== uid && o.clientUid !== uid) throw new Error('Not your order.');
  if (String(o.status || '') !== 'completed') {
    throw new Error('Commission can only be frozen after completion — use "on hold" for active sevas.');
  }
  const cleanReason = (reason || '').trim().slice(0, 500);
  if (!cleanReason) throw new Error('Please say what the issue is.');
  const ref = doc(db, 'commissionFreezeRequests', orderId);
  const existing = await getDoc(ref);
  if (existing.exists()) throw new Error('A freeze request for this seva is already with the platform. 🙏');
  await setDoc(ref, {
    orderId,
    requestedBy: uid,
    providerUid: o.providerUid,
    clientUid: o.clientUid,
    amount: Number(o.commissionAmount || 0),
    currency: o.currency || 'BDT',
    reason: cleanReason,
    status: 'requested',
    createdAt: serverTimestamp(),
  });
}

/** Re-export for UI convenience. */
export type { WalletCurrency };
export type { MarketplaceOrder };
