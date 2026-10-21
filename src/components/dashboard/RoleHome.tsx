import React, { useMemo, useState } from 'react';
import {
  Users,
  Landmark,
  Flame,
  Heart,
  Sparkles,
  CalendarDays,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  QrCode,
  Volume2,
  ChevronRight,
  Coins,
  ShieldCheck,
  GitBranch,
  Clock,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  UserCheck,
  Bell,
  Wallet,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { useData } from '../../context/DataContext';
import { WindowedNotice } from '../common/WindowedNotice';
import { resolveHerdCount } from '../../lib/herdCount';
import { useToast } from '../../context/ToastContext';
import { CountUp } from '../common/ui/CountUp';
import { MODULE_CATALOG } from '../common/Sidebar';
import { isModuleAllowed, workspaceRegistry } from '../../lib/workspaceRegistry';
import { ROLE_MIGRATION_MAP, type UserRole } from '../../types';
import { getRecommendations, localizeText } from '../../suggestions/recommend';
import { getUpcomingFestival } from '../../suggestions/festivals';
import { getModuleCopy } from '../../suggestions/moduleCopy';
import { enableModule, isSuggestionDismissed, dismissSuggestion } from '../../suggestions/store';
import { UtsavReadinessCard, LunarClosingCard } from '../panjika/IntelligenceCards';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Local-timezone YYYY-MM-DD (matches the ISO date strings on records). */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeRole(role: UserRole | string | null | undefined): UserRole {
  if (!role) return 'Devotee';
  return (ROLE_MIGRATION_MAP[role] || role) as UserRole;
}

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  value?: React.ReactNode;
  badge?: string;
  badgeTone?: 'amber' | 'emerald' | 'rose' | 'indigo' | 'slate';
  onClick?: () => void;
}

const badgeTones: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 border border-amber-100',
  emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  rose: 'bg-rose-50 text-rose-700 border border-rose-100',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  slate: 'bg-slate-100 text-slate-600 border border-slate-200',
};

/** Big tappable work card — the 3-action surface building block. */
export const ActionCard: React.FC<ActionCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  value,
  badge,
  badgeTone = 'slate',
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-saffron-300 hover:shadow transition-all cursor-pointer group min-h-[44px]"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-saffron-500/10 border border-saffron-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5 text-saffron-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {value && <span className="text-xl font-black text-slate-900">{value}</span>}
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeTones[badgeTone]}`}>
            {badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-saffron-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  </button>
);

export const RoleSectionTitle: React.FC<{ icon: React.ElementType; title: string; hint?: string }> = ({
  icon: Icon,
  title,
  hint,
}) => (
  <div className="flex items-center justify-between">
    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-saffron-500" />
      {title}
    </h2>
    {hint && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hint}</span>}
  </div>
);

/* ------------------------------------------------------------------ */
/* ShlokaCard — the sacred soul. Rendered for EVERY role, identical.   */
/* ------------------------------------------------------------------ */

/**
 * Clean up IAST transliteration for UI display. The avagraha (') before
 * "stv" in "saṅgo'stv" renders as a garbled apostrophe in most UI fonts;
 * joining it reads cleanly. (Source data in DataContext is untouched.)
 */
const cleanTransliteration = (s: string): string => s.replace(/'stv/g, 'stv');

export const ShlokaCard: React.FC = () => {
  const { shlokas } = useData();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const [currentShlokaIndex, setCurrentShlokaIndex] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff =
      now.getTime() - start.getTime() +
      (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % Math.max(shlokas.length, 1);
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentShloka = shlokas[currentShlokaIndex % shlokas.length] || shlokas[0];
  if (!currentShloka) return null;

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

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col anim-fade-up">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-saffron-500" />
          Daily Vedic Wisdom
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayShlokaAudio}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[36px] ${
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
            className="px-3 py-1.5 rounded-lg bg-saffron-500/10 hover:bg-saffron-500/20 text-saffron-500 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer min-h-[36px]"
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
          {cleanTransliteration(currentShloka.transliteration)}
        </p>
        <div className="pt-3 mt-1 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-indigo-600 uppercase tracking-wider mr-2">Meaning:</span>
          {getShlokaMeaning()}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* KpiGrid — the 4 executive KPI cards (shared by Trustee + default).  */
/* ------------------------------------------------------------------ */

export const KpiGrid: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const { activeWorkspace, checkPermission } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const { devotees, treasury, poojaBookings, cows, gurukulStudents, collectionWindows, treasuryExactTotals } = useData();

  const orgTypeKey = (activeWorkspace.type || 'Mandir').toLowerCase();
  const isGurukulLike = ['gurukul', 'vidyalaya', 'pathshala'].includes(orgTypeKey);
  const isGoshalaLike = orgTypeKey === 'goshala';
  const isMandirLike = ['mandir', 'kashikshetra', 'tirth'].includes(orgTypeKey);
  const showSankalpKpi = !isGurukulLike;
  const showGauSevaKpi = isGoshalaLike || isMandirLike;

  // Branch-aware: KPIs follow the active branch filter via matchesActiveBranch
  // (treasury/devotees/poojaBookings are already branch-filtered in context).
  const windowedIncome = treasury
    .filter((tx) => tx.type === 'Income')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const windowedExpense = treasury
    .filter((tx) => tx.type === 'Expense')
    .reduce((acc, curr) => acc + curr.amount, 0);
  // QUEUED #59 (A4-7): mirror TreasuryLedgerDesk's honesty rule — in
  // windowed mode the loaded array is only a window, so the KPI reads
  // the exact server totals when they exist; the pill below then says
  // which of the two the number really is. (Previously the windowed
  // sum wore an unconditional "Synced" pill while the desk showed
  // different, exact figures.)
  const treasuryWindowed = collectionWindows.treasury.windowed;
  const useExactTotals = treasuryWindowed && treasuryExactTotals != null;
  const totalIncome = useExactTotals ? treasuryExactTotals.totalIncome : windowedIncome;
  const totalExpense = useExactTotals ? treasuryExactTotals.totalExpense : windowedExpense;
  const netBalance = totalIncome - totalExpense;
  const treasuryIsPartial = treasuryWindowed && !useExactTotals;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 anim-stagger">
      {checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'VOLUNTEER', 'SUPER_ADMIN']) && (
        <div
          onClick={() => onNavigate('devotee-grid')}
          style={{ '--i': 0 } as React.CSSProperties}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors group"
        >
          {/* F-DASH-4: the card carries the org's own directory name — Goshala's
              nav says "Gau Sevak Directory", so the KPI does too. */}
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {isGoshalaLike
              ? safeTranslate('kpi_gau_sevak_directory', 'Gau Sevak Directory', 'গো সেবক তালিকা', 'गौ सेवक सूची')
              : safeTranslate('kpi_devotee_directory', 'Devotee Directory', 'ভক্ত তালিকা', 'भक्त सूची')}
          </span>
          <div className="flex items-end justify-between mt-1">
            {/* QUEUED #59 (A4-7): the count is the probed server total
                under windowing (DashboardHome's rule), and the old
                "KYC 100%" pill is GONE — no member record carries a KYC
                field, so the percentage was invented. */}
            <span className="text-2xl font-bold text-slate-900"><CountUp value={collectionWindows.devotees.total ?? devotees.length} /></span>
          </div>
        </div>
      )}
      {checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'SUPER_ADMIN']) && (
        <div
          onClick={() => onNavigate('treasury-ledger')}
          style={{ '--i': 1 } as React.CSSProperties}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors group"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Treasury Fund</span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">
              <CountUp value={netBalance} format={(n) => `${activeWorkspace.currencySymbol} ${Math.round(n).toLocaleString('en-IN')}`} />
            </span>
            {treasuryIsPartial ? (
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                {safeTranslate('kpi_treasury_partial', 'Loaded window only', 'শুধু লোড করা অংশ', 'केवल लोड किया भाग')}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                {safeTranslate('kpi_treasury_full', 'Full ledger', 'সম্পূর্ণ খাতা', 'पूरा खाता')}
              </span>
            )}
          </div>
        </div>
      )}
      {isGurukulLike ? (
        checkPermission(['TRUSTEE', 'MANAGER', 'VOLUNTEER', 'SUPER_ADMIN']) && (
          <div
            onClick={() => onNavigate('gurukulAcademy')}
            style={{ '--i': 2 } as React.CSSProperties}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-amber-300 transition-colors group"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shishya (Students)</span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900"><CountUp value={gurukulStudents.length} /></span>
              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Brahmacharis</span>
            </div>
          </div>
        )
      ) : (
        showSankalpKpi && checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'PUROHIT', 'SUPER_ADMIN']) && (
          <div
            onClick={() => onNavigate('pooja-booking')}
            style={{ '--i': 2 } as React.CSSProperties}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-rose-300 transition-colors group"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reserved Sankalps</span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900"><CountUp value={poojaBookings.length} /></span>
              {/* F-DASH-5: a red "Active" pill on a zero count reads as an alert.
                  Zero-states stay quiet and neutral. */}
              {poojaBookings.length > 0 ? (
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Active</span>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                  {safeTranslate('kpi_sankalp_none_yet', 'None yet', 'এখনও নেই', 'अभी कोई नहीं')}
                </span>
              )}
            </div>
          </div>
        )
      )}
      {showGauSevaKpi && checkPermission(['TRUSTEE', 'MANAGER', 'VOLUNTEER', 'SUPER_ADMIN']) && (
        <div
          onClick={() => onNavigate('gau-seva-goshala')}
          style={{ '--i': 3 } as React.CSSProperties}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-saffron-300 transition-colors group"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gau Seva Units</span>
          <div className="flex items-end justify-between mt-1">
            {/* QUEUED #59 (A4-1): same herd resolver as the Command
                Center — the suite store is the register of record. */}
            <span className="text-2xl font-bold text-slate-900"><CountUp value={resolveHerdCount(activeWorkspace.id, { legacyCowCount: cows.length })} /></span>
            <span className="text-[10px] text-saffron-600 font-bold bg-saffron-50 px-1.5 py-0.5 rounded">Gomata</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* BranchComparisonPanel — consolidated view only, invisible otherwise. */
/* ------------------------------------------------------------------ */

export const BranchComparisonPanel: React.FC = () => {
  const { activeWorkspace, checkPermission } = useAuthWorkspace();
  const {
    branches: branchList,
    isMultiBranch,
    activeBranchId,
    setActiveBranchId,
    recordsForBranch,
    isBranchAccessible,
    treasury,
    devotees,
    poojaBookings,
  } = useData();

  if (!isMultiBranch || activeBranchId !== 'ALL') return null;
  if (!checkPermission(['Trustee', 'SuperAdmin'])) return null;
  // Per-branch RBAC: only compare branches this member may see.
  const visible = branchList.filter((b) => isBranchAccessible(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-saffron-500" />
          Branch comparison
        </h2>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Tap a branch to focus
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {visible.map((b) => {
          const bTx = recordsForBranch(treasury, b.id);
          const bIncome = bTx.filter((t) => t.type === 'Income').reduce((a, c) => a + c.amount, 0);
          const bExpense = bTx.filter((t) => t.type === 'Expense').reduce((a, c) => a + c.amount, 0);
          const bDevotees = recordsForBranch(devotees, b.id).length;
          const bBookings = recordsForBranch(poojaBookings, b.id).length;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setActiveBranchId(b.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-saffron-50/50 transition-colors cursor-pointer text-left"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-900 truncate">
                  {b.name}
                  {b.isMain && (
                    <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider text-saffron-600">Main</span>
                  )}
                </span>
                {b.city && <span className="block text-[11px] text-slate-500">{b.city}</span>}
              </span>
              <span className="text-right shrink-0">
                <span className="block text-sm font-bold text-emerald-700">
                  {activeWorkspace.currencySymbol} {Math.round(bIncome - bExpense).toLocaleString('en-IN')}
                </span>
                <span className="block text-[10px] text-slate-500">{bDevotees} members · {bBookings} bookings</span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* DiscoverGrid / ActionHub / RecentTreasury — default home sections.  */
/* ------------------------------------------------------------------ */

export const DiscoverGrid: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const { activeWorkspace, checkPermission, updateWorkspaceDetails } = useAuthWorkspace();
  const { t, currentLang } = useLanguage();
  const { devotees, donations } = useData();
  const { showToast } = useToast();
  const [dismissTick, setDismissTick] = useState(0);

  // Seva Suggestions: top recommendations (with one-tap enable) lead;
  // random available modules fill the rest. No more pure-random wall.
  const { recommended, rest } = useMemo(() => {
    const available = MODULE_CATALOG.filter((m) => {
      if (['dashboard', 'devotees', 'treasury', 'poojaBooking', 'goshala', 'appStore', 'masterSettings', 'spiritualSettings'].includes(m.id)) return false;
      if (!isModuleAllowed(activeWorkspace, m.id)) return false;
      let hasRole = true;
      if (['bulkImport', 'campaigns', 'assets', 'sandeshBroadcast'].includes(m.id)) hasRole = checkPermission(['MANAGER', 'TRUSTEE']);
      else if (['inventory'].includes(m.id)) hasRole = checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE', 'VOLUNTEER']);
      else if (['mandirPuja', 'purohitDesk', 'purohitMarket', 'pitruShradh'].includes(m.id)) hasRole = checkPermission(['PUROHIT', 'MANAGER', 'TRUSTEE']);
      else if (['taxReceipts'].includes(m.id)) hasRole = checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']);
      else if (['trusteeGovernance', 'sevadarRoster', 'crisis-command'].includes(m.id)) hasRole = checkPermission(['TRUSTEE', 'MANAGER']);
      return hasRole;
    });

    let recommended: { moduleId: string; reason: string }[] = [];
    if (activeWorkspace) {
      const natives = workspaceRegistry[activeWorkspace.type] || [];
      const enabled = activeWorkspace.enabledModules || [];
      const festival = getUpcomingFestival(new Date(), 45);
      recommended = getRecommendations({
        orgType: activeWorkspace.type,
        nativeModules: natives,
        enabledModules: enabled,
        devoteeCount: (devotees || []).length,
        donationCount: (donations || []).length,
        daysToFestival: festival ? festival.daysAway : null,
        festivalName: festival ? { en: festival.name, hi: festival.hi, bn: festival.bn } : null,
        recentDeskIds: [],
        lang: currentLang,
      })
        .filter((r) => !isSuggestionDismissed(activeWorkspace.id, `rec:${r.moduleId}`))
        .slice(0, 2)
        .map((r) => ({ moduleId: r.moduleId, reason: localizeText(r.reason, currentLang) }));
    }

    const recIds = new Set(recommended.map((r) => r.moduleId));
    const pool = available.filter((m) => !recIds.has(m.id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return { recommended, rest: pool.slice(0, Math.max(0, 6 - recommended.length)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, (devotees || []).length, (donations || []).length, currentLang, dismissTick]);

  const handleEnable = (moduleId: string) => {
    if (!activeWorkspace) return;
    // V1 RBAC: enabling a module bypasses the org-type taxonomy — Trustee+ only.
    if (!checkPermission(['TRUSTEE', 'SuperAdmin'])) {
      showToast('Only Trustees can enable new modules for this organisation.', 'error', 'Permission Denied');
      return;
    }
    const mod = MODULE_CATALOG.find((m) => m.id === moduleId);
    enableModule(activeWorkspace.enabledModules, moduleId, updateWorkspaceDetails, activeWorkspace.id);
    showToast(`“${mod?.name || moduleId}” is now on — find it in your sidebar.`, 'success', 'Module Enabled');
  };

  const handleDismissRec = (moduleId: string) => {
    if (!activeWorkspace) return;
    dismissSuggestion(activeWorkspace.id, `rec:${moduleId}`);
    setDismissTick((v) => v + 1);
  };

  const featuredModules = rest;
  if (featuredModules.length === 0 && recommended.length === 0) return null;
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Discover Workspace Features</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Recommended for your institution — enable with one tap</p>
        </div>
        {checkPermission(['TRUSTEE']) && (
          <button
            onClick={() => onNavigate('appStore')}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-100/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[36px]"
          >
            App Store
          </button>
        )}
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recommended.map((rec) => {
          const mod = MODULE_CATALOG.find((m) => m.id === rec.moduleId);
          if (!mod) return null;
          const Icon = mod.icon;
          return (
            <div
              key={`rec-${rec.moduleId}`}
              className="group p-4 rounded-xl border border-saffron-200 bg-amber-50/60 transition-all flex gap-3 items-start relative"
            >
              <button
                type="button"
                onClick={() => handleDismissRec(rec.moduleId)}
                aria-label={`Dismiss ${mod.name} suggestion`}
                className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all text-sm leading-none"
              >
                ×
              </button>
              <div className="w-10 h-10 rounded-lg bg-white border border-amber-200 shadow-sm flex items-center justify-center shrink-0 text-amber-600">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-sm font-bold text-slate-800 truncate mb-0.5">{mod.name}</h3>
                <p className="text-[11px] text-amber-700 font-medium leading-snug mb-1">{rec.reason}</p>
                <p className="text-[11px] text-slate-500 leading-snug mb-2">{getModuleCopy(rec.moduleId, currentLang)}</p>
                <button
                  type="button"
                  onClick={() => handleEnable(rec.moduleId)}
                  className="text-[11px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-all min-h-[32px]"
                >
                  Enable
                </button>
              </div>
            </div>
          );
        })}
        {featuredModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              onClick={() => onNavigate(mod.id)}
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
                  <span className="text-[10px] font-medium text-slate-500 truncate">{mod.domainTitle}</span>
                  {mod.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 shrink-0">{mod.badge}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ActionHub: React.FC<{
  onNavigate: (id: string) => void;
  onOpenQuickPay: () => void;
  onOpenMySpace?: () => void;
}> = ({ onNavigate, onOpenQuickPay, onOpenMySpace }) => {
  const { checkPermission } = useAuthWorkspace();
  const { memberNoun } = useWorkspaceTaxonomy();

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide mb-1">Dharmic Action Hub</h3>
      <p className="text-[10px] text-slate-500 mb-4">Fast workflows &amp; pass generation</p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={onOpenQuickPay}
          className="w-full p-2.5 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-[11px] flex items-center justify-between transition-colors shadow-sm cursor-pointer min-h-[44px]"
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
            className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-between border border-slate-200 transition-colors cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>My {memberNoun} Smart Card</span>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        )}
        {checkPermission(['SUPER_ADMIN', 'MANAGER', 'TRUSTEE']) && (
          <button
            type="button"
            onClick={() => onNavigate('dharmic-assistant')}
            className="w-full p-2.5 rounded-lg bg-gradient-to-r from-saffron-500/10 to-saffron-500/10 hover:from-saffron-500/20 hover:to-saffron-500/20 text-saffron-900 font-semibold text-[11px] flex items-center justify-between border border-saffron-500/30 transition-colors cursor-pointer group min-h-[44px]"
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
            onClick={() => onNavigate('pooja-booking')}
            className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-between border border-slate-200 transition-colors cursor-pointer min-h-[44px]"
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
            onClick={() => onNavigate('universal-csv')}
            className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-between border border-slate-200 transition-colors cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Bulk CSV {memberNoun} Ingestion</span>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        )}
        {checkPermission(['TRUSTEE', 'MANAGER', 'SUPER_ADMIN']) && (
          <button
            type="button"
            onClick={() => onNavigate('whatsapp-broadcaster')}
            className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-between border border-slate-200 transition-colors cursor-pointer min-h-[44px]"
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
  );
};

export const RecentTreasury: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const { activeWorkspace, checkPermission } = useAuthWorkspace();
  const { treasury } = useData();
  void activeWorkspace;
  if (!checkPermission(['TRUSTEE', 'ACCOUNTANT', 'MANAGER', 'SUPER_ADMIN'])) return null;
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide mb-1">Recent Treasury</h3>
          <p className="text-[10px] text-slate-500">Double-entry audit verified</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('treasury-ledger')}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 bg-indigo-50 px-2 py-1 rounded min-h-[36px]"
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
                <p className="font-bold text-[11px] text-slate-800 truncate">{tx.category || 'General'}</p>
                <p className="text-[9px] text-slate-500 truncate">{tx.devoteeName || tx.purpose}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-black text-xs ${tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.type === 'Income' ? '+' : '-'} ₹{(tx.amount || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">{tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* PriestHome — today's pujas, check-in, darshan, festivals.           */
/* ------------------------------------------------------------------ */

const statusTone: Record<string, string> = {
  Confirmed: 'bg-amber-50 text-amber-700 border border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Standby: 'bg-slate-100 text-slate-600 border border-slate-200',
  Cancelled: 'bg-rose-50 text-rose-600 border border-rose-200',
};

export const PriestHome: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const { poojaBookings, updatePoojaStatus } = useData();
  const { showToast } = useToast();
  const today = todayISO();

  const todaysBookings = useMemo(
    () =>
      poojaBookings
        .filter((b) => (b.bookingDate || b.tithiDate || '').slice(0, 10) === today)
        .sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || '')),
    [poojaBookings, today]
  );
  const nextBooking = todaysBookings.find((b) => b.status === 'Confirmed' || b.status === 'Standby');

  const handleCheckIn = (id: string, name: string) => {
    updatePoojaStatus(id, 'Completed');
    showToast(`Puja for ${name} marked complete.`, 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <RoleSectionTitle icon={Flame} title="Today's Pujas" hint={`${todaysBookings.length} booking${todaysBookings.length === 1 ? '' : 's'}`} />

      {nextBooking ? (
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-orange-500/20 anim-fade-up">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-1">Next booking</p>
          <p className="text-xl font-black">{nextBooking.poojaName}</p>
          <p className="text-sm text-white/90 mt-1">
            {nextBooking.devoteeName} · {nextBooking.timeSlot || 'Time TBD'}
            {nextBooking.gotra ? ` · ${nextBooking.gotra} gotra` : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() => handleCheckIn(nextBooking.id, nextBooking.devoteeName)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-orange-700 text-sm font-black shadow cursor-pointer min-h-[44px] pressable"
            >
              <CheckCircle2 className="w-4 h-4" /> Check in — mark complete
            </button>
            <button
              type="button"
              onClick={() => onNavigate('poojaBooking')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold border border-white/30 cursor-pointer min-h-[44px]"
            >
              Open Rituals Hub
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-slate-200 p-5 text-center">
          <Flame className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No pujas booked for today</p>
          <p className="text-[11px] text-slate-500 mt-1">New sankalps appear here the moment they are reserved.</p>
          <button
            type="button"
            onClick={() => onNavigate('poojaBooking')}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-bold cursor-pointer min-h-[44px]"
          >
            Open Rituals Hub
          </button>
        </div>
      )}

      {todaysBookings.length > 1 && (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {todaysBookings.map((b) => (
              <div key={b.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{b.poojaName}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {b.devoteeName} · {b.timeSlot || 'Time TBD'}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${statusTone[b.status] || statusTone.Standby}`}>
                  {b.status}
                </span>
                {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                  <button
                    type="button"
                    onClick={() => handleCheckIn(b.id, b.devoteeName)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 cursor-pointer min-h-[36px]"
                  >
                    Check in
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionCard
          icon={UserCheck}
          title="Darshan & Gate Check-In"
          subtitle="Today's gate desk"
          onClick={() => onNavigate('gate-command')}
        />
        <ActionCard
          icon={CalendarDays}
          title="Festival Calendar"
          subtitle="Utsavs, muhurats & gate passes"
          onClick={() => onNavigate('utsavPanjika')}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* AccountantHome — collections, 80G, quick chanda, tally/audit.       */
/* ------------------------------------------------------------------ */

export const AccountantHome: React.FC<{ onNavigate: (id: string) => void; onOpenQuickPay: () => void }> = ({
  onNavigate,
  onOpenQuickPay,
}) => {
  const { activeWorkspace } = useAuthWorkspace();
  const { treasury } = useData();
  const today = todayISO();

  const todaysIncome = useMemo(
    () => treasury.filter((tx) => tx.type === 'Income' && (tx.date || '').slice(0, 10) === today),
    [treasury, today]
  );
  const todaysTotal = todaysIncome.reduce((a, c) => a + (c.amount || 0), 0);
  const pending80G = useMemo(
    () => treasury.filter((tx) => tx.type === 'Income' && !tx.taxReceiptNumber),
    [treasury]
  );
  const pending80GTotal = pending80G.reduce((a, c) => a + (c.amount || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <RoleSectionTitle icon={Wallet} title="Today's Books" hint={today} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 anim-stagger">
        <div
          onClick={() => onNavigate('treasury-ledger')}
          style={{ '--i': 0 } as React.CSSProperties}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Collections today</span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">
              <CountUp value={todaysTotal} format={(n) => `${activeWorkspace.currencySymbol} ${Math.round(n).toLocaleString('en-IN')}`} />
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              {todaysIncome.length} entries
            </span>
          </div>
        </div>
        <div
          onClick={() => onNavigate('taxReceipts')}
          style={{ '--i': 1 } as React.CSSProperties}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-amber-300 transition-colors"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">80G receipts pending</span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-black text-slate-900"><CountUp value={pending80G.length} /></span>
            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
              {activeWorkspace.currencySymbol} {Math.round(pending80GTotal).toLocaleString('en-IN')} awaiting
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenQuickPay}
          className="w-full p-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-sm flex items-center justify-between transition-colors shadow-md shadow-saffron-500/20 cursor-pointer min-h-[56px] pressable"
        >
          <span className="flex items-center gap-2.5">
            <Coins className="w-5 h-5" />
            <span className="text-left">Quick Chanda<span className="block text-[11px] font-medium text-white/80">Log a donation in 2 taps</span></span>
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
        <ActionCard
          icon={Receipt}
          title="Tax Certificates (80G/12A)"
          subtitle={pending80G.length > 0 ? `${pending80G.length} receipts to issue` : 'All receipts issued'}
          badge={pending80G.length > 0 ? 'Action needed' : undefined}
          badgeTone="amber"
          onClick={() => onNavigate('taxReceipts')}
        />
        <ActionCard
          icon={FileSpreadsheet}
          title="Tally Prime Export"
          subtitle="Ledger → Tally XML"
          onClick={() => onNavigate('tally-export')}
        />
        <ActionCard
          icon={Landmark}
          title="Treasury & Expense Ledger"
          subtitle="Double-entry books"
          onClick={() => onNavigate('treasury-ledger')}
        />
      </div>
      <LunarClosingCard onOpenTreasury={() => onNavigate('treasury-ledger')} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* TrusteeHome — KPIs, branches, approvals, donor alerts.              */
/* ------------------------------------------------------------------ */

export const TrusteeHome: React.FC<{ onNavigate: (id: string) => void; onOpenQuickPay: () => void }> = ({
  onNavigate,
}) => {
  const { treasury, poojaBookings, donations } = useData();

  const standbyBookings = useMemo(
    () => poojaBookings.filter((b) => b.status === 'Standby'),
    [poojaBookings]
  );
  const pendingPayments = useMemo(
    () => poojaBookings.filter((b) => b.paymentStatus === 'Pending' && b.status !== 'Cancelled'),
    [poojaBookings]
  );
  const pending80GCount = useMemo(
    () => treasury.filter((tx) => tx.type === 'Income' && !tx.taxReceiptNumber).length,
    [treasury]
  );

  // Donors whose last gift is 180+ days old — genuine win-back candidates.
  // (donations here are income-side treasury transactions.)
  const lapsedDonors = useMemo(() => {
    const lastByDonor = new Map<string, string>();
    donations.forEach((d) => {
      const key = d.devoteeName || '';
      if (!key) return;
      const prev = lastByDonor.get(key);
      if (!prev || (d.date || '') > prev) lastByDonor.set(key, d.date || '');
    });
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    const cutoffISO = todayISO(cutoff);
    return [...lastByDonor.entries()]
      .filter(([, date]) => date !== '' && date < cutoffISO)
      .map(([name]) => name)
      .slice(0, 3);
  }, [donations]);

  const attentionCount = standbyBookings.length + pendingPayments.length + pending80GCount;

  return (
    <div className="flex flex-col gap-4">
      {/* F2: attention figures below derive from the loaded treasury
          window in large-organisation mode — labelled, never exact-
          presented. Renders nothing when fully synced. */}
      <WindowedNotice collection="treasury" variant="totals" loaded={treasury.length} />
      <KpiGrid onNavigate={onNavigate} />
      <UtsavReadinessCard onPlan={() => onNavigate('utsav-one')} />
      <BranchComparisonPanel />

      <RoleSectionTitle icon={Bell} title="Needs your attention" hint={attentionCount > 0 ? `${attentionCount} open` : 'All clear'} />
      {attentionCount === 0 ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <p className="text-sm font-bold text-emerald-800">Everything is settled — no pending approvals, payments, or receipts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {standbyBookings.length > 0 && (
            <ActionCard
              icon={Clock}
              title="Standby bookings"
              value={standbyBookings.length}
              badge="Review"
              badgeTone="amber"
              onClick={() => onNavigate('poojaBooking')}
            />
          )}
          {pendingPayments.length > 0 && (
            <ActionCard
              icon={AlertCircle}
              title="Payments pending"
              value={pendingPayments.length}
              badge="Follow up"
              badgeTone="rose"
              onClick={() => onNavigate('poojaBooking')}
            />
          )}
          {pending80GCount > 0 && (
            <ActionCard
              icon={Receipt}
              title="80G receipts pending"
              value={pending80GCount}
              badge="Issue"
              badgeTone="amber"
              onClick={() => onNavigate('taxReceipts')}
            />
          )}
        </div>
      )}

      {lapsedDonors.length > 0 && (
        <>
          <RoleSectionTitle icon={Heart} title="Donor care" hint="Win-back" />
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-sm font-bold text-slate-800">
              {lapsedDonors.length} donor{lapsedDonors.length === 1 ? '' : 's'} quiet for 6+ months
            </p>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {lapsedDonors.join(' · ')}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('donorCare')}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold cursor-pointer min-h-[44px]"
            >
              <Heart className="w-4 h-4" /> Open Donor Care
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SevadarHome — my shifts, check-in, assigned tasks.                  */
/* ------------------------------------------------------------------ */

export const SevadarHome: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useAuthWorkspace();
  const { shifts } = useData();
  const today = todayISO();

  const todaysShifts = useMemo(
    () => shifts.filter((s) => (s.date || '').slice(0, 10) === today),
    [shifts, today]
  );
  const myName = (currentUser?.name || '').toLowerCase();
  const myShifts = useMemo(
    () =>
      todaysShifts.filter((s) =>
        myName && s.sevadarName ? s.sevadarName.toLowerCase().includes(myName.split(' ')[0]) : false
      ),
    [todaysShifts, myName]
  );
  const displayShifts = myShifts.length > 0 ? myShifts : todaysShifts;

  return (
    <div className="flex flex-col gap-4">
      <RoleSectionTitle icon={ClipboardList} title="My Seva Today" hint={today} />

      <button
        type="button"
        onClick={() => onNavigate('sevadar-roster')}
        className="w-full p-5 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm flex items-center justify-between transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer min-h-[64px] pressable anim-fade-up"
      >
        <span className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </span>
          <span className="text-left">
            Check in for seva
            <span className="block text-[11px] font-medium text-white/75">Mark your attendance in the roster</span>
          </span>
        </span>
        <ChevronRight className="w-5 h-5" />
      </button>

      {displayShifts.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-5 text-center">
          <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No shifts assigned for today</p>
          <p className="text-[11px] text-slate-500 mt-1">Rest well — seva schedules appear here when rostered.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {myShifts.length > 0 ? 'Your shifts' : "Today's roster"} · {displayShifts.length}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {displayShifts.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{s.role}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {s.sevadarName} · {s.shiftTiming}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    s.attended
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {s.attended ? 'Present' : 'Scheduled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionCard
          icon={Users}
          title="Sevadar Roster"
          subtitle="Full schedule & attendance"
          onClick={() => onNavigate('sevadar-roster')}
        />
        <ActionCard
          icon={ShieldCheck}
          title="Crisis Command"
          subtitle="SOS & incident desk"
          onClick={() => onNavigate('crisis-command')}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* DefaultHome — the full dashboard body (roles without a custom home) */
/* ------------------------------------------------------------------ */

export const DefaultHome: React.FC<{
  onNavigate: (id: string) => void;
  onOpenQuickPay: () => void;
  onOpenMySpace?: () => void;
}> = ({ onNavigate, onOpenQuickPay, onOpenMySpace }) => (
  <>
    <KpiGrid onNavigate={onNavigate} />
    <BranchComparisonPanel />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 flex flex-col gap-6">
        <DiscoverGrid onNavigate={onNavigate} />
      </section>
      <section className="flex flex-col gap-6">
        <ActionHub onNavigate={onNavigate} onOpenQuickPay={onOpenQuickPay} onOpenMySpace={onOpenMySpace} />
        <RecentTreasury onNavigate={onNavigate} />
      </section>
    </div>
  </>
);

/* ------------------------------------------------------------------ */
/* RoleHomeSwitch — picks the work surface; sacred header stays above. */
/* ------------------------------------------------------------------ */

export const RoleHomeSwitch: React.FC<{
  onNavigate: (id: string) => void;
  onOpenQuickPay: () => void;
  onOpenMySpace?: () => void;
}> = ({ onNavigate, onOpenQuickPay, onOpenMySpace }) => {
  const { currentRole } = useAuthWorkspace();
  const role = normalizeRole(currentRole);

  switch (role) {
    case 'Priest':
      return <PriestHome onNavigate={onNavigate} />;
    case 'Accountant':
      return <AccountantHome onNavigate={onNavigate} onOpenQuickPay={onOpenQuickPay} />;
    case 'Trustee':
    case 'SuperAdmin':
      return <TrusteeHome onNavigate={onNavigate} onOpenQuickPay={onOpenQuickPay} />;
    case 'Sevadar':
      return <SevadarHome onNavigate={onNavigate} />;
    default:
      // Devotee never reaches the dashboard (portal-forced in AppContent);
      // CSO and any future role fall back to the full dashboard.
      return <DefaultHome onNavigate={onNavigate} onOpenQuickPay={onOpenQuickPay} onOpenMySpace={onOpenMySpace} />;
  }
};
