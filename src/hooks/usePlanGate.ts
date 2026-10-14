import { useState, useCallback } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { PLAN_PRICING, TierLimits, TierFeatures, SubscriptionTier } from '../config/planPricing';
import { resolvePlanId, WorkspacePlanId } from '../lib/workspaceRegistry';

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

  const checkGate = useCallback((module: keyof TierLimits, currentCount: number): boolean => {
    const limit = PLAN_PRICING[pricingTier].limits[module];

    if (limit !== -1 && currentCount >= limit) {
      setUpsellModule(module);
      setShowUpsell(true);
      return false; // Blocked
    }
    return true; // Passed
  }, [pricingTier]);

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
    PLAN_LIMITS: PLAN_PRICING[pricingTier].limits,
    PLAN_FEATURES: PLAN_PRICING[pricingTier].features
  };
};
