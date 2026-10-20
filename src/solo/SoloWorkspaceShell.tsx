import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { SoloProvider, useSolo } from './SoloContext';
import { isProvisionalProfile } from './soloSession';
import { SoloStoreProvider } from './soloStore';
import { PurohitProvider } from '../context/PurohitContext';
import { AppShell, AppTabId } from '../components/shell/AppShell';
import { HomeTab, HomeSubTabBar, soloSubTabFromPath } from './HomeTab';
import { OrgsTab } from './OrgsTab';
import { OrgSwitchRoute } from './OrgSwitchRoute';
import { JoinOrgScreen } from './JoinOrgScreen';
import { SuchanaPage } from './SuchanaPage';
import { ProfileTab } from './ProfileTab';
import { ChatRoute } from './ChatRoute';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';
import { FirstRunSequence } from './FirstRunSequence';
import { DanaSheetHost } from './DanaSheetHost';
import { useNotifications } from '../context/NotificationContext';
import { useChatUnreadTotal } from '../chat/useChat';
import { SearchButton } from '../search/SearchButton';
import { NotificationBell } from '../notifications/NotificationBell';
import { SuchanaCenter } from './SuchanaCenter';
import { formatBadgeCount } from './headerBadges';

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
 *
 * Proposal A (unified notifications, 2026-10-20): the header carries TWO
 * doors so one glance answers "did anything happen?" —
 *   💬 Messages (badge = chat unread) → /app/chat
 *   🔔 Suchana  (badge = notification unread; red pulse ONLY for CRITICAL)
 *       → the Suchana Center sheet (sangha inbox + team notes).
 * The old header 🪔 button opened the guidance modal under the same name
 * as the inbox tab — retired. Guidance lives on the Suchana tab; the bell
 * never opens guidance. Header badges are the single source of truth —
 * the tab badges are gone.
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
  const [centerOpen, setCenterOpen] = useState(false);
  // Header-door badges — the single source of truth for unread state.
  const { unreadCount, criticalCount } = useNotifications();

  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  // Unread chat count — shown on the header 💬 Messages door.
  const chatUnread = useChatUnreadTotal(uid === 'anon' ? null : uid);
  const chatBadge = formatBadgeCount(chatUnread);

  const activeTab = tabFromPath(location.pathname);
  const subTab = soloSubTabFromPath(location.pathname);
  // QUEUED #50 (audit D11a): the provisional session-switch placeholder
  // ('SAN-PENDING') is never an identity — while the real profile
  // hydrates, the header shows the neutral 'SAN-…' rather than the
  // placeholder's literal id.
  const realProfile = isProvisionalProfile(profile) ? null : profile;
  const realSoloProfile = isProvisionalProfile(soloProfile) ? null : soloProfile;
  const sanId = realProfile?.id || realSoloProfile?.id || 'SAN-…';

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
          {/* 💬 Messages — persistent door to chat; green badge = unread.
              Vocabulary: messages are people talking to you. */}
          <button
            type="button"
            onClick={() => navigate('/app/chat')}
            aria-label="Messages · বার্তা · संदेश"
            title="Messages"
            className="relative w-11 h-11 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 flex items-center justify-center text-xl border border-white/10 transition-colors"
          >
            <span aria-hidden>💬</span>
            {chatBadge !== null && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-emerald-500 text-white border-2 border-emerald-600/30 text-[11px] font-black flex items-center justify-center shadow-sm"
              >
                {chatBadge}
              </span>
            )}
            {chatUnread > 0 && (
              <span className="sr-only">
                {chatUnread} unread message{chatUnread === 1 ? '' : 's'}
              </span>
            )}
          </button>
          {/* 🔔 Suchana — the inbox bell. Warm amber badge; red pulse ONLY
              when a CRITICAL item is unread. Vocabulary law: the bell is
              named "🪔 Suchana — from your sangha", never "Notifications". */}
          <NotificationBell
            unreadCount={unreadCount}
            criticalCount={criticalCount}
            onClick={() => setCenterOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10"
            label={{
              en: '🪔 Suchana — from your sangha',
              bn: '🪔 সূচনা — আপনার সঙ্গ থেকে',
              hi: '🪔 सूचना — आपके संघ से',
            }}
          />
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
        {/* AUDIT FIX #5: /app/chat is a real route now — DevoteeProfile's
            "Message" button and notification deep-links land here instead
            of a dead route. `?with=<chatId>` opens straight into a thread. */}
        <Route path="/app/chat" element={<ChatRoute />} />
        {/* Any other path inside a solo session lands on the Solo home —
            e.g. entering the solo session from the demo menu while at `/`. */}
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
      </div>

      {/* QUEUED FIX #2: DanaSheetHost owns the single ExpressDanaSheet
          instance for the whole solo shell — openDanaSheet() now works
          from Home, Wallet tab, AI assistant, and Seva cards, not just
          the Giving sub-tab. */}
      <DanaSheetHost />

      {/* First-run sequence — language → setup wizard → tour, exactly one
          surface at a time, each shown once. Replaces the three colliding
          mounts (NativeWelcomeSheet is global in App.tsx; the tour and the
          retired OnboardingFlow lived here). */}
      <FirstRunSequence
        uid={uid}
        onNavigate={(t) => navigate(`/app/home/${t}`)}
      />

      {/* 🔔 Suchana Center — the inbox behind the header bell. Mounted
          only while open so its Firestore listeners don't run pointlessly.
          Guidance is NOT here: the footer link goes to the Suchana tab. */}
      {centerOpen && (
        <SuchanaCenter
          isOpen={centerOpen}
          onClose={() => setCenterOpen(false)}
          onGuidance={() => {
            setCenterOpen(false);
            navigate('/app/suchana');
          }}
        />
      )}
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
