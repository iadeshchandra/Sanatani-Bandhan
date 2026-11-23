/**
 * eventDip.ts — NEXT-LEVEL B1b: the e-dip (draw for oversubscribed
 * darshan).
 * =====================================================================
 * When a tier's demand dwarfs its places, first-come-first-served
 * is a network-speed lottery that punishes the elderly and the
 * poor (the TTD lesson, from the NEXT-LEVEL research). The dip
 * replaces the rush with a registered draw whose fairness anyone
 * can check:
 *
 *  - A tier may carry a dip window (dipOpensAt/dipClosesAt on the
 *    tier; published as per-tier epoch-ms maps on the event doc).
 *    While it does, DIRECT purchase of the tier is closed —
 *    devotees enter the dip instead (one entry per devotee per
 *    tier, by doc-id construction, in the NEW collection
 *    `event_dip_entries` — flagged to the owner before the build).
 *  - After the window closes, War Room staff FREEZE the pool: the
 *    'entered' entries, sorted by doc id, fingerprinted with
 *    SHA-256, and the fingerprint + count + a public seed are
 *    stamped onto the festival doc BEFORE any winner exists. The
 *    seed is a staff-entered public string the panel instructs
 *    the committee to draw openly (e.g. read out at the meeting)
 *    — the stamp is the commitment.
 *  - The draw itself is a NAMED, deterministic method (below):
 *    anyone holding the frozen pool, the published fingerprint
 *    and the seed can recompute the exact same order. Winners
 *    are the first N of that order, N = the tier's remaining
 *    places counted in PARTIES — one entry is one household
 *    party, however many are in it (the copy says so plainly).
 *    The rest are waitlisted IN that order (dipPosition), so a
 *    promotion is never a fresh choice: when a selected party
 *    does not claim by the claim-by moment, staff lapse it and
 *    the lowest-position waitlisted party is promoted.
 *  - Claiming is the ordinary purchase: firestore.rules refuse a
 *    dip-tier ticket unless the buyer's entry stands 'selected'
 *    inside its claim window (tkDipOk), and the same purchase
 *    batch flips the entry to 'claimed'.
 *
 * HONESTY LAW (hard): the draw runs on the organiser's device.
 * Nothing here claims "provably fair" or server verification.
 * What makes it checkable is what is PUBLISHED, and when: the
 * pool fingerprint before the draw, the seed in the open, the
 * method named, the positions published. The surfaces say
 * exactly that, in those words.
 *
 * The pure half (pool order, fingerprint, PRNG, shuffle, window
 * states, aggregates) carries no Firestore and is unit-tested;
 * the Firestore half is thin writes shaped by the pure half.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { sha256Hex } from '../cashcustody/cashCustodyStore';
import type { DipDrawRecord, FestivalEventDoc } from './festival';
import type { TicketAttendee } from './eventTickets';

/* ------------------------------------------------------------------ */
/* The entry record (event_dip_entries)                                */
/* ------------------------------------------------------------------ */

export type DipEntryStatus =
  | 'entered'
  | 'selected'
  | 'waitlisted'
  | 'claimed'
  | 'lapsed';

/**
 * One household party's dip entry. The doc id IS the uniqueness
 * law — `{festivalId}__{tierId}__{uid}` — so a devotee can hold
 * exactly one entry per tier by construction (the festival_rsvps
 * derived-id precedent). All timestamps are epoch-ms NUMBERS:
 * firestore.rules compare createdAt against the stamped dip
 * window and request.time with no string parsing.
 */
export interface DipEntry {
  id: string;
  festivalId: string;
  tierId: string;
  workspaceId: string;
  uid: string;
  buyerName: string;
  /** The household party — the ticket flow's attendee shape. */
  attendees: TicketAttendee[];
  /** attendees.length, carried as a field because the rules pin
   *  heads == attendees.size() (a list's length is checkable; a
   *  client's word for it is not). */
  heads: number;
  createdAt: number;
  status: DipEntryStatus;
  /** 1-based place in the published draw order (the shuffle IS
   *  the waitlist order) — stamped by the draw, absent before. */
  dipPosition?: number;
  updatedAt?: number;
}

/** The derived entry doc id — one entry per devotee per tier. */
export function dipEntryId(festivalId: string, tierId: string, uid: string): string {
  return `${festivalId}__${tierId}__${uid}`;
}

/* ------------------------------------------------------------------ */
/* Windows — one formula for the page, the panel and the rules         */
/* ------------------------------------------------------------------ */

/** A tier is a dip tier when the published doc stamps an opening
 *  moment for it (the E8 stamped-gate idiom: absent/0 = no dip). */
export function isDipTier(
  event: Pick<FestivalEventDoc, 'dipOpensAtMs'>,
  tierId: string
): boolean {
  return (event.dipOpensAtMs?.[tierId] || 0) > 0;
}

export type DipWindowState = 'none' | 'upcoming' | 'open' | 'closed';

/**
 * Where a tier's dip window stands at `nowMs`. 'closed' begins
 * the moment AFTER the stamped close (the rules admit an entry
 * while opens <= request.time <= closes — the same inclusive
 * close the client mirrors here).
 */
export function dipWindowState(
  event: Pick<FestivalEventDoc, 'dipOpensAtMs' | 'dipClosesAtMs'>,
  tierId: string,
  nowMs: number
): DipWindowState {
  const opens = event.dipOpensAtMs?.[tierId] || 0;
  if (opens <= 0) return 'none';
  const closes = event.dipClosesAtMs?.[tierId] || 0;
  if (nowMs < opens) return 'upcoming';
  if (closes > 0 && nowMs > closes) return 'closed';
  return 'open';
}

/** The tier's draw record, when staff have frozen its pool. */
export function dipDrawOf(
  event: Pick<FestivalEventDoc, 'dipDraws'>,
  tierId: string
): DipDrawRecord | undefined {
  return event.dipDraws?.[tierId];
}

/** A selected party may claim while the draw's claim-by moment
 *  stands in the future (the rules enforce the same bound). */
export function dipClaimOpen(
  event: Pick<FestivalEventDoc, 'dipDraws'>,
  tierId: string,
  nowMs: number
): boolean {
  const draw = dipDrawOf(event, tierId);
  if (!draw || !draw.drawnAtMs) return false;
  return !draw.claimByMs || nowMs <= draw.claimByMs;
}

/* ------------------------------------------------------------------ */
/* The draw — a named, deterministic method                            */
/* ------------------------------------------------------------------ */

/**
 * THE METHOD, named wherever the draw is described:
 * the pool's entry ids, sorted; a Fisher–Yates shuffle driven by
 * the mulberry32 PRNG; the PRNG seeded from the SHA-256 of
 * (pool fingerprint + the published seed). Same pool, same seed
 * → the same order, on any device, forever. That reproducibility
 * — not a server's word — is what makes the draw checkable.
 */
export const DIP_DRAW_METHOD = 'mulberry32 + Fisher–Yates, seeded by SHA-256';

/** The pool order the fingerprint and the draw both speak: the
 *  entry doc ids, sorted (plain lexicographic — the same order
 *  Firestore returns doc ids in). */
export function sortDipPoolIds(ids: readonly string[]): string[] {
  return [...ids].sort();
}

/**
 * The pool fingerprint: SHA-256 of the sorted ids, one per line.
 * Stable by construction — the same pool always fingerprints
 * identically, so the freeze stamp can be checked against the
 * register at any later moment.
 */
export function poolFingerprint(sortedIds: readonly string[]): string {
  return sha256Hex(sortedIds.join('\n'));
}

/** mulberry32 — a small, well-known deterministic PRNG. */
export function mulberry32(seedInt: number): () => number {
  let a = seedInt >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The draw's numeric seed: SHA-256 of fingerprint + public seed. */
export function dipSeedInt(poolHash: string, seed: string): number {
  return parseInt(sha256Hex(`${poolHash}|${seed}`).slice(0, 8), 16) >>> 0;
}

export interface DipDrawResult {
  /** The full shuffled order — the waitlist order, published. */
  order: string[];
  /** The first `places` of the order — the selected parties. */
  winners: string[];
  /** Entry id → 1-based position in `order`. */
  positions: Record<string, number>;
}

/**
 * Run the draw over a frozen pool. `places` is counted in
 * PARTIES (one entry = one household party) and clamped to the
 * pool — a draw can never allot more places than parties, nor a
 * negative number. The input pool is not mutated.
 */
export function runDipDraw(
  sortedIds: readonly string[],
  poolHash: string,
  seed: string,
  places: number
): DipDrawResult {
  const rand = mulberry32(dipSeedInt(poolHash, seed));
  const order = [...sortedIds];
  // Fisher–Yates, from the last place backwards.
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  const n = Math.max(0, Math.min(Math.floor(places) || 0, order.length));
  const positions: Record<string, number> = {};
  order.forEach((id, idx) => {
    positions[id] = idx + 1;
  });
  return { order, winners: order.slice(0, n), positions };
}

/* ------------------------------------------------------------------ */
/* Aggregates — the fairness summary's dip figures                     */
/* ------------------------------------------------------------------ */

/**
 * The published dip aggregates, from the register as it stands:
 *  - entries: every party that entered (any standing);
 *  - selected: parties the draw allotted a place to who still
 *    hold it or have claimed it ('selected' + 'claimed') — a
 *    lapsed place has passed on, and its new holder is counted
 *    in their own standing, so no place is ever counted twice;
 *  - claimed: parties who completed their purchase.
 * Counts only — no name can exist in this shape.
 */
export function dipAggregates(
  entries: readonly Pick<DipEntry, 'status'>[]
): { entries: number; selected: number; claimed: number } {
  let selected = 0;
  let claimed = 0;
  for (const e of entries) {
    if (e.status === 'claimed') {
      claimed += 1;
      selected += 1;
    } else if (e.status === 'selected') {
      selected += 1;
    }
  }
  return { entries: entries.length, selected, claimed };
}

/* ------------------------------------------------------------------ */
/* Firestore operations                                                */
/* ------------------------------------------------------------------ */

const DIP_COLLECTION = 'event_dip_entries';

function entryFromSnap(id: string, data: Record<string, unknown>): DipEntry {
  return { ...(data as Omit<DipEntry, 'id'>), id };
}

/**
 * My own entry for a tier — null when I hold none. A missing doc
 * reads back permission-denied under the rules (a resource-null
 * read cannot prove ownership), so a refusal is read as "no
 * entry" — the same fact, honestly arrived at.
 */
export async function loadMyDipEntry(
  db: Firestore,
  festivalId: string,
  tierId: string,
  uid: string
): Promise<DipEntry | null> {
  try {
    const snap = await getDoc(doc(db, DIP_COLLECTION, dipEntryId(festivalId, tierId, uid)));
    if (!snap.exists()) return null;
    return entryFromSnap(snap.id, snap.data() as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Enter the dip: one setDoc of the rules-pinned shape. The
 *  window, the caps and the doc-id law are all re-checked in
 *  firestore.rules — this is the honest early path, not the
 *  boundary. */
export async function enterDip(
  db: Firestore,
  input: {
    event: Pick<FestivalEventDoc, 'id' | 'workspaceId'>;
    tierId: string;
    uid: string;
    buyerName: string;
    attendees: TicketAttendee[];
    nowMs: number;
  }
): Promise<DipEntry> {
  const entry: Omit<DipEntry, 'id'> = {
    festivalId: input.event.id,
    tierId: input.tierId,
    workspaceId: input.event.workspaceId,
    uid: input.uid,
    buyerName: input.buyerName,
    attendees: input.attendees,
    heads: input.attendees.length,
    createdAt: input.nowMs,
    status: 'entered',
  };
  const id = dipEntryId(input.event.id, input.tierId, input.uid);
  await setDoc(doc(db, DIP_COLLECTION, id), entry);
  return { ...entry, id };
}

/** Withdraw while the window stands open (the rules hold the
 *  same bound: owner-only, 'entered' only, window open). */
export async function withdrawDipEntry(db: Firestore, entryId: string): Promise<void> {
  await deleteDoc(doc(db, DIP_COLLECTION, entryId));
}

/** Every entry for one tier (staff read — the DipPanel pool). */
export async function loadDipEntries(
  db: Firestore,
  festivalId: string,
  tierId: string
): Promise<DipEntry[]> {
  const snap = await getDocs(
    query(
      collection(db, DIP_COLLECTION),
      where('festivalId', '==', festivalId),
      where('tierId', '==', tierId)
    )
  );
  return snap.docs.map((d) => entryFromSnap(d.id, d.data() as Record<string, unknown>));
}

/** Every entry for a festival, all tiers (the debrief's dip
 *  aggregates read the register as it stands). */
export async function loadDipEntriesForFestival(
  db: Firestore,
  festivalId: string
): Promise<DipEntry[]> {
  const snap = await getDocs(
    query(collection(db, DIP_COLLECTION), where('festivalId', '==', festivalId))
  );
  return snap.docs.map((d) => entryFromSnap(d.id, d.data() as Record<string, unknown>));
}

/**
 * FREEZE: stamp the pool commitment onto the festival doc —
 * BEFORE any winner exists (the panel calls this only while the
 * tier has no drawn record). The staff update clause on
 * festival_events (R_BOARD, no key-set pin) carries the write,
 * the liveBoard/fairnessSummary posture.
 */
export async function stampDipFreeze(
  db: Firestore,
  eventId: string,
  tierId: string,
  record: DipDrawRecord
): Promise<void> {
  await updateDoc(doc(db, 'festival_events', eventId), {
    [`dipDraws.${tierId}`]: record,
  });
}

/**
 * RUN: stamp the draw's facts onto the festival doc and flip
 * every pooled entry in one pass — winners 'selected', the rest
 * 'waitlisted', every entry stamped with its published position.
 * Batches chunk at 400 writes (Firestore's 500 ceiling, with
 * room to spare).
 */
export async function applyDipDraw(
  db: Firestore,
  input: {
    eventId: string;
    tierId: string;
    record: DipDrawRecord;
    result: DipDrawResult;
    nowMs: number;
  }
): Promise<void> {
  await updateDoc(doc(db, 'festival_events', input.eventId), {
    [`dipDraws.${input.tierId}`]: input.record,
  });
  const winnerSet = new Set(input.result.winners);
  const ids = input.result.order;
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + 400)) {
      batch.update(doc(db, DIP_COLLECTION, id), {
        status: winnerSet.has(id) ? 'selected' : 'waitlisted',
        dipPosition: input.result.positions[id],
        updatedAt: input.nowMs,
      });
    }
    await batch.commit();
  }
}

/**
 * PROMOTE: lapse one unclaimed 'selected' entry and raise the
 * lowest-position 'waitlisted' entry into its place — one batch,
 * two flips, each a transition the rules pin (selected→lapsed,
 * waitlisted→selected). The promoted party keeps its published
 * position: the order never changes, only standings do.
 *
 * A promotion happens BECAUSE the claim window passed, so the
 * batch also re-stamps the tier's claim-by moment (a fresh,
 * published deadline on the festival doc — the same R_BOARD
 * stamp the draw wrote). Every still-selected party shares the
 * new moment; the lapsed party cannot use it (its standing is
 * 'lapsed', and the rules witness the standing, not the clock
 * alone).
 */
export async function lapseAndPromote(
  db: Firestore,
  input: {
    lapse: DipEntry;
    promote: DipEntry;
    eventId: string;
    tierId: string;
    newClaimByMs: number;
    nowMs: number;
  }
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, DIP_COLLECTION, input.lapse.id), {
    status: 'lapsed',
    updatedAt: input.nowMs,
  });
  batch.update(doc(db, DIP_COLLECTION, input.promote.id), {
    status: 'selected',
    updatedAt: input.nowMs,
  });
  batch.update(doc(db, 'festival_events', input.eventId), {
    [`dipDraws.${input.tierId}.claimByMs`]: input.newClaimByMs,
  });
  await batch.commit();
}

/** The next party in line: the lowest-position waitlisted entry,
 *  or null when the waitlist is spent. */
export function nextWaitlisted(entries: readonly DipEntry[]): DipEntry | null {
  let best: DipEntry | null = null;
  for (const e of entries) {
    if (e.status !== 'waitlisted') continue;
    if (!best || (e.dipPosition ?? Number.MAX_SAFE_INTEGER) < (best.dipPosition ?? Number.MAX_SAFE_INTEGER)) {
      best = e;
    }
  }
  return best;
}
