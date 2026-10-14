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
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { PurohitProvider, usePurohit } from '../../context/PurohitContext';
import { provisionalSoloProfile } from '../../solo/soloSession';
import { VerificationBadge } from '../common/VerificationBadge';
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
  | 'marketplace';

const TABS: { id: PurohitTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Home', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'find', label: 'Find Gigs', icon: <Search className="w-4 h-4" /> },
  { id: 'gigs', label: 'My Gigs', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'earnings', label: 'Earnings', icon: <Wallet className="w-4 h-4" /> },
  { id: 'availability', label: 'Availability', icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'verification', label: 'Verification', icon: <BadgeCheck className="w-4 h-4" /> },
  { id: 'reviews', label: 'Reviews', icon: <Star className="w-4 h-4" /> },
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'marketplace', label: 'Marketplace', icon: <Store className="w-4 h-4" /> },
];

const InnerShell: React.FC = () => {
  const { logout, exitPurohitSession, enterSoloSession } = useAuthWorkspace();
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
                  {profileLoading ? 'Loading…' : profile?.displayName || 'Purohit'}
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
                title="Switch to your devotee view"
              >
                🙏 <span className="hidden sm:inline">Devotee view</span>
              </button>
            )}
            {/* Solo-first: Personal (Sanatani) is always one tap away. */}
            <button
              type="button"
              onClick={() => enterSoloSession(provisionalSoloProfile())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black transition-colors min-h-[44px]"
              title="Your personal Sanatani space — sadhana, panchang, Sangam"
            >
              🪔 <span className="hidden sm:inline">Personal (Sanatani)</span>
            </button>
            {pendingInvites > 0 && (
              <button
                type="button"
                onClick={() => setTab('overview')}
                className="relative p-2.5 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                title={`${pendingInvites} organisation invitation(s)`}
                aria-label={`${pendingInvites} organisation invitations`}
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
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        {/* Tab bar */}
        <nav className="max-w-6xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto" aria-label="Purohit workspace">
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
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-center">
        <p className="text-[11px] text-stone-400">
          Purohit One · Independent purohit identity · {profile?.id || ''}
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
