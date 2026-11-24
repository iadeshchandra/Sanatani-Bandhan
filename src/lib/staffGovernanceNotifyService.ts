/**
 * staffGovernanceNotifyService — NOTIFICATION WAVE 2: the self-listen
 * watcher for governance + people news (DESIGN §2.3 / §2.4).
 * ==========================================================================
 * Same discipline as approvalNotifyService: poll on start, on
 * foreground, on a slow jittered interval; first run per scope is a
 * silent baseline; persisted ledgers make every bell fire once.
 *
 * ROLE IS THE ADDRESS, enforced by the reads themselves:
 *  - `resolutions` of workspaces where I hold a BOARD role
 *    (Trustee / Manager / SuperAdmin — the rules' resBoardRoles):
 *    an open resolution I have not voted on is action news. My own
 *    voters-map entry suppresses it the moment I vote (L4).
 *  - `auction_lots` of workspaces where I am Trustee / Accountant /
 *    SuperAdmin: a lot settling or failing is staff news.
 *  - `workspaceMembers`: my OWN edges (my role changes — action) and,
 *    where I am Trustee / SuperAdmin, the whole roster (joins —
 *    digest; other members' role changes — info). The roster read is
 *    trustee-only in the rules, so a Manager/CSO device never sees
 *    another member's edge here; that audience stays unreachable
 *    until the read rules change (NOTES.md, gap G-W2-2).
 */
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  notifyLotOutcome,
  notifyMemberJoined,
  notifyResolutionPending,
  notifyRoleChanged,
} from '../notifications/notifyHelpers';
import { resolveEdgeRole } from './landingSurface';
import {
  memberKey,
  memberNamesSummary,
  pickLotOutcomes,
  pickMemberJoined,
  pickResolutionNotices,
  pickRoleChanges,
  settledRoleMap,
  type LotLedger,
  type LotLike,
  type MemberEdgeLike,
  type ResolutionDocLike,
} from './staffGovernanceNotify';

const LEDGER_KEY = 'sb.staffGovernanceNotify.ledger.v1';
const LOTS_KEY = 'sb.staffGovernanceNotify.lots.v1';
const ROSTER_KEY = 'sb.staffGovernanceNotify.roster.v1';
const BASELINE_KEY = 'sb.staffGovernanceNotify.baselined.v1';
const POLL_MS = 60_000;

const BOARD_ROLES = ['Trustee', 'Manager', 'SuperAdmin'];
const LOT_ROLES = ['Trustee', 'Accountant', 'SuperAdmin'];
const TRUSTEE_ROLES = ['Trustee', 'SuperAdmin'];

interface MyEdge {
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

async function myEdges(uid: string): Promise<MyEdge[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'workspaceMembers'), where('uid', '==', uid)),
    );
    const edges: MyEdge[] = [];
    snap.forEach((d) => {
      const m = d.data() as Record<string, unknown>;
      const workspaceId = typeof m.workspaceId === 'string' ? m.workspaceId : '';
      if (!workspaceId) return;
      edges.push({
        workspaceId,
        workspaceName: typeof m.workspaceName === 'string' ? m.workspaceName : '',
        role: String(resolveEdgeRole(typeof m.role === 'string' ? m.role : undefined)),
      });
    });
    return edges;
  } catch {
    return [];
  }
}

async function fetchResolutions(workspaceId: string): Promise<ResolutionDocLike[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'resolutions'), where('workspaceId', '==', workspaceId), limit(200)),
    );
    return snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as unknown as ResolutionDocLike,
    );
  } catch {
    return [];
  }
}

async function fetchLots(workspaceId: string): Promise<LotLike[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'auction_lots'), where('workspaceId', '==', workspaceId), limit(200)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as LotLike);
  } catch {
    return [];
  }
}

async function fetchRoster(workspaceId: string): Promise<MemberEdgeLike[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'workspaceMembers'), where('workspaceId', '==', workspaceId), limit(500)),
    );
    const out: MemberEdgeLike[] = [];
    snap.forEach((d) => {
      const m = d.data() as Record<string, unknown>;
      const memberUid = typeof m.uid === 'string' ? m.uid : '';
      if (!memberUid) return;
      out.push({
        workspaceId,
        uid: memberUid,
        role: String(resolveEdgeRole(typeof m.role === 'string' ? m.role : undefined)),
        ...(typeof m.displayName === 'string' ? { displayName: m.displayName } : {}),
      });
    });
    return out;
  } catch {
    return [];
  }
}

async function runCheck(uid: string): Promise<void> {
  const edges = await myEdges(uid);
  if (edges.length === 0) return;
  const now = Date.now();

  const baselined = readJson<Record<string, boolean>>(BASELINE_KEY, {});
  const notified = new Set(readJson<string[]>(LEDGER_KEY, []));
  const lotLedger = readJson<LotLedger>(LOTS_KEY, {});
  const roster = readJson<{ known: string[]; roles: Record<string, string> }>(ROSTER_KEY, {
    known: [],
    roles: {},
  });
  let notifiedChanged = false;
  let lotsChanged = false;
  let rosterChanged = false;
  const markBaselined = (scope: string) => {
    if (!baselined[scope]) {
      baselined[scope] = true;
      writeJson(BASELINE_KEY, baselined);
    }
  };
  const settleNotified = (key: string) => {
    if (!notified.has(key)) {
      notified.add(key);
      notifiedChanged = true;
    }
  };

  /* ---- My own role changes: my edges vs my settled role map ----- */
  {
    const scope = 'selfroles';
    const firstRun = !baselined[scope];
    const myCurrent: MemberEdgeLike[] = edges.map((e) => ({
      workspaceId: e.workspaceId,
      uid,
      role: e.role,
    }));
    if (!firstRun) {
      for (const n of pickRoleChanges(myCurrent, roster.roles)) {
        settleNotified(n.dedupeKey);
        const edge = edges.find((x) => x.workspaceId === n.workspaceId);
        try {
          await notifyRoleChanged(uid, {
            orgId: n.workspaceId,
            orgName: edge?.workspaceName || 'Your organisation',
            role: n.toRole,
            dedupeKey: n.dedupeKey,
            audience: 'self',
          });
        } catch {
          /* never crash */
        }
      }
    }
    // Settle my current roles into the shared map (the roster pass
    // below merges its own view over the same keys).
    for (const e of myCurrent) {
      const k = memberKey(e.workspaceId, uid);
      if (roster.roles[k] !== e.role) {
        roster.roles[k] = e.role;
        rosterChanged = true;
      }
    }
    markBaselined(scope);
  }

  for (const e of edges) {
    /* ---- Resolutions awaiting my vote --------------------------- */
    if (BOARD_ROLES.includes(e.role)) {
      const scope = `res:${e.workspaceId}`;
      const firstRun = !baselined[scope];
      const resolutions = await fetchResolutions(e.workspaceId);
      if (!firstRun) {
        for (const n of pickResolutionNotices(resolutions, uid, notified, now)) {
          settleNotified(n.dedupeKey);
          try {
            await notifyResolutionPending(uid, {
              orgId: e.workspaceId,
              orgName: e.workspaceName || 'Your organisation',
              title: n.resolution.title || 'A resolution',
              resolutionId: n.resolution.id,
              dedupeKey: n.dedupeKey,
              ...(n.expiresAt ? { expiresAt: n.expiresAt } : {}),
            });
          } catch {
            /* never crash */
          }
        }
      }
      markBaselined(scope);
    }

    /* ---- Auction lot outcomes ----------------------------------- */
    if (LOT_ROLES.includes(e.role)) {
      const scope = `lots:${e.workspaceId}`;
      const firstRun = !baselined[scope];
      const lots = await fetchLots(e.workspaceId);
      const { notices, settled } = pickLotOutcomes(lots, lotLedger);
      if (!firstRun) {
        for (const n of notices) {
          try {
            await notifyLotOutcome(uid, {
              copyKey: n.status === 'settled' ? 'lotSettled' : 'lotFailed',
              orgId: e.workspaceId,
              orgName: e.workspaceName || 'Your organisation',
              lotTitle: n.lot.title || 'A lot',
              lotId: n.lot.id,
              dedupeKey: n.dedupeKey,
            });
          } catch {
            /* never crash */
          }
        }
      }
      for (const [id, status] of Object.entries(settled)) {
        if (lotLedger[id] !== status) {
          lotLedger[id] = status;
          lotsChanged = true;
        }
      }
      markBaselined(scope);
    }

    /* ---- Roster: joins + other members' role changes ----------- */
    if (TRUSTEE_ROLES.includes(e.role)) {
      const scope = `roster:${e.workspaceId}`;
      const firstRun = !baselined[scope];
      const rosterEdges = await fetchRoster(e.workspaceId);
      const known = new Set(roster.known);
      if (!firstRun) {
        // Joins — one grouped card per workspace per day (DESIGN).
        for (const n of pickMemberJoined(rosterEdges, known, uid, now)) {
          const alreadyToday = notified.has(n.dedupeKey);
          settleNotified(n.dedupeKey);
          if (!alreadyToday) {
            try {
              await notifyMemberJoined(uid, {
                orgId: e.workspaceId,
                orgName: e.workspaceName || 'Your organisation',
                names: memberNamesSummary(n.members),
                dedupeKey: n.dedupeKey,
              });
            } catch {
              /* never crash */
            }
          }
        }
        // Other members' role changes — info tier for the trustee.
        const others = rosterEdges.filter((m) => m.uid !== uid);
        for (const n of pickRoleChanges(others, roster.roles)) {
          try {
            await notifyRoleChanged(uid, {
              orgId: e.workspaceId,
              orgName: e.workspaceName || 'Your organisation',
              role: n.toRole,
              dedupeKey: n.dedupeKey,
              audience: 'trustee',
              memberName: n.name || 'A member',
            });
          } catch {
            /* never crash */
          }
        }
      }
      // Settle the roster view: every uid known, every role current.
      for (const m of rosterEdges) {
        const k = memberKey(m.workspaceId, m.uid);
        if (!known.has(k)) {
          known.add(k);
          rosterChanged = true;
        }
      }
      const settled = settledRoleMap(rosterEdges);
      for (const [k, role] of Object.entries(settled)) {
        if (roster.roles[k] !== role) {
          roster.roles[k] = role;
          rosterChanged = true;
        }
      }
      roster.known = [...known].slice(-1000);
      markBaselined(scope);
    }
  }

  if (notifiedChanged) writeJson(LEDGER_KEY, [...notified].slice(-1000));
  if (lotsChanged) writeJson(LOTS_KEY, lotLedger);
  if (rosterChanged) writeJson(ROSTER_KEY, roster);
}

/** Start the watcher for a signed-in user. Returns a stop fn. */
export function startStaffGovernanceNotify(uid: string): () => void {
  let stopped = false;
  let timer: number | undefined;

  const tick = () => {
    if (stopped) return;
    runCheck(uid).catch(() => undefined);
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
