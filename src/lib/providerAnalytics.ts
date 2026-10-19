/**
 * providerAnalytics.ts — pure, jest-safe helpers for provider analytics.
 * ========================================================================
 * STANDING LAW (from audit fix #6, 2026-10-19): marketplaceOrders docs carry
 * `providerUid`, NOT `providerId`. Every analytics aggregation and filter
 * MUST resolve the provider through `orderProviderUid()` below. Never read
 * `o.providerId` on an order doc — that field does not exist and silently
 * produces empty dashboards / undefined-keyed aggregations.
 *
 * `marketplaceTransactions` is owner-written (no code writer), so its
 * convention is unknown — `txnProviderUid()` tolerates both fields.
 */

/** The canonical provider field on marketplaceOrders / marketplaceGigs / payouts. */
export const PROVIDER_UID_KEY = 'providerUid' as const;

/** Resolve the provider UID from an order doc. Orders only ever carry `providerUid`. */
export function orderProviderUid(order: Record<string, any> | null | undefined): string {
  if (!order || typeof order !== 'object') return '';
  const v = (order as any).providerUid;
  return typeof v === 'string' ? v : '';
}

/** Resolve the provider UID from an owner-written transaction doc (either convention). */
export function txnProviderUid(txn: Record<string, any> | null | undefined): string {
  if (!txn || typeof txn !== 'object') return '';
  const v = (txn as any).providerUid ?? (txn as any).providerId;
  return typeof v === 'string' ? v : '';
}

/** True when the doc belongs to the given provider (order convention). */
export function isProviderOrder(order: Record<string, any> | null | undefined, providerUid: string): boolean {
  return !!providerUid && orderProviderUid(order) === providerUid;
}

/** True when the transaction belongs to the given provider (either convention). */
export function isProviderTxn(txn: Record<string, any> | null | undefined, providerUid: string): boolean {
  return !!providerUid && txnProviderUid(txn) === providerUid;
}

export interface ProviderAgg {
  orders: number;
  gmv: number;
  commission: number;
  lastOrder: string;
}

const ACTIVE_ORDER_STATUSES = ['paid', 'accepted', 'in_progress', 'completed'] as const;

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Aggregate orders by provider UID. Skips orders with no resolvable provider
 * (they would otherwise collapse under an `undefined` key and poison the
 * leaderboard — the exact bug this module fixes).
 */
export function aggregateOrdersByProvider(orders: Array<Record<string, any>>): Record<string, ProviderAgg> {
  const byProvider: Record<string, ProviderAgg> = {};
  for (const o of orders || []) {
    const uid = orderProviderUid(o);
    if (!uid) continue;
    const p = byProvider[uid] || { orders: 0, gmv: 0, commission: 0, lastOrder: '' };
    p.orders += 1;
    if ((ACTIVE_ORDER_STATUSES as readonly string[]).includes(o.status)) {
      p.gmv += toNum(o.amountGross);
      p.commission += toNum(o.commissionAmount);
    }
    const c = typeof o.createdAt === 'string' ? o.createdAt : '';
    if (c > p.lastOrder) p.lastOrder = c;
    byProvider[uid] = p;
  }
  return byProvider;
}

export interface RankedProvider extends ProviderAgg {
  providerUid: string;
}

/** Sort aggregated providers by GMV descending. */
export function rankProviders(byProvider: Record<string, ProviderAgg>): RankedProvider[] {
  return Object.entries(byProvider)
    .map(([providerUid, s]) => ({ providerUid, ...s }))
    .sort((a, b) => b.gmv - a.gmv);
}
