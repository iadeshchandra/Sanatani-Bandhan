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
import { QuickGuideModal } from './components/common/QuickGuideModal';
import { RBACQuickGuideDrawer } from './components/common/RBACQuickGuideDrawer';
import { QuickGuideProvider, useQuickGuide } from './context/QuickGuideContext';
import { GlobalTelemetryModal } from './components/common/GlobalTelemetryModal';
import { DharmicQueryAssistant } from './components/common/DharmicQueryAssistant';
import { TawkToWidget } from './components/common/TawkToWidget';
import { LandingPage as LegacyLandingPage } from './components/public/LandingPage';
import { LandingPage } from './pages/LandingPage';
import { DevoteePortal } from './pages/DevoteePortal';
import { SmartLoginRouter } from './components/public/SmartLoginRouter';
import { PortalLogin } from './components/public/PortalLogin';
import { useAuthWorkspace } from './context/AuthWorkspaceContext';
import { isModuleAllowed } from './lib/workspaceRegistry';
import { useToast } from './context/ToastContext';
import { useData } from './context/DataContext';
import { WorkspaceType, WorkspaceConfig } from './types';
import { AdminLayout } from './admin/AdminLayout';
import { SuperAdminDashboard } from './admin/SuperAdminDashboard';
import { GlobalAnalytics } from './admin/GlobalAnalytics';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SystemOverrideGuard } from './components/auth/SystemOverrideGuard';
import { CommandPalette } from './components/common/CommandPalette';
import { ConfirmProvider } from './components/common/ui';

import { NotificationProvider } from './context/NotificationContext';
const QRScanner = lazy(() => import('./components/admin/QRScanner').then(m => ({ default: m.QRScanner })));

// Dashboard
const DashboardHome = lazy(() => import('./components/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));

// Domain 1: CRM & Lineage
const DevoteeGrid = lazy(() => import('./components/domain1/DevoteeGrid').then(m => ({ default: m.DevoteeGrid })));
const DarshanCheckInDesk = lazy(() => import('./components/domain1/DarshanCheckInDesk').then(m => ({ default: m.DarshanCheckInDesk })));
const FamilyHouseholdDesk = lazy(() => import('./components/domain1/FamilyHouseholdDesk').then(m => ({ default: m.FamilyHouseholdDesk })));
const VanshavaliDesk = lazy(() => import('./components/domain1/VanshavaliDesk').then(m => ({ default: m.VanshavaliDesk })));
const GuestManagerDesk = lazy(() => import('./components/domain1/GuestManagerDesk').then(m => ({ default: m.GuestManagerDesk })));
const BulkImportDesk = lazy(() => import('./components/domain1/BulkImportDesk').then(m => ({ default: m.BulkImportDesk })));
const RakthaSevaDesk = lazy(() => import('./components/domain1/RakthaSevaDesk').then(m => ({ default: m.RakthaSevaDesk })));
const FederationMultiBranchDesk = lazy(() => import('./components/domain1/FederationMultiBranchDesk').then(m => ({ default: m.FederationMultiBranchDesk })));
const SevadarRosterDesk = lazy(() => import('./components/domain1/SevadarRosterDesk').then(m => ({ default: m.SevadarRosterDesk })));

// Domain 2: Financials & Assets
const TreasuryLedgerDesk = lazy(() => import('./components/domain2/TreasuryLedgerDesk').then(m => ({ default: m.TreasuryLedgerDesk })));
const TaxReceiptDesk = lazy(() => import('./components/domain2/TaxReceiptDesk').then(m => ({ default: m.TaxReceiptDesk })));
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
  const { checkPermission, activeWorkspace, currentRole, viewMode } = useAuthWorkspace();
  const { showToast } = useToast();
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
    return () => {
      window.removeEventListener('navigate_module', handleNavigate);
      window.removeEventListener('sanatani:navigate' as any, handleNavigate);
    };
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isQuickChandaOpen, setIsQuickChandaOpen] = useState<boolean>(false);
  const [isMySpaceOpen, setIsMySpaceOpen] = useState<boolean>(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  const [isSahayataOpen, setIsSahayataOpen] = useState<boolean>(false);
  const { openGuide } = useQuickGuide();

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
    // Strict Guard: Devotee cannot view any administrative desk (Domains 1-7)
    if (currentRole === 'Devotee' || (currentRole as string) === 'DEVOTEE') {
      if (!['devotee-portal', 'personal-portal', 'devotee-account'].includes(activeModule)) {
        return <DevoteePortal onBackToERP={() => setActiveModule('dashboard')} />;
      }
      return <DevoteeAccountPortal />;
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

      {/* Demo Sandbox Watermark */}
      {activeWorkspace?.id?.startsWith('DEMO_') && (
        <div className="fixed bottom-4 left-4 z-[9998] bg-amber-500 text-stone-900 px-3 py-1.5 rounded-lg shadow-lg font-bold text-xs flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-stone-900"></span>
          TESTING MODE (EPHEMERAL DATA)
        </div>
      )}
    </div>
  );
};


const MainAppView: React.FC = () => {
  const { isAuthenticated, addWorkspace, switchWorkspace, loginAsRole, firebaseUser } = useAuthWorkspace();
  const { seedDemoData } = useData();
  const [view, setView] = useState<'landing' | 'login' | 'signup'>('landing');

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
    return <AppContent />;
  }

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

const AppRouter: React.FC = () => {
  return (
    <LanguageProvider>
      {/* basename follows Vite's base so the app also works under a sub-path
          (e.g. GitHub Pages project sites served at /<repo>/). */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<SmartLoginRouter />} />
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
          </Route>
          <Route path="/devotee" element={<DevoteePortal onBackToERP={() => { window.location.href = '/'; }} />} />
          <Route path="/devotee-portal" element={<DevoteePortal onBackToERP={() => { window.location.href = '/'; }} />} />
          <Route path="/portal" element={<DevoteePortal onBackToERP={() => { window.location.href = '/'; }} />} />
          <Route element={<MainAppView />} path="*" />
        </Routes>
        <OfflineIndicator />
        <PersonaSwitcher />
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
                  <QuickGuideProvider>
                    <AppRouter />
                    <GlobalSOSListener />
                  </QuickGuideProvider>
                </DataProvider>
              </NotificationProvider>
            </AuthWorkspaceProvider>
          </LanguageProvider>
        </ToastProvider>
      </AppInitializer>
    </ErrorBoundary>
  );
}
