import React, { useState } from 'react';
import {
  Users,
  Landmark,
  Flame,
  Heart,
  Sparkles,
  Calendar,
  ArrowUpRight,
  Cake,
  CalendarDays,
  Receipt,
  FileSpreadsheet,
  QrCode,
  Volume2,
  ChevronRight,
  TrendingUp,
  Clock,
  Coins,
  ShieldCheck,
  Globe,
  Compass,
  Layers,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { useData } from '../../context/DataContext';
import { calculatePanchang } from '../../utils/panchang';
import { trackViewItem, trackShare } from '../../utils/gtm';
import { useToast } from '../../context/ToastContext';
import { MODULE_CATALOG } from '../common/Sidebar';
import { isModuleAllowed } from '../../lib/workspaceRegistry';

interface DashboardHomeProps {
  onSelectModule?: (id: string) => void;
  onNavigate?: (id: string) => void;
  onOpenQuickPay: () => void;
  onOpenMySpace?: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onSelectModule,
  onNavigate,
  onOpenQuickPay,
  onOpenMySpace,
}) => {
  const handleNav = (mod: string) => {
    if (onNavigate) onNavigate(mod);
    else if (onSelectModule) onSelectModule(mod);
  };
  const { activeWorkspace, currentRole, checkPermission, currentDevotee } = useAuthWorkspace();
  const { language, t } = useLanguage();
  const { devotees, treasury, poojaBookings, cows, shlokas } = useData();
  const { showToast } = useToast();

  const [currentShlokaIndex, setCurrentShlokaIndex] = useState(() => {
    // Mathematically seed using the day of the year so all users see the same daily shloka
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % Math.max(shlokas.length, 1);
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const taxonomy = useWorkspaceTaxonomy();
  const panchang = calculatePanchang();

  // Upcoming Birthdays Logic
  const today = new Date();
  const upcomingBirthdays = devotees.filter(d => {
    if (!d.birthDate) return false;
    const bDate = new Date(d.birthDate);
    // Set to current year to compare
    bDate.setFullYear(today.getFullYear());
    // If it already passed this year, check next year
    if (bDate < today && (today.getTime() - bDate.getTime()) > 24 * 60 * 60 * 1000) {
      bDate.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = Math.abs(bDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 14; // within next 14 days
  }).sort((a, b) => {
    const dateA = new Date(a.birthDate!);
    dateA.setFullYear(today.getFullYear());
    if (dateA < today) dateA.setFullYear(today.getFullYear() + 1);
    
    const dateB = new Date(b.birthDate!);
    dateB.setFullYear(today.getFullYear());
    if (dateB < today) dateB.setFullYear(today.getFullYear() + 1);
    
    return dateA.getTime() - dateB.getTime();
  });


  // Metrics
  const totalIncome = treasury
    .filter((tx) => tx.type === 'Income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = treasury
    .filter((tx) => tx.type === 'Expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const currentShloka = shlokas[currentShlokaIndex % shlokas.length] || shlokas[0];

  const getShlokaMeaning = () => {
    if (language === 'hi') return currentShloka.hindiMeaning;
    if (language === 'bn') return currentShloka.bengaliMeaning;
    return currentShloka.englishMeaning;
  };

  const handleNextShloka = () => {
    setCurrentShlokaIndex((prev) => (prev + 1) % shlokas.length);
  };

  const handlePlayShlokaAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentShloka.sanskrit);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      showToast('Reciting sacred Sanskrit Shloka...', 'info');
    } else {
      showToast('Audio recitation not supported on this browser', 'warning');
    }
  };

  const handleShareShloka = () => {
    const textToShare = `📜 Vedic Wisdom from ${activeWorkspace.name}:\n\n${currentShloka.sanskrit}\n\n"${getShlokaMeaning()}"\n\n— ${currentShloka.source}\nShared via Sanatani Bandhan`;
    navigator.clipboard.writeText(textToShare);
    trackShare({
      contentType: 'shloka_wisdom',
      itemId: currentShloka.id,
      method: 'Copy_Link',
      workspaceId: activeWorkspace.id,
    });
    showToast('Shloka with commentary copied to clipboard!', 'success');
  };

  const featuredModules = React.useMemo(() => {
    const available = MODULE_CATALOG.filter(m => {
      if (['dashboard', 'devotees', 'treasury', 'poojaBooking', 'goshala', 'appStore', 'masterSettings', 'spiritualSettings'].includes(m.id)) return false;
      if (!isModuleAllowed(activeWorkspace, m.id)) return false;
      
      let hasRole = true;
      if (['bulkImport', 'campaigns', 'assets', 'sandeshBroadcast'].includes(m.id)) hasRole = checkPermission(['MANAGER', 'TRUSTEE']);
      else if (['inventory'].includes(m.id)) hasRole = checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE', 'VOLUNTEER']);
      else if (['mandirPuja', 'purohitDesk', 'purohitMarket', 'pitruShradh'].includes(m.id)) hasRole = checkPermission(['PUROHIT', 'MANAGER', 'TRUSTEE']);
      else if (['taxReceipts'].includes(m.id)) hasRole = checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']);
      else if (['trusteeGovernance', 'sevadarRoster', 'crisis-command', 'socialWall'].includes(m.id)) hasRole = checkPermission(['TRUSTEE', 'MANAGER']);
      
      return hasRole;
    });

    // Shuffle array using Fisher-Yates
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    
    return available.slice(0, 6);
  }, [activeWorkspace, checkPermission]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 flex flex-col">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm shrink-0 relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {taxonomy.workspaceLabel} • {activeWorkspace.sampradaya || 'Sanatan Vaidika Tradition'}
              </span>
            </div>
            <h2 className="text-2xl font-serif font-semibold text-slate-800 tracking-tight">
              {activeWorkspace.name}
            </h2>
          </div>
          
          {/* Reputation Scores */}
          <div className="flex gap-4 items-center">
            <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Org Resilience Score</p>
                <p className="text-sm font-black text-slate-900">850 <span className="text-slate-400 font-medium text-xs">/1000</span></p>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Your Seva Karma</p>
                <p className="text-sm font-black text-slate-900">{currentDevotee?.sevaIndex?.toLocaleString() || 1245} <span className="text-slate-400 font-medium text-xs">pts</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Panjika Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex flex-col sm:items-end relative z-10">
          <p className="font-bold text-slate-700">
            {panchang.tithi} • <span className="text-slate-500 font-medium">{panchang.paksha}</span>
          </p>
          <p className="text-slate-500 mt-0.5">
            {panchang.nakshatra} • Masa: {panchang.monthLunar}
          </p>
          <p className="text-slate-400 mt-1 font-mono text-[10px] uppercase tracking-wide">
            Abhijit: {panchang.abhijitMuhurat}
          </p>
        </div>
      </div>

      {/* 4 Key Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* Metric 1 - Devotee Directory */}
        {checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'VOLUNTEER', 'SUPER_ADMIN']) && (
          <div
            onClick={() => handleNav('devotee-grid')}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors group"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{taxonomy.directoryName}</span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900">{devotees.length}</span>
              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">KYC 100%</span>
            </div>
          </div>
        )}

        {/* Metric 2 - Net Treasury Fund */}
        {checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'SUPER_ADMIN']) && (
          <div
            onClick={() => handleNav('treasury-ledger')}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors group"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Treasury Fund</span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {activeWorkspace.currencySymbol} {netBalance.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Synced</span>
            </div>
          </div>
        )}

        {/* Metric 3 - Reserved Sankalps */}
        {checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'PUROHIT', 'SUPER_ADMIN']) && (
          <div
            onClick={() => handleNav('pooja-booking')}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-rose-300 transition-colors group"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reserved Sankalps</span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900">{poojaBookings.length}</span>
              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Active</span>
            </div>
          </div>
        )}

        {/* Metric 4 - Gau Seva Units */}
        {checkPermission(['TRUSTEE', 'MANAGER', 'VOLUNTEER', 'SUPER_ADMIN']) && (
          <div
            onClick={() => handleNav('gau-seva-goshala')}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-saffron-300 transition-colors group"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gau Seva Units</span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900">{cows.length}</span>
              <span className="text-[10px] text-saffron-600 font-bold bg-saffron-50 px-1.5 py-0.5 rounded">Gomata</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 flex flex-col gap-6">
          {/* Daily Rotating Shloka Engine */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-saffron-500" />
                Daily Vedic Wisdom
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayShlokaAudio}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-saffron-500/20 text-saffron-500 animate-pulse'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Listen</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextShloka}
                  className="px-3 py-1.5 rounded-lg bg-saffron-500/10 hover:bg-saffron-500/20 text-saffron-500 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="hidden sm:inline">Next Shloka</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-3">
              <p className="font-serif text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed whitespace-pre-line text-center sm:text-left">
                {currentShloka.sanskrit}
              </p>

              <p className="text-[11px] font-mono text-slate-500 italic text-center sm:text-left">
                {currentShloka.transliteration}
              </p>

              <div className="pt-3 mt-1 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-indigo-600 uppercase tracking-wider mr-2">
                  Meaning:
                </span>
                {getShlokaMeaning()}
              </div>
            </div>
          </div>

          {/* Discover Workspace Features */}
          {featuredModules.length > 0 && (
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    Discover Workspace Features
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">Explore powerful modules available in your ERP</p>
                </div>
                {checkPermission(['TRUSTEE']) && (
                  <button
                    onClick={() => handleNav('appStore')}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-100/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3 h-3" />
                    App Store
                  </button>
                )}
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {featuredModules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleNav(mod.id)}
                      className="group p-4 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer flex gap-3 items-start"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform group-hover:border-indigo-300 group-hover:text-indigo-600 text-slate-500">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-900 truncate mb-1">
                          {t(mod.id) !== mod.id ? t(mod.id) : mod.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-slate-500 truncate">
                            {mod.domainTitle}
                          </span>
                          {mod.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 shrink-0">
                              {mod.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right 1 Col */}
        <section className="flex flex-col gap-6">
          {/* Quick Command Hub */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide mb-1">Dharmic Action Hub</h3>
            <p className="text-[10px] text-slate-500 mb-4">Fast workflows & pass generation</p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onOpenQuickPay}
                className="w-full p-2.5 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-[11px] flex items-center justify-between transition-colors shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  <span>Log Chanda / Dakshina</span>
                </div>
                <ChevronRight className="w-3 h-3" />
              </button>

              {onOpenMySpace && (
                <button
                  type="button"
                  onClick={onOpenMySpace}
                  className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-between border border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-500" />
                    <span>My {taxonomy.memberNoun} Smart Card</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {checkPermission(['SUPER_ADMIN', 'MANAGER', 'TRUSTEE']) && (
                <button
                  type="button"
                  id="dashboard-dharmic-ai-btn"
                  onClick={() => handleNav('dharmic-assistant')}
                  className="w-full p-2.5 rounded-lg bg-gradient-to-r from-saffron-500/10 to-saffron-500/10 hover:from-saffron-500/20 hover:to-saffron-500/20 text-saffron-900 font-semibold text-[11px] flex items-center justify-between border border-saffron-500/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-saffron-700 text-sm">ॐ</span>
                    <span>Dharmic AI Assistant (Gemini 3.7)</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-saffron-600 group-hover:scale-110 transition-transform" />
                </button>
              )}

              {checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'PUROHIT', 'SUPER_ADMIN']) && (
                <button
                  type="button"
                  onClick={() => handleNav('pooja-booking')}
                  className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-between border border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-500" />
                    <span>Reserve Sacred Sankalp</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'SUPER_ADMIN']) && (
                <button
                  type="button"
                  onClick={() => handleNav('universal-csv')}
                  className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-between border border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Bulk CSV {taxonomy.memberNoun} Ingestion</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {checkPermission(['TRUSTEE', 'MANAGER', 'SUPER_ADMIN']) && (
                <button
                  type="button"
                  onClick={() => handleNav('whatsapp-broadcaster')}
                  className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-between border border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>WhatsApp Sandesh Engine</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          
          {/* Recent Double-Entry Transactions */}
          {checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'SUPER_ADMIN']) && (
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide mb-1">
                    Recent Treasury
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Double-entry audit verified
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNav('treasury-ledger')}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 bg-indigo-50 px-2 py-1 rounded"
                >
                  <span>Full</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {treasury.slice(0, 5).map((tx, idx) => (
                  <div key={`${tx.id}-${idx}`} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          tx.type === 'Income'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}
                      >
                        {tx.type === 'Income' ? '+' : '-'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[11px] text-slate-800 truncate">{tx.category}</p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {tx.devoteeName || tx.purpose}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-black text-xs ${
                          tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'Income' ? '+' : '-'} ₹{(tx.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{tx.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
