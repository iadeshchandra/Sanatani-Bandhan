/**
 * proGate.ts — paid-seva acceptance gate for Pro (pure, QUEUED #23).
 * ========================================================================
 * The free (Community) allowance, per the pricing law already in code
 * (saveGig: "Community tier: max 3 active sevas. Pro: unlimited"), is
 * THREE paid sevas in progress at a time. Until now nothing enforced an
 * allowance at acceptance: `orderTransition(..., 'accepted')` let any
 * provider accept unlimited paid sevas, and the only consumer of a gate
 * (`canAcceptPaidSevas` in tiers.ts) fed a commission-schedule easing
 * calculation — it never refused anything.
 *
 * This module is the decision; marketplace.ts is the enforcement point
 * (the single choke point every marketplace + Seva Bazar acceptance
 * flows through). Fail-open by design: if the provider's tier could not
 * be READ (rules still deny the self-read — see the QUEUED #23 rules
 * flag), acceptance is allowed. A gate that cannot see the truth must
 * never punish a possibly-paying provider on an infrastructure gap.
 */

/** Community (free) allowance: paid sevas in progress at once. */
export const FREE_ACTIVE_PAID_SEVA_LIMIT = 3;

/** Error code attached to a gate refusal so UIs can upsell, not dead-end. */
export const PRO_REQUIRED_CODE = 'PRO_REQUIRED';

/**
 * Warm refusal copy — dignity first, the door to Pro held open.
 * Never a bare "limit reached" error.
 */
export const PRO_UPSELL_MESSAGE =
  '🙏 Your free plan lovingly includes 3 paid sevas in progress at a time — and all 3 are already underway. ' +
  'Complete one to accept this seva, or become a Verified Seva Provider (Pro) for unlimited sevas, your verified badge, and gentler commission.';

export interface PaidSevaAcceptanceInput {
  /** Gross dakshina of the order being accepted (0 = free seva). */
  amountGross: number;
  /** Provider holds an active Pro subscription. */
  isPro: boolean;
  /**
   * The tier read actually succeeded. When false, the verdict must
   * never block (fail-open) — the provider may well be Pro.
   */
  tierReadable: boolean;
  /** Paid orders this provider currently has accepted / in progress. */
  activePaidCount: number;
}

export type PaidSevaAcceptance =
  | { allowed: true; reason: 'free_order' | 'pro' | 'within_allowance' | 'unverified_tier' }
  | { allowed: false; reason: 'allowance_exhausted' };

/** Decide whether a provider may accept this paid seva right now. */
export function paidSevaAcceptance(input: PaidSevaAcceptanceInput): PaidSevaAcceptance {
  if (!(Number(input.amountGross) > 0)) return { allowed: true, reason: 'free_order' };
  if (input.isPro) return { allowed: true, reason: 'pro' };
  if (!input.tierReadable) return { allowed: true, reason: 'unverified_tier' };
  if (Math.max(0, Math.floor(Number(input.activePaidCount) || 0)) < FREE_ACTIVE_PAID_SEVA_LIMIT) {
    return { allowed: true, reason: 'within_allowance' };
  }
  return { allowed: false, reason: 'allowance_exhausted' };
}
