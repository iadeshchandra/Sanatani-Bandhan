/**
 * JyotishWorkspaceShell — the independent jyotishi's personal workspace.
 * =====================================================================
 * HARD ISOLATION CONTRACT: this shell renders ONLY when
 * `sessionKind === 'jyotish'` (see the AppContent early-return guard). It
 * mounts no org sidebar, no workspace switcher, no desk registry, and never
 * reads workspace-scoped collections. A jyotishi-personal session literally
 * cannot reach org UI, and org sessions cannot reach this shell.
 */
import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Wallet,
  CalendarDays,
  BadgeCheck,
  Star,
  User,
  LogOut,
  Bell,
  MessageCircle,
  HandHeart,
  Store,
} from 'lucide-react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { SevaProTopupModal } from '../components/sevaPro/SevaProTopupModal';
import { provisionalSoloProfile } from '../solo/soloSession';
import { JyotishProvider, useJyotish } from '../context/JyotishContext';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { ProviderMarketplace } from '../marketplace/ProviderMarketplace';
import {
  OverviewTab,
  FindConsultationsTab,
  MyConsultationsTab,
  EarningsTab,
  AvailabilityTab,
  VerificationTab,
  ReviewsTab,
  ProfileTab,
  ReferralsTab,
} from './JyotishTabs';

type JyotishTab =
  | 'overview'
  | 'find'
  | 'consultations'
  | 'earnings'
  | 'availability'
  | 'verification'
  | 'reviews'
  | 'referrals'
  | 'profile'
  | 'marketplace';

const getTabs = (t: (k: string) => string): { id: JyotishTab; label: string; icon: React.ReactNode }[] => [
  { id: 'overview', label: t('jyotish.shell.tabs.home'), icon: <Sparkles className="w-4 h-4" /> },
  { id: 'find', label: t('jyotish.shell.tabs.find'), icon: <Search className="w-4 h-4" /> },
  { id: 'consultations', label: t('jyotish.shell.tabs.consultations'), icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'earnings', label: t('jyotish.shell.tabs.earnings'), icon: <Wallet className="w-4 h-4" /> },
  { id: 'availability', label: t('jyotish.shell.tabs.availability'), icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'verification', label: t('jyotish.shell.tabs.verification'), icon: <BadgeCheck className="w-4 h-4" /> },
  { id: 'reviews', label: t('jyotish.shell.tabs.reviews'), icon: <Star className="w-4 h-4" /> },
  { id: 'referrals', label: t('jyotish.shell.tabs.referrals'), icon: <HandHeart className="w-4 h-4" /> },
  { id: 'profile', label: t('jyotish.shell.tabs.profile'), icon: <User className="w-4 h-4" /> },
  { id: 'marketplace', label: t('jyotish.shell.tabs.marketplace'), icon: <Store className="w-4 h-4" /> },
];

const InnerShell: React.FC = () => {
  const { t } = useLanguage();
  const { logout, exitJyotishSession, enterSoloSession } = useAuthWorkspace();
  const { profile, profileLoading, effectiveTier, myInvites } = useJyotish();
  const [tab, setTab] = useState<JyotishTab>('overview');
  const TABS = getTabs(t);

  const handleLogout = async () => {
    exitJyotishSession();
    await logout();
    window.location.href = '/';
  };

  const pendingInvites = myInvites.filter((i) => i.status === 'PENDING').length;
  // Dual identity: a devotee-upgraded jyotishi can switch back to their
  // devotee (org/solo) context. Mode switcher, not two logins.
  const isDualIdentity = profile?.source === 'devotee_upgrade';

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-violet-50/60 to-stone-100 font-sans">
      {/* Personal header — no org switcher, no workspace UI, by design. */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-indigo-200/70 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl shadow-md shrink-0">
              🔮
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-stone-900 truncate">
                  {profileLoading ? t('jyotish.shell.loading') : profile?.displayName || t('jyotish.shell.title')}
                </h1>
                {effectiveTier && <VerificationBadge tier={effectiveTier} subject="Jyotishi" />}
              </div>
              <p className="text-[11px] text-stone-500 font-mono truncate">
                {profile?.id || '—'} · {profile?.city || ''}
                {profile && profile.ratingCount > 0 && (
                  <span className="ml-2 text-amber-600 font-bold">
                    ★ {profile.ratingAggregate.toFixed(1)} ({profile.ratingCount})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isDualIdentity && (
              <button
                type="button"
                onClick={() => exitJyotishSession()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-800 text-xs font-black transition-colors min-h-[44px]"
                title={t('jyotish.shell.devoteeView')}
              >
                🙏 <span className="hidden sm:inline">{t('jyotish.shell.devoteeView')}</span>
              </button>
            )}
            {/* Solo-first: Personal (Sanatani) is always one tap away. */}
            <button
              type="button"
              onClick={() => enterSoloSession(provisionalSoloProfile())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black transition-colors min-h-[44px]"
              title={t('jyotish.shell.personalSpace')}
            >
              🪔 <span className="hidden sm:inline">{t('jyotish.shell.personalSanatani')}</span>
            </button>
            {pendingInvites > 0 && (
              <button
                type="button"
                onClick={() => setTab('overview')}
                className="relative p-2.5 rounded-xl bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors"
                title={t('jyotish.shell.invites').replace('{n}', String(pendingInvites))}
                aria-label={t('jyotish.shell.invites').replace('{n}', String(pendingInvites))}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                  {pendingInvites}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('jyotish.shell.logout')}</span>
            </button>
          </div>
        </div>
        {/* Tab bar */}
        <nav className="max-w-6xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto" aria-label={t('jyotish.shell.navLabel')}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
                tab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-indigo-300 hover:text-indigo-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'verification' && effectiveTier !== 'PLATFORM_VERIFIED' && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'overview' && <OverviewTab goTo={setTab} />}
        {tab === 'find' && <FindConsultationsTab />}
        {tab === 'consultations' && <MyConsultationsTab />}
        {tab === 'earnings' && <EarningsTab />}
        {tab === 'availability' && <AvailabilityTab />}
        {tab === 'verification' && <VerificationTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'referrals' && <ReferralsTab />}
        {tab === 'profile' && <ProfileTab />}
        {tab === 'marketplace' && <ProviderMarketplace providerType="jyotishi" providerName={profile?.displayName || ''} />}
      </main>

      {/* Seva Pro Phase 3: listens for `seva-pro:open-topup` (shortfall top-up
          from SevaCompletionButton) and opens the wallet top-up claim flow. */}
      <SevaProTopupModal />

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-center">
        <p className="text-[11px] text-stone-400">
          Jyotish One · Independent jyotishi identity · {profile?.id || ''}
        </p>
      </footer>
    </div>
  );
};

export const JyotishWorkspaceShell: React.FC = () => {
  return (
    <JyotishProvider>
      <InnerShell />
    </JyotishProvider>
  );
};
