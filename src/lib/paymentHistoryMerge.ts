/**
 * lib/paymentHistoryMerge.ts — QUEUED #54: pure merge logic for the
 * Settings → Billing "Payment & Request History" panel.
 *
 * The panel unions the org's TWO billing streams:
 *   - `upgrade_requests` — legacy submissions from the retired Settings
 *     upgrade modal (communityId-keyed; read opened to the org's finance
 *     roles by the #54 rules bundle).
 *   - `paymentClaims` — the canonical PlanUpgradeFlow pipeline
 *     (workspaceId-keyed; owner approves → plan activates).
 *
 * Honesty contract (extends the #51 D9e law to two streams):
 *   - Each stream settles independently. One stream's failure must
 *     NEVER fake-empty the other's rows — it surfaces as a visible
 *     partial error alongside the surviving rows.
 *   - Only a DOUBLE failure lands in the panel's full error state.
 *   - Every row is labelled with the stream it came from.
 */

export type HistorySource = 'request' | 'claim';

export interface HistoryRow {
  /** Collection-prefixed id — unique across both streams (React key). */
  id: string;
  source: HistorySource;
  /** Honest origin label shown on the row ("Upgrade request" / "Plan claim"). */
  sourceLabel: string;
  planLabel: string;
  /** Uppercased: legacy requests store 'PENDING', claims store 'pending'. */
  statusLabel: string;
  transactionId: string;
  methodLabel: string;
  /** Claims carry an amount; legacy requests do not (null → not rendered). */
  amountLabel: string | null;
  /** 0 when the doc has no readable timestamp (sorts last, shows '—'). */
  timestampMillis: number;
}

export type StreamResult =
  | { status: 'ok'; rows: HistoryRow[] }
  | { status: 'error'; error: string };

export interface CombinedHistory {
  rows: HistoryRow[];
  /** Set only when BOTH streams failed → the panel's full error state. */
  fullError: string | null;
  /** Set when exactly ONE stream failed → note shown beside the rows. */
  partialError: string | null;
}

/** Firestore Timestamp | Date | epoch-millis | { seconds } → millis (0 = none). */
export function timestampMillis(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  const v = value as { toMillis?: unknown; seconds?: unknown };
  if (typeof v.toMillis === 'function') {
    const t = (v.toMillis as () => number)();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return 0;
}

function strField(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/** Legacy `upgrade_requests` doc → row. */
export function requestToHistoryRow(id: string, data: Record<string, any>): HistoryRow {
  return {
    id: `request:${id}`,
    source: 'request',
    sourceLabel: 'Upgrade request',
    planLabel: strField(data.requestedPlan, '—'),
    statusLabel: strField(data.status, 'PENDING').toUpperCase(),
    transactionId: strField(data.transactionId, '—'),
    methodLabel: strField(data.paymentMethod, '—'),
    amountLabel: null,
    timestampMillis: timestampMillis(data.timestamp),
  };
}

/** Canonical `paymentClaims` doc → row. */
export function claimToHistoryRow(id: string, data: Record<string, any>): HistoryRow {
  const amount =
    typeof data.amount === 'number' && Number.isFinite(data.amount) ? data.amount : null;
  return {
    id: `claim:${id}`,
    source: 'claim',
    sourceLabel: 'Plan claim',
    planLabel: strField(data.plan, '—'),
    statusLabel: strField(data.status, 'pending').toUpperCase(),
    transactionId: strField(data.transactionId, '—'),
    methodLabel: strField(data.method, '—'),
    amountLabel: amount === null ? null : `${strField(data.currency, '')} ${amount}`.trim(),
    timestampMillis: timestampMillis(data.createdAt),
  };
}

/** Newest-first merge of any number of row lists (stable for equal times). */
export function mergeHistoryRows(...lists: HistoryRow[][]): HistoryRow[] {
  return lists.flat().sort((a, b) => b.timestampMillis - a.timestampMillis);
}

/**
 * Combine the two independently-settled streams into the panel state.
 * Both ok → merged rows. One ok → its rows + partialError. None ok →
 * fullError (the first stream's message), no rows.
 */
export function combineHistoryStreams(
  requests: StreamResult,
  claims: StreamResult,
): CombinedHistory {
  if (requests.status === 'ok' && claims.status === 'ok') {
    return { rows: mergeHistoryRows(requests.rows, claims.rows), fullError: null, partialError: null };
  }
  if (requests.status === 'ok') {
    return {
      rows: mergeHistoryRows(requests.rows),
      fullError: null,
      partialError: (claims as { error: string }).error,
    };
  }
  if (claims.status === 'ok') {
    return {
      rows: mergeHistoryRows(claims.rows),
      fullError: null,
      partialError: (requests as { error: string }).error,
    };
  }
  return { rows: [], fullError: (requests as { error: string }).error, partialError: null };
}
