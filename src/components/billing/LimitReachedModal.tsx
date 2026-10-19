import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, PartyPopper, ArrowRight, TrendingUp } from 'lucide-react';
import { UpsellModal } from '../common/UpsellModal';
import { openPlanUpgrade } from '../../billing/PlanUpgradeFlow';
import { METRIC_LABEL, LimitMetric } from '../../lib/planLimits';
import { LimitModalInfo } from '../../hooks/usePlanLimits';

interface Props {
  info: LimitModalInfo;
  onClose: () => void;
}

/**
 * LimitReachedModal — the freemium paywall with a smile.
 *
 * Hitting a limit means the institution is GROWING, so we celebrate that
 * first ("You've grown! 🎉"), show exactly where they stand, and offer a
 * clear path forward. Never a dead-end error — always "View Plans" or
 * "Maybe later".
 */
export const LimitReachedModal: React.FC<Props> = ({ info, onClose }) => {
  const [showPlans, setShowPlans] = useState(false);
  const pct = info.limit > 0 ? Math.min(100, Math.round((info.used / info.limit) * 100)) : 100;

  if (showPlans) {
    return (
      <UpsellModal
        isOpen
        onClose={onClose}
        onUpgrade={() => {
          onClose();
          openPlanUpgrade();
        }}
        module={`${info.metric}_limit`}
        ctaLabel="Upgrade now"
      />
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Celebratory header */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-8 text-center">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/15 hover:bg-white/25 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <PartyPopper className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            You've grown! 🎉
          </h2>
          <p className="text-white/90 mt-2 text-sm leading-relaxed">
            Your {METRIC_LABEL[info.metric]} reached the {info.planName} limit — that's a
            sign your institution is thriving.
          </p>
        </div>

        {/* Usage */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold text-slate-700 capitalize flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              {METRIC_LABEL[info.metric]}
            </span>
            <span className="font-bold text-slate-900 tabular-nums">
              {info.used.toLocaleString('en-IN')} / {info.limit.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {info.nextPlanName && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-slate-800">
                {info.nextPlanName}
                {info.nextPlanPrice && (
                  <span className="ml-2 text-amber-700 font-extrabold">{info.nextPlanPrice}</span>
                )}
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Raise your limits and keep growing — every feature you already use,
                with room for much more.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <button
              onClick={() => setShowPlans(true)}
              className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:brightness-105 active:scale-[0.99] transition"
            >
              View Plans <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-full min-h-[48px] rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition"
            >
              Maybe later
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
            Nothing is locked or lost — your data is safe. Upgrade whenever you're ready.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
