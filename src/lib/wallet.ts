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
  addDoc, setDoc, updateDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
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
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedByUid?: string;
  reviewedAt?: any;
  createdAt?: any;
}

export const CURRENCY_SYMBOL: Record<WalletCurrency, string> = { BDT: '৳', INR: '₹', USD: '$' };

export function currencyForRegion(region: 'BD' | 'IN' | 'INTL'): WalletCurrency {
  return region === 'BD' ? 'BDT' : region === 'IN' ? 'INR' : 'USD';
}

export function fmtWallet(amount: number, currency: WalletCurrency): string {
  const sym = CURRENCY_SYMBOL[currency] || '';
  const n = Math.round(Number(amount) || 0).toLocaleString('en-IN');
  return `${sym}${n}`;
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
}): Promise<string> {
  const uid = requireUser();
  const amount = Math.round(Number(input.amount));
  if (!amount || amount <= 0) throw new Error('Enter a valid amount.');
  if (!input.trxId.trim()) throw new Error('Transaction ID is required.');
  const batch = writeBatch(db);
  const claimRef = doc(collection(db, 'topupClaims'));
  batch.set(claimRef, {
    uid,
    amount,
    currency: input.currency,
    paymentMethodId: input.paymentMethodId,
    trxId: input.trxId.trim().slice(0, 120),
    screenshotUrl: (input.screenshotUrl || '').slice(0, 500),
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
    note: `Top-up request via ${input.paymentMethodId}`,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return claimRef.id;
}

/** Own pending top-up claims. */
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
