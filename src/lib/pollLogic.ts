/**
 * pollLogic.ts — Community poll read truth (EVENTS + POLLS P0).
 * =====================================================================
 * Pure helpers for reading polls under the ballot-box model:
 *
 *  - NEW polls carry `totalVotes` on the doc and one private ballot
 *    per voter in `polls/{id}/votes/{uid}`; the poll doc itself holds
 *    ONLY counts.
 *  - LEGACY polls (created before the ballot box) carry a `votedUsers`
 *    map instead. They stay fully readable: the total falls back to
 *    the map size, and a member's own legacy vote stays visible to
 *    them. The map is frozen — no new write path touches it.
 *  - If neither exists (very old docs), the option counts themselves
 *    are the total.
 */

export interface PollOptionLike {
  text?: string;
  votes?: number;
}

export interface PollLike {
  status?: string;
  expiresAt?: number;
  totalVotes?: number;
  votedUsers?: Record<string, string>;
  options?: Record<string, PollOptionLike>;
}

/** Total ballots counted on a poll, across both data models. */
export function pollTotalVotes(p: PollLike): number {
  if (typeof p.totalVotes === 'number' && Number.isFinite(p.totalVotes)) return p.totalVotes;
  if (p.votedUsers && typeof p.votedUsers === 'object') return Object.keys(p.votedUsers).length;
  return Object.values(p.options || {}).reduce((s, o) => s + (o?.votes || 0), 0);
}

/** Options as a stable list, in the doc's own key order. */
export function pollOptionList(p: PollLike): { id: string; text: string; votes: number }[] {
  return Object.keys(p.options || {}).map((id) => ({
    id,
    text: p.options?.[id]?.text || '',
    votes: p.options?.[id]?.votes || 0,
  }));
}

/**
 * Voting is open only while the poll is ACTIVE and its deadline is in
 * the future — the deadline is read from the record itself, never
 * from whether someone has visited to flip the status.
 */
export function pollIsOpen(p: PollLike, now: number): boolean {
  if (p.status !== 'ACTIVE') return false;
  return !(typeof p.expiresAt === 'number' && p.expiresAt > 0 && now >= p.expiresAt);
}
