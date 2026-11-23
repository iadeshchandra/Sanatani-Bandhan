/**
 * festivalFairness.ts — NEXT-LEVEL B1a: fairness transparency (pure logic).
 * =====================================================================
 * Two public truths, both read from counters that already exist —
 * this lib computes nothing new about anyone, it only shapes what
 * the festival's own published doc already carries:
 *
 *  1. THE LIVE QUOTA. While booking is open, every devotee sees the
 *     same remaining-places count for every pass tier: capacity −
 *     the anchored tierSold counter. The source discipline is E4's
 *     (lib/festivalDebrief.buildTierRows): capacity from the doc's
 *     tierCaps map — the map firestore.rules bound tierSold by —
 *     falling back to the tier's own stamped capacity; sold from
 *     tierSold, the counter that moves ONLY in the same batch as
 *     the ticket record that causes it (anchoredTierCounter). No
 *     second count is kept anywhere, so the public number and the
 *     purchase path can never disagree.
 *
 *  2. THE PUBLISHED RESULTS. After booking closes, staff may stamp
 *     a fairness summary onto the festival_events doc (the same
 *     setDoc merge path as debriefSummary — the rules' R_BOARD
 *     update clause pins no key set). Aggregates ONLY: per tier,
 *     places offered and places booked; festival totals; the
 *     still-waiting count when the RSVP register can honestly speak
 *     for it; the release moment when an E8 release calendar was
 *     used. The shape carries no name and no per-person field, so
 *     none can leak — the no-names guarantee is by construction,
 *     and a unit test pins the key set.
 *
 * POSITIONING LAW (NEXT-LEVEL research, owner's standing order):
 * "No surge. Ever." Prices never move with demand, there are no
 * priority lanes and no paid fast-tracks; the quota is published
 * precisely so every devotee sees the same truth at the same time.
 * The copy this lib feeds is plain fact — no countdowns, no
 * "hurry", no scarcity theatre.
 *
 * No Firestore, no React — unit-testable and offline-safe.
 */
import type {
  FestivalEventDoc,
  FestivalFairnessSummary,
  TicketTier,
} from './festival';
import type { DebriefTierRow } from './festivalDebrief';
import { festivalConcluded } from './festivalMemory';

/* ------------------------------------------------------------------ */
/* 1. The live quota — capacity vs the anchored sold counter           */
/* ------------------------------------------------------------------ */

export interface TierQuota {
  tierId: string;
  /** Places offered — null = the tier carries no fixed limit. */
  capacity: number | null;
  /** Places booked (the anchored tierSold counter, clamped ≥ 0). */
  sold: number;
  /** Places left — null when unmetered; never negative. */
  remaining: number | null;
  /** True only for a metered tier whose places are all booked. */
  soldOut: boolean;
}

/**
 * The quota for one tier, from the published doc's own fields.
 * Capacity source order is E4's buildTierRows discipline: the
 * tierCaps map (what the rules bound tierSold by) first, the
 * tier's stamped capacity second. A tier with neither is
 * unmetered and shows no quota line at all — the surface must
 * never dress "no limit" up as a number.
 */
export function tierQuota(
  tier: Pick<TicketTier, 'id' | 'capacity'>,
  tierSold: Record<string, number> | undefined,
  tierCaps: Record<string, number> | undefined
): TierQuota {
  const capRaw = tierCaps?.[tier.id] ?? tier.capacity;
  const capacity =
    capRaw === undefined || capRaw === null ? null : Math.max(0, Math.floor(capRaw));
  const sold = Math.max(0, Math.floor(tierSold?.[tier.id] || 0));
  const remaining = capacity === null ? null : Math.max(0, capacity - sold);
  return { tierId: tier.id, capacity, sold, remaining, soldOut: remaining === 0 };
}

/** Every tier's quota, in the doc's own tier order. */
export function quotasForEvent(
  event: Pick<FestivalEventDoc, 'ticketTiers' | 'tierSold' | 'tierCaps'>
): TierQuota[] {
  return (event.ticketTiers || []).map((tier) =>
    tierQuota(tier, event.tierSold, event.tierCaps)
  );
}

/* ------------------------------------------------------------------ */
/* 2. The published results — aggregates only, by shape                */
/* ------------------------------------------------------------------ */

/**
 * Build the fairness summary from the debrief's own tier rows, so
 * the published count and the committee's count are the same
 * numbers by construction (one computation — buildTierRows over
 * the anchored counters — feeds both).
 *
 *  - `waitlistParties` is the RSVP register AS IT STANDS (E4's
 *    documented register law: a cancelled RSVP is deleted, a claim
 *    flips the record to confirmed — so this is the count of
 *    parties still waiting when staff publish). Pass null when
 *    the register cannot be read and the field is OMITTED from
 *    the summary — never estimated, never zero-filled.
 *  - `ticketReleaseAtMs` is stamped only when a release calendar
 *    was actually used (> 0); 0/absent ("no gate") omits the
 *    field — the summary never invents a release moment.
 *  - `totalOffered` sums only a fully-metered offer: when any
 *    tier is unmetered the total is null, because a partial sum
 *    would misstate what was offered. `totalBooked` always sums —
 *    booked places are a fact whatever the offer shape was.
 */
export function buildFairnessSummary(input: {
  tierRows: readonly DebriefTierRow[];
  waitlistParties: number | null;
  ticketReleaseAtMs: number | undefined;
  nowIso: string;
  /**
   * NEXT-LEVEL B1b — the e-dip aggregates (lib/eventDip
   * .dipAggregates over the festival's dip register as it
   * stands), passed ONLY when a dip actually ran for some tier
   * of this festival; null/omitted → no dip field, exactly as
   * the release moment is omitted when no calendar was used.
   * A dip whose register reads empty (entries 0) is likewise
   * omitted — the summary never dresses an unread register as
   * a held draw.
   */
  dipAggregates?: { entries: number; selected: number; claimed: number } | null;
}): FestivalFairnessSummary {
  const tiers = input.tierRows.map((r) => ({
    tierId: r.tierId,
    tierName: r.tierName,
    kind: r.kind,
    offered: r.capacity,
    booked: r.soldQty,
  }));
  const totalBooked = tiers.reduce((s, r) => s + r.booked, 0);
  const totalOffered =
    tiers.length > 0 && tiers.every((r) => r.offered !== null)
      ? tiers.reduce((s, r) => s + (r.offered || 0), 0)
      : null;
  const dip = input.dipAggregates;
  return {
    publishedAt: input.nowIso,
    tiers,
    totalOffered,
    totalBooked,
    ...(input.waitlistParties !== null && input.waitlistParties !== undefined
      ? { waitlistParties: Math.max(0, Math.floor(input.waitlistParties)) }
      : {}),
    ...(input.ticketReleaseAtMs && input.ticketReleaseAtMs > 0
      ? { releaseAtMs: Math.floor(input.ticketReleaseAtMs) }
      : {}),
    ...(dip && dip.entries > 0
      ? {
          dip: {
            entries: Math.max(0, Math.floor(dip.entries)),
            selected: Math.max(0, Math.floor(dip.selected)),
            claimed: Math.max(0, Math.floor(dip.claimed)),
          },
        }
      : {}),
  };
}

/* ------------------------------------------------------------------ */
/* 3. Public visibility — published AND the festival has ended         */
/* ------------------------------------------------------------------ */

/**
 * The results block appears on the public festival page only when
 * BOTH hold: staff have stamped the summary onto the doc, and the
 * festival has concluded (lib/festivalMemory.festivalConcluded —
 * its last day has fully passed, the same rule that retires the
 * page's booking sections and raises its memory card). Booking is
 * therefore certainly closed before any result is shown; a summary
 * published early simply waits for the festival to end. Never
 * published → never rendered: no empty shelf.
 */
export function fairnessResultsVisible(
  event: Pick<FestivalEventDoc, 'fairnessSummary' | 'dateISO' | 'endDateISO'>,
  nowMs: number
): boolean {
  return !!event.fairnessSummary && festivalConcluded(event, nowMs);
}
