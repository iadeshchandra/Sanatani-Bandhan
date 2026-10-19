/**
 * jyotish/dakshinaOrders.ts — Firestore write path for the dakshina bridge.
 * ===========================================================================
 * Impure companion to the pure dakshinaBridge.ts. Kept separate so the
 * pure logic stays jest-safe (firebase ESM breaks jest transforms).
 */
import {
  collection, doc, getDocs, query, where, limit,
  addDoc, updateDoc, serverTimestamp,
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

  // Belt-and-suspenders dedupe: eligibility check + live query.
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
  const ref = await addDoc(collection(db, 'marketplaceOrders'), payload);

  // Link back to the consultation (from==to status update — rules-legal).
  try {
    await updateDoc(doc(db, 'jyotishConsultations', c.id), {
      dakshinaOrderId: ref.id,
      updatedAt: Date.now(),
    });
  } catch {
    /* link write failed — the order still exists and is queryable */
  }
  return ref.id;
}
