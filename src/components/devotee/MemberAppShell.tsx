import React, { useState } from 'react';
import { 
  Home, UserCircle, Heart, Flame, Sparkles, BookOpen, 
  Shield, Building2, ArrowLeftRight, Bell, Radio, 
  QrCode, Globe2, Receipt, Compass, CheckCircle2, ChevronRight, LogOut, Download
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationPanel } from '../common/NotificationPanel';
import PersonalSadhanaDesk from '../domain5/PersonalSadhanaDesk';
import SanataniVivahDesk from '../domain4/SanataniVivahDesk';
import { PurohitMarketDesk } from '../domain3/PurohitMarketDesk';
import PurohitPortalUnified from '../domain3/PurohitPortalUnified';
import SanataniSocialFeed from './SanataniSocialFeed';
import { PersonalAccountDesk } from '../account/PersonalAccountDesk';
import DevoteeAccountPortal from '../domain5/DevoteeAccountPortal';
import YatraNetDesk from '../domain7/YatraNetDesk';
import { DevoteePortal } from './DevoteePortal';
import { calculatePanchang, getPanchangTodayLine } from '../../utils/panchang';

export default function MemberAppShell() {
  const { 
    activeWorkspace, 
    currentUser, 
    currentRole, 
    viewMode, 
    setViewMode, 
    currentDevotee,
    switchRole,
    logout 
  } = useAuthWorkspace();
  const { language, setLanguage, safeTranslate, t } = useLanguage();
  const { showToast } = useToast();
  const { unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState<'HOME' | 'SADHANA' | 'PUROHIT' | 'PORTAL' | 'YATRA_NET' | 'VIVAH' | 'PROFILE'>('HOME');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const panchang = calculatePanchang();

  React.useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'view_member_tab',
        member_tab: activeTab,
        workspace_id: activeWorkspace?.id
      });
    }
  }, [activeTab, activeWorkspace]);

  // Safe Switch Handler to safely transition back to Organisation View
  const handleSwitchToOrganisation = () => {
    setViewMode('MANAGER');
    showToast(t('devotee.shell.toastSwitchedBack').replace('{workspace}', activeWorkspace?.name || 'Organisation'), 'success', t('devotee.shell.toastModeChanged'));
  };

  const handleNavigateFromAccount = (deskId: string) => {
    if (deskId.includes('PUROHIT') || deskId.includes('pooja')) {
      setActiveTab('PUROHIT');
    } else if (deskId.includes('sadhana')) {
      setActiveTab('SADHANA');
    } else if (deskId.includes('vivah')) {
      setActiveTab('VIVAH');
    } else if (deskId.includes('yatra')) {
      setActiveTab('YATRA_NET');
    } else if (deskId.includes('receipt') || deskId.includes('card') || deskId.includes('donation')) {
      setActiveTab('PORTAL');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'HOME': 
        return <SanataniSocialFeed />;
      case 'PUROHIT': 
        return <div className="h-full overflow-y-auto custom-scrollbar"><PurohitPortalUnified /></div>;
      case 'SADHANA': 
        return <div className="h-full overflow-hidden"><PersonalSadhanaDesk /></div>;
      case 'PORTAL': 
        return <div className="h-full overflow-y-auto custom-scrollbar"><DevoteeAccountPortal initialTab="PASS" onNavigateDesk={handleNavigateFromAccount} /></div>;
      case 'YATRA_NET': 
        return <div className="h-full overflow-y-auto p-2 sm:p-4 custom-scrollbar"><YatraNetDesk /></div>;
      case 'VIVAH': 
        return <div className="h-full overflow-hidden"><SanataniVivahDesk /></div>;
      case 'PROFILE': 
        return <div className="h-full overflow-y-auto custom-scrollbar"><DevoteeAccountPortal initialTab="PASS" onNavigateDesk={handleNavigateFromAccount} /></div>;
      default: 
        return <SanataniSocialFeed />;
    }
  };

  const navItems = [
    { id: 'HOME', label: t('devotee.shell.navFeed'), icon: Home, badge: 'Live' },
    { id: 'SADHANA', label: t('devotee.shell.navSadhana'), icon: Flame, badge: 'Japa' },
    { id: 'PUROHIT', label: t('devotee.shell.navPurohit'), icon: BookOpen, badge: 'Vedic' },
    { id: 'PORTAL', label: t('devotee.shell.navPortal'), icon: Receipt, badge: 'Tax 80G' },
    { id: 'YATRA_NET', label: t('devotee.shell.navMesh'), icon: Radio, badge: 'P2P' },
    { id: 'VIVAH', label: t('devotee.shell.navVivah'), icon: Heart, badge: 'Gotra' },
    { id: 'PROFILE', label: t('devotee.shell.navProfile'), icon: UserCircle, badge: undefined },
  ];

  return (
    <div className="h-screen w-full bg-temple-50 flex flex-col font-sans overflow-hidden">
      {/* 🌟 UNIVERSAL SAFE SWITCH BANNER - Prominently visible on both mobile and desktop */}
      <aside 
        aria-label="Mode Indicator"
        className="bg-temple-950 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs shrink-0 border-b border-temple-800 z-30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-saffron-300 flex items-center gap-1.5 truncate">
            <UserCircle className="w-3.5 h-3.5 text-saffron-400 shrink-0" />
            <span className="truncate">{t('devotee.shell.devoteeAppPreview')}</span>
          </span>
          <span className="text-temple-400 hidden md:inline">•</span>
          <span className="text-temple-300 font-medium truncate hidden md:inline">
            {activeWorkspace?.name} ({activeWorkspace?.type})
          </span>
        </div>

        <button
          id="btn-safe-switch-org"
          onClick={handleSwitchToOrganisation}
          className="flex items-center gap-2 px-3.5 py-1 bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] rounded-lg shadow-sm transition-all border border-white/10 backdrop-blur-sm shrink-0 cursor-pointer"
          title={t('devotee.shell.returnToErp')}
        >
          <Building2 className="w-3.5 h-3.5 text-temple-950" />
          <span>{t('devotee.shell.institutionErp')}</span>
          <ArrowLeftRight className="w-3 h-3 text-temple-950" />
        </button>
      </aside>

      {/* Main Devotee App Layout: Left Sidebar for Desktop + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 💻 DESKTOP DEDICATED DEVOTEE SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-temple-200 shrink-0 shadow-sm z-20 overflow-y-auto custom-scrollbar">
          {/* Devotee Profile Header Card */}
          <div className="p-4 border-b border-temple-200 bg-temple-50/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-saffron-500 text-white font-semibold flex items-center justify-center text-lg shadow-sm border-2 border-white">
                  {currentUser?.name?.charAt(0) || 'D'}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-temple-900 truncate">{currentUser?.name || 'Acharya Devotee'}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-saffron-100 text-saffron-800 border border-saffron-200">
                    {currentDevotee?.sevaTier || t('devotee.shell.navProfile')}
                  </span>
                  <span className="text-[10px] font-semibold text-temple-500 truncate">
                    {currentDevotee?.gotra ? `Gotra: ${currentDevotee.gotra}` : 'Kashyapa'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Karma & Panchang Summary */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-temple-200/80 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-temple-400">{t('devotee.shell.karmaPoints')}</p>
                <p className="text-xs font-semibold text-saffron-600 flex items-center justify-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-saffron-500" />
                  {currentDevotee?.sevaIndex || 780} {t('devotee.shell.pts')}
                </p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-temple-200/80 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-temple-400">{t('devotee.shell.todaysTithi')}</p>
                <p className="text-[11px] font-bold text-temple-800 truncate mt-0.5" title={panchang ? getPanchangTodayLine(panchang) : ''}>
                  {panchang?.tithi ? panchang.tithi : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="p-3 flex-1 space-y-1">
            <span className="text-[10px] font-bold text-temple-400 uppercase tracking-widest px-3 block mb-2">
              {t('devotee.shell.personalDesks')}
            </span>
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  id={`devotee-nav-${item.id.toLowerCase()}`}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-saffron-50 text-saffron-700 shadow-sm border border-saffron-200 font-semibold'
                      : 'text-temple-600 hover:bg-temple-50 hover:text-temple-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-temple-950 stroke-[2.5]' : 'text-temple-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-temple-50 text-temple-900 border border-temple-300' : 'bg-white text-temple-600 border border-temple-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Safe Switch Card at Bottom of Sidebar */}
          <div className="p-3 border-t border-temple-200 bg-temple-50">
            <div className="bg-white p-3 rounded-xl border border-temple-200 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-saffron-600" />
                <span className="text-xs font-bold text-temple-800">{t('devotee.shell.institutionErp')}</span>
              </div>
              <p className="text-[11px] text-temple-500 leading-snug mb-2.5">
                {t('devotee.shell.previewDesc')}
              </p>
              <button
                onClick={handleSwitchToOrganisation}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-temple-900 hover:bg-black text-saffron-400 text-xs font-bold rounded-lg transition-all shadow-xs"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t('devotee.shell.returnToErp')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* 📱 MOBILE / DESKTOP CONTENT VIEWPORT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-temple-50">
          
          {/* Header Bar */}
          <header className="bg-white border-b border-temple-200 px-4 py-2.5 flex items-center justify-between shrink-0 z-20 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={activeWorkspace?.logoUrl || '/logo.png'} 
                alt={activeWorkspace?.name || 'Sanatani Bandhan'} 
                className="w-9 h-9 rounded-xl object-contain shadow-xs border border-temple-200 shrink-0 bg-white"
                onError={(e) => { e.currentTarget.src = '/icon-192x192.png'; }}
              />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-semibold text-temple-900 truncate">
                  {activeWorkspace?.name}
                </h1>
                <p className="text-[10px] font-bold text-temple-500 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <span>{activeWorkspace?.city || 'Varanasi'}</span>
                  <span>•</span>
                  <span className="text-saffron-700 font-semibold">{activeWorkspace?.type || 'TEMPLE'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Switch Button (Desktop & Mobile) */}
              <button
                onClick={handleSwitchToOrganisation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-temple-900 hover:bg-black text-saffron-400 rounded-xl text-xs font-semibold transition-all shadow-xs border border-temple-700"
                title={t('devotee.shell.returnToErp')}
              >
                <Building2 className="w-3.5 h-3.5 text-saffron-400" />
                <span className="hidden sm:inline">{t('devotee.shell.orgConsole')}</span>
                <span className="sm:hidden">{t('devotee.shell.org')}</span>
              </button>

              {/* Language Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="p-2 rounded-xl text-temple-600 hover:bg-temple-50 border border-temple-200 transition-colors"
                  title={t('devotee.shell.changeLanguage')}
                >
                  <Globe2 className="w-4 h-4 text-temple-700" />
                </button>
                {showLangDropdown && (
                  <div className="absolute right-0 mt-2 w-32 rounded-xl bg-white border border-temple-200 shadow-xl p-1.5 z-50">
                    {['en', 'hi', 'bn', 'sa'].map((lang, idx) => (
                      <button 
                        key={lang} 
                        onClick={() => { setLanguage(lang as any); setShowLangDropdown(false); }} 
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                          language === lang ? 'bg-saffron-100 text-saffron-900' : 'hover:bg-temple-50 text-temple-700'
                        }`}
                      >
                        {lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : lang === 'bn' ? 'বাংলা' : 'संस्कृतम्'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="p-2 rounded-xl text-temple-600 hover:bg-temple-50 border border-temple-200 transition-colors relative"
                  title={t('devotee.shell.notifications')}
                >
                  <Bell className="w-4 h-4 text-temple-700" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                <NotificationPanel 
                  isOpen={showNotifications} 
                  onClose={() => setShowNotifications(false)} 
                  theme="light" 
                />
              </div>

              {/* Avatar Click for Profile */}
              <button 
                className="w-8 h-8 rounded-full bg-saffron-500 text-white font-semibold flex items-center justify-center text-xs cursor-pointer shadow-xs hover:scale-105 active:scale-95 transition-all" 
                onClick={() => setActiveTab('PROFILE')}
                title={t('devotee.shell.openProfile')}
              >
                {currentUser?.name?.charAt(0) || 'D'}
              </button>
            </div>
          </header>

          {/* Tab Subheader for Desktop (horizontal fast switcher) */}
          <div className="hidden lg:flex items-center gap-2 px-6 py-2 bg-white border-b border-temple-200 overflow-x-auto scrollbar-hide">
            <span className="text-[11px] font-bold text-temple-400 uppercase tracking-widest mr-2 shrink-0">{t('devotee.shell.currentView')}</span>
            {navItems.map((item, idx) => (
              <button
                key={`${item.id}-${idx}`}
                onClick={() => setActiveTab(item.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  activeTab === item.id
                    ? 'bg-saffron-50 text-saffron-700 font-semibold shadow-sm border-b-2 border-saffron-500 rounded-b-none'
                    : 'text-temple-600 hover:bg-temple-50 hover:text-temple-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Main Body Viewport */}
          <main className="flex-1 overflow-hidden relative bg-temple-50">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* 📱 MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="lg:hidden bg-white border-t border-temple-200 shrink-0 z-30 shadow-sm">
        <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto overflow-x-auto scrollbar-hide">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={`${item.id}-${idx}`}
                onClick={() => setActiveTab(item.id as any)} 
                className={`flex flex-col items-center justify-center py-1 px-1.5 min-w-[48px] min-h-[44px] transition-all rounded-lg ${
                  isActive ? 'text-saffron-600 font-semibold' : 'text-temple-400 font-semibold hover:text-temple-600'
                }`}
              >
                <div className="relative">
                  <Icon size={20} className={isActive ? 'text-saffron-600 stroke-[2.5]' : 'text-temple-400'} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-saffron-500"></span>
                  )}
                </div>
                <span className="text-[9px] uppercase tracking-wider mt-0.5 truncate max-w-[54px]">
                  {item.id === 'HOME' ? t('devotee.shell.tabFeed') : item.id === 'SADHANA' ? t('devotee.shell.tabSadhana') : item.id === 'PUROHIT' ? t('devotee.shell.tabPurohit') : item.id === 'PORTAL' ? t('devotee.shell.tabPass') : item.id === 'YATRA_NET' ? t('devotee.shell.tabMesh') : item.id === 'VIVAH' ? t('devotee.shell.tabVivah') : t('devotee.shell.tabAccount')}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

