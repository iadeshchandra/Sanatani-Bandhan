import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthWorkspaceProvider } from './context/AuthWorkspaceContext';
import { DataProvider } from './context/DataContext';
import { GlobalSOSListener } from './components/common/GlobalSOSListener';
import { SOSFlow } from './crisis/SOSFlow';
import { AskButton } from './ai/components/AskButton';
import { NotificationWiring } from './notifications/NotificationWiring';
import { InstallPrompt } from './components/common/InstallPrompt';
import { UpdatePrompt } from './components/pwa/UpdatePrompt';
import { NativeWelcomeSheet } from './components/language/NativeWelcomeSheet';
import { TravelNudge } from './components/language/TravelNudge';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DeskErrorBoundary } from './components/common/DeskErrorBoundary';
import { AppInitializer } from './context/AppInitializer';
import { startDemoBackgroundService } from './lib/dbUtils';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { OrgSpaceShell } from './components/shell/OrgSpaceShell';
// Bundle slimming (2026-10-18): dev previews are DEV-only — lazy so they never
// enter the production initial bundle.
const ProfileOrgHubPreview = lazy(() => import('./dev-preview/PreviewHub').then(m => ({ default: m.ProfileOrgHubPreview })));
const JoinOrgScreenPreview = lazy(() => import('./dev-preview/PreviewHub').then(m => ({ default: m.JoinOrgScreenPreview })));
const FestivalEventPreview = lazy(() => import('./dev-preview/PreviewHub').then(m => ({ default: m.FestivalEventPreview })));
const ChatPreview = lazy(() => import('./dev-preview/PreviewHub').then(m => ({ default: m.ChatPreview })));
import { Footer } from './components/common/Footer';
// Bundle slimming (2026-10-18): QuickChandaModal pulls jspdf + QR libs (~550KB
// combined with MySpaceModal). Loaded on demand when the modal opens.
const QuickChandaModal = lazy(() => import('./components/common/QuickChandaModal').then(m => ({ default: m.QuickChandaModal })));
const MySpaceModal = lazy(() => import('./components/common/MySpaceModal').then(m => ({ default: m.MySpaceModal })));
import { PurohitWorkspaceShell } from './components/purohit/PurohitWorkspaceShell';
import { SangamProvider } from './sangam/sangamStore';
import { JyotishWorkspaceShell } from './jyotish/JyotishWorkspaceShell';
import { Navigate } from 'react-router-dom';
// Deprecated: PurohitReviewQueue used unsafe direct client writes.
// Verification now lives in the unified GodMode console (/mysecretlogin).
const PurohitReviewsRedirect: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-center">
    <div className="max-w-md">
      <p className="text-4xl mb-4">🪔</p>
      <h1 className="text-lg font-bold text-white mb-2">Verification moved</h1>
      <p className="text-sm text-slate-400 mb-6">
        Purohit &amp; Jyotishi verification now runs through the unified sovereign console,
        with server-side approval (self-approval denied).
      </p>
      <a
        href="/mysecretlogin"
        className="inline-block px-6 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black"
      >
        Open Sovereign Console
      </a>
    </div>
  </div>
);
import { MembershipProvider, useMembership } from './context/MembershipContext';
import { landingSurfaceForMembership, resolveOrgLandingRole } from './lib/landingSurface';
import { useAuthWorkspace } from './context/AuthWorkspaceContext';
import { QuickGuideModal } from './components/common/QuickGuideModal';
import { RBACQuickGuideDrawer } from './components/common/RBACQuickGuideDrawer';
import { QuickGuideProvider, useQuickGuide } from './context/QuickGuideContext';
import { GlobalTelemetryModal } from './components/common/GlobalTelemetryModal';
import { PlanLockedDesk } from './components/common/PlanLockedDesk';
import { isModuleMountAllowed, requiredTierForModule, resolvePlanModuleId } from './lib/workspaceRegistry';
import { isModuleAllowedForOrgMount } from './lib/workspaceRegistry';
import { OrgTypeRestrictedDesk } from './components/common/OrgTypeRestrictedDesk';
import { DharmicQueryAssistant } from './components/common/DharmicQueryAssistant';
import { TawkToWidget } from './components/common/TawkToWidget';
import { LandingPage as LegacyLandingPage } from './components/public/LandingPage';
import { LandingPage } from './pages/LandingPage';
import { ContactPage } from './pages/ContactPage';
import { DevoteePortal } from './pages/DevoteePortal';
import { PortalLogin } from './components/public/PortalLogin';
import { useToast } from './context/ToastContext';
import { useData } from './context/DataContext';
import { WorkspaceType, WorkspaceConfig } from './types';
import { AdminLayout } from './admin/AdminLayout';
import { SuperAdminDashboard } from './admin/SuperAdminDashboard';
// Bundle slimming (2026-10-18): GlobalAnalytics pulls recharts (~300KB).
// Admin-only page — loads on demand.
const GlobalAnalytics = lazy(() => import('./admin/GlobalAnalytics'));
import { OfflineIndicator } from './components/OfflineIndicator';
import { SystemOverrideGuard } from './components/auth/SystemOverrideGuard';
import { CommandPalette } from './components/common/CommandPalette';
import { ConfirmProvider } from './components/common/ui';
import { DemoBanner } from './components/public/DemoBanner';
import { DemoTour } from './components/public/DemoTour';
import { DemoUpsellModal } from './components/public/DemoUpsellModal';
import { SetupWizard } from './components/onboarding/SetupWizard';
import { shouldShowWizard } from './components/onboarding/wizardDeskMap';

import { NotificationProvider } from './context/NotificationContext';
const QRScanner = lazy(() => import('./components/admin/QRScanner').then(m => ({ default: m.QRScanner })));
const ShortsRoute = lazy(() => import('./sangam/shorts/ShortsRoute').then(m => ({ default: m.ShortsRoute })));
const DevoteeRoute = lazy(() => import('./social/DevoteeRoute').then(m => ({ default: m.DevoteeRoute })));

// App Growth (Phase 5): /get-app smart link + download landing — own lazy
// chunk so the first paint stays under 2s on low-end phones.
const GetAppPage = lazy(() => import('./appgrowth/GetAppPage'));

// Dashboard
const DashboardHome = lazy(() => import('./components/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));

// Domain 1: CRM & Lineage
const DevoteeGrid = lazy(() => import('./components/domain1/DevoteeGrid').then(m => ({ default: m.DevoteeGrid })));
const MembershipDesk = lazy(() => import('./components/org/MembershipDesk').then(m => ({ default: m.MembershipDesk })));
const OrgDirectory = lazy(() => import('./components/org/OrgDirectory').then(m => ({ default: m.OrgDirectory })));
// Pillar 3: public org page — the temple's web presence + inbound funnel.
// Supersedes the social-only OrgPage (follow/join actions live here now).
const OrgPublicPage = lazy(() => import('./pages/OrgPublicPage').then(m => ({ default: m.OrgPublicPage })));
// Campus maps (Phase 1): devotee-facing per-org campus view + trustee-only
// builder. The map program lived unwired in src/campus/ — these routes make
// it reachable: /org/:orgId/campus (public) and /org/:orgId/campus/manage.
const CampusPage = lazy(() => import('./pages/CampusPage').then(m => ({ default: m.CampusPage })));
const CampusManagePage = lazy(() => import('./pages/CampusPage').then(m => ({ default: m.CampusManagePage })));
// Seva Professional (Phase 1): unified purohit+jyotish public profile — /seva/pro/:uid.
const UnifiedProfessionalProfile = lazy(() => import('./components/sevaPro/UnifiedProfessionalProfile').then(m => ({ default: m.UnifiedProfessionalProfile })));
// Seva Professional: occasion-first samskara journey — devotee picks a life
// event, gets a curated jyotish-counsel + purohit-ritual bundle, tracks both
// in one view. Local-only (localStorage bundles), no Firestore dependency.
const SevaCatalog = lazy(() => import('./components/sevaPro/SevaCatalog').then(m => ({ default: m.SevaCatalog })));
const FestivalEventPage = lazy(() => import('./components/festival/FestivalEventPage').then(m => ({ default: m.FestivalEventPage })));
const DarshanCheckInDesk = lazy(() => import('./components/domain1/DarshanCheckInDesk').then(m => ({ default: m.DarshanCheckInDesk })));
const FamilyHouseholdDesk = lazy(() => import('./components/domain1/FamilyHouseholdDesk').then(m => ({ default: m.FamilyHouseholdDesk })));
const VanshavaliDesk = lazy(() => import('./components/domain1/VanshavaliDesk').then(m => ({ default: m.VanshavaliDesk })));
const GuestManagerDesk = lazy(() => import('./components/domain1/GuestManagerDesk').then(m => ({ default: m.GuestManagerDesk })));
const BulkImportDesk = lazy(() => import('./components/domain1/BulkImportDesk').then(m => ({ default: m.BulkImportDesk })));
const RakthaSevaDesk = lazy(() => import('./components/domain1/RakthaSevaDesk').then(m => ({ default: m.RakthaSevaDesk })));
const FederationMultiBranchDesk = lazy(() => import('./components/domain1/FederationMultiBranchDesk').then(m => ({ default: m.FederationMultiBranchDesk })));
const SevadarRosterDesk = lazy(() => import('./components/domain1/SevadarRosterDesk').then(m => ({ default: m.SevadarRosterDesk })));
const DonorCareDesk = lazy(() => import('./components/domain1/DonorCareDesk').then(m => ({ default: m.DonorCareDesk })));

// Domain 2: Financials & Assets
const TreasuryLedgerDesk = lazy(() => import('./components/domain2/TreasuryLedgerDesk').then(m => ({ default: m.TreasuryLedgerDesk })));
const TaxReceiptDesk = lazy(() => import('./components/domain2/TaxReceiptDesk').then(m => ({ default: m.TaxReceiptDesk })));
const TallyExportDesk = lazy(() => import('./components/domain2/TallyExportDesk').then(m => ({ default: m.TallyExportDesk })));
const Form10BDComplianceDesk = lazy(() => import('./components/domain2/Form10BDComplianceDesk').then(m => ({ default: m.Form10BDComplianceDesk })));
const MandirCampaignsDesk = lazy(() => import('./components/domain2/MandirCampaignsDesk').then(m => ({ default: m.MandirCampaignsDesk })));
const KarmaLedgerDesk = lazy(() => import('./components/domain2/KarmaLedgerDesk').then(m => ({ default: m.KarmaLedgerDesk })));
const AssetInventoryDesk = lazy(() => import('./components/domain2/AssetInventoryDesk').then(m => ({ default: m.AssetInventoryDesk })));
const InventoryDesk = lazy(() => import('./components/domain2/InventoryDesk').then(m => ({ default: m.InventoryDesk })));
const HundiCountingAuditDesk = lazy(() => import('./components/domain2/HundiCountingAuditDesk').then(m => ({ default: m.HundiCountingAuditDesk })));
const RatnaBhandarAssetDesk = lazy(() => import('./components/domain2/RatnaBhandarAssetDesk').then(m => ({ default: m.RatnaBhandarAssetDesk })));
const QuickChandaPOS = lazy(() => import('./components/domain2/QuickChandaPOS').then(m => ({ default: m.QuickChandaPOS })));
const BhoomiRealEstateDesk = lazy(() => import('./components/domain2/BhoomiRealEstateDesk').then(m => ({ default: m.BhoomiRealEstateDesk })));
const VahanFleetDesk = lazy(() => import('./components/domain2/VahanFleetDesk').then(m => ({ default: m.VahanFleetDesk })));
const RecurringSevaDesk = lazy(() => import('./components/domain2/RecurringSevaDesk').then(m => ({ default: m.RecurringSevaDesk })));

// Domain 3: Vedic Rituals & Astrology
const PoojaBookingDesk = lazy(() => import('./components/domain3/PoojaBookingDesk').then(m => ({ default: m.PoojaBookingDesk })));
const MandirPujaDesk = lazy(() => import('./components/domain3/MandirPujaDesk').then(m => ({ default: m.MandirPujaDesk })));
const PurohitMarketDesk = lazy(() => import('./components/domain3/PurohitMarketDesk').then(m => ({ default: m.PurohitMarketDesk })));
const PurohitDesk = lazy(() => import('./components/domain3/PurohitDesk').then(m => ({ default: m.PurohitDesk })));
const PurohitManagementDesk = lazy(() => import('./components/domain3/PurohitManagementDesk').then(m => ({ default: m.PurohitManagementDesk })));
const PurohitPortalUnified = lazy(() => import('./components/domain3/PurohitPortalUnified').then(m => ({ default: m.PurohitPortalUnified })));
const PitruShradhDesk = lazy(() => import('./components/domain3/PitruShradhDesk').then(m => ({ default: m.PitruShradhDesk })));
const PanchangMuhuratDesk = lazy(() => import('./components/domain3/PanchangMuhuratDesk').then(m => ({ default: m.PanchangMuhuratDesk })));
const PanchangAstrologyEngine = lazy(() => import('./components/domain3/PanchangAstrologyEngine').then(m => ({ default: m.PanchangAstrologyEngine })));
const YatraNetCommandCenter = lazy(() => import('./components/domain3/YatraNetCommandCenter').then(m => ({ default: m.YatraNetCommandCenter })));
const CrisisDashboard = lazy(() => import('./crisis/CrisisDashboard').then(m => ({ default: m.CrisisDashboard })));

// Domain 4: Gau Seva & Community
const GauSevaDesk = lazy(() => import('./components/domain4/GauSevaDesk').then(m => ({ default: m.GauSevaDesk })));
const AnnadanamKitchenDesk = lazy(() => import('./components/domain4/AnnadanamKitchenDesk').then(m => ({ default: m.AnnadanamKitchenDesk })));
const VedicSevaShikshaDesk = lazy(() => import('./components/domain4/VedicSevaShikshaDesk').then(m => ({ default: m.VedicSevaShikshaDesk })));
const AshramGoshalaGurukulDesk = lazy(() => import('./components/domain4/AshramGoshalaGurukulDesk').then(m => ({ default: m.AshramGoshalaGurukulDesk })));
// Utsav One — Mahotsav Samiti festival management suite (Mahotsav Samiti + Mandir).
const UtsavDesk = lazy(() => import('./utsav/UtsavDesk').then(m => ({ default: m.UtsavDesk })));
// Nyas One — Trust/NGO compliance & governance suite (Trust + DharmadaTrust only).
const NyasDesk = lazy(() => import('./nyas/NyasDesk').then(m => ({ default: m.NyasDesk })));
// Tirth One — darshan queue & token management suite (Tirth + Mandir + KashiKshetra).
const TirthDesk = lazy(() => import('./tirth/TirthDesk').then(m => ({ default: m.TirthDesk })));
// Yoga One — yoga shala management suite (Yoga + Ashram only).
const YogaDesk = lazy(() => import('./yoga/YogaDesk').then(m => ({ default: m.YogaDesk })));
// Matha One — monastic management suite (Sangha + Ashram only).
const MathaDesk = lazy(() => import('./matha/MathaDesk').then(m => ({ default: m.MathaDesk })));
// Satsang One — mandali organizer suite (Satsang + Mandir + Ashram only).
const SatsangDesk = lazy(() => import('./satsang/SatsangDesk').then(m => ({ default: m.SatsangDesk })));
// Sabha One — purohit sabha association management (PurohitSabha + Mandir only).
const SabhaDesk = lazy(() => import('./sabha/SabhaDesk').then(m => ({ default: m.SabhaDesk })));
// Samskara One — family lifecycle suite: 16 samskaras, pitra records, shraddha (universal).
const SamskaraDesk = lazy(() => import('./samskara/SamskaraDesk').then(m => ({ default: m.SamskaraDesk })));
// Annakshetra One — complete kitchen & bhandara management suite (Mandir + Ashram + Tirth + Trust/NGO + Akshaya Patra).
const AnnakshetraDesk = lazy(() => import('./annakshetra/AnnakshetraDesk').then(m => ({ default: m.AnnakshetraDesk })));
// Pathshala One — complete school-management suite (Gurukul + Vidyalaya only).
const PathshalaDesk = lazy(() => import('./pathshala/PathshalaDesk').then(m => ({ default: m.PathshalaDesk })));
// Goshala One — complete goshala-operations suite (Goshala only).
const GoshalaDesk = lazy(() => import('./goshala/GoshalaDesk').then(m => ({ default: m.GoshalaDesk })));
// Ashram One — complete yatri stay-management suite (Ashram + Tirth only).
const AshramDesk = lazy(() => import('./ashram/AshramDesk').then(m => ({ default: m.AshramDesk })));
// Cash Custody — hundi-to-bank chain of custody (Mandir + Trust/NGO only).
const CashCustodyDesk = lazy(() => import('./cashcustody/CashCustodyDesk').then(m => ({ default: m.CashCustodyDesk })));

// Solo Sanatani — independent personal workspace (person-scoped, no org).
const SoloWorkspaceShell = lazy(() => import('./solo/SoloWorkspaceShell').then(m => ({ default: m.SoloWorkspaceShell })));

// Domain 5: Outreach & Scriptures
const WhatsAppBroadcasterDesk = lazy(() => import('./components/domain5/WhatsAppBroadcasterDesk').then(m => ({ default: m.WhatsAppBroadcasterDesk })));
const VedicCalendarEventsDesk = lazy(() => import('./components/domain5/VedicCalendarEventsDesk').then(m => ({ default: m.VedicCalendarEventsDesk })));
const SanskritLibraryDesk = lazy(() => import('./components/domain5/SanskritLibraryDesk').then(m => ({ default: m.SanskritLibraryDesk })));

// Domain 7: Individual Life & Connect
const PersonalSadhanaDesk = lazy(() => import('./components/domain5/PersonalSadhanaDesk'));
const SanataniVivahDesk = lazy(() => import('./components/domain4/SanataniVivahDesk'));

// Domain 6: Enterprise Control & Multi-Workspace
const WorkspaceSelectorDesk = lazy(() => import('./components/domain6/WorkspaceSelectorDesk').then(m => ({ default: m.WorkspaceSelectorDesk })));
const MasterSettingsDesk = lazy(() => import('./components/domain6/MasterSettingsDesk').then(m => ({ default: m.MasterSettingsDesk })));
const FamilyRootsMatrimonyDesk = lazy(() => import('./components/domain6/FamilyRootsMatrimonyDesk').then(m => ({ default: m.FamilyRootsMatrimonyDesk })));
const AppStoreDesk = lazy(() => import('./components/domain6/AppStoreDesk').then(m => ({ default: m.AppStoreDesk })));
const CrisisCommandCenter = lazy(() => import('./components/domain6/CrisisCommandCenter').then(m => ({ default: m.CrisisCommandCenter })));
const TacticalPerimeterRadar = lazy(() => import('./components/domain6/TacticalPerimeterRadar').then(m => ({ default: m.TacticalPerimeterRadar })));
const UserRolesDesk = lazy(() => import('./components/domain6/UserRolesDesk').then(m => ({ default: m.UserRolesDesk })));
const AuditLogDesk = lazy(() => import('./components/domain6/AuditLogDesk').then(m => ({ default: m.AuditLogDesk })));
const GodModeBackend = lazy(() => import('./components/common/GodModeConsole2').then(m => ({ default: m.GodModeConsole2 })));
import { PersonaSwitcher } from './components/dev/PersonaSwitcher';

// Public / Devotee Portal
const LegacyDevoteeDesk = lazy(() => import('./components/devotee/DevoteePortal').then(m => ({ default: m.DevoteePortal })));
const DevoteeAccountPortal = lazy(() => import('./components/domain5/DevoteeAccountPortal').then(m => ({ default: m.default })));
const MemberAppShell = lazy(() => import('./components/devotee/MemberAppShell').then(m => ({ default: m.default })));

const YatraNetDesk = lazy(() => import('./components/domain7/YatraNetDesk').then(m => ({ default: m.default })));
const DharamshalaDesk = lazy(() => import('./components/domain4/DharamshalaDesk').then(m => ({ default: m.DharamshalaDesk })));
const PanchayatPollingDesk = lazy(() => import('./components/domain6/PanchayatPollingDesk').then(m => ({ default: m.PanchayatPollingDesk })));




const RestrictedAccess: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50/50">
    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
      <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    </div>
    <h2 className="text-2xl font-bold text-slate-800 mb-2 font-serif">Access Restricted</h2>
    <p className="text-slate-500 max-w-md mx-auto mb-8">
      Your current role does not have the clearance to view this secure financial or operational module. Please contact the Mandir Trustee or Head Admin for access.
    </p>
  </div>
);

const AppContent: React.FC = () => {
  // Phase 2 org spaces: RBAC here evaluates effectiveRole — the user's
  // ACTUAL role in THIS org (from the workspaceMembers edge), not the
  // global role carried from another session.
  const { checkPermission, activeWorkspace, effectiveRole, viewMode, logout, isAuthenticated, exitDemo, currentRole, firebaseUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const { demoUpsellModule, closeDemoUpsell, getDemoStats } = useData();
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  // F-RBAC-1: "Devotee view" is a chromeless preview of what members see —
  // the ERP sidebar/header/footer/demo-banner chrome must not leak around it.
  const isDevoteePreview = activeModule === 'devoteePortal' || activeModule === 'devotee-super-app';
  const hideErpChrome = effectiveRole === 'Devotee' || isDevoteePreview;

  // QUEUED #55: role-appropriate landing — the pure law lives in
  // lib/landingSurface; this block resolves the role evidence for THIS
  // org and applies the surface on entry. It replaces both the old
  // devotee guard (which fired on the UNRESOLVED global fallback — a
  // Solo-first Trustee's global role is 'Devotee', so the guard forced
  // the Devotee view before the workspaceMembers edge landed, and
  // nothing ever released it) and the #50 workspace-change effect
  // (whose 'dashboard' reset the same async dip could undo a commit
  // later). One law, every entry path: Orgs-list Open, workspace
  // switcher, post-sign-in resume, org creation (whose activation also
  // stamps creator + Trustee role — both resolve staff-side here).
  const { myMemberships, membershipsLoaded } = useMembership();
  const landingWsId = activeWorkspace?.id || '';
  const landingMembership = React.useMemo(
    () => myMemberships.find((m) => m.workspaceId === landingWsId),
    [myMemberships, landingWsId]
  );
  const landingRoleState = resolveOrgLandingRole({
    workspaceId: landingWsId,
    membershipRole: landingMembership?.role,
    membershipsLoaded,
    globalRole: currentRole,
    isCreator:
      !!firebaseUser?.uid &&
      (activeWorkspace as { createdBy?: string } | null)?.createdBy === firebaseUser.uid,
  });
  const landingSurface = landingSurfaceForMembership(
    landingRoleState.role,
    landingRoleState.resolved
  );
  const landingAppliedForRef = React.useRef<string>('');
  const guardForcedDevoteeRef = React.useRef<boolean>(false);
  React.useEffect(() => {
    if (!landingWsId) return;
    if (landingSurface === 'pending') return; // role still resolving — hold, never guess
    const needsLanding = landingAppliedForRef.current !== landingWsId;
    if (landingSurface === 'devotee') {
      // Devotee-only member: the Devotee view IS their org home.
      const allowedDevoteeDesks = ['devoteePortal', 'devotee-super-app', 'devotee-portal', 'personal-portal', 'devotee-account'];
      if (!allowedDevoteeDesks.includes(activeModule)) {
        guardForcedDevoteeRef.current = true;
        setActiveModule('devoteePortal');
      }
      landingAppliedForRef.current = landingWsId;
      return;
    }
    // Staff surface: land on the Command Center at entry (first mount
    // or workspace change — subsumes the #50 change law).
    if (needsLanding) {
      landingAppliedForRef.current = landingWsId;
      guardForcedDevoteeRef.current = false;
      if (activeModule !== 'dashboard') setActiveModule('dashboard');
    } else if (
      guardForcedDevoteeRef.current &&
      (activeModule === 'devoteePortal' || activeModule === 'devotee-super-app')
    ) {
      // The role resolved to staff after a devotee landing had been
      // forced on partial evidence — release it. A preview the user
      // opened deliberately (Header "👁 Devotee preview") is never
      // guard-forced, so this leaves it untouched.
      guardForcedDevoteeRef.current = false;
      setActiveModule('dashboard');
    }
  }, [landingWsId, landingSurface, activeModule]);

  React.useEffect(() => {
    const handleNavigate = (e: any) => {
      const target = e.detail?.module || e.detail;
      if (target) setActiveModule(target);
    };
    window.addEventListener('navigate_module', handleNavigate);
    window.addEventListener('sanatani:navigate' as any, handleNavigate);
    // M-10: legacy devotee portal dispatches 'NAVIGATE' — honor it too.
    window.addEventListener('NAVIGATE' as any, handleNavigate);
    return () => {
      window.removeEventListener('navigate_module', handleNavigate);
      window.removeEventListener('sanatani:navigate' as any, handleNavigate);
      window.removeEventListener('NAVIGATE' as any, handleNavigate);
    };
  }, []);
  // Phase 2 org spaces: broadcast the active desk so OrgSpaceShell can
  // render its breadcrumb. Read-only — desk navigation itself is untouched.
  React.useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('sanatani:org-desk', { detail: activeModule }));
    } catch {
      /* non-DOM environment */
    }
  }, [activeModule]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isQuickChandaOpen, setIsQuickChandaOpen] = useState<boolean>(false);
  const [isMySpaceOpen, setIsMySpaceOpen] = useState<boolean>(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  const [isSahayataOpen, setIsSahayataOpen] = useState<boolean>(false);

  // First-run Setup Wizard: shows exactly once per fresh (non-demo) workspace,
  // right after signup. PortalLogin sets `sb_setup_pending` on registration;
  // the wizard clears it and writes `sb_setup_done_<wsId>` on complete/skip.
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (
        shouldShowWizard({
          workspaceId: activeWorkspace?.id,
          currentRole: effectiveRole,
          storage: localStorage,
        })
      ) {
        // Let the dashboard paint first — the wizard is a welcome, not a wall.
        timer = setTimeout(() => setShowSetupWizard(true), 900);
      }
    } catch {
      /* storage unavailable — no wizard */
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeWorkspace?.id, effectiveRole]);
  const { openGuide } = useQuickGuide();

  // App Growth (Phase 5) — deferred deep linking: a /get-app?c= campaign may
  // carry a `deepLink` (e.g. '/festival/dhakeshwari/diwali-2026'). The boot
  // path (main.tsx) validates the campaign and stashes the target in
  // sessionStorage; we consume it here once the first-run wizard is out of
  // the way (returning users with no wizard route immediately). One-shot,
  // fail-open, and never overrides an explicit in-app navigation.
  React.useEffect(() => {
    if (showSetupWizard) return;
    let target: string | null = null;
    try {
      target = sessionStorage.getItem('sb_appgrowth_deeplink');
      sessionStorage.removeItem('sb_appgrowth_deeplink');
    } catch {
      /* storage unavailable — no deep link */
    }
    if (
      target &&
      /^\/[a-zA-Z0-9/_.\-]{1,120}$/.test(target) &&
      window.location.pathname !== target
    ) {
      window.location.href = target;
    }
  }, [showSetupWizard]);

  /**
   * Demo → registration handoff. Stashes the demo workspace id so the
   * pending-conversion effect can migrate the user's records after signup,
   * then drops the demo session and routes to the signup screen.
   * P1-2: NEVER signs out an already-authenticated user — the DemoBanner
   * hides this CTA when signed in, but this guard is defense-in-depth.
   */
  const handleRegister = React.useCallback(() => {
    // P1-2: If already authenticated, do not destroy the session. The user
    // is just exploring the demo — exit it and return to their real app.
    if (isAuthenticated) {
      showToast('You are already signed in — exiting the demo sandbox.', 'info');
      if (typeof exitDemo === 'function') exitDemo();
      window.location.href = '/app';
      return;
    }
    const demoId = activeWorkspace?.id;
    if (demoId && demoId.startsWith('DEMO_')) {
      try {
        localStorage.setItem('sb_pending_demo_conversion', demoId);
      } catch {
        /* storage unavailable — conversion simply won't run */
      }
    }
    closeDemoUpsell();
    logout();
    window.dispatchEvent(new CustomEvent('sanatani:show-signup'));
  }, [activeWorkspace?.id, closeDemoUpsell, logout, isAuthenticated, exitDemo, showToast]);

  const demoStats = getDemoStats();

  if (viewMode === 'MEMBER') {
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-4" />
        </div>
      }>
        <MemberAppShell />
      </Suspense>
    );
  }

  const renderActiveDesk = () => {
    // QUEUED #55 fail-safe: while this org's role is still resolving,
    // render a neutral hold — NEVER the Devotee view off the unresolved
    // global fallback (the audited flash), and never staff desks off a
    // fallback either. The org shell's chrome stays; the desk area
    // simply waits the brief moment the membership edge needs.
    if (landingSurface === 'pending') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Opening {activeWorkspace?.name || 'your organisation'}…</p>
        </div>
      );
    }
    // Strict Guard: Devotee cannot view any administrative desk (Domains 1-7),
    // EXCEPT poojaBooking — devotee self-booking (M-10). The desk renders its
    // devotee-friendly 'book' tab via its internal isDevotee path.
    if (effectiveRole === 'Devotee' || (effectiveRole as string) === 'DEVOTEE') {
      if (!['devotee-portal', 'personal-portal', 'devotee-account', 'poojaBooking', 'pooja-booking'].includes(activeModule)) {
        return <DevoteePortal previewMode onBackToERP={() => setActiveModule('dashboard')} />;
      }
      if (['poojaBooking', 'pooja-booking'].includes(activeModule)) {
        return <PoojaBookingDesk />;
      }
      return <DevoteeAccountPortal />;
    }

    // H-2: plan-tier enforcement at desk mount (defense in depth with the
    // Sidebar's nav-level lock badges). A LITE workspace cannot open an
    // ENTERPRISE desk via deep link, alias URL, or navigate_module event.
    // DEMO workspaces resolve to full access; the demo quota binds there.
    // Unmapped modules are permissive by design (never lock what we haven't mapped).
    if (!isModuleMountAllowed(activeModule, activeWorkspace?.planId)) {
      const canonical = resolvePlanModuleId(activeModule);
      const tier = requiredTierForModule(canonical) ?? 'STANDARD';
      return (
        <PlanLockedDesk
          moduleId={canonical}
          requiredTier={tier}
          onBack={() => setActiveModule('dashboard')}
        />
      );
    }

    // R-1: org-type relevance enforcement at desk mount (defense in depth
    // with the Sidebar's nav-level filtering). Direct navigation — deep link,
    // Cmd+K, navigate_module events, guide CTAs — cannot open a desk that is
    // not part of this organisation type's workspace (e.g. Sanatani Vivah
    // inside a Gurukul). Composes with the per-case checkPermission RBAC
    // gates below: org-type AND role must both pass. A Trustee can enable a
    // non-native module via the App Store, which unblocks both nav and this
    // guard (enabledModules opt-in).
    if (!isModuleAllowedForOrgMount(activeWorkspace, activeModule)) {
      return (
        <OrgTypeRestrictedDesk
          moduleId={activeModule}
          onBack={() => setActiveModule('dashboard')}
          onOpenAppStore={() => setActiveModule('appStore')}
        />
      );
    }

    switch (activeModule) {
      case 'devoteePortal':
      case 'devotee-super-app':
        return <DevoteePortal previewMode onBackToERP={() => setActiveModule('dashboard')} />;
      case 'devotee-portal':
      case 'personal-portal':
      case 'devotee-account':
        return <DevoteeAccountPortal />;
      case 'dashboard':
        return (
          <DashboardHome
            onNavigate={(mod) => setActiveModule(mod)}
            onOpenQuickPay={() => setIsQuickChandaOpen(true)}
          />
        );

      // Domain 1
      case 'devotees':
      case 'devotee-grid':
        // V10 RBAC: member directory — authenticated staff only (defense in depth).
        return checkPermission(['TRUSTEE', 'MANAGER', 'SEVADAR', 'VOLUNTEER', 'ACCOUNTANT', 'PUROHIT']) ? <DevoteeGrid /> : <RestrictedAccess />;
      case 'membership':
      case 'membership-desk':
      case 'org-membership':
        return checkPermission(['TRUSTEE', 'SuperAdmin']) ? <MembershipDesk /> : <RestrictedAccess />;
      case 'donorCare':
      case 'donor-care':
        return checkPermission(['TRUSTEE', 'MANAGER', 'ACCOUNTANT', 'SEVADAR']) ? <DonorCareDesk /> : <RestrictedAccess />;
      case 'checkin':
      case 'darshan-checkin':
      case 'gate-command':
        return checkPermission(['CSO', 'TRUSTEE', 'SEVADAR', 'VOLUNTEER']) ? <DarshanCheckInDesk /> : <RestrictedAccess />;
      case 'family':
      case 'household-census':
        return <FamilyHouseholdDesk />;
      case 'vanshavali':
      case 'vanshavali-tree':
        return <VanshavaliDesk />;
      case 'guests':
      case 'guest-pipeline':
        return <GuestManagerDesk />;
      case 'rakthaSeva':
      case 'blood-registry':
        return <RakthaSevaDesk />;
      case 'bulkImport':
      case 'universal-csv':
        return checkPermission(['MANAGER', 'TRUSTEE']) ? <BulkImportDesk /> : <RestrictedAccess />;
      case 'federation':
      case 'federation-multi-branch':
      case 'multi-branch':
      case 'branch-federation':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <FederationMultiBranchDesk /> : <RestrictedAccess />;
      case 'sevadar-roster':
      case '/sevadar-roster':
      case 'sevadarRoster':
      case 'sevadar-hr':
        // QUEUED #56 (A2-D4): CSO added — the CSO nav allowlist promises
        // the duty roster; the mount guard omitted the role entirely.
        return checkPermission(['TRUSTEE', 'MANAGER', 'SEVADAR', 'VOLUNTEER', 'CSO']) ? <SevadarRosterDesk /> : <RestrictedAccess />;

      // Domain 2
      case 'quick-chanda-pos':
      case 'quickChandaPos':
      case 'chanda-pos':
      case 'counter-pos':
        // V9 RBAC: cash-collection POS — finance roles + the Sevadar who
        // staffs the counter (QUEUED #56, A2-D4: nav promised it via the
        // fallback branch while the mount refused — widened to match).
        return checkPermission(['TRUSTEE', 'ACCOUNTANT', 'SEVADAR', 'SuperAdmin']) ? <QuickChandaPOS /> : <RestrictedAccess />;
      case 'treasury-audit':
      case 'treasuryAudit':
      case 'treasury':
      case 'treasury-ledger':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? (
          <TreasuryLedgerDesk
            onOpenQuickPay={() => setIsQuickChandaOpen(true)}
            onNavigate={(mod) => setActiveModule(mod)}
          />
        ) : (
          <RestrictedAccess />
        );
      case 'hundi':
      case 'hundi-audit':
      case 'hundi-counting':
      case 'golak':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <HundiCountingAuditDesk /> : <RestrictedAccess />;
      case 'cash-custody':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <CashCustodyDesk /> : <RestrictedAccess />;
      case 'ratna-bhandar':
      case 'ratnaBhandar':
      case 'sacred-assets':
      case 'bullion-vault':
      case 'toshakhana':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE', 'PUROHIT']) ? <RatnaBhandarAssetDesk /> : <RestrictedAccess />;
      case 'taxReceipts':
      case 'tax-receipt-80g':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <TaxReceiptDesk /> : <RestrictedAccess />;
      case 'tally-export':
      case 'tallyExport':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <TallyExportDesk /> : <RestrictedAccess />;
      case 'form10bd':
      case 'form-10bd':
      case 'form10bdCompliance':
      case 'form-10bd-compliance':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <Form10BDComplianceDesk /> : <RestrictedAccess />;
      case 'campaigns':
      case 'mandir-campaigns':
        // QUEUED #56 (A2-D4): ACCOUNTANT added — nav (accountantAllowed +
        // the Sidebar fallback check) already promised Campaigns to the
        // Accountant; the mount guard was the only layer refusing.
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <MandirCampaignsDesk /> : <RestrictedAccess />;
      case 'karmaLedger':
      case 'karma-ledger':
        return <KarmaLedgerDesk />;
      case 'assets':
      case 'asset-register':
        // QUEUED #56 (A2-D4): ACCOUNTANT added — same nav/mount split as
        // Campaigns; the asset register is the Accountant's own ledger.
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <AssetInventoryDesk /> : <RestrictedAccess />;
      case 'inventory':
      case 'store-inventory':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE', 'VOLUNTEER']) ? <InventoryDesk /> : <RestrictedAccess />;
      case 'bhoomi':
      case 'property-leases':
      case 'bhoomi-real-estate':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <BhoomiRealEstateDesk /> : <RestrictedAccess />;
      case 'vahan':
      case 'fleet':
      case 'vahan-fleet':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <VahanFleetDesk /> : <RestrictedAccess />;
      case 'recurring-seva':
      case 'recurringSeva':
      case 'seva-subscriptions':
        return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <RecurringSevaDesk /> : <RestrictedAccess />;

      // Domain 3
      case 'sanctum-hud':
      case 'sanctumHud':
      case 'purohitManagement':
      case 'purohit-management':
      case 'purohitDesk':
      case 'purohit-desk':
        return checkPermission(['PUROHIT', 'PRIEST', 'Priest', 'MANAGER', 'TRUSTEE']) ? <PurohitManagementDesk /> : <RestrictedAccess />;
      case 'poojaBooking':
      case 'pooja-booking':
        return checkPermission(['PUROHIT', 'PRIEST', 'Priest', 'MANAGER', 'TRUSTEE']) ? <PoojaBookingDesk /> : <RestrictedAccess />;
      case 'mandirPuja':
      case 'aarti-roster':
        return checkPermission(['PUROHIT', 'PRIEST', 'Priest', 'MANAGER', 'TRUSTEE']) ? <MandirPujaDesk /> : <RestrictedAccess />;
      case 'purohitPortal':
      case 'purohit-portal':
      case 'purohitUnified':
      case 'purohit-unified':
      case 'purohitMarket':
      case 'purohit-marketplace':
        return <PurohitPortalUnified />;
      case 'pitruShradh':
      case 'pitru-shradh':
        return checkPermission(['PUROHIT', 'MANAGER', 'TRUSTEE']) ? <PitruShradhDesk /> : <RestrictedAccess />;
      case 'panchang':
      case 'panchang-muhurat':
      case 'panchang-astrology-engine':
      case 'panchang-engine':
        return <PanchangAstrologyEngine />;
      case 'yatranet':
      case 'yatranet-gis':
      case 'yatra-gis':
      case 'crowd-control':
        return <YatraNetCommandCenter />;

      // Domain 4
      case 'goshala':
      case 'gau-seva-goshala':
        return <GauSevaDesk />;
      case 'annadanam':
      case 'annadanam-kitchen':
        return <AnnadanamKitchenDesk />;
      case 'dharamshala':
      case 'dharamshala-yatri-bhavan':
        return <DharamshalaDesk />;
      case 'utsav-one':
        return <UtsavDesk />;
      case 'nyas-one':
        return <NyasDesk />;
      case 'tirth-one':
        return <TirthDesk />;
      case 'yoga-one':
        return <YogaDesk />;
      case 'matha-one':
        return <MathaDesk />;
      case 'satsang-one':
        return <SatsangDesk />;
      case 'sabha-one':
        return <SabhaDesk />;
      case 'samskara-one':
        return <SamskaraDesk />;
      case 'annakshetra-one':
      case 'smartBhandar':
      case 'smart-bhandar':
      case 'bhandar':
      case 'bhandar-procurement':
      case 'smartBhandarProcurement':
        return <AnnakshetraDesk />;
      case 'ashramKutir':
      case 'ashram-kutir':
      case 'ashramGoshalaGurukul':
      case 'ashram-goshala-gurukul':
        return <AshramGoshalaGurukulDesk />;
      case 'gurukul':
      case 'gurukul-education':
      case 'gurukulAcademy':
      case 'vidyalaya':
      case 'satsang':
      case 'sanghaDrills':
      case 'sevaTrust':
        return <VedicSevaShikshaDesk />;
      case 'pathshala':
        return <PathshalaDesk />;
      case 'goshala-one':
        return <GoshalaDesk />;
      case 'ashram-one':
        return <AshramDesk />;
      case 'granthLibrary':
      case 'sanskrit-library':
      case 'shlokaFeed':
        return <SanskritLibraryDesk />;

      // Domain 5
      case 'sandeshBroadcast':
      case 'whatsapp-broadcaster':
      case 'whatsapp-broadcast': // alias dispatched by GlobalSOSListener SOS banner
        return checkPermission(['MANAGER', 'TRUSTEE']) ? <WhatsAppBroadcasterDesk /> : <RestrictedAccess />;
      case 'utsavPanjika':
      case 'events-utsav':
        return <VedicCalendarEventsDesk />;
      case 'dharmicAssistant':
      case 'dharmic-assistant':
      case 'dharmaMarketing':
        return (
          <DharmicQueryAssistant
            activeModule={activeModule}
            onNavigate={(mod) => setActiveModule(mod)}
          />
        );

      // Domain 7
      case 'sadhana-karma':
      case 'personal-sadhana':
        return <PersonalSadhanaDesk />;
      case 'sanatani-vivah':
      case 'matrimony':
        return <SanataniVivahDesk />;
      case 'familyRootsMatrimony':
      case 'family-roots-matrimony':
      case 'familyRoots':
      case 'family-roots':
        return <FamilyRootsMatrimonyDesk />;
      case 'yatraNet':
      case 'yatra-net':
        return <YatraNetDesk />;

      // Domain 6
      case 'tactical-radar':
      case 'tactical-perimeter-radar':
      case 'tacticalPerimeterRadar':
      case 'perimeter-radar':
        return checkPermission(['CSO', 'TRUSTEE', 'SuperAdmin']) ? <TacticalPerimeterRadar /> : <RestrictedAccess />;
      case 'workspace-hub':
        return checkPermission(['TRUSTEE']) ? <WorkspaceSelectorDesk /> : <RestrictedAccess />;
      case 'user-roles-rbac':
      case 'trusteeGovernance':
        return checkPermission(['TRUSTEE', 'MANAGER']) ? <UserRolesDesk /> : <RestrictedAccess />;
      case 'security-audit-log':
      case 'legalVault':
      case 'auditLog':
        return checkPermission(['TRUSTEE', 'MANAGER']) ? <AuditLogDesk /> : <RestrictedAccess />;
      case 'qrScanner':
        return checkPermission(['CSO', 'TRUSTEE', 'MANAGER', 'VOLUNTEER']) ? <QRScanner /> : <RestrictedAccess />;
      case 'appStore':
        return checkPermission(['TRUSTEE']) ? <AppStoreDesk /> : <RestrictedAccess />;
      case 'masterSettings':
        // NOTE (2026-10-20): 'socialWall' was removed from the desk catalog —
        // no component ever existed and its fall-through rendered Org
        // Settings under a "Temple Darshan Wall" label (a dead-end). SOS
        // "View in Command Center" now routes to 'crisis-command'.
        return checkPermission(['TRUSTEE']) ? <MasterSettingsDesk /> : <RestrictedAccess />;
      case 'panchayatPolls':
        return checkPermission(['TRUSTEE', 'MANAGER']) ? <PanchayatPollingDesk /> : <RestrictedAccess />;
      case 'crisis-command':
        // Tier 1 Crisis Command (crisis_events). Legacy CrisisCommandCenter
        // (yatra_broadcasts) remains in repo, unrouted.
        return <CrisisDashboard />;

      case 'spiritualSettings':
      case 'platformBroadcast':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Module Upgrading</h2>
            <p className="text-slate-500 max-w-md">
              This module is currently receiving an over-the-air update and will be available shortly.
            </p>
          </div>
        );

      default:
        return (
          <DashboardHome
            onNavigate={(mod) => setActiveModule(mod)}
            onOpenQuickPay={() => setIsQuickChandaOpen(true)}
          />
        );
    }
  };

  // Phase 2 org spaces: AppContent renders inside OrgSpaceShell (which owns
  // the h-screen column), so the root fills the shell instead of the
  // viewport. OrgSpaceShell is the ONLY renderer of AppContent.
  return (
    <div className="h-full w-full bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      {/* Universal Header (Hidden for Devotee / devotee preview — F-RBAC-1) */}
      {effectiveRole !== 'Devotee' && !isDevoteePreview && (
        <Header
          activeModule={activeModule}
          onNavigate={(mod) => setActiveModule(mod)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenQuickChanda={() => setIsQuickChandaOpen(true)}
          onOpenMySpace={() => setIsMySpaceOpen(true)}
          onOpenTelemetry={() => setIsTelemetryOpen(true)}
          onOpenAssistant={() => setIsAssistantOpen(true)}
          onOpenSahayata={() => setIsSahayataOpen(true)}
          onOpenGuide={() => openGuide(activeModule)}
        />
      )}

      {/* Demo Sandbox banner (replaces the old watermark) — hidden in the
          chromeless devotee preview (F-RBAC-1); it returns with the ERP. */}
      {!isDevoteePreview && <DemoBanner onRegister={handleRegister} />}

      {/* Guided demo tour: 5-step coachmark, once per demo session */}
      <DemoTour
        onNavigate={(mod) => setActiveModule(mod)}
        onRegister={handleRegister}
        onOpenQuickPay={() => setIsQuickChandaOpen(true)}
      />

      <div className="flex grow overflow-hidden">
        {/* Universal 46-Module Sidebar (Hidden for Devotee / devotee preview — F-RBAC-1) */}
        {effectiveRole !== 'Devotee' && !isDevoteePreview && (
          <Sidebar
            activeModule={activeModule}
            onSelectModule={(mod) => setActiveModule(mod)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}

        {/* Main Content Area — full-bleed in the devotee preview (F-RBAC-1:
            no desktop gutter waste around the phone-width pane). */}
        <main className={`grow flex flex-col gap-6 overflow-hidden ${hideErpChrome ? 'p-0 bg-stone-950' : 'p-6'}`}>
          {/* sb-sos-clear: systemic SOS FAB clearance (see index.css) — the
              desk scroller is an inner scroller, so the body rule can't
              reach it; this keeps the last row above the FAB hit area. */}
          <div className="flex flex-col grow overflow-y-auto custom-scrollbar sb-sos-clear">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading desk module...</p>
              </div>
            }>
              {/* Per-desk error isolation: a desk crash is contained here while
                  header/sidebar/navigation keep working. Keyed by desk id so
                  navigating mounts a fresh boundary. */}
              <DeskErrorBoundary
                key={activeModule}
                deskId={activeModule}
                onBackToDashboard={() => setActiveModule('dashboard')}
              >
                {renderActiveDesk()}
              </DeskErrorBoundary>
            </Suspense>
          </div>
        </main>
      </div>

      {effectiveRole !== 'Devotee' && !isDevoteePreview && (
        <Footer onOpenTelemetry={() => setIsTelemetryOpen(true)} />
      )}

      {/* Global Modals & Widgets */}
      {/* UX primitives: Cmd+K palette + promise-based confirm dialogs */}
      <CommandPalette onSelectModule={(mod) => setActiveModule(mod)} />
      <ConfirmProvider />

      {/* Demo Playground Conversion Engine: quota upsell modal */}
      <DemoUpsellModal
        module={demoUpsellModule ? demoUpsellModule.module : null}
        entityLabel={demoUpsellModule ? demoUpsellModule.entityLabel : 'records'}
        createdCount={
          demoUpsellModule ? demoStats.perModule[demoUpsellModule.module] ?? 5 : 0
        }
        onClose={closeDemoUpsell}
        onRegister={handleRegister}
      />

      {/* First-run Setup Wizard: one-time onboarding after signup. */}
      {showSetupWizard && activeWorkspace && (
        <SetupWizard
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          signupOrgType={activeWorkspace.type}
          planId={(activeWorkspace as { planId?: string }).planId}
          onComplete={() => setShowSetupWizard(false)}
          onOpenCompliance={() => {
            setShowSetupWizard(false);
            setActiveModule('masterSettings');
          }}
        />
      )}

      {/* V9 RBAC: Quick Chanda modal is a cash-collection surface — finance
          roles only. Guards every open path (DashboardHome, AppShell, tour). */}
      {checkPermission(['TRUSTEE', 'ACCOUNTANT']) && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40" aria-hidden="true">
            <span className="text-4xl animate-pulse">🪔</span>
          </div>
        }>
          <QuickChandaModal
            isOpen={isQuickChandaOpen}
            onClose={() => setIsQuickChandaOpen(false)}
          />
        </Suspense>
      )}

      <Suspense fallback={
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40" aria-hidden="true">
          <span className="text-4xl animate-pulse">🪔</span>
        </div>
      }>
        <MySpaceModal
          isOpen={isMySpaceOpen}
          onClose={() => setIsMySpaceOpen(false)}
          onNavigate={(mod) => {
            setActiveModule(mod);
            setIsMySpaceOpen(false);
          }}
        />
      </Suspense>

      <GlobalTelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
      />

      {/* Dharmic AI Sliding Intelligence Drawer */}
      <DharmicQueryAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        activeModule={activeModule}
        onNavigate={(mod) => {
          setActiveModule(mod);
          setIsAssistantOpen(false);
        }}
        isDrawer={true}
      />

      <TawkToWidget />

      {/* Shastric & Statutory Quick Guide & SOP Drawer */}
      <RBACQuickGuideDrawer />
    </div>
  );
};

const MainAppView: React.FC = () => {  const { isAuthenticated, addWorkspace, switchWorkspace, loginAsRole, firebaseUser } = useAuthWorkspace();
  const { seedDemoData } = useData();
  const [view, setView] = useState<'landing' | 'login' | 'signup'>('landing');

  // Demo conversion handoff: the in-app demo banner/modal dispatches this
  // after stashing `sb_pending_demo_conversion`, so the user lands on signup.
  React.useEffect(() => {
    const showSignup = () => setView('signup');
    window.addEventListener('sanatani:show-signup', showSignup);
    return () => window.removeEventListener('sanatani:show-signup', showSignup);
  }, []);

  if (window.location.pathname === '/mysecretlogin') {
    return <GodModeBackend isOpen={true} onClose={() => window.location.href = '/'} />;
  }

  React.useEffect(() => {
    // SECURITY: URL-based credential login (?action=autologin&id=&pin=) was
    // removed entirely. QR pairing is scan-only: the login screen scans a
    // one-time token and claims it from the `qrPairTokens` Firestore
    // collection (single-use delete). Any pairing token arriving via URL is
    // deliberately ignored here.
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'autologin' || params.get('action') === 'verify') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (isAuthenticated) {
    // Firebase Auth check bypassed to allow mock auth
    // if (!firebaseUser) { ... }
    // Purohit One: the router enforces session-kind isolation.
    return <AppContentRouter />;
  }

  // P1-1: Signed-out deep routes must redirect to /login, not render landing
  // content at the protected URL. Preserve the intended destination for
  // post-login return via ?next=.
  const publicPaths = ['/', '/login', '/signup', '/contact', '/mysecretlogin', '/get-app'];
  const currentPath = window.location.pathname;
  const isPublicPath = publicPaths.some((p) =>
    p === '/' ? currentPath === '/' : currentPath === p || currentPath.startsWith(p + '/')
  );
  // Allow /orgs and /org/:orgId as public (directory pages)
  // Allow /festival/:orgId/:eventId as public (shareable devotee event pages)
  const isOrgPublic = currentPath === '/orgs' || currentPath.startsWith('/org/');
  const isFestivalPublic = currentPath.startsWith('/festival/');
  if (!isPublicPath && !isOrgPublic && !isFestivalPublic && !currentPath.startsWith('/devotee')) {
    const next = encodeURIComponent(currentPath + window.location.search);
    window.location.href = `/login?next=${next}`;
    return null;
  }

  // (Setup-wizard trigger lives here; see shouldShowWizard below.)
  if (view === 'login' || view === 'signup') {
    return (
      <PortalLogin 
        initialMode={view} 
        onBack={() => setView('landing')} 
        onSuccess={() => {}} 
      />
    );
  }

  const handleStartDemo = (type: WorkspaceType) => {
    // Generate a temporary demo workspace ID
    const demoId = `DEMO_${type.toUpperCase()}_${Date.now()}`;
    const demoWorkspace: WorkspaceConfig = {
      id: demoId,
      name: `${type} Demo Sandbox`,
      type: type,
      tagline: 'Interactive Test Environment',
      address: 'Virtual Demo Environment',
      city: 'Kashi',
      state: 'Uttar Pradesh',
      country: 'Bharat (India)',
      currency: 'INR',
      currencySymbol: '₹',
      phone: '+91 99999 00000',
      email: `demo@${type.toLowerCase()}.org`,
      sampradaya: 'Demo Mode',
      kuladevata: 'Demo',
      pinRequired: false,
      // SECURITY: demo workspaces never carry a real admin PIN. Admin auth is
      // verified server-side via /api/auth/verify-pin; this field is inert.
      adminPin: '',
    };
    
    // Add to local state (ephemeral if not synced to firestore)
    addWorkspace(demoWorkspace);
    switchWorkspace(demoId);
    
    // Inject test user session
    loginAsRole('Trustee', 'Demo User');
    if (seedDemoData) {
      seedDemoData(demoId, type);
    }
    
    // Fire analytics
    if ((window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'start_trial',
        workspace_type: type
      });
    }
  };

  return (
    <LegacyLandingPage 
      onLoginClick={() => setView('login')} 
      onSignupClick={() => setView('signup')} 
      onDemoStart={handleStartDemo}
    />
  );
};

/**
 * PUROHIT ONE HARD GUARD. Routes between the mutually-exclusive session
 * kinds. A purohit-personal session renders ONLY the purohit workspace
 * shell — no org switcher, no workspace desks, no org data — and org
 * sessions can never reach purohit-personal routes. Single branch point.
 * Solo Sanatani extends the same guard: a solo-personal session renders
 * ONLY the solo workspace shell. Jyotish One adds the fourth kind.
 * Four mutually exclusive kinds by construction —
 * 'org' | 'purohit' | 'solo' | 'jyotish' — so no session can leak
 * into another.
 */
/**
 * Solo-first progressive flow: the "Register an Organisation" upgrade card
 * in the Solo dashboard links to /register-org. The user is already signed
 * in — PortalLogin reuses the live session for the existing workspace-
 * creation flow. Signed-out visitors are sent to /login first.
 */
const OrgRegisterRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthWorkspace();
  // Grace for slow Firebase session resolution — redirect only once the
  // auth state is known, so a signed-in user never flashes through /login.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0620] text-white/70 text-sm font-bold">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }
  return (
    <PortalLogin
      initialMode="signup"
      orgRegisterOnly
      onBack={() => { window.location.href = '/app'; }}
      onSuccess={() => { window.location.href = '/app'; }}
    />
  );
};

const AppContentRouter: React.FC = () => {
  const { sessionKind, firebaseUser } = useAuthWorkspace();
  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  if (sessionKind === 'purohit') {
    // SangamProvider: the "🪔 Seva Notice" desk tab composes service_cards
    // into the community feed via useSangam().
    return (
      <SangamProvider uid={uid}>
        <PurohitWorkspaceShell />
      </SangamProvider>
    );
  }
  if (sessionKind === 'solo') {
    return <SoloWorkspaceShell />;
  }
  if (sessionKind === 'jyotish') {
    return <JyotishWorkspaceShell />;
  }
  // Phase 2: org sessions render inside the org-space chrome (back button,
  // "Viewing as [Role]" pill, breadcrumb, per-org RBAC). Desk navigation
  // inside AppContent is untouched.
  return (
    <OrgSpaceShell>
      <AppContent />
    </OrgSpaceShell>
  );
};

const AppRoutes: React.FC = () => {
  return (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={
              <PortalLogin
                initialMode="login"
                onBack={() => {
                  window.location.href = '/';
                }}
                onSuccess={() => {
                  // P1-1: Return to the originally requested deep route, if any.
                  const params = new URLSearchParams(window.location.search);
                  const next = params.get('next');
                  window.location.href = next && next.startsWith('/') ? next : '/app';
                }}
              />
            }
          />
          <Route
            path="/signup"
            element={
              <PortalLogin
                initialMode="signup"
                onBack={() => {
                  window.location.href = '/';
                }}
                onSuccess={() => {
                  window.location.href = '/app';
                }}
              />
            }
          />
          <Route path="/contact" element={<ContactPage />} />
          {/* Secret Obfuscated Platform Route: Accessed via URL typing only, strictly guarded */}
          <Route
            path="/system-override"
            element={
              <SystemOverrideGuard>
                <SuperAdminDashboard />
              </SystemOverrideGuard>
            }
          />
          <Route
            element={
              <SystemOverrideGuard>
                <AdminLayout />
              </SystemOverrideGuard>
            }
            path="/admin"
          >
            <Route element={<SuperAdminDashboard />} index />
            <Route
              path="analytics"
              element={
                <Suspense
                  fallback={
                    <div className="flex min-h-screen items-center justify-center bg-[#2b1408] text-orange-50">
                      <span className="text-5xl animate-pulse" aria-hidden="true">🪔</span>
                    </div>
                  }
                >
                  <GlobalAnalytics />
                </Suspense>
              }
            />
            {/* Deprecated: old PurohitReviewQueue used unsafe direct client writes to
                purohitApplications. Verification now lives in the unified console. */}
            <Route element={<PurohitReviewsRedirect />} path="purohit-reviews" />
          </Route>
          <Route path="/devotee" element={<DevoteePortal />} />
          <Route path="/devotee-portal" element={<DevoteePortal />} />
          <Route path="/portal" element={<DevoteePortal />} />
          {/* Membership sprint: public organisation discovery + pages */}
          <Route path="/orgs" element={<OrgDirectory />} />
          {/* Pillar 3: canonical public org page — accepts orgId or publicSlug. */}
          <Route path="/org/:orgId" element={<OrgPublicPage />} />
          {/* Campus maps (Phase 1): per-org visitor map + trustee-only builder. */}
          <Route path="/org/:orgId/campus" element={<CampusPage />} />
          <Route path="/org/:orgId/campus/manage" element={<CampusManagePage />} />
          {/* Pillar 2 (festival war-room): shareable public festival event pages */}
          <Route path="/festival/:orgId/:eventId" element={<FestivalEventPage />} />
          {/* Sangam Shorts: deep-link to a specific short */}
          <Route path="/shorts/:shortId" element={<Suspense fallback={null}><ShortsRoute /></Suspense>} />
          {/* App Growth (Phase 5): QR smart link + download landing. The page
              owns its own lazy chunk; the below-fold sections lazy-load again
              inside it, so the hero paints in under 2s. */}
          <Route
            path="/get-app"
            element={
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center bg-[#2b1408] text-orange-50">
                    <span className="text-5xl" aria-hidden="true">🪔</span>
                  </div>
                }
              >
                <GetAppPage />
              </Suspense>
            }
          />
          {/* Seva Professional (Phase 1): unified public profile, keyed by Firebase Auth uid. */}
          <Route path="/seva/pro/:uid" element={<UnifiedProfessionalProfile />} />
          {/* Devotee public profile — the social layer's identity surface. */}
          <Route path="/u/:uid" element={<Suspense fallback={null}><DevoteeRoute /></Suspense>} />
          {/* Seva Professional: samskara journey planner (SevaCatalog). */}
          <Route path="/seva/journeys" element={<SevaCatalog />} />
          {/* Phase 2 dev preview: profile org hub with mock data.
              Dev-only, never renders in production builds. */}
          {import.meta.env.DEV && (
            <Route path="/dev-preview/profile-org-hub" element={<Suspense fallback={null}><ProfileOrgHubPreview /></Suspense>} />
          )}
          {import.meta.env.DEV && (
            <Route path="/dev-preview/join-org" element={<Suspense fallback={null}><JoinOrgScreenPreview /></Suspense>} />
          )}
          {import.meta.env.DEV && (
            <Route path="/dev-preview/festival" element={<Suspense fallback={null}><FestivalEventPreview /></Suspense>} />
          )}
          {import.meta.env.DEV && (
            <Route path="/dev-preview/chat" element={<Suspense fallback={null}><ChatPreview /></Suspense>} />
          )}
          {/* Solo-first progressive flow: an already-authenticated Solo user
              registers their organisation here (the "Grow with Sanatani
              Bandhan" upgrade card links here). Reuses PortalLogin's
              workspace-creation form with the live session — no re-login. */}
          <Route path="/register-org" element={<OrgRegisterRoute />} />
          <Route element={<MainAppView />} path="*" />
        </Routes>
  );
};

/**
 * P0 BUGFIX (2026-10-18): BrowserRouter must wrap ALL global UI, not just
 * <Routes>. AskButton renders AssistantSheet which calls useNavigate() —
 * mounted outside a <Router> that crashes the app on boot with
 * "useNavigate() may be used only in the context of a <Router> component".
 * Global components arrive as children and render inside the router.
 */
const AppRouter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    /* basename follows Vite's base so the app also works under a sub-path
       (e.g. GitHub Pages project sites served at /<repo>/). */
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
      <OfflineIndicator />
      {/* Dev-only role tester: never renders in production builds. */}
      {import.meta.env.DEV && <PersonaSwitcher />}
      {children}
    </BrowserRouter>
  );
};


export default function App() {
  return (
    <ErrorBoundary>
      <AppInitializer>
        <ToastProvider>
          <LanguageProvider>
            <AuthWorkspaceProvider>
              <NotificationProvider>
                <DataProvider>
                  <MembershipProvider>
                    <QuickGuideProvider>
                      {/* All global UI lives INSIDE AppRouter (inside the
                          BrowserRouter): AssistantSheet calls useNavigate()
                          and crashes outside a <Router>. */}
                      <AppRouter>
                        <GlobalSOSListener />
                        <SOSFlow />
                        {/* AI assistant (Phase 0) — devotee "🙏 Ask" FAB; solo sessions only. */}
                        <AskButton />
                        <NotificationWiring />
                        <InstallPrompt />
                        <UpdatePrompt />
                        {/* Regional Native Experience (Track 2): detect-once
                            warm welcome + gentle travel nudge. Mounted with
                            the other first-run UI; both no-op when the
                            devotee has already chosen. */}
                        <NativeWelcomeSheet />
                        <TravelNudge />
                      </AppRouter>
                    </QuickGuideProvider>
                  </MembershipProvider>
                </DataProvider>
              </NotificationProvider>
            </AuthWorkspaceProvider>
          </LanguageProvider>
        </ToastProvider>
      </AppInitializer>
    </ErrorBoundary>
  );
}
