/**
 * sevaBazarOrders.ts — Seva Bazar Phase 2 order operations.
 * =====================================================================
 * INTEGRATION, not a parallel system: Seva Bazar bookings live in the
 * EXISTING `marketplaceOrders` collection and ride the EXISTING rail2
 * lifecycle (pending_payment → paid → accepted → in_progress →
 * completed → awaiting_commission), the atomic commission batch, the
 * dispute freeze, and dues. This module only adds the devotee-facing
 * creation + the token-advance proof step.
 *
 * Lifecycle in warm words:
 *   pending_payment  = booking requested, token advance awaited
 *   paid             = advance proof submitted by the devotee (rail2Proof)
 *   accepted         = provider tapped "Received ✓" — muhurat held
 *
 * Rules (verified, no changes needed):
 * - create: clientUid == auth.uid && status == 'pending_payment' ✅
 * - client pending→paid with rail2Proof.trxId (rail2 clause) ✅
 * - provider →'accepted' (provider transition clause) ✅
 *
 * Offline-first: Firestore's local persistence queues these writes;
 * they sync when the network returns. The sheet says so honestly.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { resolveCommissionRate, computeCommission } from './firestoreAdmin';
import type { BookingMode, AdvanceRail, MuhuratSlot } from '../sangam/sevaBooking';

function requireUser(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required to book a seva. 🙏');
  return uid;
}

export interface SevaBazarOrderInput {
  serviceCardPostId: string;
  providerUid: string;
  providerName: string;
  providerTier: string;
  serviceLine: string;
  mode: BookingMode;
  slot: MuhuratSlot;
  devoteeName: string;
  gotra?: string;
  notes?: string;
  currency: 'INR' | 'BDT' | 'USD';
  dakshinaSuggested: number;
  shradhaPct: number;
  shradhaExtra: number;
  amountGross: number;
  tokenAdvance: number;
}

/**
 * Create a Seva Bazar booking as a marketplace order (rail2 —
 * pay-after-task with a token advance to hold the muhurat).
 * Commission is snapshotted at creation, exactly like gig orders.
 */
export async function createSevaBazarOrder(input: SevaBazarOrderInput): Promise<string> {
  const uid = requireUser();
  if (uid === input.providerUid) throw new Error('You cannot book your own seva notice. 🙏');
  if (!input.amountGross || input.amountGross <= 0) throw new Error('A dakshina above zero keeps things honest.');

  const { ratePercent, source, tier } = await resolveCommissionRate(
    input.providerUid,
    'seva',
    'purohit',
    'rail2'
  );
  const { commission, net } = computeCommission(input.amountGross, ratePercent);

  const ref = await addDoc(collection(db, 'marketplaceOrders'), {
    // — marketplace order shape (shared lifecycle) —
    gigId: '',
    gigTitle: input.serviceLine.slice(0, 120),
    providerUid: input.providerUid,
    providerType: 'purohit',
    clientUid: uid,
    amountGross: Math.round(input.amountGross),
    currency: input.currency,
    commissionPercent: ratePercent,
    commissionAmount: commission,
    providerNet: net,
    commissionSource: source,
    commissionTier: tier,
    rail: 'rail2',
    payAfterTask: true,
    payWithWallet: false,
    paymentMethodId: 'seva-bazar-advance',
    paymentRef: '',
    status: 'pending_payment',
    clientNotes: (input.notes || '').slice(0, 500),
    scheduledAt: input.slot.dateISO,
    // — seva-bazar extensions (namespaced, never colliding) —
    sevaBazar: {
      postId: input.serviceCardPostId,
      mode: input.mode,
      slot: {
        id: input.slot.id,
        dateISO: input.slot.dateISO,
        dayLabel: input.slot.dayLabel,
        tithi: input.slot.tithi,
      },
      sankalpa: {
        name: input.devoteeName.trim().slice(0, 80),
        ...(input.gotra?.trim() ? { gotra: input.gotra.trim().slice(0, 40) } : {}),
      },
      dakshinaSuggested: Math.round(input.dakshinaSuggested),
      shradhaPct: input.shradhaPct,
      shradhaExtra: Math.round(input.shradhaExtra),
      providerName: input.providerName,
      providerTier: input.providerTier,
      tokenAdvance: {
        amount: Math.round(input.tokenAdvance),
        status: 'awaiting', // awaiting → sent (proof) → received (provider confirmed)
      },
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export interface AdvanceProofInput {
  orderId: string;
  trxId: string;
  rail: AdvanceRail;
}

/**
 * Devotee: "✓ I've sent the advance." Submits the transaction reference
 * as rail2 proof → order becomes `paid` (advance confirmed, muhurat
 * held). Uses the EXISTING client rail2 clause — no rules change.
 */
export async function submitAdvanceProof(input: AdvanceProofInput): Promise<void> {
  const uid = requireUser();
  const trxId = input.trxId.trim();
  if (trxId.length < 4) throw new Error('Please enter the transaction reference from your payment app. 🙏');
  const ref = doc(db, 'marketplaceOrders', input.orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Booking not found.');
  const data = snap.data() as any;
  if (data.clientUid !== uid) throw new Error('This is not your booking.');
  if (data.status !== 'pending_payment') throw new Error('This booking is already past the advance step.');
  await updateDoc(ref, {
    status: 'paid',
    rail2Proof: {
      trxId: trxId.slice(0, 80),
      rail: input.rail,
      sentAt: serverTimestamp(),
    },
    'sevaBazar.tokenAdvance.status': 'sent',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Read a Seva Bazar order (client or provider side). Returns null when
 * missing or not yours — never throws for a stranger's order.
 */
export async function getSevaBazarOrder(orderId: string): Promise<any | null> {
  const uid = auth.currentUser?.uid;
  if (!uid || !orderId) return null;
  const snap = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  if (data.clientUid !== uid && data.providerUid !== uid) return null;
  return { id: snap.id, ...data };
}
