/** Purohit home: gig pipeline, earnings snapshot, tier progress, invites. */
import React from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { PUROHIT_TIER_META, PUROHIT_TIERS } from '../../../types/purohit';
import { Card, SectionTitle, GhostButton, Stars, EmptyState } from '../ui';
import { useLanguage } from '../../../context/LanguageContext';

export const OverviewTab: React.FC<{ goTo: (t: any) => void }> = ({ goTo }) => {
  const {
    profile,
    effectiveTier,
    claimTierAdvancement,
    openGigs,
    myGigs,
    myInvites,
    respondToInvite,
  } = usePurohit();
  const { t } = useLanguage();

  if (!profile) return <EmptyState title={t('purohit.overview.loading')} />;

  const activeGigs = myGigs.filter((g) =>
    ['ASSIGNED', 'IN_PROGRESS'].includes(g.status)
  );
  const pendingInvites = myInvites.filter((i) => i.status === 'PENDING');
  const tierIdx = PUROHIT_TIERS.indexOf(effectiveTier || profile.verificationTier);
  const canClaim = effectiveTier && effectiveTier !== profile.verificationTier;

  const monthEarnings = myGigs
    .filter((g) => {
      if (g.status !== 'DAKSHINA_RELEASED' || !g.dakshinaAgreed) return false;
      const d = new Date(g.updatedAt);
      const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    })
    .reduce((s, g) => s + (g.dakshinaAgreed || 0), 0);

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <Card className="bg-gradient-to-br from-amber-600 to-orange-700 !border-0 text-white">
        <p className="text-xs uppercase tracking-widest text-amber-200 font-bold">{t('purohit.overview.namaste')}</p>
        <h2 className="text-xl font-black mt-1">{profile.displayName}</h2>
        <p className="text-sm text-amber-100 mt-1">
          {profile.id} · {profile.city}
          {profile.completedGigs > 0 && ` · ${profile.completedGigs} ${t('purohit.overview.ritualsCompleted')}`}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Stars value={profile.ratingAggregate} />
          <span className="text-xs text-amber-100">
            {profile.ratingAggregate.toFixed(1)} ({profile.ratingCount} {t('purohit.overview.reviews')})
          </span>
        </div>
      </Card>

      {/* Tier progress */}
      <Card>
        <SectionTitle sub={t('purohit.overview.verificationJourneySub')}>
          {t('purohit.overview.verificationJourney')}
        </SectionTitle>
        <div className="flex items-center gap-1 sm:gap-2">
          {PUROHIT_TIERS.map((t, i) => {
            const meta = PUROHIT_TIER_META[t];
            const done = i <= tierIdx;
            return (
              <React.Fragment key={t}>
                <div className="flex flex-col items-center text-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${
                      done
                        ? 'bg-emerald-100 border-emerald-400'
                        : 'bg-stone-100 border-stone-200 opacity-60'
                    }`}
                  >
                    {meta.badge}
                  </div>
                  <p className={`text-[10px] font-bold mt-1.5 leading-tight ${done ? 'text-stone-800' : 'text-stone-400'}`}>
                    {meta.label}
                  </p>
                </div>
                {i < PUROHIT_TIERS.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded ${i < tierIdx ? 'bg-emerald-400' : 'bg-stone-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {canClaim ? (
          <button
            type="button"
            onClick={claimTierAdvancement}
            className="mt-4 w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black transition-colors min-h-[44px]"
          >
            🎉 {t('purohit.overview.claimTier').replace('{tier}', PUROHIT_TIER_META[effectiveTier!].label)}
          </button>
        ) : (
          <GhostButton className="mt-4 w-full" onClick={() => goTo('verification')}>
            {t('purohit.overview.continueVerification')}
          </GhostButton>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('purohit.overview.statsOpenGigs'), value: String(openGigs.length), go: 'find' },
          { label: t('purohit.overview.statsActiveGigs'), value: String(activeGigs.length), go: 'gigs' },
          { label: t('purohit.overview.statsThisMonth'), value: `₹${monthEarnings.toLocaleString('en-IN')}`, go: 'earnings' },
          { label: t('purohit.overview.statsInvites'), value: String(pendingInvites.length), go: 'overview' },
        ].map((s) => (
          <button key={s.label} type="button" onClick={() => goTo(s.go)} className="text-left">
            <Card className="hover:border-amber-300 transition-colors h-full">
              <p className="text-xl font-black text-stone-900">{s.value}</p>
              <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
            </Card>
          </button>
        ))}
      </div>

      {/* Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <SectionTitle sub={t('purohit.overview.invitesSub')}>
            {t('purohit.overview.invitesTitle')} ({pendingInvites.length})
          </SectionTitle>
          <div className="space-y-3">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="border border-amber-200 bg-amber-50 rounded-xl p-3.5">
                <p className="font-bold text-stone-900 text-sm">{inv.orgName}</p>
                {inv.message && <p className="text-xs text-stone-600 mt-1">{inv.message}</p>}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => respondToInvite(inv, true)}
                    className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black min-h-[44px]"
                  >
                    {t('purohit.overview.accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => respondToInvite(inv, false)}
                    className="flex-1 px-3 py-2 rounded-lg bg-stone-200 text-stone-700 text-xs font-bold min-h-[44px]"
                  >
                    {t('purohit.overview.decline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active gigs */}
      {activeGigs.length > 0 && (
        <Card>
          <SectionTitle>{t('purohit.overview.activeRituals')}</SectionTitle>
          <div className="space-y-2.5">
            {activeGigs.slice(0, 3).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => goTo('gigs')}
                className="w-full text-left border border-stone-200 rounded-xl p-3 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-stone-900">{g.ritualType}</p>
                  <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100 rounded-full px-2 py-0.5">
                    {g.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {g.devoteeName} · {g.city} · {g.preferredDate}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
