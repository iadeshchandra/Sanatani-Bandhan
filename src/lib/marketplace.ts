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
  addDoc, setDoc, updateDoc, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { resolveCommissionRate, computeCommission, duesCreateForOrder } from './firestoreAdmin';
import { validateRating, nextAvg, canRateStatus } from './gigRatings';
// Re-export pure rating helpers so UI imports stay on marketplace.ts.
export { validateRating, nextAvg, canRateStatus };

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
  // Sort: featured first, then verified providers, then most booked.
  // Deliberately NOT rating-descending — ratings (ashirvad) reflect gratitude,
  // not a leaderboard. Verification + availability lead.
  gigs.sort((a, b) =>
    Number(b.featured || false) - Number(a.featured || false) ||
    Number((b as any).providerVerified ? 1 : 0) - Number((a as any).providerVerified ? 1 : 0) ||
    Number(b.totalOrders || 0) - Number(a.totalOrders || 0)
  );
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
  // Community (free) tier: max 3 active sevas. Pro: unlimited.
  if (!gig.id) {
    try {
      const { getProviderTier } = await import('./firestoreAdmin');
      const tier = await getProviderTier(uid);
      if (tier !== 'pro') {
        const existing = await myGigs();
        const active = existing.filter((g) => g.active !== false);
        if (active.length >= 3) {
          throw new Error('Community tier allows 3 active sevas. Upgrade to Verified Seva Provider for unlimited.');
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('Community tier')) throw e;
      // tier lookup failure fails open — never block on infra hiccups
    }
  }
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
  /** Pay the full amount from the platform wallet at booking (escrow). */
  payWithWallet?: boolean;
  /** Pay the provider directly AFTER the task; commission to platform later. */
  payAfterTask?: boolean;
  /** Sanatani ID of the sharer, from ?ref= — warm recognition, no money. */
  referredBy?: string;
}): Promise<string> {
  const uid = requireUser();
  const gig = await getGig(input.gigId);
  if (!gig || gig.active === false) throw new Error('This service is no longer available.');
  // Gentle lock (Path B): don't let a client stack new bookings with a
  // provider while a previous order awaits its commission. Fail-open.
  try {
    const { awaitingCommissionWith } = await import('./wallet');
    const stuck = await awaitingCommissionWith(gig.providerUid);
    if (stuck > 0) throw new Error('Please complete the commission payment on your previous order with this provider first.');
  } catch (e: any) {
    if (e?.message?.includes('commission payment')) throw e;
    // query errors fail open — never block booking on infra hiccups
  }
  const { ratePercent, source, tier } = await resolveCommissionRate(
    gig.providerUid, gig.category, gig.providerType,
    input.payAfterTask === true ? 'rail2' : 'rail1',
  );
  const { commission, net } = computeCommission(Number(gig.priceAmount), ratePercent);
  const ref = await addDoc(collection(db, 'marketplaceOrders'), {
    gigId: gig.id, gigTitle: gig.title,
    providerUid: gig.providerUid, providerType: gig.providerType,
    clientUid: uid,
    amountGross: Number(gig.priceAmount), currency: gig.priceCurrency || 'INR',
    commissionPercent: ratePercent, commissionAmount: commission, providerNet: net,
    commissionSource: source, commissionTier: tier,
    rail: input.payAfterTask === true ? 'rail2' : 'rail1',
    paymentMethodId: input.paymentMethodId, paymentRef: input.paymentRef || '',
    payWithWallet: input.payWithWallet === true,
    payAfterTask: input.payAfterTask === true,
    status: 'pending_payment',
    clientNotes: (input.clientNotes || '').slice(0, 500),
    scheduledAt: input.scheduledAt || '',
    ...(input.referredBy ? { referredBy: input.referredBy } : {}),
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
  // Wallet-escrow orders: completion releases escrow (provider wallet credit
  // + platform revenue), all in one batched write. Rules validate every leg.
  if (to === 'completed' && o.walletPaid === true && o.payWithWallet === true) {
    const { releaseEscrow } = await import('./wallet');
    await releaseEscrow(id);
    return;
  }
  // Pay-after-task orders: provider marking complete moves to
  // awaiting_commission (Path B gate) — NOT completed.
  if (to === 'completed' && o.payAfterTask === true && isProvider) {
    await updateDoc(doc(db, 'marketplaceOrders', id), {
      status: 'awaiting_commission',
      taskCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }
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

/* ------------------------------ Ratings (Step 7) ------------------------------ */

/**
 * A devotee's blessing on a completed seva. Stored at gigRatings/{orderId}
 * (orderId as doc ID = one rating per order, enforced by construction).
 * Framed as Kritagyata (gratitude), not e-commerce stars — but the numeric
 * rating IS trust infrastructure that populates GigCard and GigDetail.
 */
export interface GigRating {
  gigId: string;
  orderId: string;
  clientUid: string;
  providerUid: string;
  /** 1-5. Displayed as 🪔-warm blessings, never cold stars. */
  rating: number;
  /** Optional written blessing, max 500 chars. */
  review: string;
  createdAt?: any;
}

/**
 * Submit a rating for a completed order. Gated to COMPLETED orders only,
 * one rating per order (doc ID = orderId). Atomically creates the rating
 * and updates the gig's avgRating/ratingCount.
 *
 * Firestore rules (flagged): gigRatings create requires a completed order
 * owned by the caller; gig update branch permits ratingCount +1 and
 * avgRating within 1-5.
 */
export async function submitGigRating(orderId: string, rating: number, review: string): Promise<void> {
  const uid = requireUser();
  const errors = validateRating(rating, review);
  if (errors.length > 0) throw new Error(errors[0]);

  const orderRef = doc(db, 'marketplaceOrders', orderId);
  const ratingRef = doc(db, 'gigRatings', orderId);

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found.');
    const o = orderSnap.data() as any;
    if (o.clientUid !== uid) throw new Error('Only the devotee who received this seva can share blessings.');
    if (!canRateStatus(o.status)) throw new Error('Blessings can only be shared after the seva is complete.');

    const existing = await tx.get(ratingRef);
    if (existing.exists()) throw new Error('You have already shared your blessings for this seva. 🙏');

    const gigRef = doc(db, 'marketplaceGigs', o.gigId);
    const gigSnap = await tx.get(gigRef);
    if (!gigSnap.exists()) throw new Error('This seva is no longer available.');

    const g = gigSnap.data() as any;
    const { avg: newAvg, count: newCount } = nextAvg(
      Number(g.avgRating || 0), Number(g.ratingCount || 0), rating
    );

    tx.set(ratingRef, {
      gigId: o.gigId,
      orderId,
      clientUid: uid,
      providerUid: o.providerUid,
      rating,
      review: (review || '').trim().slice(0, 500),
      createdAt: serverTimestamp(),
    });
    tx.update(gigRef, {
      avgRating: newAvg,
      ratingCount: newCount,
      updatedAt: serverTimestamp(),
    });
  });
}

/** List public blessings for a gig (newest first, bounded). */
export async function getGigRatings(gigId: string, max = 50): Promise<GigRating[]> {
  const snap = await getDocs(
    query(collection(db, 'gigRatings'), where('gigId', '==', gigId), limit(max))
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as any) } as GigRating))
    .sort((a, b) => {
      const ta = (a.createdAt?.toMillis?.() || 0);
      const tb = (b.createdAt?.toMillis?.() || 0);
      return tb - ta;
    });
}

/** Has this order already been rated? (for showing/hiding the prompt) */
export async function hasRated(orderId: string): Promise<boolean> {
  const s = await getDoc(doc(db, 'gigRatings', orderId));
  return s.exists();
}
