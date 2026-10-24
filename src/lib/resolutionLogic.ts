/**
 * resolutionLogic.ts — Trustee resolution truth (EVENTS + POLLS P0).
 * =====================================================================
 * Pure, firebase-free logic for board resolutions:
 *
 *  - WHO voted is recorded on the doc (`voters`: uid → choice), and the
 *    counts are always a tally OF that map — never free-floating
 *    numbers a screen can bump.
 *  - QUORUM is computed from the actual board size captured when the
 *    resolution was proposed (`boardSize` = board-role members of the
 *    workspace at that moment). The formula is mirrored word-for-word
 *    in firestore.rules (`resQuorumOk`) — keep both in lockstep:
 *      board > 0  → quorum when strictly more than half the board voted
 *      board == 0 → floor of two distinct voters (no roster was kept)
 *  - STATUS IS DERIVED: an open resolution whose deadline has passed
 *    IS concluded, whether or not any client has written the outcome
 *    yet. `concludeResolution` produces the write that persists the
 *    derived outcome (the DataContext sweep lands it + the audit
 *    event); screens render the derived status either way, so the
 *    deadline never depends on a manager's visit.
 */

export type ResolutionVoteChoice = 'favor' | 'against';
export type ResolutionOutcome = 'Passed' | 'Rejected' | 'Deferred';

export interface ResolutionLike {
  status: string;
  votesInFavor: number;
  votesAgainst: number;
  voters?: Record<string, ResolutionVoteChoice>;
  boardSize?: number;
  expiresAt?: number;
  concludedAt?: number;
}

/** Tally a voters map into counts — the counts' single source of truth. */
export function tallyFromVoters(
  voters: Record<string, ResolutionVoteChoice> | undefined | null
): { favor: number; against: number; cast: number } {
  let favor = 0;
  let against = 0;
  for (const choice of Object.values(voters || {})) {
    if (choice === 'favor') favor += 1;
    else if (choice === 'against') against += 1;
  }
  return { favor, against, cast: favor + against };
}

/** Quorum from the ACTUAL board size (mirrors rules `resQuorumOk`). */
export function resolutionQuorumMet(r: ResolutionLike): boolean {
  const cast = (r.votesInFavor || 0) + (r.votesAgainst || 0);
  const board = r.boardSize || 0;
  return board > 0 ? cast * 2 > board : cast >= 2;
}

/** The outcome a resolution with these figures concludes to. */
export function resolutionOutcome(r: ResolutionLike): ResolutionOutcome {
  if (!resolutionQuorumMet(r)) return 'Deferred';
  return (r.votesInFavor || 0) > (r.votesAgainst || 0) ? 'Passed' : 'Rejected';
}

export function resolutionIsExpired(r: ResolutionLike, now: number): boolean {
  return typeof r.expiresAt === 'number' && r.expiresAt > 0 && now >= r.expiresAt;
}

/** True while votes may still be cast: stored open AND deadline ahead. */
export function resolutionIsOpen(r: ResolutionLike, now: number): boolean {
  return r.status === 'Pending Review' && !resolutionIsExpired(r, now);
}

/**
 * The status the world should see right now. A stored outcome wins;
 * an expired open resolution derives its outcome from the record.
 */
export function resolutionEffectiveStatus(r: ResolutionLike, now: number): string {
  if (r.status !== 'Pending Review') return r.status;
  if (resolutionIsExpired(r, now)) return resolutionOutcome(r);
  return 'Pending Review';
}

export function hasUserVoted(r: ResolutionLike, uid: string | null | undefined): boolean {
  return !!uid && !!r.voters && r.voters[uid] !== undefined;
}

export interface ResolutionConclusion {
  status: ResolutionOutcome;
  quorumMet: boolean;
  concludedAt: number;
  details: string;
}

/** The persisted conclusion for an expired open resolution. */
export function concludeResolution(r: ResolutionLike, now: number): ResolutionConclusion {
  const quorumMet = resolutionQuorumMet(r);
  const status = resolutionOutcome(r);
  const cast = (r.votesInFavor || 0) + (r.votesAgainst || 0);
  const board = r.boardSize || 0;
  const when = new Date(now).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const boardLine =
    board > 0 ? `${cast} of ${board} board members voted` : `${cast} votes cast (no board roster recorded)`;
  const details = quorumMet
    ? `Concluded ${when}: ${status} — ${boardLine}; quorum met. Recorded in the workspace history.`
    : `Concluded ${when}: ${status} — ${boardLine}; quorum not met, so the motion was not decided. Recorded in the workspace history.`;
  return { status, quorumMet, concludedAt: now, details };
}
