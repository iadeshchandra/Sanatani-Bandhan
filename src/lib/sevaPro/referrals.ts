/**
 * referrals.ts — Seva Professional referral credit engine (Phase 4).
 * =====================================================================
 * The remedy → ritual pipeline: a jyotishi prescribes a remedy, the devotee
 * books a purohit; or a purohit refers the devotee to a jyotishi. The
 * referring professional earns a small credit — a configurable share of the
 * referred seva's value — paid FROM THE PLATFORM'S commission, never from
 * the other provider's earnings.
 *
 * Tamper-proofing (no backend; Spark-native):
 *  - `referredBy` is pinned on the gig/consultation AT CREATION and rules
 *    pin it immutable afterwards (see firestore.rules.snippet.txt).
 *  - The create-time `referredBy` is ANCHORED: for jyotish→purohit the rules
 *    require a real, PENDING remedy prescription naming this devotee and
 *    jyotish; for purohit→jyotish they require a real jyotishReferrals doc.
 *  - `referralAttributions/{orderId}` (deterministic id) is written once at
 *    order creation; rules reject overwrites and settle-time transitions are
 *    validated against the order's terminal state.
 *  - `referralCredits/rc_{orderId}` (deterministic id) is created once at
 *    settle; rules validate the exact integer math against the completed
 *    order and reject duplicates. Owner-only updates (fraud reversal);
 *    no deletes.
 *  - Wallet credit is anchored to the validated credit doc (same pattern as
 *    releaseEscrow): the delta must equal the credit amount exactly.
 *
 * Money model: credit = min(round(sevaValue × referralBps / 10000),
 * platformCommission). The referrer can never take more than the platform
 * earned on that order — the platform keeps the remainder.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import type { GigReferralAttribution } from '../../types/purohit';
import type { ConsultationReferralAttribution } from '../../types/jyotish';
import {
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  DEFAULT_REFERRAL_CONFIG,
  clampReferralPercent,
  percentToBps,
  computeReferralCredit,
} from './referralMath';
import type {
  ComputedReferralCredit,
  DirectionReferralConfig,
  SevaReferralConfig,
} from './referralMath';

export {
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  DEFAULT_REFERRAL_CONFIG,
  clampReferralPercent,
  percentToBps,
  computeReferralCredit,
};
export type { ComputedReferralCredit, DirectionReferralConfig, SevaReferralConfig };

const now = () => Date.now();

export type ReferralDirection = 'jyotish-to-purohit' | 'purohit-to-jyotish';
export type SevaOrderType = 'gig' | 'consultation';

export type { GigReferralAttribution, ConsultationReferralAttribution };

/** A jyotish's remedy prescription: jyotishConsultations/{id}/remedies/{remedyId}. */
export interface RemedyPrescription {
  id: string;
  consultationId: string;
  devoteeUid: string;
  jyotishUid: string;
  jyotishName: string;
  ritualName: string;
  remedyText: string;
  suggestedMuhurat?: string;
  status: 'PENDING' | 'BOOKED' | 'DISMISSED';
  bookedGigId?: string;
  createdAt: number;
}

/** One row per referred order: referralAttributions/{orderId}. */
export interface ReferralAttributionRecord {
  orderId: string;
  orderType: SevaOrderType;
  direction: ReferralDirection;
  referrerUid: string;
  referrerName: string;
  referrerRoleId: string;
  devoteeUid: string;
  consultationId?: string;
  remedyId?: string;
  gigId?: string;
  referralId?: string;
  sevaValue: number;
  platformCommission: number;
  platformCommissionPercent: number;
  status: 'OPEN' | 'SETTLED' | 'SKIPPED_NO_VALUE';
  settledAt?: number;
  creditId?: string;
  createdAt: number;
}

/** The settled credit: referralCredits/rc_{orderId}. */
export interface ReferralCredit {
  id: string;
  orderId: string;
  orderType: SevaOrderType;
  direction: ReferralDirection;
  referrerUid: string;
  referrerName: string;
  sevaValue: number;
  platformCommission: number;
  /** Integer basis points, e.g. 200 = 2%. Canonical — avoids float math in rules. */
  referralBps: number;
  creditAmount: number;
  currency: string;
  status: 'SETTLED' | 'REVERSED';
  createdAt: number;
}

export const REFERRAL_CONFIG_DOC = 'platformConfig/sevaReferralConfig';
const ATTRIBUTIONS = 'referralAttributions';
const CREDITS = 'referralCredits';

function requireUser(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  return uid;
}



/** Read the GodMode referral config (public read; falls back to defaults). */
export async function getReferralConfig(): Promise<SevaReferralConfig> {
  try {
    const snap = await getDoc(doc(db, REFERRAL_CONFIG_DOC));
    if (!snap.exists()) return DEFAULT_REFERRAL_CONFIG;
    const d = snap.data() as Partial<SevaReferralConfig>;
    return {
      'jyotish-to-purohit': {
        enabled: d['jyotish-to-purohit']?.enabled !== false,
        percent: clampReferralPercent(d['jyotish-to-purohit']?.percent ?? 2),
      },
      'purohit-to-jyotish': {
        enabled: d['purohit-to-jyotish']?.enabled !== false,
        percent: clampReferralPercent(d['purohit-to-jyotish']?.percent ?? 2),
      },
    };
  } catch {
    return DEFAULT_REFERRAL_CONFIG;
  }
}

/** GodMode save. Firestore rules restrict this doc to the owner. */
export async function saveReferralConfig(cfg: SevaReferralConfig): Promise<void> {
  const uid = requireUser();
  const clean: SevaReferralConfig = {
    'jyotish-to-purohit': {
      enabled: cfg['jyotish-to-purohit'].enabled,
      percent: clampReferralPercent(cfg['jyotish-to-purohit'].percent),
    },
    'purohit-to-jyotish': {
      enabled: cfg['purohit-to-jyotish'].enabled,
      percent: clampReferralPercent(cfg['purohit-to-jyotish'].percent),
    },
    updatedAt: now(),
    updatedBy: uid,
  };
  await setDoc(doc(db, REFERRAL_CONFIG_DOC), { ...clean, updatedAt: serverTimestamp() }, { merge: true });
}

type OrderDoc = {
  id: string;
  devoteeUid: string;
  assignedPurohitUid?: string;
  assignedJyotishUid?: string;
  status: string;
  dakshinaAgreed?: number;
  budgetMax?: number;
  referredBy?: (GigReferralAttribution | ConsultationReferralAttribution) & { direction: ReferralDirection };
};

function orderCollection(orderType: SevaOrderType): string {
  return orderType === 'gig' ? 'gigs' : 'jyotishConsultations';
}

function orderValue(order: OrderDoc): number {
  return Math.round(Number(order.dakshinaAgreed || 0) > 0 ? Number(order.dakshinaAgreed) : Number(order.budgetMax || 0));
}

function isOrderParty(order: OrderDoc, uid: string): boolean {
  return order.devoteeUid === uid || order.assignedPurohitUid === uid || order.assignedJyotishUid === uid;
}

/**
 * Write referralAttributions/{orderId} once, at order creation. Idempotent:
 * an existing attribution is never overwritten (tamper-proof).
 */
export async function recordReferralAttribution(input: {
  orderId: string;
  orderType: SevaOrderType;
  referredBy: GigReferralAttribution | ConsultationReferralAttribution;
  devoteeUid: string;
  sevaValue: number;
  platformCommission: number;
  platformCommissionPercent: number;
}): Promise<void> {
  const ref = doc(db, ATTRIBUTIONS, input.orderId);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  const rb = input.referredBy as (GigReferralAttribution | ConsultationReferralAttribution) & {
    direction: ReferralDirection;
    consultationId?: string;
    remedyId?: string;
    gigId?: string;
    referralId?: string;
  };
  const record: ReferralAttributionRecord = {
    orderId: input.orderId,
    orderType: input.orderType,
    direction: rb.direction,
    referrerUid: rb.referrerUid,
    referrerName: rb.referrerName,
    referrerRoleId: rb.referrerRoleId,
    devoteeUid: input.devoteeUid,
    sevaValue: Math.round(input.sevaValue),
    platformCommission: Math.round(input.platformCommission),
    platformCommissionPercent: input.platformCommissionPercent,
    status: 'OPEN',
    createdAt: now(),
  };
  if (rb.consultationId) record.consultationId = rb.consultationId;
  if (rb.remedyId) record.remedyId = rb.remedyId;
  if (rb.gigId) record.gigId = rb.gigId;
  if (rb.referralId) record.referralId = rb.referralId;
  await setDoc(ref, record);
}

/**
 * Settle the referral credit when the referred order completes
 * (DAKSHINA_RELEASED — the terminal, devotee-confirmed state).
 *
 * Called by a party of the order (typically the devotee confirming
 * completion). Idempotent: re-running returns the existing credit id.
 *
 * Atomically (one batch): creates referralCredits/rc_{orderId}, credits the
 * referrer's Platform Wallet, appends the wallet transaction, and marks the
 * attribution SETTLED. All amounts are re-validated by Firestore rules
 * against the completed order doc.
 */
export async function settleReferralCredit(input: {
  orderId: string;
  orderType: SevaOrderType;
  /** Platform commission % that applied to this order (e.g. 12). */
  platformCommissionPercent: number;
  currency?: string;
}): Promise<string> {
  const caller = requireUser();
  const creditId = `rc_${input.orderId}`;

  // Idempotency first: an existing credit means "already settled".
  const creditRef = doc(db, CREDITS, creditId);
  const existingCredit = await getDoc(creditRef);
  if (existingCredit.exists()) return creditId;

  const orderSnap = await getDoc(doc(db, orderCollection(input.orderType), input.orderId));
  if (!orderSnap.exists()) throw new Error('Order not found.');
  const order = { id: orderSnap.id, ...(orderSnap.data() as object) } as OrderDoc;

  if (!isOrderParty(order, caller)) throw new Error('Only the order parties can settle a referral credit.');
  if (order.status !== 'DAKSHINA_RELEASED')
    throw new Error('The seva must be complete (dakshina released) before the guidance credit settles.');
  const referredBy = order.referredBy;
  if (!referredBy || !referredBy.referrerUid) throw new Error('This order carries no referral attribution.');

  const config = await getReferralConfig();
  const dirCfg = config[referredBy.direction];
  if (!dirCfg.enabled) {
    await updateDoc(doc(db, ATTRIBUTIONS, input.orderId), { status: 'SKIPPED_NO_VALUE' }).catch(() => undefined);
    throw new Error('Referral credits are currently paused for this direction.');
  }

  const sevaValue = orderValue(order);
  const platformCommission = Math.round((sevaValue * Math.max(0, input.platformCommissionPercent)) / 100);
  const referralBps = percentToBps(dirCfg.percent);
  const computed = computeReferralCredit(sevaValue, referralBps, platformCommission);
  if (computed.creditAmount <= 0) {
    await updateDoc(doc(db, ATTRIBUTIONS, input.orderId), { status: 'SKIPPED_NO_VALUE' }).catch(() => undefined);
    return creditId;
  }

  const currency = input.currency || 'BDT';
  const ts = now();

  const credit: ReferralCredit = {
    id: creditId,
    orderId: input.orderId,
    orderType: input.orderType,
    direction: referredBy.direction,
    referrerUid: referredBy.referrerUid,
    referrerName: referredBy.referrerName,
    sevaValue,
    platformCommission,
    referralBps,
    creditAmount: computed.creditAmount,
    currency,
    status: 'SETTLED',
    createdAt: ts,
  };

  // Referrer wallet: read-then-set with exact-delta merge (rules re-check).
  const walletRef = doc(db, 'wallets', referredBy.referrerUid);
  const walletSnap = await getDoc(walletRef);
  const w = walletSnap.exists() ? (walletSnap.data() as Record<string, number | string>) : null;

  const batch = writeBatch(db);
  batch.set(creditRef, credit);
  batch.set(
    walletRef,
    {
      uid: referredBy.referrerUid,
      balance: Number(w?.balance || 0) + computed.creditAmount,
      currency: (w?.currency as string) || currency,
      totalToppedUp: Number(w?.totalToppedUp || 0),
      totalSpent: Number(w?.totalSpent || 0),
      totalReceived: Number(w?.totalReceived || 0) + computed.creditAmount,
      lastReferralCreditId: creditId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  batch.set(doc(collection(db, 'walletTransactions')), {
    uid: referredBy.referrerUid,
    type: 'referral_credit',
    amount: computed.creditAmount,
    currency: (w?.currency as string) || currency,
    creditId,
    orderId: input.orderId,
    note: `Guidance credit — ${referredBy.direction === 'jyotish-to-purohit' ? 'remedy became ritual' : 'puja led to consultation'} (from the platform's contribution, never from the provider's earnings)`,
    createdAt: serverTimestamp(),
  });
  batch.set(
    doc(db, ATTRIBUTIONS, input.orderId),
    { status: 'SETTLED', settledAt: ts, creditId },
    { merge: true }
  );
  await batch.commit();
  return creditId;
}

/** Owner-only reversal (fraud correction). Rules enforce isSuperAdmin(). */
export async function reverseReferralCredit(creditId: string, reason: string): Promise<void> {
  requireUser();
  const ref = doc(db, CREDITS, creditId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Credit not found.');
  await updateDoc(ref, {
    status: 'REVERSED',
    reversedAt: now(),
    reversalReason: String(reason || '').slice(0, 500),
  });
}

export interface ProviderReferralStats {
  sent: number;
  converted: number;
  conversionRate: number;
  creditsEarned: number;
  creditsPending: number;
}

/** Per-professional stats: referrals sent, converted, credits earned. */
export async function getProviderReferralStats(uid: string): Promise<ProviderReferralStats> {
  const [sentSnap, attrSnap, creditSnap] = await Promise.all([
    getDocs(query(collection(db, 'jyotishReferrals'), where('fromUid', '==', uid), limit(200))),
    getDocs(query(collection(db, ATTRIBUTIONS), where('referrerUid', '==', uid), limit(500))),
    getDocs(query(collection(db, CREDITS), where('referrerUid', '==', uid), limit(500))),
  ]);
  const sent = sentSnap.size;
  const converted = attrSnap.docs.filter((d) => (d.data() as ReferralAttributionRecord).status === 'SETTLED').length;
  let creditsEarned = 0;
  let creditsPending = 0;
  attrSnap.docs.forEach((d) => {
    const a = d.data() as ReferralAttributionRecord;
    if (a.status === 'OPEN') creditsPending += 1;
  });
  creditSnap.docs.forEach((d) => {
    const c = d.data() as ReferralCredit;
    if (c.status === 'SETTLED') creditsEarned += Number(c.creditAmount || 0);
  });
  return {
    sent,
    converted,
    conversionRate: sent > 0 ? converted / sent : 0,
    creditsEarned,
    creditsPending,
  };
}
