import { useState, useCallback, useMemo } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { PLAN_PRICING, TierLimits, TierFeatures, SubscriptionTier } from '../config/planPricing';
import { resolvePlanId, WorkspacePlanId } from '../lib/workspaceRegistry';
import { useTerms } from './useTerms';
import { planIdForTier } from '../lib/termsConfig';

/**
 * usePlanGate — monetization enforcement (C-6), unified on PLAN_PRICING.
 *
 * Plan resolution (see resolvePlanId in lib/workspaceRegistry):
 *   - 'DEMO' | 'SEVA' | 'STANDARD' | 'PREMIUM' | 'PUROHIT_PRO' honored verbatim
 *     (legacy 'LITE' → 'SEVA', 'ENTERPRISE' → 'PREMIUM').
 *   - A missing/unknown planId defaults to 'SEVA' (Seva Free) — NEVER 'DEMO'.
 *
 * DEMO workspaces resolve to SEVA's limits inside this gate; the binding
 * constraint for demos is the separate 5-creates-per-module demo quota
 * (checkAndIncrementModuleQuota in DataContext), which fires long before
 * any plan limit could.
 */

/** PLAN_PRICING tier used for limit/feature lookups ('DEMO' → 'SEVA'). */
const pricingTierFor = (planId: WorkspacePlanId): SubscriptionTier =>
  planId === 'DEMO' ? 'SEVA' : planId;

export const usePlanGate = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellModule, setUpsellModule] = useState('');

  const currentPlanId = resolvePlanId(activeWorkspace?.planId);
  const pricingTier = pricingTierFor(currentPlanId);
  const isDemo = currentPlanId === 'DEMO';

  // QUEUED #31: the four enforced caps are owner terms (config-first via
  // termsConfig; locked planPricing values are the fallback). The other
  // limit fields (events/storageMB/pdfsPerMonth) are display-only and stay
  // in code.
  const terms = useTerms();
  const termsLimits = useMemo<TierLimits>(() => {
    const base = PLAN_PRICING[pricingTier].limits;
    const tp = terms.plans[planIdForTier(pricingTier)];
    if (!tp) return base;
    return {
      ...base,
      devotees: tp.limits.maxDevotees,
      transactions: tp.limits.maxTransactionsPerMonth,
      adminSeats: tp.limits.maxSeats,
      branches: tp.limits.maxBranches,
    };
  }, [terms, pricingTier]);

  const checkGate = useCallback((module: keyof TierLimits, currentCount: number): boolean => {
    const limit = termsLimits[module];

    if (limit !== -1 && currentCount >= limit) {
      setUpsellModule(module);
      setShowUpsell(true);
      return false; // Blocked
    }
    return true; // Passed
  }, [pricingTier, termsLimits]);

  const checkFeatureGate = useCallback((feature: keyof TierFeatures): boolean => {
    const isEnabled = PLAN_PRICING[pricingTier].features[feature];

    if (!isEnabled) {
      setUpsellModule(feature);
      setShowUpsell(true);
      return false; // Blocked
    }
    return true; // Passed
  }, [pricingTier]);

  const closeUpsell = useCallback(() => {
    setShowUpsell(false);
  }, []);

  return {
    isDemo,
    currentPlanId,
    pricingTier,
    checkGate,
    checkFeatureGate,
    showUpsell,
    upsellModule,
    closeUpsell,
    PLAN_LIMITS: termsLimits,
    PLAN_FEATURES: PLAN_PRICING[pricingTier].features
  };
};
