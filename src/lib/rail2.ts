/**
 * rail2.ts — Rail-2 (provider-direct payment) tracking operations.
 * ================================================================
 * Rail 1 = client pays the PLATFORM (Bangla QR / Wise) → platform holds →
 *          provider gets net on payout. Commission auto-secured.
 * Rail 2 = client pays the PROVIDER DIRECTLY via the provider's own
 *          approved QR / UPI / link. The platform must TRACK the payment
 *          and collect its commission as a RECEIVABLE (platform dues).
 *
 * This is Layer 1 + 2 + 6 (client-side parts) of the Rail-2 defense stack:
 *  L1: order-first enforcement — no order record = no review, no payout.
 *  L2: TrxID + amount declaration with provider confirmation.
 *  L6: commission dues auto-created on completed Rail-2 orders.
 */
import {
  collection, doc, getDoc, getDocs, query, where, limit,
  addDoc, setDoc, updateDoc, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { assignPayableAmount, generateOrderCode } from './uniqueAmount';
import { resolveCommissionRate, computeCommission } from './firestoreAdmin';

export type Rail = 'rail1' | 'rail2';

export interface Rail2Proof {
  trxId: string;
  amount: number;
  screenshotUrl?: string;
  submittedAt?: any;
  confirmedAt?: any;
  autoConfirmed?: boolean;
  disputed?: boolean;
  disputeNote?: string;
}

function requireUser(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  return uid;
}

/* ---------------- TrxID validation (Layer 2) ---------------- */

/**
 * Validate a transaction/reference ID by payment method.
 * bKash: 10-char alphanumeric (e.g. 9HXK2LM4PQ). Nagad: 8-char.
 * UPI: 12-digit numeric. Wise: free-form reference.
 */
export function validateTrxId(trxId: string, methodId: string): { ok: boolean; error?: string } {
  const t = (trxId || '').trim();
  if (!t) return { ok: false, error: 'Transaction ID is required.' };
  const m = (methodId || '').toLowerCase();
  if (m.includes('bkash') || m.includes('banglaqr')) {
    if (!/^[A-Za-z0-9]{10}$/.test(t)) return { ok: false, error: 'bKash TrxID is 10 letters/numbers (e.g. 9HXK2LM4PQ).' };
  } else if (m.includes('nagad')) {
    if (!/^[A-Za-z0-9]{6,12}$/.test(t)) return { ok: false, error: 'Nagad TrxID looks wrong — check and retry.' };
  } else if (m.includes('upi')) {
    if (!/^[0-9]{12}$/.test(t)) return { ok: false, error: 'UPI reference is 12 digits.' };
  } else if (m.includes('rocket')) {
    if (!/^[A-Za-z0-9]{6,12}$/.test(t)) return { ok: false, error: 'Rocket TrxID looks wrong — check and retry.' };
  }
  // Wise / Payoneer / other: accept any non-empty reference.
  if (t.length > 64) return { ok: false, error: 'Reference too long.' };
  return { ok: true };
}

/* ---------------- Rail detection ---------------- */

/** Determine which rail an order uses from the provider's payment method record. */
export async function detectRail(providerUid: string): Promise<{ rail: Rail; method: any | null }> {
  try {
    const snap = await getDocs(
      query(collection(db, 'providerPaymentMethods'), where('providerUid', '==', providerUid), limit(20))
    );
    const methods = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    // Latest record wins.
    methods.sort((a, b) => String(b.submittedAt?.toDate?.()?.toISOString?.() || '').localeCompare(
      String(a.submittedAt?.toDate?.()?.toISOString?.() || '')));
    const latest = methods[0];
    if (latest && latest.status === 'approved' && ['own_qr', 'own_upi', 'own_link'].includes(latest.methodType)) {
      return { rail: 'rail2', method: latest };
    }
    return { rail: 'rail1', method: latest || null };
  } catch {
    return { rail: 'rail1', method: null };
  }
}

/* ---------------- Rail-2 order creation ---------------- */

export interface Rail2OrderInput {
  gigId: string;
  clientNotes?: string;
  scheduledAt?: string;
}

/**
 * Atomically allocate the next per-provider Rail-2 order sequence.
 *
 * The old `(query size) + 1` was non-atomic: two clients booking the same
 * provider at once could receive the SAME sequence and therefore the SAME
 * unique payable amount — the owner would then confirm the wrong order
 * paid. A dedicated `rail2Sequences/{providerUid}` counter doc,
 * incremented inside a Firestore transaction, makes the allocation
 * atomic.
 *
 * First booking: the doc doesn't exist yet, so it is seeded from the
 * legacy order count — the new sequence continues where old orders left
 * off instead of restarting at 1 and re-issuing old amounts. Concurrent
 * seeds are harmless (the transaction below serializes the increments).
 *
 * REQUIRES firestore.rules: `match /rail2Sequences/{providerUid}` must
 * allow signed-in clients to create/update { seq, updatedAt } — without
 * it the transaction is denied and booking fails closed (see fallback
 * in createRail2Order).
 */
async function nextRail2OrderSeq(providerUid: string): Promise<number> {
  const seqRef = doc(db, 'rail2Sequences', providerUid);
  const existing = await getDoc(seqRef).catch(() => null);
  if (!existing || !existing.exists()) {
    const priorSnap = await getDocs(
      query(collection(db, 'marketplaceOrders'), where('providerUid', '==', providerUid), limit(500)),
    ).catch(() => null);
    const seed = priorSnap ? priorSnap.size : 0;
    await setDoc(seqRef, { seq: seed, updatedAt: serverTimestamp() }, { merge: true }).catch(
      () => undefined,
    );
  }
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(seqRef);
    const next = (snap.exists() ? Number((snap.data() as { seq?: unknown }).seq) || 0 : 0) + 1;
    tx.set(seqRef, { seq: next, updatedAt: serverTimestamp() }, { merge: true });
    return next;
  });
}

/**
 * Create a Rail-2 order: generates orderCode (SB-XXXXXX) + unique payable
 * amount, snapshots commission, stores provider's payment method details
 * for the client to pay against.
 */
export async function createRail2Order(input: Rail2OrderInput): Promise<{
  orderId: string; orderCode: string; payableAmount: number; display: string; providerMethod: any;
}> {
  const uid = requireUser();
  const { getDoc: gd } = await import('firebase/firestore');
  const gigSnap = await gd(doc(db, 'marketplaceGigs', input.gigId));
  if (!gigSnap.exists()) throw new Error('Service not found.');
  const gig: any = gigSnap.data();
  if (gig.active === false) throw new Error('This service is no longer available.');

  const { rail, method } = await detectRail(gig.providerUid);
  if (rail !== 'rail2' || !method) throw new Error('This provider uses platform payment. Please book normally.');

  // Per-provider order sequence for unique amount assignment — allocated
  // atomically so concurrent bookings can't share a payable amount.
  let orderSeq: number;
  try {
    orderSeq = await nextRail2OrderSeq(gig.providerUid);
  } catch (e) {
    // The atomic counter needs the rail2Sequences rules grant (see
    // nextRail2OrderSeq). Until that ships, fall back to the legacy
    // count — racy but functional — rather than breaking bookings.
    console.warn(
      '[rail2] atomic sequence unavailable, using legacy count:',
      e instanceof Error ? e.message : String(e),
    );
    const priorSnap = await getDocs(
      query(collection(db, 'marketplaceOrders'), where('providerUid', '==', gig.providerUid), limit(500)),
    );
    orderSeq = priorSnap.size + 1;
  }
  const currency = gig.priceCurrency || 'INR';
  const { payableAmount, amountCode, display } = assignPayableAmount(Number(gig.priceAmount), orderSeq, currency);
  const orderCode = generateOrderCode();

  const { ratePercent, source, tier } = await resolveCommissionRate(gig.providerUid, gig.category, gig.providerType, 'rail2');
  const { commission, net } = computeCommission(payableAmount, ratePercent);

  const ref = await addDoc(collection(db, 'marketplaceOrders'), {
    gigId: gigSnap.id, gigTitle: gig.title,
    providerUid: gig.providerUid, providerType: gig.providerType,
    clientUid: uid,
    rail: 'rail2',
    orderCode,
    amountGross: Number(gig.priceAmount), currency,
    payableAmount, amountCode,
    commissionPercent: ratePercent, commissionAmount: commission, providerNet: net,
    commissionSource: `${source} (Rail-2 receivable)`, commissionTier: tier,
    paymentMethodId: `provider:${method.methodType}`,
    providerMethodSnapshot: {
      methodType: method.methodType,
      qrImageUrl: method.details?.qrImageUrl || '',
      upiId: method.details?.upiId || '',
      paymentLink: method.details?.paymentLink || '',
      accountLabel: method.details?.accountLabel || '',
    },
    status: 'pending_payment',
    clientNotes: (input.clientNotes || '').slice(0, 500),
    scheduledAt: input.scheduledAt || '',
    createdAt: serverTimestamp(),
  });
  try {
    await updateDoc(doc(db, 'marketplaceGigs', gigSnap.id), { totalOrders: Number(gig.totalOrders || 0) + 1 });
  } catch { /* non-fatal */ }
  return { orderId: ref.id, orderCode, payableAmount, display, providerMethod: method };
}

/* ---------------- Layer 2: proof submit / confirm / dispute ---------------- */

/** Client submits payment proof for a Rail-2 order. */
export async function submitRail2Proof(orderId: string, trxId: string, amount: number, screenshotUrl?: string): Promise<void> {
  const uid = requireUser();
  const s = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!s.exists()) throw new Error('Order not found.');
  const o: any = s.data();
  if (o.clientUid !== uid) throw new Error('Not your order.');
  if (o.rail !== 'rail2') throw new Error('This order does not use provider-direct payment.');
  if (o.status !== 'pending_payment') throw new Error('Proof already submitted.');
  const v = validateTrxId(trxId, o.paymentMethodId || '');
  if (!v.ok) throw new Error(v.error);
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error('Enter the exact amount you paid.');
  // Warn (don't block) if amount differs from the unique payable amount.
  const mismatch = Math.abs(amt - Number(o.payableAmount || 0)) > 0.01;
  await updateDoc(doc(db, 'marketplaceOrders', orderId), {
    rail2Proof: {
      trxId: trxId.trim().toUpperCase(),
      amount: amt,
      screenshotUrl: screenshotUrl || '',
      amountMismatch: mismatch,
      submittedAt: serverTimestamp(),
    },
    status: 'paid',
    updatedAt: serverTimestamp(),
  });
}

/** Provider confirms receipt of a Rail-2 payment. */
export async function confirmRail2Receipt(orderId: string): Promise<void> {
  const uid = requireUser();
  const s = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!s.exists()) throw new Error('Order not found.');
  const o: any = s.data();
  if (o.providerUid !== uid) throw new Error('Not your order.');
  if (!o.rail2Proof) throw new Error('No payment proof submitted yet.');
  await updateDoc(doc(db, 'marketplaceOrders', orderId), {
    'rail2Proof.confirmedAt': serverTimestamp(),
    'rail2Proof.disputed': false,
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
}

/** Provider disputes the amount (client underpaid / wrong TrxID). */
export async function disputeRail2Amount(orderId: string, note: string): Promise<void> {
  const uid = requireUser();
  if (!note.trim()) throw new Error('Explain the issue.');
  const s = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!s.exists()) throw new Error('Order not found.');
  const o: any = s.data();
  if (o.providerUid !== uid) throw new Error('Not your order.');
  await updateDoc(doc(db, 'marketplaceOrders', orderId), {
    'rail2Proof.disputed': true,
    'rail2Proof.disputeNote': note.trim().slice(0, 500),
    status: 'pending_payment', // back to pending until resolved
    updatedAt: serverTimestamp(),
  });
}

/**
 * Auto-confirm: any Rail-2 proof older than 48h with no dispute moves to
 * accepted. Called opportunistically (provider dashboard load, owner audit).
 * Returns the number auto-confirmed.
 */
export async function autoConfirmStaleProofs(providerUid?: string): Promise<number> {
  const uid = providerUid || auth.currentUser?.uid;
  if (!uid) return 0;
  const snap = await getDocs(query(collection(db, 'marketplaceOrders'), where('providerUid', '==', uid), limit(200)));
  const cutoff = Date.now() - 48 * 3600 * 1000;
  let n = 0;
  for (const d of snap.docs) {
    const o: any = d.data();
    if (o.rail !== 'rail2' || o.status !== 'paid' || !o.rail2Proof || o.rail2Proof.confirmedAt || o.rail2Proof.disputed) continue;
    const submitted = o.rail2Proof.submittedAt?.toDate?.()?.getTime?.() || 0;
    if (submitted && submitted < cutoff) {
      try {
        await updateDoc(doc(db, 'marketplaceOrders', d.id), {
          'rail2Proof.confirmedAt': serverTimestamp(),
          'rail2Proof.autoConfirmed': true,
          status: 'accepted',
          updatedAt: serverTimestamp(),
        });
        n++;
      } catch { /* keep going */ }
    }
  }
  return n;
}

/* ---------------- Layer 6 (client): provider dues ---------------- */

export interface PlatformDue {
  id?: string;
  providerUid: string;
  orderId: string;
  orderCode?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'settled' | 'waived';
  createdAt?: any;
  settledAt?: any;
}

/** Provider reads their own outstanding dues. */
export async function myPlatformDues(): Promise<{ dues: PlatformDue[]; totalPending: number }> {
  const uid = requireUser();
  const snap = await getDocs(query(collection(db, 'platformDues'), where('providerUid', '==', uid), limit(200)));
  const dues = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PlatformDue));
  const totalPending = dues.filter((d) => d.status === 'pending').reduce((s, d) => s + Number(d.amount || 0), 0);
  return { dues, totalPending };
}
