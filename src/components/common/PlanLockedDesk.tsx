import React from 'react';
import { Lock, ArrowLeft, MessageCircle } from 'lucide-react';
import { whatsappLink, hasWhatsApp } from '../../config/contact';
import { PLAN_PRICING, SubscriptionTier } from '../../config/planPricing';
import { useTerms } from '../../hooks/useTerms';
import { planIdForTier, priceFor } from '../../lib/termsConfig';

interface PlanLockedDeskProps {
  moduleId: string;
  requiredTier: SubscriptionTier;
  onBack: () => void;
}

/**
 * H-2: plan-tier enforcement at desk mount (defense in depth with the
 * Sidebar's nav-level lock badges). Rendered by App.tsx renderActiveDesk
 * when a workspace's plan doesn't include the requested module — e.g. a
 * LITE workspace opening an ENTERPRISE desk via a deep link or alias URL.
 * Never silently renders the desk; always offers the upgrade path.
 */
export const PlanLockedDesk: React.FC<PlanLockedDeskProps> = ({ moduleId, requiredTier, onBack }) => {
  // QUEUED #31: name + price are owner terms (config-first).
  const terms = useTerms();
  const termsPlan = terms.plans[planIdForTier(requiredTier)];
  const tierName = termsPlan?.name ?? PLAN_PRICING[requiredTier]?.name ?? requiredTier;
  const price = PLAN_PRICING[requiredTier]?.price;
  const monthlyInr = termsPlan ? priceFor(termsPlan, 'INR', 'monthly') : price?.monthly;

  const handleTalk = () => {
    if (hasWhatsApp()) {
      window.open(
        whatsappLink(`Namaste! I want to upgrade my Sanatani Bandhan workspace to unlock: ${moduleId} (${tierName} plan)`),
        '_blank',
        'noopener'
      );
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200 shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
          <Lock className="w-8 h-8" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-2">
          {tierName} feature
        </p>
        <h2 className="text-2xl font-black text-stone-900 mb-3">This desk needs {tierName}</h2>
        <p className="text-sm text-stone-500 leading-relaxed mb-6">
          Your workspace is on a plan that doesn't include <strong>{moduleId}</strong>.
          {price ? (
            <> Upgrade to <strong>{tierName}</strong> ({price.currencySymbol}{(monthlyInr ?? price.monthly).toLocaleString('en-IN')}/month) to unlock it — along with everything else in the tier.</>
          ) : (
            <> Talk to us and we'll get you upgraded.</>
          )}
        </p>
        <div className="flex flex-col gap-3">
          {hasWhatsApp() && (
            <button
              type="button"
              onClick={handleTalk}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Talk to us on WhatsApp
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-extrabold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
