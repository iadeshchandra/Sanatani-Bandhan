/**
 * PurohitWorkspaceShell — the independent purohit's personal workspace.
 * =====================================================================
 * HARD ISOLATION CONTRACT: this shell renders ONLY when
 * `sessionKind === 'purohit'` (see the AppContent early-return guard). It
 * mounts no org sidebar, no workspace switcher, no desk registry, and never
 * reads workspace-scoped collections. A purohit-personal session literally
 * cannot reach org UI, and org sessions cannot reach this shell.
 */
import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Wallet,
  CalendarDays,
  BadgeCheck,
  Star,
  User,
  LogOut,
  Bell,
  Store,
  HandHeart,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { ReferralDashboard } from '../sevaPro/ReferralDashboard';
import { SevaProTopupModal } from '../sevaPro/SevaProTopupModal';
import { PurohitProvider, usePurohit } from '../../context/PurohitContext';
import { provisionalSoloProfile } from '../../solo/soloSession';
import { VerificationBadge } from '../common/VerificationBadge';
import { useLanguage } from '../../context/LanguageContext';
import { OverviewTab } from './tabs/OverviewTab';
import { FindGigsTab } from './tabs/FindGigsTab';
import { MyGigsTab } from './tabs/MyGigsTab';
import { EarningsTab } from './tabs/EarningsTab';
import { AvailabilityTab } from './tabs/AvailabilityTab';
import { VerificationTab } from './tabs/VerificationTab';
import { ReviewsTab } from './tabs/ReviewsTab';
import { ProfileTab } from './tabs/ProfileTab';
import { ProviderMarketplace } from '../../marketplace/ProviderMarketplace';

type PurohitTab =
  | 'overview'
  | 'find'
  | 'gigs'
  | 'earnings'
  | 'availability'
  | 'verification'
  | 'reviews'
  | 'profile'
  | 'marketplace'
  | 'referrals';

const getTabs = (t: (k: string) => string, st: (key: string, en: string, bn?: string, hi?: string) => string): { id: PurohitTab; label: string; icon: React.ReactNode }[] => [
  { id: 'overview', label: t('purohit.shell.tabs.home'), icon: <Briefcase className="w-4 h-4" /> },
  { id: 'find', label: t('purohit.shell.tabs.find'), icon: <Search className="w-4 h-4" /> },
  { id: 'gigs', label: t('purohit.shell.tabs.gigs'), icon: <Briefcase className="w-4 h-4" /> },
  { id: 'earnings', label: t('purohit.shell.tabs.earnings'), icon: <Wallet className="w-4 h-4" /> },
  { id: 'availability', label: t('purohit.shell.tabs.availability'), icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'verification', label: t('purohit.shell.tabs.verification'), icon: <BadgeCheck className="w-4 h-4" /> },
  { id: 'reviews', label: t('purohit.shell.tabs.reviews'), icon: <Star className="w-4 h-4" /> },
  { id: 'profile', label: t('purohit.shell.tabs.profile'), icon: <User className="w-4 h-4" /> },
  { id: 'marketplace', label: t('purohit.shell.tabs.marketplace'), icon: <Store className="w-4 h-4" /> },
  { id: 'referrals', label: st('purohit.shell.tabs.referrals', 'Referrals', 'রেফারেল', 'रेफ़रल'), icon: <HandHeart className="w-4 h-4" /> },
];

const InnerShell: React.FC = () => {
  const { t, safeTranslate } = useLanguage();
  const { logout, exitPurohitSession, enterSoloSession } = useAuthWorkspace();
  const TABS = getTabs(t, safeTranslate);
  const { profile, profileLoading, effectiveTier, myInvites } = usePurohit();
  const [tab, setTab] = useState<PurohitTab>('overview');

  const handleLogout = async () => {
    exitPurohitSession();
    await logout();
    window.location.href = '/';
  };

  const pendingInvites = myInvites.filter((i) => i.status === 'PENDING').length;
  // Dual identity: a devotee-upgraded purohit can switch back to their
  // devotee (org) context. Mode switcher, not two logins.
  const isDualIdentity = profile?.source === 'devotee_upgrade';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/60 to-stone-100 font-sans">
      {/* Personal header — no org switcher, no workspace UI, by design. */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-amber-200/70 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-md shrink-0">
              🪔
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-stone-900 truncate">
                  {profileLoading ? t('purohit.shell.loading') : profile?.displayName || t('purohit.shell.fallbackName')}
                </h1>
                {effectiveTier && <VerificationBadge tier={effectiveTier} />}
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
                onClick={() => exitPurohitSession()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-black transition-colors min-h-[44px]"
                title={t('purohit.shell.devoteeViewHint')}
              >
                🙏 <span className="hidden sm:inline">{t('purohit.shell.devoteeView')}</span>
              </button>
            )}
            {/* Solo-first: Personal (Sanatani) is always one tap away. */}
            <button
              type="button"
              onClick={() => enterSoloSession(provisionalSoloProfile())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black transition-colors min-h-[44px]"
              title={t('purohit.shell.personalSpaceHint')}
            >
              🪔 <span className="hidden sm:inline">{t('purohit.shell.personalSanatani')}</span>
            </button>
            {pendingInvites > 0 && (
              <button
                type="button"
                onClick={() => setTab('overview')}
                className="relative p-2.5 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                title={`${pendingInvites} organisation invitation(s)`}
                aria-label={`${pendingInvites} ${t('purohit.shell.invitesAria')}`}
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
              <span className="hidden sm:inline">{t('purohit.shell.logout')}</span>
            </button>
          </div>
        </div>
        {/* Tab bar */}
        <nav className="max-w-6xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto" aria-label={t('purohit.shell.navLabel')}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
                tab === t.id
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === 'verification' && effectiveTier !== 'PLATFORM_VERIFIED' && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'overview' && <OverviewTab goTo={setTab} />}
        {tab === 'find' && <FindGigsTab />}
        {tab === 'gigs' && <MyGigsTab />}
        {tab === 'earnings' && <EarningsTab />}
        {tab === 'availability' && <AvailabilityTab />}
        {tab === 'verification' && <VerificationTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'profile' && <ProfileTab />}
        {tab === 'marketplace' && <ProviderMarketplace providerType="purohit" providerName={profile?.displayName || ''} />}
        {tab === 'referrals' && <ReferralDashboard />}
      </main>

      {/* Seva Pro Phase 3: listens for `seva-pro:open-topup` (shortfall top-up
          from SevaCompletionButton) and opens the wallet top-up claim flow. */}
      <SevaProTopupModal />

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-center">
        <p className="text-[11px] text-stone-400">
          {t('purohit.shell.footer')} · {profile?.id || ''}
        </p>
      </footer>
    </div>
  );
};

export const PurohitWorkspaceShell: React.FC = () => {
  return (
    <PurohitProvider>
      <InnerShell />
    </PurohitProvider>
  );
};
