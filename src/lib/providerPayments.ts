/**
 * providerPayments.ts — Provider payment method management.
 * ==========================================================
 * Providers can use the platform payment rail (default, commission
 * auto-deducted) or request to use their own QR / UPI / payment link.
 * Own methods need OWNER APPROVAL — this is a commission-protection
 * control, not a rubber stamp.
 *
 * Also: provider → owner inquiry channel ("Contact owner").
 */
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

export type ProviderMethodType = 'platform' | 'own_qr' | 'own_upi' | 'own_link';
export type ProviderMethodStatus = 'pending' | 'approved' | 'rejected' | 'platform_assigned';

export interface ProviderPaymentMethod {
  id?: string;
  providerUid: string;
  providerType: 'purohit' | 'jyotishi';
  providerName?: string;
  methodType: ProviderMethodType;
  details: {
    qrImageUrl?: string;
    upiId?: string;
    paymentLink?: string;
    accountLabel?: string;
  };
  reason?: string; // why the provider wants their own method
  status: ProviderMethodStatus;
  reviewNotes?: string;
  reviewedByUid?: string;
  submittedAt?: any;
  reviewedAt?: any;
}

export interface ProviderInquiry {
  id?: string;
  providerUid: string;
  providerType?: string;
  providerName?: string;
  subject: string;
  message: string;
  status: 'open' | 'replied' | 'closed';
  ownerReply?: string;
  createdAt?: any;
  repliedAt?: any;
}

function requireUser(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  return uid;
}

/* ---------------- Provider: my method ---------------- */

/** The provider's current payment method record, or null if never set (platform default). */
export async function myPaymentMethod(): Promise<ProviderPaymentMethod | null> {
  const uid = requireUser();
  const snap = await getDocs(
    query(collection(db, 'providerPaymentMethods'), where('providerUid', '==', uid), orderBy('submittedAt', 'desc'), limit(1))
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as ProviderPaymentMethod;
}

/** Submit (or re-submit) an own-method request. Always lands as 'pending'. */
export async function submitOwnPaymentMethod(input: {
  providerType: 'purohit' | 'jyotishi';
  providerName?: string;
  methodType: 'own_qr' | 'own_upi' | 'own_link';
  details: ProviderPaymentMethod['details'];
  reason: string;
}): Promise<string> {
  const uid = requireUser();
  if (!input.reason?.trim()) throw new Error('Please explain why you need your own payment method.');
  if (input.methodType === 'own_qr' && !input.details.qrImageUrl) throw new Error('QR image is required.');
  if (input.methodType === 'own_upi' && !input.details.upiId?.trim()) throw new Error('UPI ID is required.');
  if (input.methodType === 'own_link' && !input.details.paymentLink?.trim()) throw new Error('Payment link is required.');

  const ref = await addDoc(collection(db, 'providerPaymentMethods'), {
    providerUid: uid,
    providerType: input.providerType,
    providerName: input.providerName || '',
    methodType: input.methodType,
    details: {
      qrImageUrl: input.details.qrImageUrl || '',
      upiId: (input.details.upiId || '').trim(),
      paymentLink: (input.details.paymentLink || '').trim(),
      accountLabel: (input.details.accountLabel || '').trim().slice(0, 120),
    },
    reason: input.reason.trim().slice(0, 1000),
    status: 'pending',
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Switch back to the platform rail (no approval needed). */
export async function usePlatformPayment(providerType: 'purohit' | 'jyotishi', providerName?: string): Promise<string> {
  const uid = requireUser();
  const ref = await addDoc(collection(db, 'providerPaymentMethods'), {
    providerUid: uid,
    providerType,
    providerName: providerName || '',
    methodType: 'platform',
    details: {},
    status: 'platform_assigned',
    reviewNotes: 'Provider chose platform rail.',
    submittedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
  });
  return ref.id;
}

/* ---------------- Provider: contact owner ---------------- */

export async function contactOwner(input: {
  subject: string;
  message: string;
  providerType?: string;
  providerName?: string;
}): Promise<string> {
  const uid = requireUser();
  if (!input.subject?.trim() || !input.message?.trim()) throw new Error('Subject and message are required.');
  const ref = await addDoc(collection(db, 'providerInquiries'), {
    providerUid: uid,
    providerType: input.providerType || '',
    providerName: input.providerName || '',
    subject: input.subject.trim().slice(0, 120),
    message: input.message.trim().slice(0, 2000),
    status: 'open',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function myInquiries(): Promise<ProviderInquiry[]> {
  const uid = requireUser();
  const snap = await getDocs(
    query(collection(db, 'providerInquiries'), where('providerUid', '==', uid), orderBy('createdAt', 'desc'), limit(50))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ProviderInquiry));
}

/* ---------------- Provider: strikes (read own) ---------------- */

export interface ProviderStrike {
  id?: string;
  providerUid: string;
  type: 'bypass_attempt' | 'payment_fraud' | 'fake_completion' | 'other';
  orderId?: string;
  notes: string;
  strikeNumber: number;
  actionTaken: 'warning' | 'suspension_7d' | 'review_flagged';
  issuedByUid: string;
  createdAt?: any;
}

export async function myStrikes(): Promise<ProviderStrike[]> {
  const uid = requireUser();
  const snap = await getDocs(
    query(collection(db, 'providerStrikes'), where('providerUid', '==', uid), orderBy('createdAt', 'desc'), limit(50))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ProviderStrike));
}
