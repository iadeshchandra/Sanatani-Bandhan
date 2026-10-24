import React, { useMemo, useState } from 'react';
import {
  Globe2,
  Sparkles,
  QrCode,
  Activity,
  Menu,
  Coins,
  LogOut,
  HeartPulse,
  MessageSquare,
  Bell,
  Check,
  Flame,
  Shield,
  HelpCircle,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
  Building2,
  ArrowLeftRight,
  Search
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { calculatePanchang, getPanchangTodayLine } from '../../utils/panchang';
import { UserRole } from '../../types';
import { NotificationCenterUI } from '../../notifications/NotificationCenterUI';
import { useNotificationCenter } from '../../notifications/index';
import {
  scopeItemsForOrg,
  unreadInScope,
} from '../../notifications/orgScope';
import { OPEN_PALETTE_EVENT } from './CommandPalette';
import { BranchSwitcher } from '../branch/BranchSwitcher';

interface HeaderProps {
  onOpenSidebar: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  onOpenTelemetry: () => void;
  onOpenMySpace: () => void;
  onOpenQuickPay?: () => void;
  onOpenQuickChanda?: () => void;
  onOpenAssistant?: () => void;
  onOpenSahayata?: () => void;
  onOpenGodMode?: () => void;
  onOpenGuide?: () => void;
  activeModule: string;
  onSelectModule?: (module: string) => void;
  onNavigate?: (module: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  onOpenTelemetry,
  onOpenMySpace,
  onOpenQuickPay,
  onOpenQuickChanda,
  onOpenAssistant,
  onOpenSahayata,
  onOpenGuide,
  activeModule,
  onSelectModule,
  onNavigate,
}) => {
  const handleQuickPay = onOpenQuickChanda || onOpenQuickPay || (() => {});
  const {
    activeWorkspace,
    currentRole,
    effectiveRole,
    currentUser,
    switchRole,
    setViewMode,
    logout,
    checkPermission,
    enterSoloSession,
    firebaseUser,
  } = useAuthWorkspace();

  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();
  // Unified notification center — the warm full-screen center, live on
  // notifications/{uid}/items. No legacy seed: the list is real or empty.
  const centerUid = firebaseUser?.uid ?? null;
  const {
    items: centerItems,
    markRead: centerMarkRead,
    markGroupRead: centerMarkGroupRead,
    acknowledge: centerAcknowledge,
  } = useNotificationCenter(centerUid);
  // QUEUED #50 (audit D8): this header exists only inside an org
  // workspace, so the center it mounts is scoped to THIS org — the old
  // code showed the whole per-user stream (identical in every org,
  // "Org" tab included) and counted all of it on the badge. The list
  // is the #43 duplicate-collapsed list, scoped; badge == scoped list.
  // (#61: the bell itself lives in the org shell — see A3-1 note below.)
  const orgItems = useMemo(
    () => scopeItemsForOrg(centerItems, activeWorkspace?.id),
    [centerItems, activeWorkspace?.id]
  );
  const orgUnread = unreadInScope(orgItems);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const panchang = calculatePanchang();
  const taxonomy = useWorkspaceTaxonomy();

  const getRoleLabel = (r: UserRole | string) => {
    switch (r) {
      case 'SuperAdmin':
      case 'SUPER_ADMIN':
        return 'Executive Mode';
      case 'Trustee':
      case 'TRUSTEE':
        return 'Trustee Mode';
      case 'Accountant':
      case 'ACCOUNTANT':
        return 'Accountant Mode';
      case 'Priest':
      case 'PUROHIT':
        return 'Purohit Mode';
      case 'Sevadar':
      case 'MANAGER':
      case 'VOLUNTEER':
        return 'Staff Manager';
      case 'Devotee':
      case 'DEVOTEE':
      default:
        return `Personal Mode (${taxonomy.memberNoun})`;
    }
  };

  // QUEUED #61 (A3-7): the avatar carries the signed-in PERSON's initials
  // (real profile name → account name → email), never the role's — the
  // role is words, in the label beside it. Falls back to the per-org
  // role initials only when no person identity exists at all.
  const personName =
    currentUser?.fullName || currentUser?.name || firebaseUser?.displayName || firebaseUser?.email || '';
  const avatarInitials = personName.trim()
    ? personName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('')
    : effectiveRole.substring(0, 2).toUpperCase();

  return (
    <header className="h-16 lg:h-20 bg-gradient-to-b from-temple-900 to-temple-800 border-b border-temple-700 flex items-center justify-between px-3 sm:px-6 shrink-0 z-50 shadow-md">
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 rounded-xl text-temple-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
          title="Open Desks Menu"
          aria-label="Open desks menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {onToggleSidebarCollapse && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-2 -ml-1 min-w-[44px] min-h-[44px] items-center justify-center rounded-xl text-temple-400 hover:text-saffron-400 hover:bg-white/10 transition-all cursor-pointer"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon Rail'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5 text-saffron-400" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        )}

        <div className="flex items-center gap-3">
          {activeWorkspace.logoUrl ? (
            <img 
              src={activeWorkspace.logoUrl || undefined} 
              alt={activeWorkspace.name} 
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover border border-saffron-500/50 shadow-saffron-500/20 shrink-0 bg-white" 
            />
          ) : (
            <img 
              src="/logo.png" 
              alt="Sanatani Bandhan" 
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-contain shadow-[0_0_12px_rgba(255,153,51,0.35)] shrink-0 transition-transform hover:scale-105" 
              onError={(e) => { e.currentTarget.src = '/icon-192x192.png'; }}
            />
          )}

          <div className="flex flex-col text-left justify-center min-w-0 overflow-hidden">
            {/* F-DASH-2: single-line truncate (never a cramped 2-line clamp) so the
                workspace name ellipsizes gracefully instead of colliding with
                the tithi line / desk search at tight widths. Full name on hover.
                UIUX Batch 4 (D-13): the cap is viewport-relative (52vw) — a name
                keeps a meaningful budget at 320-390px instead of a fixed 140px. */}
            <h1
              title={activeWorkspace.name}
              className="text-base sm:text-lg font-bold text-white leading-tight tracking-tight truncate min-w-0 max-w-[52vw] sm:max-w-[220px] lg:max-w-md"
            >
              {activeWorkspace.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-saffron-500 uppercase">
                {activeWorkspace.type}
              </span>
              {activeWorkspace.city && (
                <>
                  <span className="w-1 h-1 rounded-full bg-temple-500 hidden sm:inline-block"></span>
                  <span className="hidden sm:inline text-[11px] font-medium text-temple-400">
                    {activeWorkspace.city}
                  </span>
                </>
              )}
            </div>
          </div>
          {/* Multi-branch switcher — renders nothing for single-org workspaces */}
          <BranchSwitcher />
        </div>
      </div>

      {/* Center/Right side controls */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Command palette trigger (⌘K) — the fastest way across 72 desks */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT))}
          data-guide-anchor="org-desk-palette"
          className="hidden sm:flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-temple-400 hover:text-temple-200 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
          title="Jump to any desk (Ctrl/⌘ + K)"
          aria-label="Search desks, shortcut Control or Command K"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          <span className="hidden 2xl:inline text-temple-500 font-medium">Search desks…</span>
          <kbd className="kbd hidden 2xl:inline-flex" aria-hidden="true">⌘K</kbd>
        </button>

        {/* Live Panjika (Hidden on mobile) — canonical today line, live Samvat (no hardcoded years).
            F-DASH-2: whitespace-nowrap so the tithi line never wraps into the workspace name.
            Progressive disclosure: the dashboard hero carries the tithi card, so the
            header Panjika yields below 2xl to give the workspace name room. */}
        <div className="hidden 2xl:flex flex-col items-end border-r border-temple-700 pr-5 mr-1 min-w-0">
          <span className="text-[10px] uppercase font-bold text-temple-400 tracking-widest whitespace-nowrap">Vikram {panchang.vikramSamvat} / San {panchang.bengaliSan}</span>
          <span className="text-sm font-medium text-saffron-500 italic whitespace-nowrap">
            {getPanchangTodayLine(panchang)}
          </span>
        </div>

        {/* Quick Chanda Button - Visible on all sizes but icon only on tiny screens */}
        <button
          type="button"
          onClick={handleQuickPay}
          className="flex items-center gap-1.5 px-2.5 sm:px-4 min-h-[44px] py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-500 hover:from-saffron-500 hover:to-saffron-600 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-saffron-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-300"
        >
          <Coins className="w-4 h-4" />
          {/* H-7: was t('quickPay') with no dictionary entry — rendered the literal key in production. */}
          <span className="hidden sm:inline">Quick Chanda</span>
          <span className="sm:hidden">Pay</span>
        </button>

        {/* Desktop Icons */}
        <div className="hidden md:flex items-center gap-2">
          {/* Trilingual Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-temple-300 transition-colors border border-white/5"
            >
              <Globe2 className="w-4 h-4 text-indigo-400" />
              <span>{language.toUpperCase()}</span>
            </button>
            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-32 rounded-xl bg-temple-800 border border-temple-700 shadow-xl p-1.5 z-50">
                {['en', 'hi', 'bn', 'sa'].map((lang, idx) => (
                  <button key={lang} onClick={() => { setLanguage(lang as any); setShowLangDropdown(false); }} className={`w-full text-left px-3 py-2 min-h-[44px] flex items-center rounded-lg text-xs font-bold transition-colors ${language === lang ? 'bg-saffron-500/20 text-saffron-500' : 'hover:bg-white/5 text-temple-300'}`}>
                    {lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : lang === 'bn' ? 'বাংলা' : 'संस्कृतम्'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow-xs cursor-pointer group"
              title="Shastric & Statutory Quick Guide (SOP) & Lexicon"
            >
              <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>SOP Guide</span>
            </button>
          )}
          {onOpenAssistant && (
            <button
              type="button"
              onClick={onOpenAssistant}
              className="hidden 2xl:flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-saffron-500/10 hover:bg-saffron-500/20 border border-saffron-500/30 text-saffron-500 text-xs font-bold transition-all"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Dharmic AI</span>
            </button>
          )}

          {onOpenSahayata && (
            <button
              type="button"
              onClick={onOpenSahayata}
              className="hidden 2xl:flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Community</span>
            </button>
          )}

          <button
            id="header-btn-switch-devotee-view"
            onClick={() => {
              if (onNavigate) {
                onNavigate('devoteePortal');
              } else {
                window.location.href = '/';
              }
              showToast('Here is what your community members see 🙏', 'success', 'Devotee preview');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500 hover:to-orange-500 text-amber-300 hover:text-slate-950 rounded-xl transition-all border border-amber-500/40 font-bold text-xs shadow-xs cursor-pointer group"
            title="See what your community members see"
          >
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:text-slate-950 transition-colors" />
            <span className="font-bold">👁 Devotee preview</span>
          </button>

          <button
            id="header-btn-switch-personal"
            onClick={() => {
              setViewMode('MEMBER');
              showToast('Switched to Personal Devotee Space 🙏', 'success', 'Personal Mode Active');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-gradient-to-r from-saffron-500/20 to-saffron-500/20 hover:from-saffron-500 hover:to-saffron-500 text-saffron-300 hover:text-temple-950 rounded-xl transition-all border border-saffron-500/40 font-bold text-xs shadow-xs cursor-pointer group"
            title="Switch to Personal Devotee View (Darshan, Sadhana Japa, Vivah, e-Pass & 80G Receipts)"
          >
            <UserCircle className="w-4 h-4 text-saffron-400 group-hover:text-temple-950 transition-colors" />
            <span className="font-bold hidden 2xl:inline">Personal View</span>
          </button>
        {checkPermission(['SUPER_ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN']) && (
          <button onClick={onOpenTelemetry} aria-label="Live Telemetry" className="p-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-temple-400 hover:text-emerald-400 transition-colors border border-white/5">
            <Activity className="w-4 h-4" />
          </button>
        )}
          <button onClick={onOpenMySpace} className="px-3 py-2 min-h-[44px] rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors border border-indigo-500/20 flex items-center gap-2 shadow-inner">
            <QrCode className="w-4 h-4" />
            <span className="text-xs font-bold hidden 2xl:block">Smart Pass</span>
          </button>
          
          {/* QUEUED #61 (A3-1): ONE Suchana bell law — the org shell's
              org-scoped bell is the single bell at every width, so this
              desktop duplicate is gone. The unified center still opens
              from the avatar menu's Suchana entry (all widths) and is
              mounted at the header root below; orgItems/orgUnread keep
              feeding its badge there. */}
        </div>

        {/* Unified Profile & Settings (Always Visible) */}
        <div className="relative border-l border-temple-700 pl-3 sm:pl-4 ml-1 sm:ml-2">
          <button
            type="button"
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-2 sm:gap-3 text-left cursor-pointer group min-h-[44px] min-w-[44px]"
          >
            <div className="hidden md:block text-right">
              {/* QUEUED #61 (A3-1): the label shows the PER-ORG resolved
                  role (effectiveRole), so it can never contradict the
                  shell's role chip when the two sessions differ. */}
              <p className="text-sm font-bold text-white group-hover:text-saffron-500 transition-colors">{getRoleLabel(effectiveRole)}</p>
              <p className="text-[10px] uppercase text-temple-400 font-bold tracking-wider">Settings & Profile</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-temple-800 border-2 border-temple-600 shadow-sm overflow-hidden shrink-0 transition-transform group-hover:scale-105 group-hover:border-saffron-500">
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-saffron-500/20 to-saffron-500/20 text-saffron-500 font-bold text-sm">
                {avatarInitials}
              </div>
            </div>
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-3 w-64 sm:w-60 rounded-2xl bg-temple-800 border border-temple-700 shadow-2xl p-2 z-50 animate-in slide-in-from-top-2 duration-200">
              
              {/* Mobile Only: App Utilities */}
              <div className="md:hidden flex flex-col gap-1 mb-2">
                {/* QUEUED #50 (D8): Suchana reachable on mobile too — the
                    bell above is desktop-only (md:flex), so the avatar
                    menu carries the door here, with the org's unread count. */}
                <button
                  type="button"
                  onClick={() => { setShowRoleDropdown(false); setShowNotifications(true); }}
                  className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-white/5 text-temple-300 text-xs font-bold transition-colors"
                >
                  <Bell className="w-4 h-4 text-amber-400" /> 🪔 Suchana — this organisation
                  {orgUnread > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-amber-950 text-[11px] font-black flex items-center justify-center">
                      {orgUnread > 99 ? '99+' : orgUnread}
                    </span>
                  )}
                </button>
                <button onClick={() => { setShowRoleDropdown(false); onOpenMySpace(); }} className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-white/5 text-temple-300 text-xs font-bold transition-colors">
                  <QrCode className="w-4 h-4 text-indigo-400" /> My Smart Pass
                </button>
                {onOpenGuide && (
                  <button
                    type="button"
                    onClick={() => { setShowRoleDropdown(false); onOpenGuide(); }}
                    className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-white/5 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400" /> Shastric SOP & Lexicon
                  </button>
                )}
          {onOpenAssistant && (
                  <button onClick={() => { setShowRoleDropdown(false); onOpenAssistant(); }} className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-white/5 text-temple-300 text-xs font-bold transition-colors">
                    <Sparkles className="w-4 h-4 text-saffron-500" /> Dharmic AI Assistant
                  </button>
                )}
                {/* QUEUED #61 (A3-3): the Sahayata / Community door existed
                    only at ≥2xl widths; below that it had no door at all.
                    The avatar menu now carries it at every width. */}
                {onOpenSahayata && (
                  <button onClick={() => { setShowRoleDropdown(false); onOpenSahayata(); }} className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-white/5 text-temple-300 text-xs font-bold transition-colors">
                    <MessageSquare className="w-4 h-4 text-indigo-400" /> Community — Sahayata
                  </button>
                )}
                {checkPermission(['SUPER_ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN']) && (
                  <button onClick={() => { setShowRoleDropdown(false); onOpenTelemetry(); }} className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-white/5 text-temple-300 text-xs font-bold transition-colors">
                    <Activity className="w-4 h-4 text-emerald-400" /> Live Telemetry
                  </button>
                )}
                
                <div className="px-2.5 py-1.5 mt-1">
                  <p className="text-[10px] uppercase font-bold text-temple-500 mb-1.5">Language</p>
                  <div className="flex gap-2">
                    {['en', 'hi', 'bn', 'sa'].map((lang, idx) => (
                      <button key={lang} onClick={() => { setLanguage(lang as any); setShowRoleDropdown(false); }} className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center border transition-colors ${language === lang ? 'bg-saffron-500/20 border-saffron-500/50 text-saffron-500' : 'border-temple-600 text-temple-400 hover:bg-white/5'}`}>
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-temple-700 my-1 mx-2"></div>
              </div>

              {/* Devotee-view switch (plain language — no B2C jargon) */}
              <div className="px-1 py-1 mb-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleDropdown(false);
                    if (onNavigate) {
                      onNavigate('devoteePortal');
                    } else {
                      window.location.href = '/';
                    }
                    showToast('Here is what your community members see 🙏', 'success', 'Devotee preview');
                  }}
                  className="w-full text-left px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 text-amber-300 hover:text-slate-950 transition-all border border-amber-500/40 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>👁 Devotee preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleDropdown(false);
                    // Org → solo: enter the personal session FIRST (provisional),
                    // mirroring the purohit 'PUR-PENDING' pattern — the
                    // SoloProvider lazy-mints the real SAN-XXXXXX on mount
                    // (get-or-create, never duplicates). Works for Firebase
                    // users and local demo sessions alike.
                    enterSoloSession({
                      id: 'SAN-PENDING',
                      uid: '__pending__',
                      displayName: '',
                      languages: [],
                      verificationTier: 'REGISTERED',
                      roles: {},
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    } as any);
                    showToast('Welcome to My Space 🙏', 'success');
                  }}
                  className="w-full text-left px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500 hover:to-teal-500 text-emerald-300 hover:text-slate-950 transition-all border border-emerald-500/40 cursor-pointer"
                  title="Your personal Sanatani space — sadhana, panchang, saved texts"
                >
                  <span className="text-sm">🪔</span>
                  <span>My Space — home</span>
                </button>
              </div>

              {/* Role Switcher — dev-only tester. Hidden in production builds. */}
              {import.meta.env.DEV && (
              <div className="px-3 py-2 border-b border-temple-700 mb-2">
                <p className="text-[10px] font-bold text-temple-400 uppercase tracking-wider">
                  Role-Based Access
                </p>
              </div>
              )}
              {import.meta.env.DEV && (['Trustee', 'Priest', 'Accountant', 'Sevadar', 'Devotee'] as UserRole[]).map((r, idx) => (
                <button
                  key={r}
                  onClick={() => { switchRole(r); setShowRoleDropdown(false); }}
                  className={`w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    currentRole === r
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'hover:bg-white/5 text-temple-300'
                  }`}
                >
                  <span>{getRoleLabel(r)}</span>
                  {currentRole === r && <span>✓</span>}
                </button>
              ))}
              
              {/* Logout */}
              <div className="border-t border-temple-700 mt-2 pt-2">
                <button
                  onClick={() => { logout(); setShowRoleDropdown(false); }}
                  className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-rose-500/10 text-rose-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUEUED #50 (D8): the center is a fixed full-screen overlay —
          mounted at header root, NOT inside the desktop-only controls
          (a display:none ancestor would hide it), so the mobile avatar
          menu's Suchana entry opens it too. Org-scoped items only. */}
      {showNotifications && (
        <NotificationCenterUI
          items={orgItems}
          onClose={() => setShowNotifications(false)}
          onMarkRead={(id) => void centerMarkRead(id)}
          onMarkGroupRead={(group) => void centerMarkGroupRead(group.items.map((i) => i.id))}
          onMarkAllRead={() =>
            void centerMarkGroupRead(orgItems.filter((i) => !i.read).map((i) => i.id))
          }
          onClearRead={() =>
            void centerMarkGroupRead(orgItems.filter((i) => !i.read).map((i) => i.id))
          }
          onAcknowledge={(id) => void centerAcknowledge(id)}
        />
      )}
    </header>
  );
};

