/**
 * auctionLive.ts — AUCTION WAVE A3: open ascending live bidding.
 * =====================================================================
 * A live lot's bids live in an append-only log under the lot:
 * `auction_lots/{lotId}/liveBids/{bidId}` — one doc per bid,
 * create-only (the rules deny update and delete to everyone;
 * a bid, once landed, is the record and cannot be taken back).
 * Beside the log sits one mirror doc, `liveBids/_arena`, which
 * exists for exactly one reason: the lot doc itself is
 * staff-read only (it carries every bidder's phone and ID
 * reference), so the arena is the bidder-readable copy of the
 * lot's public stamps — highest bid, count, close clock — and
 * nothing else. The rules pin every arena move to the lot's own
 * bid-verified after-state, so the mirror can never drift from
 * the record.
 *
 * THE ARENA IS OPEN, stated plainly (the desk, the bidder card
 * and the printed notice all say the same words): while a live
 * lot is running, anyone signed in can watch every bid as it
 * lands — bidder, amount, moment. That openness is the
 * anti-collusion defence: a quiet arrangement cannot survive a
 * public log. This is the exact opposite of A2's sealed mode,
 * and the two are never blurred.
 *
 * ONE WRITER: every bid goes through placeLiveBid's Firestore
 * transaction — read the lot, judge the bid against the fresh
 * state (window, register, EMD, bar, amount), then append the
 * bid + move the lot's stamps + move the arena, atomically.
 * The firestore.rules pin the same truths independently
 * (liveBidCreateOk against the lot's stored state;
 * liveBidMoveOk against the new bid's after-state), so a forged
 * or below-increment write from any other path is refused even
 * though it never came near this service. Simultaneous honest
 * bids resolve in recorded order: the transaction that commits
 * second re-reads the winner's stamp and its amount must clear
 * the NEW highest + increment, or it fails as outbid.
 *
 * THE EXTENSION, stated plainly: if a bid lands within the
 * last 5 minutes before the close, the close becomes that
 * bid's moment + 5 minutes. It is the only way the close ever
 * moves; the lot counts its extensions and every extending bid
 * is identifiable in the log (its moment sits inside the old
 * close's last 5 minutes). The service computes the new close
 * from its own clock; the rules accept it within a 15-second
 * band around the server's bid moment + 5 minutes — device
 * clocks and network latency are real, and the band is the
 * honest allowance for them. The deadline every later bid is
 * judged against is the close stored on the lot.
 *
 * EMD GATE: a bidder may bid only when their registration on
 * the lot carries EMD recorded at or above the notice's EMD
 * and not refunded — the desk-derived liveEmdUids register on
 * the lot is what the rules check; emdUidsFromRegistrations is
 * the one derivation, stamped by the desk in the same writes
 * that stamp bidderUids.
 *
 * THE BAR: the org-wide defaulter bar is the workspace doc's
 * `auctionBarredUids` array (the P2b pollTemplates precedent —
 * no new collection), writable only through a narrow board-only
 * rules branch. The bid rules check it on both electronic
 * paths (live and sealed); the lot rules refuse to grow a
 * lot's bidder register with a barred uid. Barring is always a
 * deliberate, on-record desk action — never automatic.
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  isLiveLot,
  liveCloseMs,
  patchLot,
  transitionLot,
  type AuctionLot,
  type LotRegistration,
} from './auctionLots';

/* ------------------------------------------------------------------ */
/* The records                                                         */
/* ------------------------------------------------------------------ */

export interface LiveBid {
  /** The liveBids doc id — also stamped on the lot as
   *  highestBidId while this bid stands highest. */
  id: string;
  bidderUid: string;
  bidderName: string;
  /** The registration this bid rides on (LotRegistration.id). */
  registrationId: string;
  amount: number;
  /** Server timestamp; null in a local snapshot before the
   *  server stamp lands. */
  createdAt: Timestamp | null;
  entryMode: 'self' | 'hall';
  /** Hall entries only: the conductor who took the bid in the
   *  hall and typed it in — displayed as such, never hidden. */
  enteredByUid?: string;
}

/** The bidder-readable mirror of the lot's public stamps. */
export interface LiveArena {
  highestBid: number;
  highestBidderUid: string;
  highestBidderName: string;
  highestBidId: string;
  bidCount: number;
  extensions: number;
  closeAt: number;
  bidIncrement: number;
  reservePrice: number;
}

export const ARENA_DOC_ID = '_arena';

const liveCol = (lotId: string) => collection(db, 'auction_lots', lotId, 'liveBids');
const liveBidRef = (lotId: string, bidId: string) => doc(db, 'auction_lots', lotId, 'liveBids', bidId);
const arenaRef = (lotId: string) => doc(db, 'auction_lots', lotId, 'liveBids', ARENA_DOC_ID);
const lotRef = (lotId: string) => doc(db, 'auction_lots', lotId);

const newLiveBidId = () =>
  `lb_${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;

/* ------------------------------------------------------------------ */
/* Pure law: window, EMD, amounts, the extension, the stamps           */
/* ------------------------------------------------------------------ */

/** A bid inside the last 5 minutes before the close extends it. */
export const LIVE_EXTENSION_WINDOW_MS = 300_000;

export type LiveWindowState = 'not-open' | 'open' | 'closed';

/**
 * Where a live lot's bidding window stands, judged from the
 * record itself (the same facts the rules judge):
 *  - 'open'   — live mode, status 'open', the close clock ahead;
 *  - 'closed' — the close clock has passed;
 *  - 'not-open' — anything else.
 */
export function liveWindowState(
  lot: Pick<AuctionLot, 'lotMode' | 'status' | 'closeAt' | 'notice'>,
  now: number
): LiveWindowState {
  if (!isLiveLot(lot)) return 'not-open';
  const close = liveCloseMs(lot);
  if (close > 0 && now >= close) return 'closed';
  if (lot.status === 'open' && close > 0 && now < close) return 'open';
  return 'not-open';
}

/**
 * One registration's EMD truth — the gate A3 bids stand on.
 * A1 records EMD on the registration itself (amount, mode,
 * reference, receivedAt, refundedAt); the honest gate is
 * exactly those fields: money recorded at or above the
 * notice's EMD, received, and not since refunded. When the
 * notice asks no EMD (0), any recorded receipt qualifies —
 * the registration's receivedAt stamp is the desk's own
 * record that the bidder was taken on.
 */
export function emdRecordedOk(
  reg: Pick<LotRegistration, 'emdAmount' | 'receivedAt' | 'refundedAt'>,
  noticeEmd: number
): boolean {
  if (reg.refundedAt) return false;
  if (!(reg.receivedAt > 0)) return false;
  return (reg.emdAmount || 0) >= Math.max(0, noticeEmd || 0);
}

/**
 * The EMD gate register, derived from the registrations: the
 * uids of app-bidders whose registration carries EMD recorded
 * (emdRecordedOk) against the lot's notice. The desk stamps
 * exactly this on the lot as liveEmdUids whenever the register
 * or the notice changes, so the rules-side list can never
 * disagree with the register it mirrors.
 */
export function emdUidsFromRegistrations(
  lot: Pick<AuctionLot, 'registrations' | 'notice'>
): string[] {
  const noticeEmd = lot.notice?.emdAmount ?? 0;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of lot.registrations ?? []) {
    const uid = (r.bidderUid ?? '').trim();
    if (uid && !seen.has(uid) && emdRecordedOk(r, noticeEmd)) {
      seen.add(uid);
      out.push(uid);
    }
  }
  return out;
}

/** The registration a uid rides on for this lot, or null. */
export function liveRegistrationForUid(
  lot: Pick<AuctionLot, 'registrations'>,
  uid: string
): LotRegistration | null {
  return (lot.registrations ?? []).find((r) => r.bidderUid === uid) ?? null;
}

/**
 * The smallest lawful next bid: the reserve for the first bid
 * (the A1 opening rule — a first bid at or above the reserve),
 * otherwise the standing highest + the lot's increment.
 */
export function minNextBid(
  lot: Pick<AuctionLot, 'highestBid' | 'reservePrice' | 'bidIncrement'>
): number {
  const highest = lot.highestBid ?? 0;
  if (highest <= 0) return Math.max(0, lot.reservePrice || 0);
  return highest + Math.max(0, lot.bidIncrement ?? 0);
}

/**
 * The close after a bid lands at bidAtMs: bidAtMs + 5 minutes
 * when the bid falls inside the old close's last 5 minutes,
 * otherwise the old close untouched. Pure — the desk, the
 * service and the tests all read the same law (the rules hold
 * the same shape against the server's clock, inside a
 * 15-second band for device-clock and latency reality).
 */
export function extendedCloseAt(closeAt: number, bidAtMs: number): number {
  if (closeAt > 0 && bidAtMs < closeAt && closeAt - bidAtMs <= LIVE_EXTENSION_WINDOW_MS) {
    return bidAtMs + LIVE_EXTENSION_WINDOW_MS;
  }
  return closeAt;
}

/** The seven stamp fields a landed bid moves, on lot and arena alike. */
export interface LiveStampSet {
  highestBid: number;
  highestBidderUid: string;
  highestBidderName: string;
  highestBidId: string;
  bidCount: number;
  extensions: number;
  closeAt: number;
}

/** The stamps as they must stand after `bid` lands at bidAtMs.
 *  Judged on the lot's stored closeAt stamp alone (the rules'
 *  own fact — the notice fallback in liveCloseMs is a display
 *  courtesy, never a write-path fact). */
export function liveStampsAfter(
  lot: Pick<AuctionLot, 'highestBid' | 'bidCount' | 'extensions' | 'closeAt'>,
  bid: { id: string; bidderUid: string; bidderName: string; amount: number },
  bidAtMs: number
): LiveStampSet {
  const closeBefore = lot.closeAt ?? 0;
  const closeAfter = extendedCloseAt(closeBefore, bidAtMs);
  return {
    highestBid: bid.amount,
    highestBidderUid: bid.bidderUid,
    highestBidderName: bid.bidderName,
    highestBidId: bid.id,
    bidCount: (lot.bidCount ?? 0) + 1,
    extensions: (lot.extensions ?? 0) + (closeAfter !== closeBefore ? 1 : 0),
    closeAt: closeAfter,
  };
}

export type LiveBidGateIssue =
  | 'not-live'
  | 'window'
  | 'not-registered'
  | 'emd'
  | 'barred'
  | 'amount'
  | 'entry';

/** The facts the bid gate judges — the lot's stored state. */
export interface LiveBidFacts {
  lotMode?: AuctionLot['lotMode'];
  status: AuctionLot['status'];
  closeAt: number;
  reservePrice: number;
  bidIncrement: number;
  highestBid: number;
  bidCount: number;
  /** The lot's app-bidder register (bidderUids) — who is
   *  registered for app bidding on this lot at all. */
  registeredUids: readonly string[];
  liveEmdUids: readonly string[];
  barredUids: readonly string[];
}

export interface LiveBidAttempt {
  bidderUid: string;
  amount: number;
  entryMode: 'self' | 'hall';
  /** The account placing the write: the bidder (self) or the
   *  conductor (hall). */
  actorUid: string;
  /** Hall only: the caller holds the lot's desk permission.
   *  The rules verify the same fact independently. */
  conductorOk: boolean;
}

/**
 * Every gate a live bid must pass, as issue codes the surfaces
 * render — the pure mirror of liveBidCreateOk + liveBidMoveOk
 * in firestore.rules. The transaction judges with this before
 * writing; the rules judge again, alone, at commit.
 */
export function liveBidGateIssues(
  facts: LiveBidFacts,
  bid: LiveBidAttempt,
  now: number
): LiveBidGateIssue[] {
  const issues: LiveBidGateIssue[] = [];
  if (facts.lotMode !== 'live') issues.push('not-live');
  if (facts.status !== 'open' || !(facts.closeAt > 0) || now >= facts.closeAt) {
    issues.push('window');
  }
  if (!bid.bidderUid || !facts.registeredUids.includes(bid.bidderUid)) {
    issues.push('not-registered');
  } else if (!facts.liveEmdUids.includes(bid.bidderUid)) {
    // Registered, but the registration carries no EMD recorded
    // at the notice's figure — the gate the rules enforce.
    issues.push('emd');
  }
  if (facts.barredUids.includes(bid.bidderUid)) issues.push('barred');
  if (bid.entryMode === 'self') {
    if (bid.actorUid !== bid.bidderUid) issues.push('entry');
  } else if (bid.entryMode === 'hall') {
    if (!bid.conductorOk || !bid.actorUid) issues.push('entry');
  } else {
    issues.push('entry');
  }
  const floor =
    facts.bidCount <= 0 || facts.highestBid <= 0
      ? Math.max(0, facts.reservePrice || 0)
      : facts.highestBid + Math.max(0, facts.bidIncrement || 0);
  if (!Number.isFinite(bid.amount) || bid.amount <= 0 || bid.amount < floor) {
    issues.push('amount');
  }
  return issues;
}

/** Bids in log order: earliest first (the arena's story). A bid
 *  whose server stamp has not landed yet sorts last. */
export function sortLiveLog(bids: readonly LiveBid[]): LiveBid[] {
  return [...bids].sort((a, b) => {
    const am = a.createdAt ? a.createdAt.toMillis() : Number.MAX_SAFE_INTEGER;
    const bm = b.createdAt ? b.createdAt.toMillis() : Number.MAX_SAFE_INTEGER;
    return am - bm;
  });
}

/**
 * The bid the lot's stamps say is winning: the log's doc whose
 * id is the lot's highestBidId, verified against the stamps.
 * Null when no bid stands (or the log and the stamps disagree,
 * which the rules make impossible for committed writes — the
 * desk treats null as "no verified leader").
 */
export function liveLeaderBid(
  lot: Pick<AuctionLot, 'highestBidId' | 'highestBid' | 'bidCount'>,
  bids: readonly LiveBid[]
): LiveBid | null {
  if (!lot.highestBidId || (lot.bidCount ?? 0) <= 0) return null;
  const lead = bids.find((b) => b.id === lot.highestBidId) ?? null;
  if (!lead || lead.amount !== (lot.highestBid ?? 0)) return null;
  return lead;
}

/** The arena seed for a live lot, from the lot's own record. */
export function arenaSeedFor(lot: AuctionLot): LiveArena {
  return {
    highestBid: 0,
    highestBidderUid: '',
    highestBidderName: '',
    highestBidId: '',
    bidCount: 0,
    extensions: 0,
    closeAt: liveCloseMs(lot),
    bidIncrement: lot.bidIncrement ?? 0,
    reservePrice: lot.reservePrice || 0,
  };
}

/* ------------------------------------------------------------------ */
/* Firestore half — reads                                              */
/* ------------------------------------------------------------------ */

const bidFromSnap = (id: string, data: Record<string, unknown>): LiveBid => ({
  id,
  bidderUid: String(data.bidderUid ?? ''),
  bidderName: String(data.bidderName ?? ''),
  registrationId: String(data.registrationId ?? ''),
  amount: Number(data.amount ?? 0),
  createdAt: (data.createdAt as Timestamp | null) ?? null,
  entryMode: data.entryMode === 'hall' ? 'hall' : 'self',
  ...(typeof data.enteredByUid === 'string' && data.enteredByUid
    ? { enteredByUid: data.enteredByUid }
    : {}),
});

/** The arena mirror, or null when the desk has not seeded it. */
export async function loadLiveArena(lotId: string): Promise<LiveArena | null> {
  const snap = await getDoc(arenaRef(lotId));
  return snap.exists() ? (snap.data() as LiveArena) : null;
}

/** The full bid log (never the arena doc), in log order. */
export async function loadLiveLog(lotId: string): Promise<LiveBid[]> {
  const snap = await getDocs(liveCol(lotId));
  const bids = snap.docs
    .filter((d) => d.id !== ARENA_DOC_ID)
    .map((d) => bidFromSnap(d.id, d.data() as Record<string, unknown>));
  return sortLiveLog(bids);
}

/* ------------------------------------------------------------------ */
/* Firestore half — the desk's arena keeping                           */
/* ------------------------------------------------------------------ */

/**
 * Seed the arena mirror (the desk's act when a live lot opens).
 * The rules pin the seed's shape and the desk's permission;
 * re-seeding an existing arena is refused by the create rule,
 * so this is safe to attempt and honest to surface.
 */
export async function seedLiveArena(lot: AuctionLot): Promise<void> {
  await setDoc(arenaRef(lot.id), arenaSeedFor(lot));
}

/**
 * Open a live lot: the A1 transition, with the EMD register
 * derived and stamped in the same write, then the arena seed.
 * If the seed fails after the transition lands, the desk's
 * live section offers the seed again (seedLiveArena) — the
 * lot is open either way and its stamps are the truth.
 */
export async function openLiveLot(
  lot: AuctionLot,
  actor: { uid: string; name?: string },
  now: number
): Promise<void> {
  const liveEmdUids = emdUidsFromRegistrations(lot);
  await transitionLot(lot, 'open', actor, now, { liveEmdUids });
  await seedLiveArena({ ...lot, liveEmdUids, status: 'open' });
}

/**
 * Re-stamp the EMD register after a registration change on a
 * live lot (the desk calls this in the same breath as the
 * bidderUids stamp, so both registers track the register).
 */
export async function refreshLiveEmdUids(lot: AuctionLot): Promise<void> {
  await patchLot(lot.id, { liveEmdUids: emdUidsFromRegistrations(lot) }, Date.now());
}

/* ------------------------------------------------------------------ */
/* Firestore half — THE one writer                                     */
/* ------------------------------------------------------------------ */

export interface PlaceLiveBidArgs {
  lotId: string;
  bidderUid: string;
  bidderName: string;
  registrationId: string;
  amount: number;
  entryMode: 'self' | 'hall';
  /** The account placing the write (bidder for self, conductor for hall). */
  actorUid: string;
  /** Hall only: the conductor holds the lot's desk permission. */
  conductorOk?: boolean;
  /** Best-effort bar pre-check (the workspace list, when the
   *  caller could read it). The rules check the bar themselves;
   *  this only lets the surface say "barred" before the write. */
  barredUids?: readonly string[];
}

/**
 * Place one live bid — the ONLY way a live bid is written.
 * One transaction: read the lot → judge (liveBidGateIssues) →
 * append the bid doc + move the lot's stamps + move the arena.
 * Throws an Error whose message is the first gate issue code
 * ('window', 'emd', 'barred', 'amount', 'entry', 'not-live'),
 * 'arena' when the desk has not seeded the arena, or 'outbid'
 * when the amount no longer clears the floor on the fresh
 * state the transaction actually read (a rival bid landed
 * first — stated plainly, never disguised).
 */
export async function placeLiveBid(args: PlaceLiveBidArgs): Promise<LiveBid> {
  const bidId = newLiveBidId();
  let written: LiveBid | undefined;
  await runTransaction(db, async (tx) => {
    const lotSnap = await tx.get(lotRef(args.lotId));
    if (!lotSnap.exists()) throw new Error('not-live');
    const lot = lotSnap.data() as AuctionLot;
    const arenaSnap = await tx.get(arenaRef(args.lotId));
    if (!arenaSnap.exists()) throw new Error('arena');
    const now = Date.now();
    const issues = liveBidGateIssues(
      {
        lotMode: lot.lotMode,
        status: lot.status,
        closeAt: lot.closeAt ?? 0,
        reservePrice: lot.reservePrice || 0,
        bidIncrement: lot.bidIncrement ?? 0,
        highestBid: lot.highestBid ?? 0,
        bidCount: lot.bidCount ?? 0,
        registeredUids: lot.bidderUids ?? [],
        liveEmdUids: lot.liveEmdUids ?? [],
        barredUids: args.barredUids ?? [],
      },
      {
        bidderUid: args.bidderUid,
        amount: args.amount,
        entryMode: args.entryMode,
        actorUid: args.actorUid,
        conductorOk: !!args.conductorOk,
      },
      now
    );
    if (issues.length > 0) {
      // An amount that fails only against the fresh state is
      // an outbid, whatever the caller believed when typing.
      throw new Error(issues[0] === 'amount' ? 'outbid' : issues[0]);
    }
    const stamps = liveStampsAfter(
      lot,
      { id: bidId, bidderUid: args.bidderUid, bidderName: args.bidderName, amount: args.amount },
      now
    );
    tx.set(liveBidRef(args.lotId, bidId), {
      bidderUid: args.bidderUid,
      bidderName: args.bidderName,
      registrationId: args.registrationId,
      amount: args.amount,
      createdAt: serverTimestamp(),
      entryMode: args.entryMode,
      ...(args.entryMode === 'hall' ? { enteredByUid: args.actorUid } : {}),
    });
    tx.update(lotRef(args.lotId), { ...stamps, updatedAt: now });
    tx.update(arenaRef(args.lotId), { ...stamps });
    written = {
      id: bidId,
      bidderUid: args.bidderUid,
      bidderName: args.bidderName,
      registrationId: args.registrationId,
      amount: args.amount,
      createdAt: null,
      entryMode: args.entryMode,
      ...(args.entryMode === 'hall' ? { enteredByUid: args.actorUid } : {}),
    };
  });
  if (!written) throw new Error('window');
  return written;
}

/* ------------------------------------------------------------------ */
/* The org-wide defaulter bar (workspace doc — no new collection)      */
/* ------------------------------------------------------------------ */

/** The workspace's barred-bidder register, read defensively. */
export async function loadBarredUids(workspaceId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'workspaces', workspaceId));
  const raw = snap.exists() ? (snap.data() as { auctionBarredUids?: unknown }).auctionBarredUids : undefined;
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * Bar a bidder from future auctions, org-wide — a deliberate,
 * on-record desk action (the rules allow it only to board
 * roles, through the narrow auctionBarredUids diff branch).
 */
export async function barBidder(workspaceId: string, uid: string): Promise<void> {
  if (!uid) throw new Error('uid');
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    auctionBarredUids: arrayUnion(uid),
  });
}

/** Lift a bar (a correction, likewise on the record). */
export async function unbarBidder(workspaceId: string, uid: string): Promise<void> {
  if (!uid) throw new Error('uid');
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    auctionBarredUids: arrayRemove(uid),
  });
}

export { isLiveLot, liveCloseMs };
