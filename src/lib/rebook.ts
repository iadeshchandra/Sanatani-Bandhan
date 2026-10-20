/**
 * rebook.ts — pure "book this seva again" decisions (QUEUED #27).
 * =====================================================================
 * Sanatani life is rhythmic — the same Satyanarayan katha every month,
 * the same purohit for the annual shraddha. A past order is the
 * devotee's own prefilled sankalp: same provider, same seva. Only the
 * DATE is never carried over (a past muhurat is meaningless), and the
 * PRICE is always the gig's current dakshina — this module decides
 * eligibility and surfaces the honest price delta; the booking itself
 * is a brand-new order through the normal creation paths (commission
 * snapshot, token advance, timeline all inherit).
 *
 * Pure: no Firestore, no React, no copy. Callers build the words.
 */

export interface RebookOrderLike {
  status?: string;
  gigId?: string;
  /** Seva Bazar extension: present on orders booked from a feed card. */
  sevaBazar?: { postId?: string } | null;
  providerUid?: string;
  amountGross?: number;
  currency?: string;
  [k: string]: unknown;
}

export interface RebookGigLike {
  priceAmount?: number;
  priceCurrency?: string;
  active?: boolean;
}

export type RebookKind = 'gig' | 'seva_bazar';

export interface RebookEligibility {
  eligible: boolean;
  /** Which booking surface a rebook re-enters — null when ineligible. */
  kind: RebookKind | null;
}

/**
 * Who may see "🙏 Book again", and where the tap leads.
 *
 * Eligible statuses: `completed` and `cancelled`.
 * - completed: the rhythm case — the seva happened, book its next turn.
 * - cancelled: the seva never happened. Orders carry NO cancelledBy or
 *   dispute marker (orderTransition stamps neither), so a
 *   dispute-tainted cancellation cannot be distinguished in the data —
 *   disputed/refunded are their own statuses and are excluded; every
 *   plain `cancelled` order is treated the same honest way.
 * Everything live (pending_payment / paid / accepted / in_progress /
 * awaiting_commission) is excluded: that journey is still open, and a
 * duplicate sankalp would stack two live orders for one seva.
 *
 * Kind: a non-empty gigId re-enters the gig booking flow. A gig-less
 * order is rebookable ONLY when it carries its Seva Bazar post id —
 * the request then re-enters through that (still-active) notice.
 * Gig-less orders with neither (consultation dakshina bridges, legacy
 * rows) have no faithful rebook target and get no button.
 */
export function rebookEligibility(order: RebookOrderLike | null | undefined): RebookEligibility {
  if (!order) return { eligible: false, kind: null };
  const status = String(order.status || '');
  if (status !== 'completed' && status !== 'cancelled') {
    return { eligible: false, kind: null };
  }
  const gigId = typeof order.gigId === 'string' ? order.gigId.trim() : '';
  if (gigId) return { eligible: true, kind: 'gig' };
  const postId =
    order.sevaBazar && typeof order.sevaBazar.postId === 'string'
      ? order.sevaBazar.postId.trim()
      : '';
  if (postId && typeof order.providerUid === 'string' && order.providerUid.trim()) {
    return { eligible: true, kind: 'seva_bazar' };
  }
  return { eligible: false, kind: null };
}

export type RebookGigState = 'available' | 'gone' | 'inactive';

/**
 * What the world looks like when the devotee taps Book again.
 * Mirrors createOrder's own guard (`!gig || gig.active === false`):
 * an undefined `active` counts as available; the submit re-validates
 * regardless — this only decides which door the UI opens.
 */
export function rebookGigState(gig: RebookGigLike | null | undefined): RebookGigState {
  if (!gig) return 'gone';
  return gig.active === false ? 'inactive' : 'available';
}

export interface PriceChangeNote {
  wasAmount: number;
  wasCurrency: string;
  nowAmount: number;
  nowCurrency: string;
}

/**
 * The gentle honesty note: the rebook charges the gig's CURRENT
 * dakshina (createOrder re-reads the gig — the old price is never
 * silently reused). When it differs from what the devotee last
 * offered, return the pair so the UI can say so before any money
 * moves; when it matches (to the rounded unit createOrder charges),
 * return null — no note, no noise.
 */
export function priceChangeNote(
  order: RebookOrderLike,
  gig: RebookGigLike,
): PriceChangeNote | null {
  const wasAmount = Math.round(Number(order.amountGross || 0));
  const nowAmount = Math.round(Number(gig.priceAmount || 0));
  const wasCurrency = String(order.currency || 'INR').toUpperCase();
  const nowCurrency = String(gig.priceCurrency || 'INR').toUpperCase();
  if (wasAmount === nowAmount && wasCurrency === nowCurrency) return null;
  return { wasAmount, wasCurrency, nowAmount, nowCurrency };
}
