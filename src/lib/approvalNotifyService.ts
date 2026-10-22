/**
 * approvalNotifyService — Blueprint B: the self-listen watcher.
 * ==========================================================================
 * Mirrors orderNotifyService's discipline exactly: poll on start,
 * on foreground, and on a slow jittered interval; the FIRST run
 * only establishes the baseline (never a burst of history); a
 * localStorage ledger makes every bell fire exactly once.
 *
 * What it watches: the approvalRequests of the workspaces where I
 * hold a finance/oversight edge (checker side), plus requests I
 * made anywhere (requester side). Rules already scope those reads:
 * approvalRequests read = oversight members of the workspace, or
 * the requester — so a Devotee's device simply sees nothing.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyApprovalEvent } from '../notifications/notifyHelpers';
import {
  CHECKER_ROLES,
  type ApprovalActor,
  type ApprovalRequestDoc,
} from './approvals';
import { pickApprovalNotices } from './approvalNotify';
import { resolveEdgeRole } from './landingSurface';

const LEDGER_KEY = 'sb.approvalNotify.ledger.v1';
const BASELINE_KEY = 'sb.approvalNotify.baselined.v1';
const POLL_MS = 60_000;

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
  const snap = await getDocs(
    query(collection(db, 'workspaceMembers'), where('uid', '==', uid))
  );
  const edges: MyEdge[] = [];
  snap.forEach((d) => {
    const m = d.data() as any;
    edges.push({
      workspaceId: String(m.workspaceId || ''),
      workspaceName: String(m.workspaceName || ''),
      role: String(resolveEdgeRole(m.role)),
    });
  });
  return edges.filter((e) => e.workspaceId);
}

async function fetchRequests(field: string, value: string): Promise<ApprovalRequestDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'approvalRequests'), where(field, '==', value))
  );
  return snap.docs.map((d) => d.data() as ApprovalRequestDoc);
}

async function runCheck(uid: string): Promise<void> {
  const edges = await myEdges(uid);
  if (edges.length === 0) return;
  const byWorkspace = new Map<string, ApprovalRequestDoc[]>();

  // Checker side: workspaces where I can decide at least one kind.
  const checkerWs = edges.filter((e) =>
    (Object.keys(CHECKER_ROLES) as Array<keyof typeof CHECKER_ROLES>).some((k) =>
      CHECKER_ROLES[k].includes(e.role as never)
    )
  );
  for (const e of checkerWs) {
    byWorkspace.set(e.workspaceId, await fetchRequests('workspaceId', e.workspaceId));
  }
  // Requester side: my own requests, wherever I filed them.
  const mine = await fetchRequests('requestedBy', uid);
  for (const r of mine) {
    const list = byWorkspace.get(r.workspaceId) || [];
    if (!list.some((x) => x.id === r.id)) list.push(r);
    byWorkspace.set(r.workspaceId, list);
  }

  const baselined = readJson<Record<string, boolean>>(BASELINE_KEY, {});
  const ledger = new Set(readJson<string[]>(LEDGER_KEY, []));
  let ledgerChanged = false;

  for (const [wsId, requests] of byWorkspace) {
    const edge = edges.find((e) => e.workspaceId === wsId);
    const me: ApprovalActor = { uid, name: '', role: edge?.role || '' };
    const notices = pickApprovalNotices(requests, me, ledger);
    const firstRun = !baselined[wsId];
    for (const n of notices) {
      ledger.add(n.dedupeKey);
      ledgerChanged = true;
      if (firstRun) continue; // baseline law: history never bursts
      try {
        await notifyApprovalEvent(uid, {
          copyKey: n.copyKey,
          orgId: wsId,
          orgName: edge?.workspaceName || 'Your organisation',
          summary: n.request.summary,
          requestId: n.request.id,
          dedupeKey: n.dedupeKey,
        });
      } catch {
        /* inbox write failed — ledger already marked; never crash */
      }
    }
    if (firstRun) {
      baselined[wsId] = true;
      writeJson(BASELINE_KEY, baselined);
    }
  }
  if (ledgerChanged) writeJson(LEDGER_KEY, [...ledger].slice(-500));
}

/** Start the watcher for a signed-in user. Returns a stop fn. */
export function startApprovalNotify(uid: string): () => void {
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
      POLL_MS + Math.floor(Math.random() * 15_000)
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
