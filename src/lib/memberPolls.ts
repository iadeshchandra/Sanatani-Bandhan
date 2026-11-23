/**
 * memberPolls.ts — POLLS NEXT-LEVEL P2a: the member door's pure logic.
 * =====================================================================
 * The desk (CommunityPollsTab) is the committee's door into the one
 * ballot box; this module shapes the MEMBER's door — the Polls home
 * in Personal mode — plus the secrecy-safe reminder mechanism. All
 * of it is pure: the components and the notification fan-out supply
 * the Firestore reads, these functions supply the judgements.
 *
 * Laws held here:
 *  - Audience: a MANAGERS (committee) poll surfaces to a member ONLY
 *    when the member's own membership edge in THAT workspace carries
 *    a board role — the same set the electorate snapshot counts
 *    (POLL_BOARD_ROLES). This mirrors the rules' read gate
 *    (pollCommittee) at the display layer.
 *  - Secrecy: a member's view is shaped ONLY by their own ballot
 *    (ballotCast of their own ballot doc / their legacy map entry).
 *    Nothing here reads, counts or infers anyone else's ballot.
 *  - The recorded outcome is read, never recomputed, when present
 *    (pollStoredOutcome); legacy polls keep derive-at-render.
 *
 * THE REMINDER MECHANISM (P2a, secrecy-safe by construction):
 *  The committee's Remind button publishes ONE announcement through
 *  the org's existing broadcast feed (orgBroadcasts — the pinned
 *  shape cannot carry a poll id, so the reminder's TITLE carries
 *  the poll's title after a stable prefix: POLL_REMINDER_TITLE_PREFIX).
 *  That broadcast is addressed to the whole community — the sender
 *  neither knows nor learns who has voted. Each member's OWN device
 *  then resolves the reminder against the member's own state
 *  (org/pollReminderFanout.ts, riding the broadcast watcher's
 *  cadence): it finds the org's open poll of that title, reads the
 *  member's OWN ballot doc, and —
 *    · ballot exists  → the reminder is suppressed, silently and
 *      forever (for that broadcast); the member never sees it;
 *    · no ballot yet  → the member's device emits a Suchana item
 *      into the member's OWN notification inbox (the self-write-only
 *      pattern the broadcast fan-out already uses), deep-linked to
 *      the poll.
 *  Honest limits: the match is by exact poll title within the org
 *  (two live polls sharing one title are both matched — they are
 *  indistinguishable to members too); legacy pre-ballot-box polls
 *  are long concluded, so their frozen votedUsers maps play no part
 *  here (an expired poll is suppressed by its deadline alone).
 */
import {
  ballotCast,
  pollIsOpen,
  pollStoredOutcome,
  POLL_BOARD_ROLES,
  type MyBallot,
  type PollLike,
} from './pollLogic';
import { fillTemplate } from './outreachPacks';

/** A poll doc as the member door reads it (the desk's shape + ids). */
export interface MemberPollDoc extends PollLike {
  id: string;
  workspaceId?: string;
  title?: string;
  description?: string;
  createdAt?: number;
  createdBy?: string;
  adminNote?: string;
}

/** The member's membership edge in one workspace (workspaceMembers). */
export interface MemberPollMembership {
  workspaceId: string;
  role?: string | null;
}

/** One poll, shaped for the member's list. */
export interface MemberPollEntry {
  poll: MemberPollDoc;
  workspaceId: string;
  workspaceName: string;
  /** The member's role in this workspace (their membership edge). */
  myRole: string;
  /** True when that role is a board role (committee polls visible). */
  isBoard: boolean;
  /** The member's OWN ballot on this poll (null = not voted). */
  myBallot: MyBallot | null;
  hasVoted: boolean;
  open: boolean;
}

/** Is this role a board role in the poll electorate's sense? */
export function isPollBoardRole(role: string | null | undefined): boolean {
  return POLL_BOARD_ROLES.includes(String(role || ''));
}

/**
 * The audience gate for the member door: ALL_MEMBERS polls are for
 * every member of the workspace; MANAGERS polls only for members
 * whose own edge in that workspace is a board role. (The rules
 * enforce the same gate on read; this keeps the list honest even
 * for docs already in hand.)
 */
export function pollVisibleToMember(poll: PollLike, roleInWorkspace: string | null | undefined): boolean {
  if (poll.targetAudience === 'MANAGERS') return isPollBoardRole(roleInWorkspace);
  return true;
}

/**
 * Assemble the member's cross-workspace poll list: every poll of
 * every workspace they belong to, audience-gated per workspace,
 * each carrying the member's own ballot state. Order: polls still
 * awaiting MY vote first (soonest deadline first — the one the
 * committee is waiting on), then open polls I have voted in, then
 * concluded polls (newest first). DEMO_ workspaces are included —
 * the demo's polls are the demo member's polls.
 */
export function assembleMemberPolls(input: {
  memberships: readonly MemberPollMembership[];
  workspaceNames: Readonly<Record<string, string>>;
  pollsByWorkspace: Readonly<Record<string, readonly MemberPollDoc[]>>;
  myBallots: Readonly<Record<string, MyBallot | null>>;
  now: number;
}): MemberPollEntry[] {
  const roleByWorkspace = new Map<string, string>();
  for (const m of input.memberships) {
    if (m && m.workspaceId && !roleByWorkspace.has(m.workspaceId)) {
      roleByWorkspace.set(m.workspaceId, String(m.role || ''));
    }
  }

  const entries: MemberPollEntry[] = [];
  for (const [workspaceId, role] of roleByWorkspace) {
    const polls = input.pollsByWorkspace[workspaceId] || [];
    for (const poll of polls) {
      if (!poll || !poll.id) continue;
      if (!pollVisibleToMember(poll, role)) continue;
      const myBallot = input.myBallots[poll.id] ?? null;
      entries.push({
        poll,
        workspaceId,
        workspaceName: input.workspaceNames[workspaceId] || '',
        myRole: role,
        isBoard: isPollBoardRole(role),
        myBallot,
        hasVoted: ballotCast(myBallot),
        open: pollIsOpen(poll, input.now),
      });
    }
  }

  const deadline = (e: MemberPollEntry) =>
    typeof e.poll.expiresAt === 'number' && e.poll.expiresAt > 0 ? e.poll.expiresAt : Number.MAX_SAFE_INTEGER;
  const concludedAt = (e: MemberPollEntry) =>
    pollStoredOutcome(e.poll)?.concludedAt ?? e.poll.createdAt ?? 0;

  entries.sort((a, b) => {
    const rank = (e: MemberPollEntry) => (e.open && !e.hasVoted ? 0 : e.open ? 1 : 2);
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 2) return concludedAt(b) - concludedAt(a);
    return deadline(a) - deadline(b);
  });
  return entries;
}

/** How many open polls are still waiting for this member's vote. */
export function memberPollsAwaitingCount(entries: readonly MemberPollEntry[]): number {
  return entries.filter((e) => e.open && !e.hasVoted).length;
}

/* ------------------------------------------------------------------ */
/* The reminder: broadcast compose + parse + the suppression rule      */
/* ------------------------------------------------------------------ */

/**
 * The reminder broadcast's title prefix — the parse contract between
 * the committee's Remind button (which composes it) and every
 * member's device (which resolves it). It is a wire format, not UI
 * copy, so it deliberately does NOT live in the dictionaries.
 */
export const POLL_REMINDER_TITLE_PREFIX = 'Voting reminder: ';

/** The broadcast title the committee's Remind button publishes. */
export function pollReminderBroadcastTitle(pollTitle: string): string {
  return `${POLL_REMINDER_TITLE_PREFIX}${pollTitle || ''}`;
}

/**
 * The broadcast body: the template's {closes} sentence (composed by
 * the caller from its own dated template, '' when the poll carries
 * no deadline) interpolated under the outreach packs' no-placeholder
 * law — a missing sentence degrades away, never prints raw.
 */
export function pollReminderBroadcastBody(bodyTemplate: string, closesSentence: string): string {
  return fillTemplate(bodyTemplate, { closes: closesSentence || '' });
}

/** A broadcast's poll title, when it is a poll reminder — else null. */
export function parsePollReminderBroadcast(b: { title?: string } | null | undefined): string | null {
  const title = b?.title;
  if (typeof title !== 'string' || !title.startsWith(POLL_REMINDER_TITLE_PREFIX)) return null;
  const pollTitle = title.slice(POLL_REMINDER_TITLE_PREFIX.length).trim();
  return pollTitle.length > 0 ? pollTitle : null;
}

/**
 * Resolve a reminder broadcast to the polls it concerns: the org's
 * polls whose title matches exactly and whose audience includes
 * this member. Concluded polls stay in the result — the caller
 * suppresses on them (a reminder about a closed poll must not ring
 * as a generic announcement either).
 */
export function matchReminderPolls(
  polls: readonly MemberPollDoc[],
  pollTitle: string,
  roleInWorkspace: string | null | undefined
): MemberPollDoc[] {
  return (polls || []).filter(
    (p) => p && p.title === pollTitle && pollVisibleToMember(p, roleInWorkspace)
  );
}

/**
 * THE SUPPRESSION PREDICATE — the heart of the secrecy-safe
 * reminder. A reminder about a poll may be shown to a member only
 * when the poll is still open AND the member's OWN ballot does not
 * exist. It reads nothing about anyone else: the sender learns
 * nothing, the member who voted is never nagged, and the member
 * who has not voted is reminded exactly once per committee trigger
 * (the fan-out's dedupe key carries the broadcast id).
 */
export function shouldShowPollReminder(input: {
  poll: PollLike;
  myBallot: MyBallot | null | undefined;
  now: number;
}): boolean {
  if (!pollIsOpen(input.poll, input.now)) return false;
  return !ballotCast(input.myBallot ?? null);
}
