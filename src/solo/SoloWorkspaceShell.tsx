import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { SoloProvider, useSolo } from './SoloContext';
import { SoloStoreProvider } from './soloStore';
import { PurohitProvider } from '../context/PurohitContext';
import { AppShell, AppTabId } from '../components/shell/AppShell';
import { HomeTab, HomeSubTabBar, soloSubTabFromPath, SOLO_TAB_IDS, SoloTabId } from './HomeTab';
import { OrgsTab } from './OrgsTab';
import { OrgSwitchRoute } from './OrgSwitchRoute';
import { JoinOrgScreen } from './JoinOrgScreen';
import { SuchanaPage } from './SuchanaPage';
import { ProfileTab } from './ProfileTab';
import { SuchanaFullModal } from '../components/suchana/SuchanaFullModal';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';
import { FirstRunSequence } from './FirstRunSequence';
import { useNotifications } from '../context/NotificationContext';
import { useChatUnreadTotal } from '../chat/useChat';
import { SearchButton } from '../search/SearchButton';

/* SoloWorkspaceShell — the independent personal workspace.
 * =====================================================================
 * Rendered ONLY when sessionKind === 'solo' (AppContentRouter hard guard).
 * No org switcher, no workspace desks, no org data can reach this tree —
 * the same mutual-exclusion construction Purohit One established.
 *
 * Phase 1 navigation: 4-tab shell (Home | Orgs | Suchana | Profile),
 * every tab deep-linkable via /app/* routes. The old ⇄ Switch dropdown
 * is removed; its actions migrated:
 *  - "Organisation view"      → /app/orgs (Orgs tab, existing session flow)
 *  - "Purohit / Jyotishi Workspace" → Profile tab → "My Workspaces"
 *  - "Sign out"               → Profile tab → "Data & session"
 * The 12 Solo sub-tabs live INSIDE the Home tab as secondary navigation.
 * The 🪔 Suchana header button still opens SuchanaFullModal.
 */

const TAB_PATH: Record<AppTabId, string> = {
  home: '/app/home',
  orgs: '/app/orgs',
  suchana: '/app/suchana',
  profile: '/app/profile',
};

function tabFromPath(pathname: string): AppTabId {
  if (pathname.startsWith('/app/orgs') || pathname.startsWith('/app/org/')) return 'orgs';
  if (pathname.startsWith('/app/suchana')) return 'suchana';
  if (pathname.startsWith('/app/profile')) return 'profile';
  return 'home';
}

const SoloRouter: React.FC = () => {
  const { soloProfile, firebaseUser } = useAuthWorkspace();
  const { profile } = useSolo();
  const location = useLocation();
  const navigate = useNavigate();
  const [suchanaOpen, setSuchanaOpen] = useState(false);
  // Unread badge for the Suchana tab — one calm number, no anxiety (spec §3).
  const { unreadCount } = useNotifications();

  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  // Unread chat badge on the Home tab — the Messages card lives on Home,
  // and the 4-tab shell is law, so unread needs a shell-level surface.
  const chatUnread = useChatUnreadTotal(uid === 'anon' ? null : uid);

  const activeTab = tabFromPath(location.pathname);
  const subTab = soloSubTabFromPath(location.pathname);
  const sanId = profile?.id || soloProfile?.id || 'SAN-…';

  const header = (
    <header className="sticky top-0 z-40 bg-temple-950/95 backdrop-blur border-b border-amber-900/30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shrink-0">
            🪔
          </div>
          <div className="min-w-0">
            <div className="text-white font-extrabold text-sm truncate">My Space</div>
            <div className="text-amber-400/90 text-[11px] font-mono truncate">{sanId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 🔍 Universal search — one bar for temples, people, posts, videos */}
          <SearchButton />
          {/* 🪔 Suchana — the calm alternative to a notification bell */}
          <button
            type="button"
            onClick={() => setSuchanaOpen(true)}
            aria-label="Suchana — guidance for your path"
            title="Suchana"
            className="w-11 h-11 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 flex items-center justify-center text-xl border border-white/10 transition-colors"
          >
            🪔
          </button>
        </div>
      </div>
      {/* Secondary sub-tab navigation — only inside the Home tab */}
      {activeTab === 'home' && (
        <HomeSubTabBar current={subTab} onSelect={(t) => navigate(`/app/home/${t}`)} />
      )}
    </header>
  );

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={(t) => navigate(TAB_PATH[t])}
      header={header}
      suchanaUnread={unreadCount}
      homeChatUnread={chatUnread}
    >
      <div className="max-w-5xl mx-auto px-4 pt-3 flex justify-end">
        <LocalOnlyBadge />
      </div>
      {/* Solo tab content — keyed by path so each tab change glides in.
          Presentational only: remounts the route view on navigation. */}
      <div key={location.pathname} className="anim-tab-in">
      <Routes>
        <Route path="/app" element={<Navigate to="/app/home" replace />} />
        <Route path="/app/home" element={<HomeTab />} />
        <Route path="/app/home/:subTab" element={<HomeTab />} />
        <Route path="/app/orgs" element={<OrgsTab />} />
        {/* Phase 2: join flow — static route first so "join" never falls
            into the :orgId param. */}
        <Route path="/app/orgs/join" element={<JoinOrgScreen />} />
        <Route path="/app/org/:orgId" element={<OrgSwitchRoute />} />
        <Route path="/app/suchana" element={<SuchanaPage />} />
        <Route path="/app/profile" element={<ProfileTab />} />
        {/* Any other path inside a solo session lands on the Solo home —
            e.g. entering the solo session from the demo menu while at `/`. */}
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
      </div>

      {/* First-run sequence — language → setup wizard → tour, exactly one
          surface at a time, each shown once. Replaces the three colliding
          mounts (NativeWelcomeSheet is global in App.tsx; the tour and the
          retired OnboardingFlow lived here). */}
      <FirstRunSequence
        uid={uid}
        onNavigate={(t) => navigate(`/app/home/${t}`)}
      />

      {/* 🪔 Full Suchana view — calm guidance feed */}
      <SuchanaFullModal
        isOpen={suchanaOpen}
        onClose={() => setSuchanaOpen(false)}
        role="solo"
        onAction={(route) => {
          setSuchanaOpen(false);
          const id = route as SoloTabId;
          navigate(
            (SOLO_TAB_IDS as readonly string[]).includes(id)
              ? `/app/home/${id}`
              : '/app/home/panjika'
          );
        }}
      />
    </AppShell>
  );
};

export const SoloWorkspaceShell: React.FC = () => {
  const { firebaseUser } = useAuthWorkspace();
  const uid = (firebaseUser as { uid?: string } | null)?.uid || 'anon';
  return (
    <SoloProvider uid={uid}>
      <SoloStoreProvider uid={uid}>
        <PurohitProvider>
          <SoloRouter />
        </PurohitProvider>
      </SoloStoreProvider>
    </SoloProvider>
  );
};
