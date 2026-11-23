/**
 * org/pollReminderFanout.ts — POLLS NEXT-LEVEL P2a: the receiver
 * side of the committee's poll reminder.
 * ===========================================================================
 * The committee's Remind button publishes ONE announcement in the
 * org's broadcast feed, addressed to the whole community (see
 * lib/memberPolls for the mechanism + its honesty limits). This
 * module is what each member's OWN device does with it:
 *
 *   1. It spots reminder broadcasts (title prefix contract) from
 *      orgs where THIS user holds a workspaceMembers edge.
 *   2. It resolves each to the org's poll of that exact title whose
 *      audience includes this member.
 *   3. It reads the member's OWN ballot doc — never anyone else's —
 *      and applies lib/memberPolls.shouldShowPollReminder.
 *   4. Unvoted + open → it emits a Suchana item into the member's
 *      OWN inbox (notifyPollReminder; self-write-only rules make
 *      this the only possible fan-out — the same pattern as
 *      broadcastListener). Voted or closed → silence.
 *   5. Either way the broadcast is reported HANDLED, so the generic
 *      announcement path in broadcastListener never rings a member
 *      twice for the same reminder — and never rings a member who
 *      already voted at all.
 *
 * It runs INSIDE checkOrgBroadcasts (broadcastListener lazy-imports
 * it, like notifyHelpers — the Firestore chain must stay out of
 * that module's import graph for jest). Fail-soft throughout: a
 * reminder failure must never break announcements or the app.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  matchReminderPolls,
  parsePollReminderBroadcast,
  shouldShowPollReminder,
  type MemberPollDoc,
} from '../lib/memberPolls';
import type { MyBallot } from '../lib/pollLogic';
import { fetchRecentBroadcasts } from './broadcastService';
import { BROADCAST_RECENCY_MS } from './broadcast';

interface MembershipEdge {
  workspaceId: string;
  role: string;
}

async function fetchMembershipEdges(uid: string): Promise<MembershipEdge[]> {
  try {
    const snap = await getDocs(query(collection(db, 'workspaceMembers'), where('uid', '==', uid)));
    const out: MembershipEdge[] = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      if (typeof data.workspaceId === 'string') {
        out.push({ workspaceId: data.workspaceId, role: typeof data.role === 'string' ? data.role : '' });
      }
    });
    return out;
  } catch {
    return [];
  }
}

async function fetchOrgPolls(orgId: string): Promise<MemberPollDoc[]> {
  try {
    const snap = await getDocs(query(collection(db, 'polls'), where('workspaceId', '==', orgId)));
    const out: MemberPollDoc[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Record<string, unknown>) } as MemberPollDoc));
    return out;
  } catch {
    return [];
  }
}

/** The member's OWN ballot on one poll — the only ballot ever read here. */
async function fetchOwnBallot(pollId: string, uid: string): Promise<MyBallot | null> {
  try {
    const snap = await getDoc(doc(db, 'polls', pollId, 'votes', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      ...(typeof data.optionId === 'string' ? { optionId: data.optionId } : {}),
      ...(Array.isArray(data.optionIds) ? { optionIds: data.optionIds as string[] } : {}),
      ...(typeof data.text === 'string' ? { text: data.text } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * One reminder pass for a member. Returns a handled map
 * (broadcastId → createdAt) for every reminder broadcast it fully
 * resolved — emitted or suppressed — for broadcastListener to fold
 * into its seen ledger. On `baseline` (the watcher's first-ever
 * check) nothing emits; everything resolves as handled, mirroring
 * the announcement baseline law.
 */
export async function checkPollReminders(
  uid: string,
  opts: { now?: number; baseline?: boolean; seen?: Record<string, number> } = {},
): Promise<Record<string, number>> {
  const handled: Record<string, number> = {};
  if (!uid || uid === 'anon') return handled;
  const now = opts.now ?? Date.now();
  try {
    const edges = await fetchMembershipEdges(uid);
    if (edges.length === 0) return handled;
    const roleByOrg = new Map(edges.map((e) => [e.workspaceId, e.role]));

    const broadcasts = await fetchRecentBroadcasts(
      edges.map((e) => e.workspaceId),
      now - BROADCAST_RECENCY_MS,
    );
    const reminders = broadcasts.filter((b) => parsePollReminderBroadcast(b) !== null);
    if (reminders.length === 0) return handled;

    // Lazy: the emit chain pulls in firebase ESM (broadcastListener's law).
    const { notifyPollReminder } = await import('../notifications/notifyHelpers');

    const pollsByOrg = new Map<string, MemberPollDoc[]>();
    for (const b of reminders) {
      if (opts.seen && opts.seen[b.id] !== undefined) continue; // a past check resolved it
      const pollTitle = parsePollReminderBroadcast(b);
      if (!pollTitle) continue;
      if (!pollsByOrg.has(b.orgId)) pollsByOrg.set(b.orgId, await fetchOrgPolls(b.orgId));
      const candidates = matchReminderPolls(pollsByOrg.get(b.orgId) || [], pollTitle, roleByOrg.get(b.orgId));
      if (candidates.length === 0) continue; // not resolvable here — leave it to the generic announcement

      let resolved = true;
      for (const poll of candidates) {
        const myBallot = await fetchOwnBallot(poll.id, uid);
        if (!shouldShowPollReminder({ poll, myBallot, now })) continue; // voted, or closed — silence
        if (!opts.baseline) {
          try {
            await notifyPollReminder(uid, {
              orgId: b.orgId,
              orgName: b.orgName || '',
              pollId: poll.id,
              pollTitle: poll.title || pollTitle,
              broadcastId: b.id,
            });
          } catch {
            resolved = false; // emit failed — do not mark handled; a later check may retry
          }
        }
      }
      if (resolved) handled[b.id] = b.createdAt;
    }
    return handled;
  } catch {
    return handled; // a reminder failure never breaks announcements
  }
}
