/**
 * staffMoneyNotifyService — NOTIFICATION WAVE 2: the self-listen
 * watcher for staff money news (DESIGN §2.1).
 * ==========================================================================
 * Mirrors approvalNotifyService's discipline exactly: poll on start,
 * on foreground, and on a slow jittered interval; the FIRST run per
 * scope only establishes the baseline (never a burst of history);
 * localStorage ledgers make every bell fire exactly once.
 *
 * ROLE IS THE ADDRESS. Each source is read only where the reader's
 * own role already grants the read — the rules do the addressing:
 *  - my own `payouts` (provider-scoped: nobody else can read them);
 *  - `paymentClaims` I filed, plus those of workspaces where I hold
 *    a FINANCE role (Trustee / Accountant / SuperAdmin);
 *  - `treasury` of workspaces where I hold an OVERSIGHT role
 *    (FINANCE + Auditor) — a large Income row is the news;
 *  - `subscriptions/{ws}` for workspaces where I am Trustee /
 *    SuperAdmin — the plan's derived stage is the news.
 * A devotee's device simply sees nothing: every query comes back
 * empty or denied, and the watcher stays silent.
 */
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  notifyLargeDonation,
  notifyPayoutFailed,
  notifyPayoutReleased,
  notifyPayoutSettlementFailed,
  notifyPlanClaimRejected,
  notifyPlanStage,
} from '../notifications/notifyHelpers';
import { payoutApprovalThreshold } from './approvals';
import { formatMoney } from './money';
import { resolveEdgeRole } from './landingSurface';
import {
  pickClaimRejections,
  pickLargeDonations,
  pickPayoutFailures,
  pickPlanStage,
  type ClaimLedger,
  type PaymentClaimLike,
  type PayoutLedger,
  type PayoutLike,
  type TreasuryTxLike,
} from './staffMoneyNotify';
import type { SubscriptionLike } from './subscriptionExpiry';

const LEDGER_KEY = 'sb.staffMoneyNotify.ledger.v1';
const STATE_KEY = 'sb.staffMoneyNotify.state.v1';
const BASELINE_KEY = 'sb.staffMoneyNotify.baselined.v1';
const POLL_MS = 60_000;

const FINANCE_ROLES = ['Trustee', 'Accountant', 'SuperAdmin'];
const OVERSIGHT_ROLES = ['Trustee', 'Accountant', 'SuperAdmin', 'Auditor'];
const PLAN_ROLES = ['Trustee', 'SuperAdmin'];

interface MyEdge {
  workspaceId: string;
  workspaceName: string;
  role: string;
}

interface WsInfo {
  name: string;
  currency: string;
  threshold: number;
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

/** Workspace doc facts the money news needs (name, currency, the
 *  workspace's own maker–checker threshold). Fail-soft to defaults. */
async function wsInfo(edge: MyEdge): Promise<WsInfo> {
  const fallback: WsInfo = {
    name: edge.workspaceName || 'Your organisation',
    currency: 'INR',
    threshold: payoutApprovalThreshold(null),
  };
  try {
    const snap = await getDoc(doc(db, 'workspaces', edge.workspaceId));
    if (!snap.exists()) return fallback;
    const w = snap.data() as Record<string, unknown>;
    return {
      name: typeof w.name === 'string' && w.name ? w.name : fallback.name,
      currency: typeof w.currency === 'string' && w.currency ? w.currency : fallback.currency,
      threshold: payoutApprovalThreshold(w as { makerCheckerPayoutThreshold?: number | null }),
    };
  } catch {
    return fallback;
  }
}

async function fetchPayouts(uid: string): Promise<PayoutLike[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'payouts'), where('providerUid', '==', uid), limit(100)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as PayoutLike);
  } catch {
    return [];
  }
}

async function fetchClaims(field: string, value: string): Promise<PaymentClaimLike[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'paymentClaims'), where(field, '==', value), limit(100)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as PaymentClaimLike);
  } catch {
    return [];
  }
}

async function fetchTreasury(workspaceId: string): Promise<TreasuryTxLike[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'treasury'), where('workspaceId', '==', workspaceId), limit(500)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as TreasuryTxLike);
  } catch {
    return [];
  }
}

async function fetchSubscription(workspaceId: string): Promise<SubscriptionLike | null> {
  try {
    const snap = await getDoc(doc(db, 'subscriptions', workspaceId));
    return snap.exists() ? (snap.data() as SubscriptionLike) : null;
  } catch {
    return null;
  }
}

function planLabel(claim: PaymentClaimLike): string {
  const plan = (claim.plan || '').trim();
  const period = (claim.period || '').trim();
  if (plan && period) return `${plan} (${period})`;
  return plan || 'plan';
}

async function runCheck(uid: string): Promise<void> {
  const edges = await myEdges(uid);
  const now = Date.now();

  const baselined = readJson<Record<string, boolean>>(BASELINE_KEY, {});
  const notified = new Set(readJson<string[]>(LEDGER_KEY, []));
  const state = readJson<{ payouts: PayoutLedger; claims: ClaimLedger }>(STATE_KEY, {
    payouts: {},
    claims: {},
  });
  let notifiedChanged = false;
  let stateChanged = false;
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

  /* ---- My payouts: rejection + settlement news is my money news - */
  {
    const payouts = await fetchPayouts(uid);
    const { notices, settled } = pickPayoutFailures(payouts, state.payouts);
    const firstRun = !baselined['payouts'];
    for (const n of notices) {
      if (!firstRun) {
        const amount = formatMoney(Number(n.payout.amount || 0), n.payout.currency);
        try {
          if (n.kind === 'settlement_failed') {
            await notifyPayoutSettlementFailed(uid, {
              amount,
              payoutId: n.payout.id,
              dedupeKey: n.dedupeKey,
              ...(n.reason ? { reason: n.reason } : {}),
            });
          } else if (n.kind === 'released') {
            await notifyPayoutReleased(uid, {
              amount,
              payoutId: n.payout.id,
              dedupeKey: n.dedupeKey,
            });
          } else {
            await notifyPayoutFailed(uid, {
              amount,
              payoutId: n.payout.id,
              dedupeKey: n.dedupeKey,
            });
          }
        } catch {
          /* inbox write failed — state already settled; never crash */
        }
      }
    }
    if (JSON.stringify(settled) !== JSON.stringify(state.payouts)) {
      state.payouts = { ...state.payouts, ...settled };
      stateChanged = true;
    }
    markBaselined('payouts');
  }

  /* ---- Payment claims: mine + my finance workspaces' ------------ */
  {
    const byId = new Map<string, PaymentClaimLike>();
    for (const c of await fetchClaims('applicantUid', uid)) byId.set(c.id, c);
    for (const e of edges.filter((x) => FINANCE_ROLES.includes(x.role))) {
      for (const c of await fetchClaims('workspaceId', e.workspaceId)) byId.set(c.id, c);
    }
    const claims = [...byId.values()];
    const { notices, settled } = pickClaimRejections(claims, state.claims);
    const firstRun = !baselined['claims'];
    for (const n of notices) {
      if (!firstRun) {
        const wsId = typeof n.claim.workspaceId === 'string' ? n.claim.workspaceId : '';
        const edge = edges.find((x) => x.workspaceId === wsId);
        try {
          await notifyPlanClaimRejected(uid, {
            orgId: wsId && wsId !== 'personal' ? wsId : '',
            orgName: n.claim.workspaceName || edge?.workspaceName || 'Your workspace',
            plan: planLabel(n.claim),
            claimId: n.claim.id,
            dedupeKey: n.dedupeKey,
          });
        } catch {
          /* never crash */
        }
      }
    }
    if (JSON.stringify(settled) !== JSON.stringify(state.claims)) {
      state.claims = { ...state.claims, ...settled };
      stateChanged = true;
    }
    markBaselined('claims');
  }

  /* ---- Large donations + plan stages, per workspace ------------- */
  for (const e of edges) {
    if (OVERSIGHT_ROLES.includes(e.role)) {
      const info = await wsInfo(e);
      const txs = await fetchTreasury(e.workspaceId);
      const scope = `treasury:${e.workspaceId}`;
      const firstRun = !baselined[scope];
      if (firstRun) {
        // Baseline: settle every id in view — history is not news.
        for (const tx of txs) if (tx && tx.id) settleNotified(`txn:${tx.id}`);
      } else {
        for (const n of pickLargeDonations(txs, notified, info.threshold)) {
          settleNotified(n.dedupeKey);
          try {
            await notifyLargeDonation(uid, {
              orgId: e.workspaceId,
              orgName: info.name,
              amount: formatMoney(Number(n.tx.amount || 0), info.currency),
              txnId: n.tx.id,
              dedupeKey: n.dedupeKey,
            });
          } catch {
            /* never crash */
          }
        }
        // Settle the below-threshold ids too, so the ledger stays
        // bounded to what this device has actually seen.
        for (const tx of txs) if (tx && tx.id) settleNotified(`txn:${tx.id}`);
      }
      markBaselined(scope);
    }

    if (PLAN_ROLES.includes(e.role)) {
      const sub = await fetchSubscription(e.workspaceId);
      const scope = `plan:${e.workspaceId}`;
      const firstRun = !baselined[scope];
      const notice = pickPlanStage(sub, e.workspaceId, now);
      if (notice) {
        const already = notified.has(notice.dedupeKey);
        settleNotified(notice.dedupeKey);
        if (!firstRun && !already) {
          const info = await wsInfo(e);
          try {
            await notifyPlanStage(uid, {
              copyKey:
                notice.stage === 'expiring'
                  ? 'planExpiring'
                  : notice.stage === 'grace'
                    ? 'planGrace'
                    : 'planExpired',
              orgId: e.workspaceId,
              orgName: info.name,
              days: notice.daysLeft ?? 0,
              dedupeKey: notice.dedupeKey,
              ...(notice.expiresAt ? { expiresAt: notice.expiresAt } : {}),
            });
          } catch {
            /* never crash */
          }
        }
      }
      markBaselined(scope);
    }
  }

  if (stateChanged) writeJson(STATE_KEY, state);
  if (notifiedChanged) writeJson(LEDGER_KEY, [...notified].slice(-1000));
}

/** Start the watcher for a signed-in user. Returns a stop fn. */
export function startStaffMoneyNotify(uid: string): () => void {
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
