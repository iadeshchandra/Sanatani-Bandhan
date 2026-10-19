import { useState, useCallback, useRef } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import {
  checkLimit,
  auditBlockedAction,
  METRIC_LABEL,
  LimitMetric,
  LimitCheckResult,
} from '../lib/planLimits';

export interface LimitModalInfo {
  metric: LimitMetric;
  used: number;
  limit: number;
  planName: string;
  nextPlanName: string | null;
  nextPlanPrice: string | null;
}

/**
 * usePlanLimits — freemium enforcement for React components.
 *
 * Usage:
 *   const { guard, modalInfo, closeModal } = usePlanLimits();
 *   const onAdd = async () => {
 *     if (!(await guard('devotees'))) return; // modal shows automatically
 *     ...proceed with the write...
 *   };
 *   return <>{modalInfo && <LimitReachedModal info={modalInfo} onClose={closeModal} />}</>;
 *
 * - guard() checks BEFORE the write. Returns false when blocked (modal opens).
 * - At >=80% usage a one-per-session gentle toast suggests upgrading.
 * - Fail-open: lookup/count errors allow the action (see planLimits.ts).
 */
export function usePlanLimits() {
  const { activeWorkspace, activeWorkspaceId } = useAuthWorkspace();
  const { showToast } = useToast();
  const [modalInfo, setModalInfo] = useState<LimitModalInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const warnedRef = useRef<Set<string>>(new Set());

  const closeModal = useCallback(() => setModalInfo(null), []);

  const guard = useCallback(
    async (metric: LimitMetric): Promise<boolean> => {
      const wsId = activeWorkspaceId || (activeWorkspace as { id?: string } | null)?.id || '';
      const ws = activeWorkspace as unknown as {
        planId?: string | null;
        limitsBypassed?: boolean;
        branches?: { id: string }[];
      } | null;

      setChecking(true);
      let result: LimitCheckResult;
      try {
        result = await checkLimit(
          {
            id: wsId,
            planId: ws?.planId,
            limitsBypassed: ws?.limitsBypassed,
            branchCount: ws?.branches?.length ?? 0,
          },
          metric
        );
      } finally {
        setChecking(false);
      }

      if (result.bypassed || result.allowed) {
        // Gentle 80% nudge — once per metric per session, never blocking.
        const key = `${wsId}:${metric}`;
        if (
          !result.bypassed &&
          result.limit > 0 &&
          result.percentUsed >= 80 &&
          !warnedRef.current.has(key)
        ) {
          warnedRef.current.add(key);
          showToast(
            `You've used ${result.percentUsed}% of your ${METRIC_LABEL[metric]} limit on ${result.planName}. Upgrade any time to keep growing.`,
            'info'
          );
        }
        // AUDIT FIX #7: warm downgrade notice — once per session. Dignity,
        // never a lockout: the workspace keeps working on Seva Free caps.
        const downgradeKey = `${wsId}:downgraded`;
        if (result.downgraded && !warnedRef.current.has(downgradeKey)) {
          warnedRef.current.add(downgradeKey);
          showToast(
            '🙏 Your paid plan ended — you\u2019re on Seva (free) now. Everything still works; upgrade any time to raise your limits.',
            'info'
          );
        }
        return true;
      }

      // Blocked — record the demand signal, then celebrate the growth.
      try {
        const { auth } = await import('../firebase');
        const uid = auth.currentUser?.uid || 'anonymous';
        await auditBlockedAction(wsId, metric, result.used, result.limit, uid);
      } catch {
        /* audit is best-effort */
      }

      setModalInfo({
        metric,
        used: result.used,
        limit: result.limit,
        planName: result.planName,
        nextPlanName: result.nextPlan?.name ?? null,
        nextPlanPrice:
          result.nextPlan != null
            ? result.nextPlan.priceMonthlyINR > 0
              ? `₹${result.nextPlan.priceMonthlyINR.toLocaleString('en-IN')}/mo`
              : 'Free'
            : null,
      });
      return false;
    },
    [activeWorkspace, activeWorkspaceId, showToast]
  );

  return { guard, modalInfo, closeModal, checking };
}
