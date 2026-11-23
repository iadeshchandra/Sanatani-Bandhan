/**
 * followedFestivalNotify.ts — NOTIFICATION WAVE 1: pure picking for
 * the followed-org festival alert (DESIGN §2.2, closes G3).
 * =====================================================================
 * Following a temple must mean hearing when it publishes a festival.
 * The published `festival_events` docs of the orgs I follow (my
 * follows = user_follows ∪ the org-side followers store, as A1
 * reads them) are public reads; my device diffs them against its
 * seen ledger and emits the new ones into my own inbox — the
 * self-listen pattern, as everywhere in this system.
 *
 * One bell per festival, ever: dedupe `fest:<id>:published`, and
 * the seen ledger settles every published doc it has met (the
 * service's first run is the baseline: it records the current
 * shelf and rings nothing).
 *
 * No IO, no clock — fully unit-testable.
 */

/** The published-festival shape this watcher needs (a slim reading
 *  of lib/festival's FestivalEventDoc). */
export interface FollowedFestivalLike {
  id: string;
  workspaceId: string;
  published?: boolean;
  festivalCancelled?: boolean;
}

export function festivalPublishedKey(festivalId: string): string {
  return `fest:${festivalId}:published`;
}

export interface FestivalNotice {
  festival: FollowedFestivalLike;
  dedupeKey: string;
}

/**
 * Pick the newly published festivals: published, not cancelled,
 * not already in the seen ledger. `settled` carries every
 * published, uncancelled id met this pass (the service merges it
 * into its ledger whether or not a bell rang — baseline included).
 */
export function pickNewFestivals(
  festivals: readonly FollowedFestivalLike[],
  seen: ReadonlySet<string>,
): { notices: FestivalNotice[]; settled: string[] } {
  const notices: FestivalNotice[] = [];
  const settled: string[] = [];
  for (const f of festivals) {
    if (!f || !f.id) continue;
    if (f.published !== true) continue;
    if (f.festivalCancelled === true) continue;
    settled.push(f.id);
    if (seen.has(f.id)) continue;
    notices.push({ festival: f, dedupeKey: festivalPublishedKey(f.id) });
  }
  return { notices, settled };
}
