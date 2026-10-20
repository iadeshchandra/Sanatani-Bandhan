/**
 * orderGuards.ts — pure order-transition guards.
 * ==========================================================================
 * Kept free of Firebase imports so every guard is unit-testable.
 * The Firestore writers in marketplace.ts enforce these same guards
 * before touching the database.
 */

/**
 * Guard for the rail-1 "confirm payment received" path.
 * --------------------------------------------------------------------------
 * AUDIT FIX #4 (2026-10-19): rail-1 pay-now orders were permanently stuck
 * at `pending_payment` — no writer moved them to `paid` (wallet and rail-2
 * proof flows each had their own branch; rail-1 external payments had none).
 * Returns null when the transition is valid, otherwise a human reason why.
 */
export function canConfirmRail1Receipt(o: {
  providerUid?: string; status?: string; rail?: string; payWithWallet?: boolean;
}, uid: string): string | null {
  if (o.providerUid !== uid) return 'Not your order.';
  if (o.status !== 'pending_payment') return 'Order is not awaiting payment.';
  if (o.payWithWallet === true) return 'Wallet orders confirm automatically.';
  if (o.rail === 'rail2') return 'Use the rail-2 payment-proof flow for this order.';
  if (o.rail !== 'rail1') return 'Only rail-1 direct payments can be confirmed here.';
  return null;
}

/**
 * Pure: does the PLATFORM hold this order's funds (payout-eligible)?
 * --------------------------------------------------------------------------
 * AUDIT FIX (2026-10-20, Domain 4): `requestPayout` counted providerNet of
 * EVERY completed order as platform-held earnings. That is wrong three
 * ways:
 *  - Rail-2 / pay-after-task orders: the client paid the PROVIDER directly
 *    (own QR / UPI / cash). The platform never holds these funds.
 *  - Wallet-escrow orders: releaseEscrow ALREADY credited providerNet to
 *    the provider's wallet on completion. Counting them again double-pays.
 *  - 'direct' payment-method orders (consultation dakshina): paid straight
 *    to the jyotishi outside the app.
 * Only rail-1 orders paid through a PLATFORM payment method (bd_banglaqr,
 * in_upi, intl_payoneer, intl_wise — money that landed on the platform's
 * own rails) are payout-eligible. Everything else the provider already
 * has in hand — a platform payout for those is a double-spend / loss.
 */
export function isPlatformHeld(o: {
  rail?: string; payWithWallet?: boolean; walletPaid?: boolean;
  payAfterTask?: boolean; paymentMethodId?: string;
}): boolean {
  if (o.rail === 'rail2') return false;
  if (o.payAfterTask === true) return false;
  if (o.payWithWallet === true || o.walletPaid === true) return false;
  const pm = String(o.paymentMethodId || '').toLowerCase();
  if (!pm) return false;
  if (pm === 'direct') return false; // consultation dakshina — paid straight to the jyotishi
  if (pm === 'wallet' || pm === 'pay_after_task' || pm === 'seva-bazar-advance') return false;
  if (pm.startsWith('provider:')) return false; // rail-2 own-QR/UPI/link
  return true;
}

/**
 * Pure: should completing this order create the platform's commission
 * receivable (platformDues)?
 * --------------------------------------------------------------------------
 * AUDIT FIX (2026-10-20, Domain 4): pay-after-task orders completed into
 * `awaiting_commission` never created a platformDue — the early return in
 * orderTransition skipped duesCreateForOrder. Owner Dues tab, the provider
 * Dues tab, and the auto-suspension machinery all missed Path-B
 * receivables. Dues fire on 'completed' for ANY rail-2 order (rail covers
 * both rail2 gig orders and pay-after-task orders).
 */
export function shouldCreateDuesOnComplete(o: { rail?: string; payAfterTask?: boolean }, to: string): boolean {
  return to === 'completed' && o.rail === 'rail2';
}
