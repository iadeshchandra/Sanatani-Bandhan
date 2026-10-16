/**
 * ReferralDashboard — provider view of the remedy → ritual pipeline.
 * =====================================================================
 * Shows the professional (purohit or jyotishi): how many devotees they
 * guided, how many received that guidance with love, and the guidance
 * credits earned — paid from the platform's own contribution, never from
 * the other provider's earnings.
 */
import React, { useEffect, useState } from 'react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  getProviderReferralStats,
  ProviderReferralStats,
} from '../../lib/sevaPro/referrals';
import { sp } from '../../lib/sevaPro/sevaProCopy';

const StatCard: React.FC<{ icon: string; label: string; value: string; sub?: string }> = ({
  icon,
  label,
  value,
  sub,
}) => (
  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
    <p className="text-2xl mb-1">{icon}</p>
    <p className="text-2xl font-black text-stone-900">{value}</p>
    <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mt-0.5">{label}</p>
    {sub && <p className="text-[11px] text-stone-400 mt-1">{sub}</p>}
  </div>
);

export const ReferralDashboard: React.FC = () => {
  const { firebaseUser } = useAuthWorkspace();
  const { currentLang } = useLanguage();

  const [stats, setStats] = useState<ProviderReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getProviderReferralStats(uid)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [firebaseUser?.uid]);

  if (loading) return <p className="text-sm text-stone-400">Loading your guidance journey…</p>;
  if (!stats) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="🤝" label={sp(currentLang, 'referrals_sent')} value={String(stats.sent)} />
        <StatCard icon="🪔" label={sp(currentLang, 'referrals_converted')} value={String(stats.converted)} />
        <StatCard
          icon="💛"
          label={sp(currentLang, 'conversion_rate')}
          value={`${Math.round(stats.conversionRate * 100)}%`}
        />
        <StatCard
          icon="🪙"
          label={sp(currentLang, 'credits_earned')}
          value={stats.creditsEarned.toLocaleString('en-IN')}
          sub={stats.creditsPending > 0 ? `${stats.creditsPending} awaiting seva completion` : undefined}
        />
      </div>
      <p className="text-[11px] text-stone-400 leading-relaxed">{sp(currentLang, 'credit_explainer')}</p>
    </div>
  );
};
