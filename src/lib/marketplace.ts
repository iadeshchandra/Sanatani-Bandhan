/**
 * marketplace.ts — Client-side Fiverr-like marketplace operations.
 * =================================================================
 * Spark-native: direct Firestore reads/writes. Rules enforce:
 * - Gigs: public read; provider owns their gigs; owner moderates.
 * - Orders: client creates; provider/client read own; status moves gated.
 * - Disputes: parties open; owner resolves.
 * - Payouts: provider requests own; owner approves.
 *
 * Commission snapshots at order creation (resolveCommissionRate):
 * later rule changes never rewrite history.
 */
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { resolveCommissionRate, computeCommission, duesCreateForOrder } from './firestoreAdmin';

export interface Gig {
  id?: string;
  providerUid: string;
  providerType: 'purohit' | 'jyotishi';
  providerName?: string;
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  durationMinutes: number;
  category: string;
  languages: string[];
  active: boolean;
  featured?: boolean;
  avgRating: number;
  totalOrders: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface MarketplaceOrder {
  id?: string;
  gigId: string;
  gigTitle: string;
  providerUid: string;
  providerType: string;
  clientUid: string;
  amountGross: number;
  currency: string;
  commissionPercent: number;
  commissionAmount: number;
  providerNet: number;
  commissionSource: string;
  paymentMethodId: string;
  paymentRef?: string;
  status: string;
  clientNotes?: string;
  scheduledAt?: string;
  createdAt?: any;
}

const tsIso = (v: any): string | undefined => {
  try {
    if (!v) return undefined;
    if (typeof v === 'string') return v;
    if (v.toDate) return v.toDate().toISOString();
    return undefined;
  } catch { return undefined; }
};

function requireUser(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  return uid;
}

/* ------------------------------ Gigs ------------------------------ */

export async function listGigs(filters: {
  category?: string; providerType?: string; maxPrice?: number;
  search?: string; featuredOnly?: boolean; limit?: number;
} = {}): Promise<Gig[]> {
  const snap = await getDocs(query(collection(db, 'marketplaceGigs'), where('active', '==', true), limit(200)));
  let gigs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Gig));
  if (filters.category && filters.category !== 'all') gigs = gigs.filter((g) => g.category === filters.category);
  if (filters.providerType && filters.providerType !== 'all') gigs = gigs.filter((g) => g.providerType === filters.providerType);
  if (filters.maxPrice) gigs = gigs.filter((g) => Number(g.priceAmount) <= filters.maxPrice!);
  if (filters.featuredOnly) gigs = gigs.filter((g) => g.featured === true);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    gigs = gigs.filter((g) => `${g.title} ${g.description} ${g.providerName || ''}`.toLowerCase().includes(q));
  }
  // Featured first, then rating
  gigs.sort((a, b) => Number(b.featured || false) - Number(a.featured || false) || Number(b.avgRating || 0) - Number(a.avgRating || 0));
  return gigs.slice(0, filters.limit || 100);
}

export async function getGig(id: string): Promise<Gig | null> {
  const s = await getDoc(doc(db, 'marketplaceGigs', id));
  return s.exists() ? ({ id: s.id, ...(s.data() as any) } as Gig) : null;
}

export async function myGigs(): Promise<Gig[]> {
  const uid = requireUser();
  const snap = await getDocs(query(collection(db, 'marketplaceGigs'), where('providerUid', '==', uid), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Gig));
}

export async function saveGig(gig: Partial<Gig> & { id?: string }): Promise<string> {
  const uid = requireUser();
  if (!gig.title?.trim()) throw new Error('Title is required.');
  if (!gig.priceAmount || gig.priceAmount <= 0) throw new Error('Price must be positive.');
  const payload = {
    providerUid: uid,
    providerType: gig.providerType || 'purohit',
    providerName: gig.providerName || '',
    title: gig.title.trim().slice(0, 120),
    description: (gig.description || '').trim().slice(0, 2000),
    priceAmount: Math.round(Number(gig.priceAmount)),
    priceCurrency: gig.priceCurrency || 'INR',
    durationMinutes: Number(gig.durationMinutes) || 60,
    category: gig.category || 'Other',
    languages: Array.isArray(gig.languages) ? gig.languages.slice(0, 8) : [],
    active: gig.active !== false,
    updatedAt: serverTimestamp(),
  };
  if (gig.id) {
    await updateDoc(doc(db, 'marketplaceGigs', gig.id), payload);
    return gig.id;
  }
  const ref = await addDoc(collection(db, 'marketplaceGigs'), {
    ...payload, avgRating: 0, totalOrders: 0, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setGigActive(id: string, active: boolean): Promise<void> {
  requireUser();
  await updateDoc(doc(db, 'marketplaceGigs', id), { active, updatedAt: serverTimestamp() });
}

/* ------------------------------ Orders ------------------------------ */

export async function createOrder(input: {
  gigId: string; paymentMethodId: string; paymentRef?: string;
  clientNotes?: string; scheduledAt?: string;
}): Promise<string> {
  const uid = requireUser();
  const gig = await getGig(input.gigId);
  if (!gig || gig.active === false) throw new Error('This service is no longer available.');
  const { ratePercent, source } = await resolveCommissionRate(gig.providerUid, gig.category, gig.providerType);
  const { commission, net } = computeCommission(Number(gig.priceAmount), ratePercent);
  const ref = await addDoc(collection(db, 'marketplaceOrders'), {
    gigId: gig.id, gigTitle: gig.title,
    providerUid: gig.providerUid, providerType: gig.providerType,
    clientUid: uid,
    amountGross: Number(gig.priceAmount), currency: gig.priceCurrency || 'INR',
    commissionPercent: ratePercent, commissionAmount: commission, providerNet: net,
    commissionSource: source,
    paymentMethodId: input.paymentMethodId, paymentRef: input.paymentRef || '',
    status: 'pending_payment',
    clientNotes: (input.clientNotes || '').slice(0, 500),
    scheduledAt: input.scheduledAt || '',
    createdAt: serverTimestamp(),
  });
  // Increment gig order count
  try {
    await updateDoc(doc(db, 'marketplaceGigs', gig.id as string), { totalOrders: Number(gig.totalOrders || 0) + 1 });
  } catch { /* non-fatal */ }
  return ref.id;
}

export async function myOrdersAsClient(): Promise<MarketplaceOrder[]> {
  const uid = requireUser();
  const snap = await getDocs(query(collection(db, 'marketplaceOrders'), where('clientUid', '==', uid), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), createdAt: tsIso((d.data() as any).createdAt) } as MarketplaceOrder))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function myOrdersAsProvider(): Promise<MarketplaceOrder[]> {
  const uid = requireUser();
  const snap = await getDocs(query(collection(db, 'marketplaceOrders'), where('providerUid', '==', uid), limit(200)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), createdAt: tsIso((d.data() as any).createdAt) } as MarketplaceOrder))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Provider: accept / decline / start / complete. Client: confirm / cancel. */
export async function orderTransition(id: string, to: 'accepted' | 'cancelled' | 'in_progress' | 'completed'): Promise<void> {
  const uid = requireUser();
  const s = await getDoc(doc(db, 'marketplaceOrders', id));
  if (!s.exists()) throw new Error('Order not found.');
  const o: any = s.data();
  const isProvider = o.providerUid === uid;
  const isClient = o.clientUid === uid;
  const allowed =
    (isProvider && ['accepted', 'cancelled', 'in_progress', 'completed'].includes(to)) ||
    (isClient && ['completed', 'cancelled'].includes(to) && (o.status === 'pending_payment' || o.status === 'paid'));
  if (!allowed) throw new Error('You cannot move this order to that status.');
  await updateDoc(doc(db, 'marketplaceOrders', id), {
    status: to,
    ...(to === 'completed' ? { completedAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });
  // Rail-2: completing an order creates the platform's commission receivable.
  // Idempotent (checks for existing due). Fail-open: never blocks completion.
  if (to === 'completed' && o.rail === 'rail2') {
    try {
      await duesCreateForOrder(id);
    } catch { /* non-fatal — owner can backfill from the Risk tab */ }
  }
}

export async function openDispute(orderId: string, reason: string, details: string): Promise<string> {
  const uid = requireUser();
  const s = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!s.exists()) throw new Error('Order not found.');
  const o: any = s.data();
  if (o.clientUid !== uid && o.providerUid !== uid) throw new Error('Not your order.');
  const ref = await addDoc(collection(db, 'marketplaceDisputes'), {
    orderId, raisedByUid: uid, providerUid: o.providerUid, clientUid: o.clientUid,
    reason: reason.slice(0, 120), details: details.slice(0, 2000),
    status: 'open', createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'marketplaceOrders', orderId), { status: 'disputed', updatedAt: serverTimestamp() });
  return ref.id;
}

/* ------------------------------ Payouts ------------------------------ */

export async function requestPayout(input: {
  amount: number; method: 'bkash' | 'nagad' | 'bank' | 'wise'; accountDetails: string;
}): Promise<string> {
  const uid = requireUser();
  if (!input.amount || input.amount <= 0) throw new Error('Amount must be positive.');
  // Verify the provider actually has this much available (completed orders net - paid payouts)
  const [orders, payouts] = await Promise.all([myOrdersAsProvider(), listMyPayouts()]);
  let earned = 0;
  for (const o of orders) if (o.status === 'completed') earned += Number(o.providerNet || 0);
  let paidOut = 0;
  for (const p of payouts) if (['requested', 'approved', 'paid'].includes(p.status)) paidOut += Number(p.amount || 0);
  const available = earned - paidOut;
  if (input.amount > available) throw new Error(`Only ₹${Math.round(available).toLocaleString('en-IN')} available for payout.`);
  const ref = await addDoc(collection(db, 'payouts'), {
    providerUid: uid, amount: Math.round(input.amount), method: input.method,
    accountDetails: input.accountDetails.slice(0, 300),
    status: 'requested', requestedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyPayouts(): Promise<any[]> {
  const uid = requireUser();
  const snap = await getDocs(query(collection(db, 'payouts'), where('providerUid', '==', uid), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function providerEarningsSummary(): Promise<{ earned: number; pending: number; paidOut: number; available: number }> {
  const [orders, payouts] = await Promise.all([myOrdersAsProvider(), listMyPayouts()]);
  let earned = 0, pending = 0, paidOut = 0;
  for (const o of orders) {
    if (o.status === 'completed') earned += Number(o.providerNet || 0);
    else if (['paid', 'accepted', 'in_progress'].includes(o.status)) pending += Number(o.providerNet || 0);
  }
  for (const p of payouts) if (['requested', 'approved', 'paid'].includes(p.status)) paidOut += Number(p.amount || 0);
  return { earned, pending, paidOut, available: Math.max(0, earned - paidOut) };
}
