/**
 * auctionStallBridge.ts — AUCTION WAVE A3: the festival-stall bridge.
 * =====================================================================
 * The scoped bridge between EVENTS E6 (the festival sponsors &
 * stalls register) and the Nilam desk, in exactly two moves:
 *
 *  1. From the stall register, the committee's "Allot by
 *     auction" creates a Nilam lot linked to the stall —
 *     `stallRef {festivalId, stallId}` on the lot, class
 *     rights-lease, reserve = the stall's fee. The lot then
 *     lives the ordinary A1/A2/A3 life: valuation, sanction
 *     gates, notice, registration with EMD, outcome by
 *     maker–checker, settlement ONLY through the treasury.
 *  2. When that lot's settlement completes, the desk stamps
 *     the stall record with the allottee — winner name as the
 *     holder, winning amount as the fee, and the lot reference
 *     (allottedVia) — through stampStallAllotment below.
 *
 * The bridge adds NO second money path: the stall's fee is
 * real only when the lot's settlement posted it to the
 * treasury through addTreasuryTransaction, exactly like every
 * other lot. The stamp is a register note, written into the
 * same utsav_stores doc the Utsav desk keeps (staff write,
 * the store's own shape and newer-updatedAt-wins law). When
 * the festival plan exists only on the Utsav desk's own device
 * (no cloud doc yet), the stamp honestly reports false and
 * the desk tells the committee to record the allotment on the
 * Utsav desk — the bridge never forks the register by
 * inventing a cloud copy of a device-local plan.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { createLot, type AuctionLot } from './auctionLots';
import type { Festival, FestivalStall, UtsavState } from '../utsav/types';

/** The lot title the bridge gives a stall allotment. */
export function stallLotTitle(festivalName: string, stall: FestivalStall): string {
  const where = stall.zone?.trim() || stall.kind;
  return `Stall allotment — ${festivalName} — ${where}`;
}

/**
 * Create the Nilam lot for a festival stall (the committee's
 * one action in the stall register). Hall mode: the allotment
 * is cried at the festival ground and remembered by the desk —
 * a committee that wants app bidding drafts a live lot from
 * the Nilam desk itself. The stall's fee becomes the reserve,
 * with a committee-estimate valuation of the same figure so
 * the lot can lawfully leave draft.
 */
export async function createStallLot(args: {
  workspaceId: string;
  festivalId: string;
  festivalName: string;
  stall: FestivalStall;
  actor: { uid: string; name?: string };
  now: number;
}): Promise<AuctionLot> {
  const { stall } = args;
  const fee = Math.max(0, Math.round(stall.fee || 0));
  return createLot(
    {
      workspaceId: args.workspaceId,
      source: { kind: 'standalone', label: stallLotTitle(args.festivalName, stall) },
      lotClass: 'rights-lease',
      lotMode: 'hall',
      title: stallLotTitle(args.festivalName, stall),
      description: `Festival stall (${stall.kind}${stall.zone ? `, ${stall.zone}` : ''}) allotted by auction from the Utsav stall register.`,
      mediaRefs: [],
      reservePrice: fee,
      valuationBasis: {
        kind: 'committee-estimate',
        figure: fee,
        valuedOn: new Date(args.now).toISOString().slice(0, 10),
      },
      stallRef: { festivalId: args.festivalId, stallId: stall.id },
    },
    args.actor,
    args.now
  );
}

/**
 * Stamp the stall record after its lot settles: holder =
 * winner, fee = winning amount, allottedVia = the lot ref.
 * Returns false — honestly, for the desk to report — when the
 * festival plan has no cloud doc, or the festival/stall is no
 * longer in it, or the lot is not a settled stall lot with an
 * outcome. Writes the store's own doc shape with a strictly
 * newer updatedAt, so the Utsav desk's mirror adopts it under
 * its newer-wins law.
 */
export async function stampStallAllotment(args: {
  workspaceId: string;
  lot: AuctionLot;
  now: number;
}): Promise<boolean> {
  const { lot } = args;
  if (!lot.stallRef || lot.status !== 'settled' || !lot.outcome) return false;
  const ref = doc(db, 'utsav_stores', args.workspaceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data() as { state?: UtsavState; updatedAt?: number };
  const state = data.state;
  if (!state || !Array.isArray(state.festivals)) return false;
  let found = false;
  const festivals: Festival[] = state.festivals.map((f) => {
    if (f.id !== lot.stallRef?.festivalId) return f;
    const stalls = (f.stalls ?? []).map((s) => {
      if (s.id !== lot.stallRef?.stallId) return s;
      found = true;
      return {
        ...s,
        holder: lot.outcome?.winnerName ?? s.holder,
        fee: lot.outcome?.winningAmount ?? s.fee,
        allottedVia: {
          lotId: lot.id,
          amount: lot.outcome?.winningAmount ?? 0,
          at: args.now,
        },
      };
    });
    return { ...f, stalls };
  });
  if (!found) return false;
  const updatedAt = Math.max(args.now, (data.updatedAt ?? 0) + 1);
  await setDoc(ref, { workspaceId: args.workspaceId, state: { ...state, festivals }, updatedAt });
  return true;
}
