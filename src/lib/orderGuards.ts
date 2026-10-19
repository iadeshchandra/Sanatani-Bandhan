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
