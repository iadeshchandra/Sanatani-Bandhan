import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthWorkspaceProvider } from './context/AuthWorkspaceContext';
import { DataProvider } from './context/DataContext';
import { GlobalSOSListener } from './components/common/GlobalSOSListener';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppInitializer } from './context/AppInitializer';
import { startDemoBackgroundService } from './lib/dbUtils';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { QuickChandaModal } from './components/common/QuickChandaModal';
import { MySpaceModal } from './components/common/MySpaceModal';
import { PurohitWorkspaceShell } from './components/purohit/PurohitWorkspaceShell';
import { PurohitReviewQueue } from './admin/PurohitReviewQueue';
import { MembershipProvider } from './context/MembershipContext';
import { useAuthWorkspace } from './context/AuthWorkspaceContext';
import { QuickGuideModal } from './components/common/QuickGuideModal';
import { RBACQuickGuideDrawer } from './components/common/RBACQuickGuideDrawer';
import { QuickGuideProvider, useQuickGuide } from './context/QuickGuideContext';
import { GlobalTelemetryModal } from './components/common/GlobalTelemetryModal';
import { PlanLockedDesk } from './components/common/PlanLockedDesk';
import { isModuleMountAllowed, requiredTierForModule, resolvePlanModuleId } from './lib/workspaceRegistry';
import { DharmicQueryAssistant } from './components/common/DharmicQueryAssistant';
import { TawkToWidget } from './components/common/TawkToWidget';
import { LandingPage as LegacyLandingPage } from './components/public/LandingPage';
import { LandingPage } from './pages/LandingPage';
import { ContactPage } from './pages/ContactPage';
import { DevoteePortal } from './pages/DevoteePortal';
import { SmartLoginRouter } from './components/public/SmartLoginRouter';
import { PortalLogin } from './components/public/PortalLogin';
import { isModuleAllowed } from './lib/workspaceRegistry';
import { useToast } from './context/ToastContext';
import { useData } from './context/DataContext';
import { WorkspaceType, WorkspaceConfig, UserRole } from './types';
import { AdminLayout } from './admin/AdminLayout';
import { SuperAdminDashboard } from './admin/SuperAdminDashboard';
import { GlobalAnalytics } from './admin/GlobalAnalytics';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SystemOverrideGuard } from './components/auth/SystemOverrideGuard';
import { CommandPalette } from './components/common/CommandPalette';
import { ConfirmProvider } from './components/common/ui';
import { DemoBanner } from './components/public/DemoBanner';
import { DemoTour } from './components/public/DemoTour';
import { BranchSwitcher } from './components/branch/BranchSwitcher';
import { DemoUpsellModal } from './components/public/DemoUpsellModal';
import { SetupWizard } from './components/onboarding/SetupWizard';
import { shouldShowWizard } from './components/onboarding/wizardDeskMap';

import { NotificationProvider } from './context/NotificationContext';
const QRScanner = lazy(() => import('./components/admin/QRScanner').then(m => ({ default: m.QRScanner })));

// Dashboard
const DashboardHome = lazy(() => import('./components/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));

// Domain 1: CRM & Lineage
const DevoteeGrid = lazy(() => import('./components/domain1/DevoteeGrid').then(m => ({ default: m.DevoteeGrid })));
const MembershipDesk = lazy(() => import('./components/org/MembershipDesk').then(m => ({ default: m.MembershipDesk })));
const OrgDirectory = lazy(() => import('./components/org/OrgDirectory').then(m => ({ default: m.OrgDirectory })));
const OrgPage = lazy(() => import('./components/org/OrgPage').then(m => ({ default: m.OrgPage })));
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

// Domain 4: Gau Seva & Community
const GauSevaDesk = lazy(() => import('./components/domain4/GauSevaDesk').then(m => ({ default: m.GauSevaDesk })));
const AnnadanamKitchenDesk = lazy(() => import('./components/domain4/AnnadanamKitchenDesk').then(m => ({ default: m.AnnadanamKitchenDesk })));
const VedicSevaShikshaDesk = lazy(() => import('./components/domain4/VedicSevaShikshaDesk').then(m => ({ default: m.VedicSevaShikshaDesk })));
const AshramGoshalaGurukulDesk = lazy(() => import('./components/domain4/AshramGoshalaGurukulDesk').then(m => ({ default: m.AshramGoshalaGurukulDesk })));
const SmartBhandarProcurementDesk = lazy(() => import('./components/domain4/SmartBhandarProcurementDesk').then(m => ({ default: m.SmartBhandarProcurementDesk })));

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
const GodModeBackend = lazy(() => import('./components/common/GodModeBackend').then(m => ({ default: m.GodModeBackend })));
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
  const { checkPermission, activeWorkspace, currentRole, viewMode, logout } = useAuthWorkspace();
  const { showToast } = useToast();
  const { demoUpsellModule, closeDemoUpsell, getDemoStats } = useData();
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  React.useEffect(() => {
    if (currentRole === 'Devotee' || (currentRole as string) === 'DEVOTEE') {
      const allowedDevoteeDesks = ['devoteePortal', 'devotee-super-app', 'devotee-portal', 'personal-portal', 'devotee-account'];
      if (!allowedDevoteeDesks.includes(activeModule)) {
        setActiveModule('devoteePortal');
      }
    }
  }, [currentRole, activeModule]);

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
          currentRole,
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
  }, [activeWorkspace?.id, currentRole]);
  const { openGuide } = useQuickGuide();

  /**
   * Demo → registration handoff. Stashes the demo workspace id so the
   * pending-conversion effect can migrate the user's records after signup,
   * then drops the demo session and routes to the signup screen.
   */
  const handleRegister = React.useCallback(() => {
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
  }, [activeWorkspace?.id, closeDemoUpsell, logout]);

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
    // Strict Guard: Devotee cannot view any administrative desk (Domains 1-7),
    // EXCEPT poojaBooking — devotee self-booking (M-10). The desk renders its
    // devotee-friendly 'book' tab via its internal isDevotee path.
    if (currentRole === 'Devotee' || (currentRole as string) === 'DEVOTEE') {
      if (!['devotee-portal', 'personal-portal', 'devotee-account', 'poojaBooking', 'pooja-booking'].includes(activeModule)) {
        return <DevoteePortal onBackToERP={() => setActiveModule('dashboard')} />;
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

    switch (activeModule) {
      case 'devoteePortal':
      case 'devotee-super-app':
        return <DevoteePortal onBackToERP={() => setActiveModule('dashboard')} />;
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
        return <DevoteeGrid />;
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
        return checkPermission(['TRUSTEE', 'MANAGER', 'SEVADAR', 'VOLUNTEER']) ? <SevadarRosterDesk /> : <RestrictedAccess />;

      // Domain 2
      case 'quick-chanda-pos':
      case 'quickChandaPos':
      case 'chanda-pos':
      case 'counter-pos':
        return <QuickChandaPOS />;
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
        return checkPermission(['MANAGER', 'TRUSTEE']) ? <MandirCampaignsDesk /> : <RestrictedAccess />;
      case 'karmaLedger':
      case 'karma-ledger':
        return <KarmaLedgerDesk />;
      case 'assets':
      case 'asset-register':
        return checkPermission(['MANAGER', 'TRUSTEE']) ? <AssetInventoryDesk /> : <RestrictedAccess />;
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
      case 'smartBhandar':
      case 'smart-bhandar':
      case 'bhandar':
      case 'bhandar-procurement':
      case 'smartBhandarProcurement':
        return <SmartBhandarProcurementDesk />;
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
      case 'granthLibrary':
      case 'sanskrit-library':
      case 'shlokaFeed':
        return <SanskritLibraryDesk />;

      // Domain 5
      case 'sandeshBroadcast':
      case 'whatsapp-broadcaster':
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
      case 'sevadarRoster':
        return checkPermission(['TRUSTEE', 'MANAGER']) ? <SevadarRosterDesk /> : <RestrictedAccess />;
      case 'qrScanner':
        return checkPermission(['CSO', 'TRUSTEE', 'MANAGER', 'VOLUNTEER']) ? <QRScanner /> : <RestrictedAccess />;
      case 'appStore':
        return checkPermission(['TRUSTEE']) ? <AppStoreDesk /> : <RestrictedAccess />;
      case 'masterSettings':
      case 'socialWall':
        return checkPermission(['TRUSTEE']) ? <MasterSettingsDesk /> : <RestrictedAccess />;
      case 'panchayatPolls':
        return checkPermission(['TRUSTEE', 'MANAGER']) ? <PanchayatPollingDesk /> : <RestrictedAccess />;
      case 'crisis-command':
        return checkPermission(['CSO', 'TRUSTEE', 'MANAGER']) ? <CrisisCommandCenter /> : <RestrictedAccess />;

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

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      {/* Universal Header (Hidden for Devotee) */}
      {currentRole !== 'Devotee' && (
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

      {/* Demo Sandbox banner (replaces the old watermark) */}
      <DemoBanner onRegister={handleRegister} />

      {/* Guided demo tour: 5-step coachmark, once per demo session */}
      <DemoTour
        onNavigate={(mod) => setActiveModule(mod)}
        onRegister={handleRegister}
        onOpenQuickPay={() => setIsQuickChandaOpen(true)}
      />

      <div className="flex grow overflow-hidden">
        {/* Universal 46-Module Sidebar (Hidden for Devotee) */}
        {currentRole !== 'Devotee' && (
          <Sidebar
            activeModule={activeModule}
            onSelectModule={(mod) => setActiveModule(mod)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}

        {/* Main Content Area */}
        <main className={`grow p-6 flex flex-col gap-6 overflow-hidden ${currentRole === 'Devotee' ? 'p-0 bg-stone-950' : ''}`}>
          <div className="flex flex-col grow overflow-y-auto custom-scrollbar">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading desk module...</p>
              </div>
            }>
              {renderActiveDesk()}
            </Suspense>
          </div>
        </main>
      </div>

      {currentRole !== 'Devotee' && (
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

      <QuickChandaModal
        isOpen={isQuickChandaOpen}
        onClose={() => setIsQuickChandaOpen(false)}
      />

      <MySpaceModal
        isOpen={isMySpaceOpen}
        onClose={() => setIsMySpaceOpen(false)}
        onNavigate={(mod) => {
          setActiveModule(mod);
          setIsMySpaceOpen(false);
        }}
      />

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


/**
 * QA harness for role-based home screens (?rolehome=test&role=Priest).
 * Logs in as the requested role inside a demo workspace, then renders the
 * real DashboardHome. Unlinked in UI; mirrors the ?wizard=test precedent.
 */
const RoleHomeTestHarness: React.FC = () => {
  const { loginAsRole, currentRole } = useAuthWorkspace();
  const roleParam =
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('role')) ||
    'Priest';
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    try {
      loginAsRole(roleParam as UserRole, 'QA Tester');
    } catch {
      /* harness-only */
    }
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ready || !currentRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm font-medium">
        Loading {roleParam} home…
      </div>
    );
  }
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm font-medium">
          Loading {roleParam} home…
        </div>
      }
    >
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
            QA harness · role={currentRole} · unlinked in UI
          </p>
          <DashboardHome onNavigate={() => {}} onOpenQuickPay={() => {}} />
        </div>
      </div>
    </React.Suspense>
  );
};

/**
 * QA harness for per-branch RBAC (?branchrbac=test). Builds a 3-branch
 * workspace, restricts the QA member (matched by the deterministic demo
 * email) to branches B+C, seeds one income record per branch, and renders
 * the real BranchSwitcher plus query-layer probes. Unlinked in UI.
 */
const BranchRBACTestHarness: React.FC = () => {
  const { addWorkspace, switchWorkspace, loginAsRole, currentRole } = useAuthWorkspace();
  const {
    addTreasuryTransaction,
    myBranchIds,
    isBranchAccessible,
    recordsForBranch,
    treasury,
    branches,
    activeBranchId,
    setActiveBranchId,
  } = useData();
  const { activeWorkspace: _aw } = useAuthWorkspace();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const wsId = 'DEMO_QA_BRANCHRBAC';
    try {
      addWorkspace({
        id: wsId,
        name: 'QA Branch Workspace',
        type: 'Mandir',
        tagline: 'QA',
        address: 'QA',
        city: 'Kashi',
        state: 'UP',
        country: 'Bharat',
        currency: 'INR',
        currencySymbol: '₹',
        sampradaya: 'QA',
        kuladevata: 'QA',
        pinRequired: false,
        adminPin: '',
        branches: [
          { id: 'br-a', name: 'Kashi Main', city: 'Varanasi', isMain: true },
          { id: 'br-b', name: 'Ayodhya Branch', city: 'Ayodhya' },
          { id: 'br-c', name: 'Mathura Branch', city: 'Mathura' },
        ],
        // loginAsRole('Trustee') sets persona email trustee@sanatanmandir.org.
        branchAccess: [
          { memberId: 'trustee@sanatanmandir.org', label: 'QA Member', branchIds: ['br-b', 'br-c'] },
        ],
      } as WorkspaceConfig);
      void switchWorkspace(wsId);
      loginAsRole('Trustee', 'QA Member');
    } catch {
      /* harness-only */
    }
    const t = setTimeout(() => {
      try {
        const base = {
          workspaceId: wsId,
          date: '2026-10-13',
          type: 'Income' as const,
          category: 'Donation',
          amount: 1000,
          handledBy: 'QA',
          paymentMode: 'Cash',
          purpose: 'QA seed',
          auditVerified: true,
        };
        addTreasuryTransaction({ ...base, id: 'qa-tx-a', devoteeName: 'Donor A', branchId: 'br-a' } as never);
        addTreasuryTransaction({ ...base, id: 'qa-tx-b', amount: 500, devoteeName: 'Donor B', branchId: 'br-b' } as never);
        addTreasuryTransaction({ ...base, id: 'qa-tx-c', amount: 250, devoteeName: 'Donor C', branchId: 'br-c' } as never);
      } catch {
        /* harness-only */
      }
      setReady(true);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm font-medium">
        Loading branch RBAC harness…
      </div>
    );
  }
  const visibleTotal = treasury.reduce((a, t) => a + (t.amount || 0), 0);
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          QA harness · branch RBAC · role={currentRole} · unlinked in UI
        </p>
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Branch switcher (real component)</p>
          <BranchSwitcher />
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 text-sm text-slate-300 font-mono">
          <p data-testid="probe-ws">activeWorkspace={_aw?.id} name={_aw?.name}</p>
          <p data-testid="probe-branchIds">myBranchIds={JSON.stringify(myBranchIds)}</p>
          <p data-testid="probe-branches">branches={branches.map((b) => b.id).join(',')}</p>
          <p data-testid="probe-active">activeBranchId={activeBranchId}</p>
          <p data-testid="probe-access-a">isBranchAccessible(br-a)={String(isBranchAccessible('br-a'))}</p>
          <p data-testid="probe-access-b">isBranchAccessible(br-b)={String(isBranchAccessible('br-b'))}</p>
          <p data-testid="probe-visible-count">visible treasury records={treasury.length}</p>
          <p data-testid="probe-visible-total">visible treasury total={visibleTotal}</p>
          <p data-testid="probe-rfb-a">recordsForBranch(br-a)={recordsForBranch(treasury, 'br-a').length}</p>
          <p data-testid="probe-rfb-b">recordsForBranch(br-b)={recordsForBranch(treasury, 'br-b').length}</p>
          <p data-testid="probe-rfb-all">recordsForBranch(ALL)={recordsForBranch(treasury, 'ALL').length}</p>
        </div>
        <button
          type="button"
          data-testid="probe-select-a"
          onClick={() => setActiveBranchId('br-a')}
          className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-bold"
        >
          Try select br-a (should be ignored)
        </button>
      </div>
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

  // Test harness for role-based home screens (QA only): visit any page with
  // ?rolehome=test&role=Priest to render that role's dashboard home without
  // Firebase. Never linked in UI. NOTE: placed BEFORE the isAuthenticated
  // gate — the harness logs in as the role, which would otherwise flip the
  // gate and unmount the harness on re-render.
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('rolehome') === 'test'
  ) {
    return <RoleHomeTestHarness />;
  }

  // Test harness for per-branch RBAC (QA only): ?branchrbac=test builds a
  // 3-branch workspace, restricts the QA member to branches B+C, seeds one
  // record per branch, and renders the real BranchSwitcher plus query probes.
  // Never linked in UI.
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('branchrbac') === 'test'
  ) {
    return <BranchRBACTestHarness />;
  }

  if (isAuthenticated) {
    // Firebase Auth check bypassed to allow mock auth
    // if (!firebaseUser) { ... }
    // Purohit One: the router enforces session-kind isolation.
    return <AppContentRouter />;
  }

  // Test harness for the first-run Setup Wizard (QA only): visit any page with
  // ?wizard=test to drive the wizard without Firebase. Never linked in UI.
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('wizard') === 'test'
  ) {
    return (
      <SetupWizard
        workspaceId="WS-TEST"
        workspaceName="Test Mandir"
        signupOrgType="Mandir"
        planId="LITE"
        onComplete={() => {
          window.location.href = '/';
        }}
        onOpenCompliance={() => {}}
      />
    );
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
 * PUROHIT ONE HARD GUARD. Routes between the two mutually-exclusive session
 * kinds. A purohit-personal session renders ONLY the purohit workspace
 * shell — no org switcher, no workspace desks, no org data — and org
 * sessions can never reach purohit-personal routes. Single branch point.
 */
const AppContentRouter: React.FC = () => {
  const { sessionKind } = useAuthWorkspace();
  if (sessionKind === 'purohit') {
    return <PurohitWorkspaceShell />;
  }
  return <AppContent />;
};

const AppRouter: React.FC = () => {
  return (
    <LanguageProvider>
      {/* basename follows Vite's base so the app also works under a sub-path
          (e.g. GitHub Pages project sites served at /<repo>/). */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<SmartLoginRouter />} />
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
            <Route element={<GlobalAnalytics />} path="analytics" />
            <Route element={<PurohitReviewQueue />} path="purohit-reviews" />
          </Route>
          <Route path="/devotee" element={<DevoteePortal onBackToERP={() => { window.location.href = '/'; }} />} />
          <Route path="/devotee-portal" element={<DevoteePortal onBackToERP={() => { window.location.href = '/'; }} />} />
          <Route path="/portal" element={<DevoteePortal onBackToERP={() => { window.location.href = '/'; }} />} />
          {/* Membership sprint: public organisation discovery + pages */}
          <Route path="/orgs" element={<OrgDirectory />} />
          <Route path="/org/:orgId" element={<OrgPage />} />
          <Route element={<MainAppView />} path="*" />
        </Routes>
        <OfflineIndicator />
        {/* Dev-only role tester: never renders in production builds. */}
        {import.meta.env.DEV && <PersonaSwitcher />}
      </BrowserRouter>
    </LanguageProvider>
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
                      <AppRouter />
                      <GlobalSOSListener />
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
