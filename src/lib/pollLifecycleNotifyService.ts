/**
 * pollLifecycleNotifyService — NOTIFICATION WAVE 1: the self-listen
 * watcher for the poll lifecycle trio (DESIGN §2.3).
 * ==========================================================================
 * Mirrors approvalNotifyService's discipline exactly: poll on start,
 * on foreground, and on a slow jittered interval; the FIRST run per
 * workspace only establishes the baseline (never a burst of history);
 * a localStorage ledger makes every bell fire exactly once.
 *
 * What it watches: the polls of the workspaces I belong to —
 * workspaceMembers edges ∪ the active workspace (the P2a membership
 * shape). The pure half (lib/pollLifecycleNotify) applies the poll's
 * own audience gate and, for opened/closing, the own-ballot
 * suppression: this service reads ONLY my own ballot doc per open
 * poll — never anyone else's — so a member who has voted is never
 * nagged, and nobody learns anything about anyone's vote.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyPollLifecycle } from '../notifications/notifyHelpers';
import type { MemberPollDoc } from './memberPolls';
import type { MyBallot } from './pollLogic';
import {
  pickPollLifecycleNotices,
  pollVerdictFragment,
} from './pollLifecycleNotify';
import { resolveEdgeRole } from './landingSurface';

const LEDGER_KEY = 'sb.pollLifecycleNotify.ledger.v1';
const BASELINE_KEY = 'sb.pollLifecycleNotify.baselined.v1';
const POLL_MS = 60_000;

export interface PollWatcherMembership {
  workspaceId: string;
  workspaceName: string;
  role: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — bells may repeat, never crash */
  }
}

async function myMemberships(
  uid: string,
  activeWorkspace?: { id: string; name?: string; role?: string } | null,
): Promise<PollWatcherMembership[]> {
  const out: PollWatcherMembership[] = [];
  try {
    const snap = await getDocs(
      query(collection(db, 'workspaceMembers'), where('uid', '==', uid)),
    );
    snap.forEach((d) => {
      const m = d.data() as Record<string, unknown>;
      const workspaceId = typeof m.workspaceId === 'string' ? m.workspaceId : '';
      if (!workspaceId) return;
      out.push({
        workspaceId,
        workspaceName: typeof m.workspaceName === 'string' ? m.workspaceName : '',
        role: String(resolveEdgeRole(typeof m.role === 'string' ? m.role : undefined)),
      });
    });
  } catch {
    /* fail-soft: the active workspace below may still resolve */
  }
  // ∪ the active workspace (P2a: a plain devotee may hold no edge
  // for their own temple; the rules still grant them poll reads).
  if (activeWorkspace?.id && !out.some((e) => e.workspaceId === activeWorkspace.id)) {
    out.push({
      workspaceId: activeWorkspace.id,
      workspaceName: activeWorkspace.name || '',
      role: activeWorkspace.role || 'Devotee',
    });
  }
  return out;
}

async function fetchPolls(workspaceId: string): Promise<MemberPollDoc[]> {
  try {
    // P2b: drafts are committee-only at the rules layer — an
    // unfiltered query that returned one would fail wholesale for
    // a non-committee member, silencing ALL of this watcher's news
    // for that workspace. The status filter keeps drafts out of
    // every member's read (the picker's phase law skips them too).
    const snap = await getDocs(
      query(
        collection(db, 'polls'),
        where('workspaceId', '==', workspaceId),
        where('status', 'in', ['ACTIVE', 'CONCLUDED'])
      ),
    );
    const out: MemberPollDoc[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Record<string, unknown>) } as MemberPollDoc));
    return out;
  } catch {
    return [];
  }
}

/** My OWN ballot on one poll — the only ballot ever read here. */
async function fetchOwnBallot(pollId: string, uid: string): Promise<MyBallot | null> {
  try {
    const snap = await getDoc(doc(db, 'polls', pollId, 'votes', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      ...(typeof data.optionId === 'string' ? { optionId: data.optionId } : {}),
      ...(Array.isArray(data.optionIds) ? { optionIds: data.optionIds as string[] } : {}),
      ...(typeof data.text === 'string' ? { text: data.text } : {}),
      ...(data.abstain === true ? { abstain: true } : {}),
    };
  } catch {
    return null;
  }
}

async function runCheck(
  uid: string,
  activeWorkspace?: { id: string; name?: string; role?: string } | null,
): Promise<void> {
  const memberships = await myMemberships(uid, activeWorkspace);
  if (memberships.length === 0) return;
  const now = Date.now();

  const baselined = readJson<Record<string, boolean>>(BASELINE_KEY, {});
  const ledger = new Set(readJson<string[]>(LEDGER_KEY, []));
  let ledgerChanged = false;

  for (const ms of memberships) {
    const polls = await fetchPolls(ms.workspaceId);
    if (polls.length === 0) {
      if (!baselined[ms.workspaceId]) {
        baselined[ms.workspaceId] = true;
        writeJson(BASELINE_KEY, baselined);
      }
      continue;
    }
    // Ballots only for OPEN polls (concluded news needs none).
    const myBallots: Record<string, MyBallot | null> = {};
    for (const p of polls) {
      if (p.status === 'ACTIVE') myBallots[p.id] = await fetchOwnBallot(p.id, uid);
    }

    const notices = pickPollLifecycleNotices({
      polls,
      roleByWorkspace: { [ms.workspaceId]: ms.role },
      myBallots,
      notified: ledger,
      now,
    });
    const firstRun = !baselined[ms.workspaceId];
    for (const n of notices) {
      ledger.add(n.dedupeKey);
      ledgerChanged = true;
      if (firstRun || n.suppressed) continue; // baseline law / already voted — settle silently
      try {
        await notifyPollLifecycle(uid, {
          copyKey:
            n.stage === 'opened'
              ? 'pollOpened'
              : n.stage === 'closing'
                ? 'pollClosing'
                : 'pollResult',
          orgId: ms.workspaceId,
          orgName: ms.workspaceName || 'Your organisation',
          pollId: n.poll.id,
          pollTitle: n.poll.title || '',
          dedupeKey: n.dedupeKey,
          verdict: n.stage === 'concluded' ? pollVerdictFragment(n.poll) : null,
          ...(n.stage !== 'concluded' &&
          typeof n.poll.expiresAt === 'number' &&
          n.poll.expiresAt > now
            ? { expiresAt: n.poll.expiresAt }
            : {}),
        });
      } catch {
        /* inbox write failed — ledger already marked; never crash */
      }
    }
    if (firstRun) {
      baselined[ms.workspaceId] = true;
      writeJson(BASELINE_KEY, baselined);
    }
  }
  if (ledgerChanged) writeJson(LEDGER_KEY, [...ledger].slice(-800));
}

/** Start the watcher for a signed-in user. Returns a stop fn. */
export function startPollLifecycleNotify(
  uid: string,
  opts: { activeWorkspace?: { id: string; name?: string; role?: string } | null } = {},
): () => void {
  let stopped = false;
  let timer: number | undefined;

  const tick = () => {
    if (stopped) return;
    runCheck(uid, opts.activeWorkspace).catch(() => undefined);
  };
  const schedule = () => {
    timer = window.setTimeout(
      () => {
        tick();
        schedule();
      },
      POLL_MS + Math.floor(Math.random() * 15_000),
    );
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') tick();
  };

  tick();
  schedule();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
