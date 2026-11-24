/**
 * auctionBids.ts — AUCTION WAVE A2: sealed-then-open bidding.
 * =====================================================================
 * A sealed lot's bids live one doc per bidder under the lot:
 * `auction_lots/{lotId}/bids/{bidderUid}`. The doc id IS the
 * bidder's uid, so a second live bid is impossible by
 * construction — replacing is an update of the same doc,
 * withdrawing is its deletion, and both are the bidder's own
 * writes, allowed by the rules only while the window stands.
 *
 * THE SEAL, stated plainly (the desk and the bidder card say
 * the same words): before the lot's stored close clock — the
 * notice's auction moment, frozen with the notice — a bid is
 * readable by NO ONE but its own bidder: not other bidders,
 * not the committee, not staff. The Firestore rules enforce
 * exactly that; the committee's first lawful read is after
 * the close. This is access control on ordinary records, NOT
 * cryptographic sealing, and nothing here claims otherwise.
 *
 * THE OPENING is one deliberate committee action (stampBidsOpened):
 * it stamps the lot and appends the tamper-evident audit-chain
 * event, then the desk reads the bids and the A1 acceptance
 * machinery proceeds unchanged — the winning bid becomes the
 * recorded outcome through the same maker–checker step, and
 * settlement posts only through the treasury choke point.
 *
 * The pure half (ranking, the winner judgement, the opening
 * summary) carries no Firestore and is unit-tested; the
 * Firestore half is thin writes shaped by it.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  bidderUidsFromRegistrations,
  patchLot,
  type AuctionLot,
  type LotRegistration,
} from './auctionLots';
import { auditRecorder } from '../context/data/auditStore';

/* ------------------------------------------------------------------ */
/* The bid record                                                      */
/* ------------------------------------------------------------------ */

export interface SealedBid {
  /** The bidder's app account uid — also the doc id. */
  bidderUid: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
}

const bidsCol = (lotId: string) => collection(db, 'auction_lots', lotId, 'bids');
const bidRef = (lotId: string, uid: string) => doc(db, 'auction_lots', lotId, 'bids', uid);

/* ------------------------------------------------------------------ */
/* Pure law: ranking, the winner judgement, the opening summary        */
/* ------------------------------------------------------------------ */

/** Bids in opening order: highest first; equal amounts rank by
 *  the earlier stamp (the bid that stood first wins the tie —
 *  stated here so the desk never improvises it). */
export function rankBids(bids: readonly SealedBid[]): SealedBid[] {
  return [...bids].sort((a, b) => b.amount - a.amount || a.createdAt - b.createdAt);
}

export function highestBid(bids: readonly SealedBid[]): SealedBid | null {
  const ranked = rankBids(bids);
  return ranked.length > 0 ? ranked[0] : null;
}

/** The registration a bid rides on — matched by the account uid
 *  the desk recorded at registration, never by name. */
export function registrationForBid(
  lot: Pick<AuctionLot, 'registrations'>,
  bid: SealedBid
): LotRegistration | null {
  return (lot.registrations ?? []).find((r) => r.bidderUid === bid.bidderUid) ?? null;
}

export interface WinningBid {
  bid: SealedBid;
  registration: LotRegistration;
}

/**
 * The winning bid of an opened sealed lot: the highest bid at
 * or above the reserve, from a bidder whose registration is on
 * the lot. A highest bid from an unregistered account (it can
 * exist only where the rules' demo posture allowed the write)
 * never wins — the A1 gate (the winner must be a registration)
 * is applied here exactly as the desk applies it by hand.
 * Null when no bid clears the reserve: a failed lot, recorded.
 */
export function winningBid(
  lot: Pick<AuctionLot, 'registrations' | 'reservePrice'>,
  bids: readonly SealedBid[]
): WinningBid | null {
  for (const bid of rankBids(bids)) {
    if (bid.amount < lot.reservePrice) break;
    const registration = registrationForBid(lot, bid);
    if (registration) return { bid, registration };
  }
  return null;
}

export interface BidOpeningSummary {
  count: number;
  highest: number | null;
  aboveReserve: number;
  winner: WinningBid | null;
}

/** What the committee sees the moment the bids open. */
export function bidOpeningSummary(
  lot: Pick<AuctionLot, 'registrations' | 'reservePrice'>,
  bids: readonly SealedBid[]
): BidOpeningSummary {
  const top = highestBid(bids);
  return {
    count: bids.length,
    highest: top ? top.amount : null,
    aboveReserve: bids.filter((b) => b.amount >= lot.reservePrice).length,
    winner: winningBid(lot, bids),
  };
}

/** A bid amount is a real bid: a finite, positive number. */
export function bidAmountOk(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

/* ------------------------------------------------------------------ */
/* Firestore half — the bidder's own writes                            */
/* ------------------------------------------------------------------ */

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Place the bidder's one sealed bid (the window, the register
 *  and the shape are the rules' to judge — this writes the doc
 *  the rules expect, nothing more). */
export async function placeBid(lotId: string, uid: string, amount: number, now: number): Promise<SealedBid> {
  if (!bidAmountOk(amount)) throw new Error('amount');
  const bid: SealedBid = { bidderUid: uid, amount, createdAt: now, updatedAt: now };
  await setDoc(bidRef(lotId, uid), clean(bid));
  return bid;
}

/** Replace the amount on the bidder's own live bid. */
export async function replaceBid(lotId: string, uid: string, amount: number, now: number): Promise<void> {
  if (!bidAmountOk(amount)) throw new Error('amount');
  await updateDoc(bidRef(lotId, uid), { amount, updatedAt: now });
}

/** Withdraw the bidder's own bid — possible only while the
 *  window stands; after the close the bid is the record. */
export async function withdrawBid(lotId: string, uid: string): Promise<void> {
  await deleteDoc(bidRef(lotId, uid));
}

/** The bidder's own bid, or null. (Anyone else's bid is not
 *  readable before the opening — the rules refuse, by design.) */
export async function loadMyBid(lotId: string, uid: string): Promise<SealedBid | null> {
  const snap = await getDoc(bidRef(lotId, uid));
  return snap.exists() ? (snap.data() as SealedBid) : null;
}

/** Every bid on the lot — lawful only for the committee after
 *  the close (and for the platform SuperAdmin); the rules
 *  refuse the same read a moment earlier. */
export async function loadLotBids(lotId: string): Promise<SealedBid[]> {
  const snap = await getDocs(bidsCol(lotId));
  return snap.docs.map((d) => d.data() as SealedBid);
}

/* ------------------------------------------------------------------ */
/* The opening — one deliberate, audit-logged committee action         */
/* ------------------------------------------------------------------ */

/**
 * Open a sealed lot's bids: stamp the lot (bidsOpenedAt/By —
 * bookkeeping) and append the audit-chain event (the tamper-
 * evident record of who opened them and when). The stamp does
 * not unseal anything by itself: the committee's read is the
 * rules' close-clock judgement, and this function is called by
 * the desk only once that judgement has passed. Idempotent in
 * effect — a lot already stamped keeps its first stamp (the
 * opening happened once; re-viewing the bids is not a second
 * opening), and no second audit event is written.
 */
export async function stampBidsOpened(
  lot: AuctionLot,
  actor: { uid: string; name?: string; role?: string },
  now: number
): Promise<boolean> {
  if (lot.bidsOpenedAt) return false;
  await patchLot(lot.id, {
    bidsOpenedAt: now,
    bidsOpenedBy: actor.uid,
    ...(actor.name ? { bidsOpenedByName: actor.name } : {}),
  }, now);
  auditRecorder.record({
    workspaceId: lot.workspaceId,
    actorUid: actor.uid,
    actorName: actor.name || '',
    actorRole: actor.role || '',
    action: 'auction.bidsOpened',
    entityType: 'auction_lot',
    entityId: lot.id,
    entityLabel: lot.title,
    summaryKey: 'org.audit.history.auctionBidsOpened',
    summaryParams: { summary: lot.title },
  });
  return true;
}

/** Re-exported for the desk: the register a lot's registrations
 *  imply (the desk stamps it on the lot at every register edit). */
export { bidderUidsFromRegistrations };
