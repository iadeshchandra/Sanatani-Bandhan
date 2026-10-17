/**
 * wallet.ts — Platform wallet + escrow top-up (client).
 * =====================================================
 * Spark-native. The SECURITY model lives in firestore.rules:
 * - Client debits are only valid inside a batched write against a real
 *   marketplace order (pending_payment + payWithWallet). The order doc is
 *   the idempotency key — replays fail because the order is no longer
 *   pending_payment afterwards.
 * - Provider credits are only valid for the exact providerNet of a real
 *   order, initiated by an order party during completion.
 * - Top-up credits happen ONLY via owner approval (topupClaims).
 *
 * A client can NEVER inflate their own balance. Reads fail open (show 0);
 * writes fail closed (rules reject).
 */
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, setDoc, updateDoc, writeBatch, serverTimestamp, onSnapshot,
} from 'firebase/firestore';

import {
  notifyCommissionDue,
  notifyLowBalance,
  notifyPayoutReceived,
  notifyTopupApproved,
  notifyTopupRejected,
} from "../notifications/notifyHelpers";
import { db, auth } from './firebase';

export type WalletCurrency = 'BDT' | 'INR' | 'USD';

export interface Wallet {
  uid: string;
  balance: number;
  currency: WalletCurrency;
  totalToppedUp: number;
  totalSpent: number;
  totalReceived: number;
  lastDebitOrderId?: string;
  lastCreditOrderId?: string;
  /** Pratham Seva bonus claimed — prevents double-grant. */
  hasReceivedFirstTopupBonus?: boolean;
  updatedAt?: any;
}

export interface WalletTransaction {
  id?: string;
  uid: string;
  type: 'topup' | 'spend' | 'receive' | 'commission' | 'refund' | 'adjustment' | 'topup_request';
  amount: number;
  currency: string;
  orderId?: string;
  topupClaimId?: string;
  note?: string;
  createdAt?: any;
}

export interface TopupClaim {
  id?: string;
  uid: string;
  amount: number;
  currency: WalletCurrency;
  paymentMethodId: string;
  trxId: string;
  screenshotUrl?: string;
  /** Unique per-top-up reference, e.g. TOP-XXXXXX. Shown on the instruction screen. */
  reference: string;
  /** Pending claims expire this many hours after creation (client-side display). */
  expiresAt?: any;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedByUid?: string;
  reviewedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

/** Display status including client-side expiry (no backend needed). */
export type TopupClaimDisplayStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export const CURRENCY_SYMBOL: Record<WalletCurrency, string> = { BDT: '৳', INR: '₹', USD: '$' };

/**
 * Top-up limits per currency (betting-site style: shown inline in the form).
 * BD/IN: ৳500–30,000 / ₹500–30,000 · INTL: $10–1,000.
 */
export const TOPUP_LIMITS: Record<WalletCurrency, { min: number; max: number }> = {
  BDT: { min: 500, max: 30000 },
  INR: { min: 500, max: 30000 },
  USD: { min: 10, max: 1000 },
};

/** Pending top-up claims expire after this many hours (client-side display). */
export const TOPUP_EXPIRY_HOURS = 48;

/**
 * Pratham Seva — first-ever approved top-up bonus (flat thank-you credit, no wagering).
 * Granted when the owner's approval credits the user's first approved top-up
 * AND the top-up amount meets the currency's minimum.
 */
export const FIRST_TOPUP_BONUS: Record<WalletCurrency, number> = { BDT: 50, INR: 50, USD: 1 };

export function currencyForRegion(region: 'BD' | 'IN' | 'INTL'): WalletCurrency {
  return region === 'BD' ? 'BDT' : region === 'IN' ? 'INR' : 'USD';
}

export function fmtWallet(amount: number, currency: WalletCurrency): string {
  const sym = CURRENCY_SYMBOL[currency] || '';
  const n = Math.round(Number(amount) || 0).toLocaleString('en-IN');
  return `${sym}${n}`;
}

/**
 * Generate a unique top-up reference like TOP-XXXXXX.
 * Excludes I, O, 0, 1 to avoid visual confusion.
 */
export function generateTopupReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TOP-${ref}`;
}

/** Client-side expiry check — a pending claim past expiresAt shows as Expired. */
export function isClaimExpired(claim: TopupClaim): boolean {
  if (claim.status !== 'pending') return false;
  const exp = (claim.expiresAt as any)?.toDate?.();
  if (!exp) return false;
  return exp.getTime() < Date.now();
}

/** Resolve the user-facing status (pending → expired when past expiresAt). */
export function claimDisplayStatus(claim: TopupClaim): TopupClaimDisplayStatus {
  if (claim.status === 'pending' && isClaimExpired(claim)) return 'expired';
  return claim.status;
}

/** Mask a TrxID for display: show first 4 + last 2, e.g. TRX9…P2. */
export function maskTrxId(trxId: string): string {
  const t = (trxId || '').trim();
  if (t.length <= 6) return t;
  return `${t.slice(0, 4)}…${t.slice(-2)}`;
}

function requireUser(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  return uid;
}

const ZERO_WALLET = (uid: string): Wallet => ({
  uid, balance: 0, currency: 'BDT', totalToppedUp: 0, totalSpent: 0, totalReceived: 0,
});

/**
 * Ensure the signed-in user's wallet doc exists (zero balance).
 * Called on Wallet tab load. The create rule only permits a zero-balance
 * doc for one's own UID — fail-closed, never throws.
 */
export async function ensureWallet(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    const snap = await getDoc(doc(db, 'wallets', uid));
    if (!snap.exists()) {
      await setDoc(doc(db, 'wallets', uid), {
        uid, balance: 0, currency: 'BDT',
        totalToppedUp: 0, totalSpent: 0, totalReceived: 0,
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // fail-closed on write; reads already fail open
  }
}

/** Read own wallet. Fail-open: missing doc → zero balance. Never throws. */
export async function getWallet(): Promise<Wallet> {
  const uid = auth.currentUser?.uid;
  if (!uid) return ZERO_WALLET('anon');
  try {
    const snap = await getDoc(doc(db, 'wallets', uid));
    if (!snap.exists()) return ZERO_WALLET(uid);
    const d = snap.data() as any;
    return {
      uid,
      balance: Number(d.balance || 0),
      currency: (['BDT', 'INR', 'USD'].includes(d.currency) ? d.currency : 'BDT') as WalletCurrency,
      totalToppedUp: Number(d.totalToppedUp || 0),
      totalSpent: Number(d.totalSpent || 0),
      totalReceived: Number(d.totalReceived || 0),
      lastDebitOrderId: d.lastDebitOrderId,
      lastCreditOrderId: d.lastCreditOrderId,
      hasReceivedFirstTopupBonus: Boolean(d.hasReceivedFirstTopupBonus),
      updatedAt: d.updatedAt,
    };
  } catch {
    return ZERO_WALLET(uid);
  }
}

/** Transaction history (own). Newest first. Never throws. */
export async function getTransactions(limitN = 50): Promise<WalletTransaction[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'walletTransactions'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(limitN))
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as WalletTransaction));
  } catch {
    // Index may not exist yet — fall back to unordered.
    try {
      const snap = await getDocs(query(collection(db, 'walletTransactions'), where('uid', '==', uid), limit(limitN)));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as WalletTransaction));
    } catch {
      return [];
    }
  }
}

/** File a top-up claim: "I paid X via method Y, TrxID Z". Owner approves → wallet credited. */
export async function fileTopupClaim(input: {
  amount: number; currency: WalletCurrency; paymentMethodId: string; trxId: string; screenshotUrl?: string;
  /** Pre-generated reference (shown on the instruction screen). Generated here if omitted. */
  reference?: string;
}): Promise<{ claimId: string; reference: string }> {
  const uid = requireUser();
  const amount = Math.round(Number(input.amount));
  const limits = TOPUP_LIMITS[input.currency];
  if (!amount || amount <= 0) throw new Error('Enter a valid amount.');
  if (limits && (amount < limits.min || amount > limits.max)) {
    throw new Error(
      `Amount must be between ${fmtWallet(limits.min, input.currency)} and ${fmtWallet(limits.max, input.currency)}.`
    );
  }
  if (!input.trxId.trim()) throw new Error('Transaction ID is required.');
  const reference = (input.reference || generateTopupReference()).toUpperCase().slice(0, 12);
  const expiresAt = new Date(Date.now() + TOPUP_EXPIRY_HOURS * 60 * 60 * 1000);
  const batch = writeBatch(db);
  const claimRef = doc(collection(db, 'topupClaims'));
  batch.set(claimRef, {
    uid,
    amount,
    currency: input.currency,
    paymentMethodId: input.paymentMethodId,
    trxId: input.trxId.trim().slice(0, 120),
    screenshotUrl: (input.screenshotUrl || '').slice(0, 500),
    reference,
    expiresAt,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  const txnRef = doc(collection(db, 'walletTransactions'));
  batch.set(txnRef, {
    uid,
    type: 'topup_request',
    amount,
    currency: input.currency,
    topupClaimId: claimRef.id,
    note: `Top-up request ${reference} via ${input.paymentMethodId}`,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return { claimId: claimRef.id, reference };
}

/**
 * Self-serve "Edit & resubmit": fix a pending claim's TrxID / screenshot / amount.
 * Only the claim owner can edit, only while pending. Status can never be
 * changed by the user (enforced here AND in firestore.rules).
 */
export async function updateTopupClaim(
  claimId: string,
  patch: { trxId?: string; screenshotUrl?: string; amount?: number }
): Promise<void> {
  const uid = requireUser();
  const ref = doc(db, 'topupClaims', claimId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Claim not found.');
  const claim = snap.data() as any;
  if (claim.uid !== uid) throw new Error('Not your claim.');
  if (claim.status !== 'pending') throw new Error('Only pending claims can be edited.');
  if (isClaimExpired(claim as TopupClaim)) throw new Error('This claim has expired. Please file a new top-up request.');

  const updates: Record<string, any> = { updatedAt: serverTimestamp() };
  if (patch.trxId !== undefined) {
    if (!patch.trxId.trim()) throw new Error('Transaction ID is required.');
    updates.trxId = patch.trxId.trim().slice(0, 120);
  }
  if (patch.screenshotUrl !== undefined) {
    updates.screenshotUrl = patch.screenshotUrl.slice(0, 500);
  }
  if (patch.amount !== undefined) {
    const amt = Math.round(Number(patch.amount));
    const currency = claim.currency as WalletCurrency;
    const limits = TOPUP_LIMITS[currency];
    if (!amt || amt <= 0) throw new Error('Enter a valid amount.');
    if (limits && (amt < limits.min || amt > limits.max)) {
      throw new Error(
        `Amount must be between ${fmtWallet(limits.min, currency)} and ${fmtWallet(limits.max, currency)}.`
      );
    }
    updates.amount = amt;
  }
  await updateDoc(ref, updates);
}

/** Own top-up claims (all statuses). */
export async function myTopupClaims(): Promise<TopupClaim[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  try {
    const snap = await getDocs(query(collection(db, 'topupClaims'), where('uid', '==', uid), limit(50)));
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as TopupClaim));
    list.sort((a, b) => String(b.createdAt?.toDate?.()?.toISOString?.() || '').localeCompare(String(a.createdAt?.toDate?.()?.toISOString?.() || '')));
    return list;
  } catch {
    return [];
  }
}

/**
 * Pay for an order from the wallet. BATched write (all-or-nothing):
 *  1. order: pending_payment → paid, escrowHeld = amountGross
 *  2. wallet: balance -= amountGross (validated by rules against the order)
 *  3. walletTransactions: 'spend' record
 *
 * Throws if balance is insufficient or rules reject.
 */
export async function spendFromWallet(orderId: string): Promise<void> {
  const uid = requireUser();
  const orderSnap = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!orderSnap.exists()) throw new Error('Order not found.');
  const order: any = orderSnap.data();
  if (order.clientUid !== uid) throw new Error('Not your order.');
  if (order.status !== 'pending_payment') throw new Error('Order is not awaiting payment.');
  if (order.payWithWallet !== true) throw new Error('This order is not a wallet order.');
  const gross = Number(order.amountGross || 0);
  if (gross <= 0) throw new Error('Invalid order amount.');

  const walletSnap = await getDoc(doc(db, 'wallets', uid));
  const balance = walletSnap.exists() ? Number((walletSnap.data() as any).balance || 0) : 0;
  if (balance < gross) throw new Error(`Insufficient wallet balance. You have ${fmtWallet(balance, (walletSnap.data() as any)?.currency || 'BDT')}, need ${fmtWallet(gross, (walletSnap.data() as any)?.currency || 'BDT')}.`);

  const w = walletSnap.exists() ? (walletSnap.data() as any) : null;
  const batch = writeBatch(db);
  batch.update(doc(db, 'marketplaceOrders', orderId), {
    status: 'paid',
    escrowHeld: gross,
    walletPaid: true,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'wallets', uid), {
    balance: Number(w?.balance || 0) - gross,
    totalSpent: Number(w?.totalSpent || 0) + gross,
    lastDebitOrderId: orderId,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, 'walletTransactions')), {
    uid,
    type: 'spend',
    amount: gross,
    currency: order.currency || w?.currency || 'BDT',
    orderId,
    note: `Escrow for order: ${order.gigTitle || orderId}`,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

/**
 * Release escrow on order completion. Batched:
 *  1. order → completed
 *  2. provider wallet: balance += providerNet (validated by rules)
 *  3. walletTransactions: provider 'receive' + platform 'commission' records
 *  4. platformRevenue/{orderId}: commission ledger (validated by rules)
 *
 * Called by the client on confirm, or the provider on 48h auto-finalize,
 * or the owner on force-complete.
 */
export async function releaseEscrow(orderId: string): Promise<void> {
  const caller = requireUser();
  const orderSnap = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!orderSnap.exists()) throw new Error('Order not found.');
  const order: any = orderSnap.data();
  const isClient = order.clientUid === caller;
  const isProvider = order.providerUid === caller;
  if (!isClient && !isProvider) throw new Error('Not your order.');
  if (!['paid', 'accepted', 'in_progress'].includes(order.status)) throw new Error('Order cannot be completed from its current state.');
  const net = Number(order.providerNet || 0);
  const commission = Number(order.commissionAmount || 0);
  if (net <= 0) throw new Error('Invalid order amounts.');

  const providerWalletSnap = await getDoc(doc(db, 'wallets', order.providerUid));
  const pw = providerWalletSnap.exists() ? (providerWalletSnap.data() as any) : null;
  const providerExists = providerWalletSnap.exists();

  const batch = writeBatch(db);
  batch.update(doc(db, 'marketplaceOrders', orderId), {
    status: 'completed',
    escrowReleased: true,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // setDoc (not update): works whether the provider wallet exists or not.
  // Rules validate the credit against the order in both paths.
  batch.set(doc(db, 'wallets', order.providerUid), {
    uid: order.providerUid,
    balance: Number(pw?.balance || 0) + net,
    currency: order.currency || pw?.currency || 'BDT',
    totalToppedUp: Number(pw?.totalToppedUp || 0),
    totalSpent: Number(pw?.totalSpent || 0),
    totalReceived: Number(pw?.totalReceived || 0) + net,
    lastCreditOrderId: orderId,
    updatedAt: serverTimestamp(),
    ...(providerExists ? {} : {}),
  }, { merge: true });
  batch.set(doc(collection(db, 'walletTransactions')), {
    uid: order.providerUid,
    type: 'receive',
    amount: net,
    currency: order.currency || 'BDT',
    orderId,
    note: `Payout for completed order: ${order.gigTitle || orderId}`,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, 'walletTransactions')), {
    uid: order.providerUid,
    type: 'commission',
    amount: commission,
    currency: order.currency || 'BDT',
    orderId,
    note: `Platform commission (${order.commissionPercent || 12}%)`,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'platformRevenue', orderId), {
    orderId,
    amount: commission,
    currency: order.currency || 'BDT',
    providerUid: order.providerUid,
    clientUid: order.clientUid,
    recordedBy: caller,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

/** File a commission payment (Path B: post-task direct pay, commission to platform). */
export async function fileCommissionPayment(input: {
  orderId: string; amount: number; currency: string; paymentMethodId: string; trxId: string;
}): Promise<string> {
  const uid = requireUser();
  const orderSnap = await getDoc(doc(db, 'marketplaceOrders', input.orderId));
  if (!orderSnap.exists()) throw new Error('Order not found.');
  const order: any = orderSnap.data();
  if (order.clientUid !== uid && order.providerUid !== uid) throw new Error('Not your order.');
  if (order.status !== 'awaiting_commission') throw new Error('This order is not awaiting commission.');
  const expected = Number(order.commissionAmount || 0);
  const amount = Math.round(Number(input.amount));
  if (amount < expected) throw new Error(`Commission is ${fmtWallet(expected, (order.currency || 'BDT') as WalletCurrency)}. Please pay the full amount.`);
  if (!input.trxId.trim()) throw new Error('Transaction ID is required.');
  const ref = await addDoc(collection(db, 'commissionPayments'), {
    orderId: input.orderId,
    clientUid: order.clientUid,
    providerUid: order.providerUid,
    amount,
    currency: input.currency,
    paidByUid: uid,
    payerRole: order.clientUid === uid ? 'client' : 'provider',
    paymentMethodId: input.paymentMethodId,
    trxId: input.trxId.trim().slice(0, 120),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Count of my orders stuck in awaiting_commission with a given provider (gentle lock). */
export async function awaitingCommissionWith(providerUid: string): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 0;
  try {
    const snap = await getDocs(query(
      collection(db, 'marketplaceOrders'),
      where('clientUid', '==', uid),
      where('providerUid', '==', providerUid),
      where('status', '==', 'awaiting_commission'),
      limit(10)
    ));
    return snap.size;
  } catch {
    return 0; // fail-open: never block booking on a query error
  }
}

/* Phase 3 notification wiring — self-listen watchers                          */
/* =========================================================================== */
/* The rules are self-write-only, so the devotee's own device watches its      */
/* wallet data and emits to ITSELF:                                            */
/*   top-up claim approved  → IMPORTANT (wallet/topupCredited)                 */
/*   top-up claim rejected  → IMPORTANT (wallet/topupRejected)                 */
/*   escrow payout received → GENTLE (wallet/payoutReceived)                   */
/*   seva contribution due  → IMPORTANT (wallet/commissionDue, once per day)   */
/*   wallet running low     → IMPORTANT (wallet/lowBalance, once per day)      */
/* Start once per session (see notifications/NotificationWiring).             */
/* --------------------------------------------------------------------------- */

/** Live subscription to my own top-up claims (newest first, client-sorted). */
export function subscribeMyClaims(cb: (claims: TopupClaim[]) => void) {
  const uid = auth.currentUser?.uid;
  if (!uid) return () => undefined;
  const q = query(collection(db, "topupClaims"), where("uid", "==", uid), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as TopupClaim));
      list.sort((a, b) =>
        String((b.createdAt as any)?.toDate?.()?.toISOString?.() || "").localeCompare(
          String((a.createdAt as any)?.toDate?.()?.toISOString?.() || "")
        )
      );
      cb(list);
    },
    () => cb([])
  );
}

/** Live subscription to my own wallet doc. */
export function subscribeMyWallet(cb: (w: Wallet | null) => void) {
  const uid = auth.currentUser?.uid;
  if (!uid) return () => undefined;
  return onSnapshot(
    doc(db, "wallets", uid),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const d = snap.data() as any;
      cb({
        uid,
        balance: Number(d.balance || 0),
        currency: (["BDT", "INR", "USD"].includes(d.currency) ? d.currency : "BDT") as WalletCurrency,
        totalToppedUp: Number(d.totalToppedUp || 0),
        totalSpent: Number(d.totalSpent || 0),
        totalReceived: Number(d.totalReceived || 0),
        updatedAt: d.updatedAt,
      });
    },
    () => cb(null)
  );
}

/** Live subscription to my recent wallet transactions (for payout detection). */
export function subscribeMyWalletTransactions(cb: (txns: WalletTransaction[]) => void) {
  const uid = auth.currentUser?.uid;
  if (!uid) return () => undefined;
  const q = query(collection(db, "walletTransactions"), where("uid", "==", uid), limit(50));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as WalletTransaction))),
    () => cb([])
  );
}

/** Balance below this (in wallet currency units) counts as "running low". */
export const LOW_BALANCE_THRESHOLD = 200;

function dayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Watch my wallet + claims + dues and notify on transitions.
 * Returns an unsubscribe. The first snapshots are baselines (no
 * notifications for history); only transitions afterwards emit.
 */
export function startWalletNotify(uid: string): () => void {
  if (!uid || uid === "anon") return () => undefined;
  const cleanups: Array<() => void> = [];
  const stop = () => {
    for (const c of cleanups) {
      try {
        c();
      } catch {
        /* best-effort */
      }
    }
  };

  // --- Top-up claims: pending → approved / rejected -------------------------
  const claimStatus = new Map<string, string>();
  let claimsBaselined = false;
  cleanups.push(
    subscribeMyClaims((claims) => {
      for (const c of claims) {
        const id = c.id ?? "";
        const prev = claimStatus.get(id);
        claimStatus.set(id, c.status);
        if (!claimsBaselined) continue;
        if (prev === "pending" && (c.status === "approved" || c.status === "rejected")) {
          const amount = fmtWallet(Number(c.amount || 0), c.currency);
          if (c.status === "approved") void notifyTopupApproved(uid, amount, id);
          else void notifyTopupRejected(uid, amount, id);
        }
      }
      claimsBaselined = true;
    })
  );

  // --- Payouts: new 'receive' transactions tied to an order ------------------
  const seenTxn = new Set<string>();
  let txnsBaselined = false;
  cleanups.push(
    subscribeMyWalletTransactions((txns) => {
      for (const t of txns) {
        const id = t.id ?? "";
        if (seenTxn.has(id)) continue;
        seenTxn.add(id);
        if (!txnsBaselined) continue;
        if (t.type === "receive" && t.orderId && Number(t.amount || 0) > 0) {
          void notifyPayoutReceived(uid, fmtWallet(Number(t.amount), (t.currency || "BDT") as WalletCurrency), t.orderId);
        }
      }
      txnsBaselined = true;
    })
  );

  // --- Low balance: transition into "low" -----------------------------------
  let wasLow: boolean | null = null;
  let lowNotifiedDay = "";
  cleanups.push(
    subscribeMyWallet((w) => {
      if (!w) return;
      const low = w.balance < LOW_BALANCE_THRESHOLD;
      const today = dayKey();
      if (low && wasLow !== true && lowNotifiedDay !== today) {
        lowNotifiedDay = today;
        void notifyLowBalance(uid, fmtWallet(w.balance, w.currency), today);
      }
      wasLow = low;
    })
  );

  // --- Seva contribution due: my provider orders awaiting commission ---------
  // Polled lightly (30s) — these change rarely; a snapshot listener would
  // need a composite index. Once per order per day.
  const duesNotified = new Map<string, string>(); // orderId -> dayKey
  const checkDues = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "marketplaceOrders"),
          where("providerUid", "==", uid),
          where("status", "==", "awaiting_commission"),
          limit(10)
        )
      );
      const today = dayKey();
      for (const d of snap.docs) {
        const o = d.data() as any;
        if (duesNotified.get(d.id) === today) continue;
        duesNotified.set(d.id, today);
        const amount = fmtWallet(Number(o.commissionAmount || 0), (String(o.currency || "BDT") as WalletCurrency));
        void notifyCommissionDue(uid, amount, d.id, today);
      }
    } catch {
      /* fail-open: never block on a dues read */
    }
  };
  void checkDues();
  const duesTimer = setInterval(() => void checkDues(), 30_000);
  cleanups.push(() => clearInterval(duesTimer));

  return stop;
}
