import { useState, useCallback } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { SUBSCRIPTION_PLANS, PlanLimits, PlanFeatures } from '../config/planPricing';

export const usePlanGate = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellModule, setUpsellModule] = useState('');

  // Default to DEMO plan if no explicit plan is set
  const currentPlanId = activeWorkspace?.planId || 'DEMO';
  const isDemo = currentPlanId === 'DEMO';

  const checkGate = useCallback((module: keyof PlanLimits, currentCount: number): boolean => {
    const limit = SUBSCRIPTION_PLANS[currentPlanId as keyof typeof SUBSCRIPTION_PLANS].limits[module];
    
    if (limit !== -1 && currentCount >= limit) {
      setUpsellModule(module);
      setShowUpsell(true);
      return false; // Blocked
    }
    return true; // Passed
  }, [currentPlanId]);

  const checkFeatureGate = useCallback((feature: keyof PlanFeatures): boolean => {
    const isEnabled = SUBSCRIPTION_PLANS[currentPlanId as keyof typeof SUBSCRIPTION_PLANS].features[feature];
    
    if (!isEnabled) {
      setUpsellModule(feature);
      setShowUpsell(true);
      return false; // Blocked
    }
    return true; // Passed
  }, [currentPlanId]);

  const closeUpsell = useCallback(() => {
    setShowUpsell(false);
  }, []);

  return {
    isDemo,
    currentPlanId,
    checkGate,
    checkFeatureGate,
    showUpsell,
    upsellModule,
    closeUpsell,
    PLAN_LIMITS: SUBSCRIPTION_PLANS[currentPlanId as keyof typeof SUBSCRIPTION_PLANS].limits,
    PLAN_FEATURES: SUBSCRIPTION_PLANS[currentPlanId as keyof typeof SUBSCRIPTION_PLANS].features
  };
};
