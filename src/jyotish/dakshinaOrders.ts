/**
 * jyotish/dakshinaOrders.ts — Firestore write path for the dakshina bridge.
 * ===========================================================================
 * Impure companion to the pure dakshinaBridge.ts. Kept separate so the
 * pure logic stays jest-safe (firebase ESM breaks jest transforms).
 */
import {
  collection, doc, getDocs, query, where, limit,
  updateDoc, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { resolveCommissionRate, computeCommission } from '../lib/firestoreAdmin';
import { detectPayRegion } from '../lib/geoDetect';
import {
  canSendDakshina,
  buildDakshinaOrderPayload,
} from './dakshinaBridge';
import type { Consultation } from '../types/jyotish';

function requireUser(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  return uid;
}

/**
 * Dedupe check: is there already a dakshina order for this consultation?
 * Queries the consultationId-linked orders.
 */
export async function findExistingDakshinaOrder(consultationId: string): Promise<string | null> {
  const snap = await getDocs(
    query(
      collection(db, 'marketplaceOrders'),
      where('consultationId', '==', consultationId),
      limit(1),
    ),
  );
  return snap.empty ? null : snap.docs[0].id;
}

/** Default currency from the devotee's region (phone → IP → default). */
export async function defaultDakshinaCurrency(): Promise<string> {
  try {
    const region = await detectPayRegion(auth.currentUser?.phoneNumber || null);
    const map: Record<string, string> = { BD: 'BDT', IN: 'INR', INTL: 'USD' };
    return map[region] || 'INR';
  } catch {
    return 'INR';
  }
}

/**
 * Creates the dakshina order + links it to the consultation.
 * Never auto-called — the devotee always taps to send.
 * Throws on invalid input or duplicate.
 *
 * AUDIT FIX (2026-10-20, Domain 4): the old check-then-act (live order
 * query, then addDoc, then a best-effort link update) had a double-tap /
 * double-tab race — two orders could be created for one consultation
 * before either link write landed. Now the order doc is created INSIDE a
 * transaction that also claims consultation.dakshinaOrderId: a second
 * concurrent attempt sees the claim (or loses the transaction) and
 * throws instead of writing a second order. The order ID is
 * client-generated so no document exists before the claim succeeds —
 * there is no partial state.
 */
export async function createConsultationDakshinaOrder(
  c: Consultation,
  amount: number,
  currency: string,
): Promise<string> {
  const uid = requireUser();
  const elig = canSendDakshina(c, uid);
  if (!elig.ok) throw new Error(`Cannot send dakshina: ${elig.reason}`);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid dakshina amount.');

  // Pre-flight dedupe (friendly error before any heavy work). The
  // transaction below is the authority — this is just a fast path.
  const existing = await findExistingDakshinaOrder(c.id);
  if (existing) throw new Error('Dakshina already recorded for this consultation.');

  const { ratePercent, source, tier } = await resolveCommissionRate(
    c.assignedJyotishUid as string,
    c.consultationType,
    'jyotishi',
    'rail1',
  );
  const { commission, net } = computeCommission(amount, ratePercent);

  const payload = {
    ...buildDakshinaOrderPayload({ consultation: c, amount, currency }),
    commissionPercent: ratePercent,
    commissionAmount: commission,
    providerNet: net,
    commissionSource: source,
    commissionTier: tier,
    createdAt: serverTimestamp(),
  };

  // Client-generated order ref: created inside the transaction so the
  // order and the consultation claim land atomically (or not at all).
  const orderRef = doc(collection(db, 'marketplaceOrders'));
  const consultationRef = doc(db, 'jyotishConsultations', c.id);
  try {
    await runTransaction(db, async (tx) => {
      const cSnap = await tx.get(consultationRef);
      if (!cSnap.exists()) throw new Error('Consultation not found.');
      const fresh = cSnap.data() as any;
      // Re-verify against the FRESH consultation — the UI's copy may be stale.
      if (fresh.devoteeUid !== uid) throw new Error('Cannot send dakshina: not_devotee');
      if (fresh.status !== 'COMPLETED' && fresh.status !== 'DAKSHINA_RELEASED')
        throw new Error('Cannot send dakshina: not_completed');
      if (!fresh.assignedJyotishUid) throw new Error('Cannot send dakshina: no_jyotish');
      if (fresh.dakshinaOrderId)
        throw new Error('Dakshina already recorded for this consultation.');
      tx.set(orderRef, payload);
      // from==to status update adding dakshinaOrderId — rules-legal
      // (consultationTransitionOk allows from==to; immutable fields pinned).
      tx.update(consultationRef, {
        dakshinaOrderId: orderRef.id,
        updatedAt: Date.now(),
      });
    });
  } catch (e: any) {
    if (e?.message?.includes('Dakshina already recorded')) throw e;
    throw new Error(e?.message || 'Could not record dakshina. Please try again.');
  }
  return orderRef.id;
}
