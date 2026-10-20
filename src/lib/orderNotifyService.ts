/**
 * lib/orderNotifyService.ts — the watcher half of order Suchana (#29).
 * ============================================================================
 * Pure decisions live in orderNotify.ts (unit-tested there); this file
 * is the Firestore + ledger + timer shell, mirroring
 * org/broadcastListener.ts and sangam/referralThanksService.ts:
 *
 *  - Fetch: my orders as client AND as provider — the two participant
 *    queries `marketplaceOrders` rules already allow (the same ones
 *    myOrdersAsClient/myOrdersAsProvider run in production). All
 *    booking kinds live in this one collection (gig orders, Seva Bazar,
 *    rail-2, Jyotish dakshina), so one watcher covers every journey.
 *  - Ledger: localStorage, per uid, orderId → last status this device
 *    recorded. A status-valued ledger (not a seen-set): one order
 *    transitions many times, and each NEW status is a new story.
 *    Per-device by design — a second device baselines independently,
 *    the same honest limit as org broadcasts.
 *  - Baseline law: the first check on a device records everything and
 *    rings nothing. History is a baseline, not a backlog.
 *  - Honest PWA limit: checks run on boot, on foreground, and on a 60s
 *    tick while the app is open. Order news arrives when the devotee
 *    next opens the app — never later than their next visit.
 *
 * NOTE: notifyHelpers is imported LAZILY inside the checker — the emit
 * chain pulls in firebase ESM, which breaks jest at import time.
 */
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatMoney } from './money';
import {
  pickOrderNotifications,
  type OrderLite,
} from './orderNotify';

const ORDERS = 'marketplaceOrders';
const CLIENT_FETCH_LIMIT = 100;
const PROVIDER_FETCH_LIMIT = 200;

const LEDGER_KEY_PREFIX = 'sb.orderNotify.ledger.v1.';
/** Ledger entries not re-observed within this window are pruned. */
const LEDGER_PRUNE_MS = 45 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Fetch                                                               */
/* ------------------------------------------------------------------ */

function toEpochMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: number };
    if (typeof v.toMillis === 'function') {
      const ms = v.toMillis();
      if (Number.isFinite(ms)) return ms;
    }
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  return 0;
}

function toOrderLite(id: string, data: Record<string, unknown>): OrderLite {
  const sevaBazar = (data.sevaBazar ?? undefined) as OrderLite['sevaBazar'];
  return {
    id,
    status: typeof data.status === 'string' ? data.status : '',
    gigTitle: typeof data.gigTitle === 'string' && data.gigTitle ? data.gigTitle : 'Seva',
    providerUid: typeof data.providerUid === 'string' ? data.providerUid : '',
    clientUid: typeof data.clientUid === 'string' ? data.clientUid : '',
    ...(typeof data.providerName === 'string' && data.providerName
      ? { providerName: data.providerName }
      : {}),
    amountGross: Number(data.amountGross || 0),
    currency: typeof data.currency === 'string' && data.currency ? data.currency : 'INR',
    ...(typeof data.rail === 'string' ? { rail: data.rail } : {}),
    ...(data.payWithWallet === true ? { payWithWallet: true } : {}),
    ...(data.walletPaid === true ? { walletPaid: true } : {}),
    ...(data.payAfterTask === true ? { payAfterTask: true } : {}),
    ...(sevaBazar ? { sevaBazar } : {}),
    updatedAtMs: toEpochMs(data.updatedAt) || toEpochMs(data.createdAt),
  };
}

/** My orders in both roles, deduped by id. Throws on read failure —
 *  the checker treats any failure as "no news", never as an error. */
export async function fetchMyOrdersLite(uid: string): Promise<OrderLite[]> {
  const byId = new Map<string, OrderLite>();
  const [asClient, asProvider] = await Promise.all([
    getDocs(query(collection(db, ORDERS), where('clientUid', '==', uid), limit(CLIENT_FETCH_LIMIT))),
    getDocs(query(collection(db, ORDERS), where('providerUid', '==', uid), limit(PROVIDER_FETCH_LIMIT))),
  ]);
  for (const snap of [asClient, asProvider]) {
    snap.forEach((d) => {
      if (!byId.has(d.id)) byId.set(d.id, toOrderLite(d.id, d.data() as Record<string, unknown>));
    });
  }
  return [...byId.values()];
}

/* ------------------------------------------------------------------ */
/* Ledger (fail-open: storage problems never break the app)            */
/* ------------------------------------------------------------------ */

interface LedgerEntry {
  s: string;
  t: number;
}

function ledgerKey(uid: string): string {
  return `${LEDGER_KEY_PREFIX}${uid}`;
}

/** Returns orderId → last recorded status, or null when never checked. */
function loadLedger(uid: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(ledgerKey(uid));
    if (!raw) return null; // null = never checked → baseline run
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const e = v as LedgerEntry | string;
      if (typeof e === 'string') out[k] = e;
      else if (e && typeof e.s === 'string') out[k] = e.s;
    }
    return out;
  } catch {
    return {}; // corrupt storage → treat as checked, never re-blast
  }
}

function saveLedger(uid: string, marks: Record<string, string>): void {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(ledgerKey(uid));
    const existing: Record<string, LedgerEntry> = {};
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          const e = v as LedgerEntry | string;
          if (typeof e === 'string') existing[k] = { s: e, t: now };
          else if (e && typeof e.s === 'string' && typeof e.t === 'number') existing[k] = e;
        }
      }
    }
    for (const [id, status] of Object.entries(marks)) existing[id] = { s: status, t: now };
    const cutoff = now - LEDGER_PRUNE_MS;
    const pruned: Record<string, LedgerEntry> = {};
    for (const [k, v] of Object.entries(existing)) if (v.t > cutoff) pruned[k] = v;
    localStorage.setItem(ledgerKey(uid), JSON.stringify(pruned));
  } catch {
    /* storage unavailable — the center's dedupeKey still prevents doubles */
  }
}

/* ------------------------------------------------------------------ */
/* Checker + watcher                                                   */
/* ------------------------------------------------------------------ */

/**
 * One order-news check for a devotee. Returns how many bells were
 * emitted. Fire-and-forget safe: never throws.
 */
export async function checkOrderNotifications(
  uid: string,
  opts: { now?: number } = {},
): Promise<number> {
  if (!uid || uid === 'anon') return 0;
  const now = opts.now ?? Date.now();
  try {
    const orders = await fetchMyOrdersLite(uid);
    const ledger = loadLedger(uid);
    const baseline = ledger === null;
    const { notify, markLedger } = pickOrderNotifications({
      orders,
      ledger: ledger ?? {},
      uid,
      now,
      baseline,
    });

    // Persist the ledger FIRST — if an emit crashes midway, the
    // devotee is never re-blasted on the next check.
    saveLedger(uid, markLedger);
    if (notify.length === 0) return 0;

    // Lazy: the emit chain pulls in firebase — only needed when we ring.
    const { notifyOrderEvent } = await import('../notifications/notifyHelpers');
    let sent = 0;
    for (const ev of notify) {
      try {
        await notifyOrderEvent(uid, {
          orderId: ev.orderId,
          copyKey: ev.copyKey,
          priority: ev.priority,
          sevaTitle: ev.sevaTitle,
          amountText: formatMoney(ev.amountGross, ev.currency),
          dedupeKey: ev.dedupeKey,
          ...(ev.counterpartName
            ? { actorUid: ev.counterpartUid, actorName: ev.counterpartName }
            : {}),
          ...(ev.deepLink ? { deepLink: ev.deepLink } : {}),
          payload: {
            orderId: ev.orderId,
            role: ev.role,
            status: ev.status,
            surface: ev.role === 'client' ? 'my-bookings' : 'provider-orders',
          },
        });
        sent++;
      } catch {
        /* one failed bell must not stop the others */
      }
    }
    return sent;
  } catch {
    return 0; // a notification failure never breaks the product
  }
}

/**
 * Start the order-news watcher: runs once on start, again whenever the
 * app returns to the foreground, and ticks every 60s while visible.
 * Returns a stop function.
 */
export function startOrderNotify(uid: string | null): () => void {
  if (!uid || uid === 'anon') return () => undefined;

  let stopped = false;
  const run = () => {
    if (stopped) return;
    void checkOrderNotifications(uid);
  };

  run();
  const onForeground = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    run();
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  const tick =
    typeof window !== 'undefined'
      ? window.setInterval(() => {
          if (typeof document === 'undefined' || document.visibilityState !== 'hidden') run();
        }, 60000)
      : null;

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
    if (tick !== null) window.clearInterval(tick);
  };
}
