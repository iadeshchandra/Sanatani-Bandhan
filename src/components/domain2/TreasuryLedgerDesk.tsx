import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { KpiCardSkeleton, TableSkeleton } from '../common/DeskSkeletons';
import { EmptyState } from '../common/EmptyState';
import { DataExportButton } from '../common/DataExportButton';
import { formatINR, formatDateIST } from '../../utils/format';
import { workspaceRegistry } from '../../lib/workspaceRegistry';
import {
  fireSuggestion,
  milestoneFired,
  markMilestone,
  usePendingSuggestions,
  enableModule,
} from '../../suggestions/store';
import { SuggestionCard, ModuleUpsellCard } from '../../suggestions/cards';
import {
  Landmark,
  Plus,
  Search,
  Filter,
  Download,
  Receipt,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Printer,
  ChevronDown,
  Building,
  CreditCard,
  AlertCircle,
  Sparkles,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData, INITIAL_TREASURY } from '../../context/DataContext';
import { TreasuryTransaction } from '../../types';
import { generateTaxReceiptPDF, generateTreasuryLedgerPDF } from '../../utils/pdfGenerator';
import { printThermalReceipt } from '../../utils/printUtils';
import { useToast } from '../../context/ToastContext';
import { compressExpenseMemo } from '../../utils/imageCompression';
import { MemberSearchSelect } from '../common/MemberSearchSelect';
import { getTransactions } from '../../services/treasuryService';
import { GuideButton } from '../suchana/GuideButton';

interface TreasuryLedgerDeskProps {
  onOpenQuickPay?: () => void;
  onNavigate?: (module: string) => void;
}

type FundType = 'Unrestricted' | 'Restricted';

interface FundDefinition {
  id: string;
  name: string;
  type: FundType;
  description: string;
  keywords: string[];
}

const TRUST_FUNDS: FundDefinition[] = [
  {
    id: 'general',
    name: 'General Trust Fund',
    type: 'Unrestricted',
    description: 'Unrestricted general donations, temple hundi, operational expenses & administrative overhead',
    keywords: ['general', 'chanda', 'pranami', 'hundi', 'maintenance', 'utility', 'utilities', 'office', 'admin'],
  },
  {
    id: 'annadanam',
    name: 'Annadanam & Prasad Fund',
    type: 'Restricted',
    description: 'Earmarked solely for prasad preparation, community meals, grains, and bhandara seva',
    keywords: ['annadanam', 'prasad', 'bhandara', 'catering', 'food', 'groceries', 'ration', 'bhog'],
  },
  {
    id: 'nirman',
    name: 'Mandir Nirman & Capital Fund',
    type: 'Restricted',
    description: 'Earmarked for sanctum construction, stone carving, architecture, land, and temple renovation',
    keywords: ['nirman', 'mandir nirman', 'construction', 'renovation', 'building', 'stone', 'capital', 'expansion'],
  },
  {
    id: 'gauseva',
    name: 'Gau Seva & Gaushala Fund',
    type: 'Restricted',
    description: 'Earmarked for sacred cow protection, fodder, veterinary care, and gaushala shelter',
    keywords: ['gau', 'cow', 'gaushala', 'grass', 'fodder', 'veterinary'],
  },
  {
    id: 'puja_utsav',
    name: 'Pooja & Utsav Seva Fund',
    type: 'Restricted',
    description: 'Earmarked for special festival celebrations, floral decorations, yajnas, and priest honorariums',
    keywords: ['utsav', 'festival', 'pooja', 'puja', 'yajna', 'dakshina', 'purohit', 'flower', 'decor', 'setup', 'durga'],
  },
];

const DONUT_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#171006',
  border: '1px solid #44403c',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#fde68a',
};

interface FundCardProps {
  fund: FundDefinition;
  income: number;
  expense: number;
  net: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

/** Memoized presentational fund card — re-renders only when its own fund data or selection changes. */
const FundCard: React.FC<FundCardProps> = React.memo(({ fund, income, expense, net, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(isSelected ? 'all' : fund.id)}
      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
        isSelected
          ? 'bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
          : 'bg-temple-950/60 border-temple-800 hover:border-temple-700'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-1 mb-1">
          <span
            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
              fund.type === 'Unrestricted'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {fund.type}
          </span>
          {isSelected && <span className="text-[10px] font-bold text-amber-400">Active</span>}
        </div>
        <p className="font-bold text-xs text-temple-100 line-clamp-1">{fund.name}</p>
        <p className="text-[10px] text-temple-400 mt-0.5 line-clamp-1">{fund.description}</p>
      </div>

      <div className="mt-3 pt-2 border-t border-temple-800/80">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-temple-400">Net Corpus:</span>
          <span className={`font-bold ${net >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {formatINR(net)}
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-temple-400 mt-0.5">
          <span className="text-emerald-400">+{formatINR(income)}</span>
          <span className="text-rose-400">-{formatINR(expense)}</span>
        </div>
      </div>
    </button>
  );
});

export const TreasuryLedgerDesk: React.FC<TreasuryLedgerDeskProps> = ({ onOpenQuickPay, onNavigate }) => {
  const { activeWorkspace, activeWorkspaceId, updateWorkspaceDetails } = useAuthWorkspace();
  const workspaceId = activeWorkspaceId || activeWorkspace?.id || 'DEMO_ws-mandir';
  const { donations, addTreasuryTransaction, recordsForBranch, activeBranchId } = useData();
  const { showToast } = useToast();
  const { suggestions: sevaSuggestions, dismiss: dismissSevaSuggestion } = usePendingSuggestions(workspaceId);

  const isModuleAvailable = (id: string) => {
    if (!activeWorkspace) return true;
    const natives = workspaceRegistry[activeWorkspace.type] || [];
    const enabled = activeWorkspace.enabledModules || [];
    return natives.includes(id) || enabled.includes(id);
  };

  const handleEnableSuggestion = (moduleId: string) => {
    if (!activeWorkspace) return;
    enableModule(activeWorkspace.enabledModules, moduleId, updateWorkspaceDetails, workspaceId);
    showToast('Module enabled — find it in your sidebar.', 'success', 'Module Enabled');
  };

  // Seva Suggestions — trigger (b): donation volume milestone. When recorded
  // donations cross 25, Donor Care & Win-Back becomes genuinely useful.
  // Fires once per workspace; sticky-dismissed suggestions never re-fire.
  useEffect(() => {
    const count = (donations || []).length;
    if (count >= 25 && !milestoneFired(workspaceId, 'donation-volume-25')) {
      markMilestone(workspaceId, 'donation-volume-25');
      fireSuggestion(
        workspaceId,
        'donorCare',
        {
          en: `${count} donations recorded — Donor Care & Win-Back thanks first-time donors and brings lapsed ones back.`,
          hi: `${count} दान दर्ज — डोनर केयर पहली बार के दाताओं को धन्यवाद देता है और छूटे हुओं को वापस लाता है।`,
          bn: `${count}টি অনুদান নথিভুক্ত — ডোনার কেয়ার প্রথমবারের দাতাদের ধন্যবাদ জানায় ও হারানোদের ফিরিয়ে আনে।`,
        },
        isModuleAvailable
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(donations || []).length, workspaceId]);

  const [treasury, setTreasury] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTransactions = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const records = await getTransactions(workspaceId);
      if (records && records.length > 0) {
        setTreasury(records as TreasuryTransaction[]);
      } else {
        setTreasury(INITIAL_TREASURY || []);
      }
    } catch (err: any) {
      console.warn('Notice: Falling back to local treasury transactions ledger:', err?.message || err);
      setTreasury(INITIAL_TREASURY || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [workspaceId]);

  // Combine treasury and donations ensuring no missing records.
  // Multi-branch: DataContext `donations` is the single source of truth — it
  // is workspace- and branch-filtered and carries the correct branchId. The
  // Firestore-fetched local `treasury` state is used ONLY as a fallback when
  // DataContext is empty, because it can hold stale copies without branchId
  // that would otherwise leak across branches.
  const allLedgerRecords = useMemo(() => {
    const source =
      donations && donations.length > 0
        ? donations
        : recordsForBranch(treasury || [], activeBranchId);
    return [...source].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [treasury, donations, activeBranchId, recordsForBranch]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Income' | 'Expense'>('all');
  const [selectedFundId, setSelectedFundId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Date-range validation: an inverted range (start > end) is flagged and ignored by the filter.
  const dateRangeInvalid = Boolean(startDate && endDate && startDate > endDate);
  const prevInvalidRef = useRef(false);
  useEffect(() => {
    if (dateRangeInvalid && !prevInvalidRef.current) {
      showToast('Start date is after the end date — the date filter is ignored until fixed.', 'warning', 'Date Range');
    }
    prevInvalidRef.current = dateRangeInvalid;
  }, [dateRangeInvalid, showToast]);

  // Reset every filter back to its default
  const resetFilters = () => {
    setSelectedFundId('all');
    setSelectedCategory('all');
    setFilterType('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const hasActiveFilters =
    filterType !== 'all' ||
    selectedFundId !== 'all' ||
    selectedCategory !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchTerm.trim());

  // Modals State
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedMemoUrl, setSelectedMemoUrl] = useState<string | null>(null);

  // New Voucher Form State
  const [voucherType, setVoucherType] = useState<'Income' | 'Expense'>('Expense');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherAmount, setVoucherAmount] = useState<number | ''>('');
  const [voucherCategory, setVoucherCategory] = useState('Utilities & Maintenance');
  const [voucherFundId, setVoucherFundId] = useState('general');
  const [voucherEntityName, setVoucherEntityName] = useState('');
  const [voucherPaymentMode, setVoucherPaymentMode] = useState('Bank Transfer (NEFT/RTGS)');
  const [voucherRefNo, setVoucherRefNo] = useState('');
  const [voucherPurpose, setVoucherPurpose] = useState('');
  const [voucherHandledBy, setVoucherHandledBy] = useState((activeWorkspace as any)?.custodianName || 'Treasury Sevadar');
  const [voucherIs80G, setVoucherIs80G] = useState(false);
  const [voucherMemoUrl, setVoucherMemoUrl] = useState('');
  const [isUploadingMemo, setIsUploadingMemo] = useState(false);

  // Categorize a transaction into a Fund
  const getTransactionFund = (tx: TreasuryTransaction): FundDefinition => {
    const text = `${tx.category || ''} ${tx.purpose || ''} ${tx.eventName || ''}`.toLowerCase();

    for (const fund of TRUST_FUNDS) {
      if (fund.id === 'general') continue;
      if (fund.keywords.some((kw) => text.includes(kw))) {
        return fund;
      }
    }
    return TRUST_FUNDS[0]; // Default to General Fund
  };

  // Top-Level Financial KPIs
  const financialKPIs = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of allLedgerRecords) {
      if (tx.type === 'Income') {
        income += Number(tx.amount || 0);
      } else if (tx.type === 'Expense') {
        expense += Number(tx.amount || 0);
      }
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
    };
  }, [allLedgerRecords]);

  // Fund Segregation Breakdown (Restricted vs. Unrestricted)
  const fundBreakdown = useMemo(() => {
    const map = new Map<string, { fund: FundDefinition; income: number; expense: number; net: number }>();

    for (const f of TRUST_FUNDS) {
      map.set(f.id, { fund: f, income: 0, expense: 0, net: 0 });
    }

    for (const tx of allLedgerRecords) {
      const fund = getTransactionFund(tx);
      const entry = map.get(fund.id);
      if (entry) {
        if (tx.type === 'Income') {
          entry.income += Number(tx.amount || 0);
        } else {
          entry.expense += Number(tx.amount || 0);
        }
        entry.net = entry.income - entry.expense;
      }
    }

    let unrestrictedNet = 0;
    let restrictedNet = 0;

    map.forEach((val) => {
      if (val.fund.type === 'Unrestricted') {
        unrestrictedNet += val.net;
      } else {
        restrictedNet += val.net;
      }
    });

    return {
      funds: Array.from(map.values()),
      unrestrictedNet,
      restrictedNet,
    };
  }, [allLedgerRecords]);

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return allLedgerRecords.filter((tx) => {
      // Type filter
      if (filterType !== 'all' && tx.type !== filterType) return false;

      // Date range filter (ignored when the range is inverted)
      if (!dateRangeInvalid) {
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
      }

      // Fund filter
      if (selectedFundId !== 'all') {
        const txFund = getTransactionFund(tx);
        if (txFund.id !== selectedFundId) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;

      // Search query filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const categoryMatch = tx.category?.toLowerCase().includes(q);
        const entityMatch =
          tx.devoteeName?.toLowerCase().includes(q) ||
          tx.vendorName?.toLowerCase().includes(q);
        const purposeMatch = tx.purpose?.toLowerCase().includes(q);
        const refMatch = (tx.referenceNo || tx.id || tx.taxReceiptNumber)?.toLowerCase().includes(q);
        const custodyMatch = tx.handledBy?.toLowerCase().includes(q);

        if (!categoryMatch && !entityMatch && !purposeMatch && !refMatch && !custodyMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allLedgerRecords, filterType, dateRangeInvalid, startDate, endDate, selectedFundId, selectedCategory, searchTerm]);

  // Unique categories for filtering
  const availableCategories = useMemo(() => {
    return Array.from(new Set(allLedgerRecords.map((t) => t.category).filter(Boolean)));
  }, [allLedgerRecords]);

  // Monthly Income vs Expense — last 8 calendar months for the analytics section
  const monthlyFlow = useMemo(() => {
    const buckets: { key: string; label: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        income: 0,
        expense: 0,
      });
    }
    for (const tx of allLedgerRecords) {
      const monthKey = (tx.date || '').slice(0, 7); // YYYY-MM
      const bucket = buckets.find((b) => b.key === monthKey);
      if (!bucket) continue;
      if (tx.type === 'Income') bucket.income += Number(tx.amount || 0);
      else if (tx.type === 'Expense') bucket.expense += Number(tx.amount || 0);
    }
    return buckets;
  }, [allLedgerRecords]);

  // Trust-fund income mix for the donut chart (reuses the fundBreakdown segregation logic)
  const fundDonutData = useMemo(() => {
    return fundBreakdown.funds
      .filter((f) => f.income > 0)
      .map((f) => ({ name: f.fund.name, value: f.income }));
  }, [fundBreakdown]);
  const fundDonutTotal = fundDonutData.reduce((sum, d) => sum + d.value, 0);

  // 1. Export to Tally Prime CSV
  const handleExportTallyCSV = () => {
    const headers = [
      'Date',
      'Voucher Type',
      'Ledger Name',
      'Debit',
      'Credit',
      'Narration',
      'Voucher No',
      'Payment Mode',
    ];

    const rows = filteredTransactions.map((tx) => {
      const dateFormatted = tx.date ? tx.date.split('T')[0] : '';
      const voucherType = tx.type === 'Income' ? 'Receipt' : 'Payment';
      const ledgerName = tx.category || (tx.type === 'Income' ? 'Donation Account' : 'General Expenses');
      const debit = tx.type === 'Expense' ? Number(tx.amount || 0).toFixed(2) : '';
      const credit = tx.type === 'Income' ? Number(tx.amount || 0).toFixed(2) : '';
      const entity = tx.devoteeName || tx.vendorName || 'Counter Cashier';
      const narration = `"${(tx.purpose || tx.category || '').replace(/"/g, '""')} - ${entity.replace(/"/g, '""')} [Mode: ${tx.paymentMode || 'Cash'}]"`;
      const voucherNo = `"${(tx.taxReceiptNumber || tx.referenceNo || tx.id).replace(/"/g, '""')}"`;

      return [
        dateFormatted,
        voucherType,
        `"${ledgerName.replace(/"/g, '""')}"`,
        debit,
        credit,
        narration,
        voucherNo,
        `"${tx.paymentMode || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Tally_Prime_Ledger_${activeWorkspace.name?.replace(/\s+/g, '_') || 'Trust'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Tally Prime columnar CSV exported for Chartered Accountant!', 'success', 'CA & Tally Export');
  };

  // 2. Export Statement via jsPDF
  const handleExportPDF = async () => {
    try {
      showToast('Generating official Treasury Ledger Statement...', 'info');
      await generateTreasuryLedgerPDF(
        filteredTransactions,
        activeWorkspace,
        `Treasury & Fund Statement (${filterType === 'all' ? 'Consolidated' : filterType})`
      );
      showToast('Treasury Statement PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error generating Ledger PDF', 'error');
    }
  };

  // 3. Export Standard Audited CSV
  const handleExportStandardCSV = () => {
    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Fund Segregation',
      'Ledger Head',
      'Amount (INR)',
      'Entity (Donor / Vendor)',
      'Payment Mode',
      'Handled By',
      'Purpose / Sankalp',
      '80G Tax Exemption',
    ];

    const rows = filteredTransactions.map((tx) => {
      const fund = getTransactionFund(tx);
      return [
        `"${tx.id}"`,
        `"${tx.date}"`,
        `"${tx.type}"`,
        `"${fund.name} (${fund.type})"`,
        `"${tx.category}"`,
        tx.amount.toString(),
        `"${tx.devoteeName || tx.vendorName || ''}"`,
        `"${tx.paymentMode}"`,
        `"${tx.handledBy}"`,
        `"${(tx.purpose || '').replace(/"/g, '""')}"`,
        tx.is80GEligible ? 'YES' : 'NO',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Treasury_Ledger_Audited_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Audited Double-Entry CSV downloaded', 'success');
  };

  // Memo upload compression
  const handleMemoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingMemo(true);
      const compressed = await compressExpenseMemo(file);
      setVoucherMemoUrl(compressed);
      showToast('Voucher receipt memo compressed and attached', 'info');
    } catch (err) {
      console.error(err);
      showToast('Failed to compress receipt image', 'error');
    } finally {
      setIsUploadingMemo(false);
    }
  };

  // Save Voucher Entry
  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(voucherAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      showToast('Please specify a valid transaction amount', 'warning');
      return;
    }
    // Sanity cap: a single manual voucher above ₹10 Cr is almost certainly a data-entry error
    if (numAmount > 100000000) {
      showToast('Amount exceeds the ₹10 Crore single-voucher sanity cap — please verify the figure', 'error', 'Amount Too Large');
      return;
    }
    // Block future-dated vouchers: the ledger must reflect settled transactions only
    const todayStr = new Date().toISOString().slice(0, 10);
    if (voucherDate > todayStr) {
      showToast('Voucher date cannot be in the future', 'error', 'Invalid Date');
      return;
    }
    if (!voucherDate || Number.isNaN(new Date(voucherDate).getTime())) {
      showToast('Please select a valid voucher date', 'warning', 'Invalid Date');
      return;
    }

    // Duplicate-voucher guard: same amount + category + date posted within the last 10 minutes
    const nowMs = Date.now();
    const dupe = (allLedgerRecords || []).find((t) => {
      if (t.type !== voucherType || t.category !== voucherCategory) return false;
      if (Number(t.amount) !== numAmount) return false;
      if ((t.date || '').slice(0, 10) !== voucherDate) return false;
      const rawTs = typeof t.createdAt === 'number' ? t.createdAt : Date.parse(String(t.createdAt ?? ''));
      return Number.isFinite(rawTs) && nowMs - rawTs >= 0 && nowMs - rawTs < 10 * 60 * 1000;
    });
    if (dupe) {
      showToast(
        'Heads up: an identical voucher was posted in the last 10 minutes — verify this is not a double entry',
        'warning',
        'Possible Duplicate'
      );
    }

    const txId = `tx_${Date.now()}`;
    const newTx: any = {
      id: txId,
      workspaceId,
      date: voucherDate,
      type: voucherType,
      category: voucherCategory,
      amount: numAmount,
      handledBy: voucherHandledBy.trim() || 'Treasury Sevadar',
      devoteeName: voucherType === 'Income' ? voucherEntityName.trim() : undefined,
      vendorName: voucherType === 'Expense' ? voucherEntityName.trim() : undefined,
      paymentMode: voucherPaymentMode,
      referenceNo: voucherRefNo.trim() || undefined,
      purpose: voucherPurpose.trim() || `${voucherCategory} Transaction`,
      is80GEligible: voucherType === 'Income' ? voucherIs80G : false,
      taxReceiptIssued: voucherType === 'Income' && voucherIs80G,
      taxReceiptNumber: voucherType === 'Income' && voucherIs80G ? `SB-80G-${Date.now().toString().slice(-6)}` : undefined,
      memoImageUrl: voucherMemoUrl || undefined,
      auditVerified: true,
    };

    try {
      // C-8: addTreasuryTransaction returns false when the module quota blocks
      // the write — never inject the voucher locally in that case, or the
      // ledger would show money that was never persisted.
      const posted = addTreasuryTransaction(newTx);
      if (!posted) {
        showToast(
          'Voucher NOT recorded: transaction quota reached for this workspace.',
          'error',
          'Quota Reached'
        );
        return;
      }
      setTreasury((prev) => [newTx, ...prev]);
      showToast(
        `${voucherType === 'Income' ? 'Receipt' : 'Payment'} Voucher recorded on the General Ledger!`,
        'success',
        'Voucher Posted'
      );

      // Seva Suggestions — trigger (c): the first basic "Hundi Collection"
      // voucher is the moment the full dual-custody Hundi Audit desk earns
      // its place. Fires once per workspace.
      if (
        voucherCategory === 'Hundi Collection' &&
        !milestoneFired(workspaceId, 'first-hundi-collection')
      ) {
        markMilestone(workspaceId, 'first-hundi-collection');
        fireSuggestion(
          workspaceId,
          'hundi-audit',
          {
            en: 'You recorded a hundi collection — the Hundi & Golak Dual Audit desk opens it with two custodians and a tamper-proof count.',
            hi: 'आपने हुंडी संग्रह दर्ज किया — हुंडी एवं गोलक दोहरी अंकेक्षण डेस्क इसे दो संरक्षकों और छेड़छाड़-रहित गिनती के साथ खोलता है।',
            bn: 'আপনি হুন্ডি সংগ্রহ নথিভুক্ত করেছেন — হুন্ডি ও গোলক দ্বৈত নিরীক্ষা ডেস্ক দুই তত্ত্বাবধায়ক ও কারচুপি-মুক্ত গণনায় এটি খোলে।',
          },
          isModuleAvailable
        );
      }
      setShowVoucherModal(false);
      // Reset form
      setVoucherAmount('');
      setVoucherEntityName('');
      setVoucherPurpose('');
      setVoucherRefNo('');
      setVoucherMemoUrl('');
    } catch (err) {
      console.error(err);
      showToast('Failed to save voucher to ledger', 'error');
    }
  };

  return (
    <ErrorBoundary moduleName="Treasury Ledger">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-temple-950 via-temple-900 to-amber-950/70 border border-amber-500/30 p-6 rounded-3xl shadow-2xl">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                Double-Entry Treasury Ledger
              </span>
              <span className="text-xs text-temple-300 font-mono bg-temple-950/60 px-2.5 py-0.5 rounded-lg border border-temple-800">
                Charitable Trust Accounting Standard
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
              Treasury & Fund Balance Sheet
            </h2>
            <p className="text-xs sm:text-sm text-temple-400 mt-1 max-w-2xl">
              Audited double-entry ledger with Restricted vs. Unrestricted fund segregation, instant Section 80G receipts, and direct Tally Prime CSV ingestion for CAs.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <GuideButton moduleId="treasury" className="!text-amber-300 hover:!text-amber-200 hover:!bg-white/10" />
            {/* Hundi & Golak Dual Audit Desk — upsell in-context when not enabled,
                instead of a dead navigation to a blocked desk. */}
            {onNavigate &&
              (isModuleAvailable('hundi-audit') ? (
                <button
                  type="button"
                  onClick={() => onNavigate('hundi-audit')}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="Open Hundi & Golak Dual-Custody Vault & Counting Desk"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Hundi Vault Desk</span>
                </button>
              ) : (
                <ModuleUpsellCard moduleId="hundi-audit" compact onEnable={handleEnableSuggestion} />
              ))}

            {/* Tally CSV Export */}
            <button
              type="button"
              onClick={handleExportTallyCSV}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Download formatted columnar CSV for Tally Prime import"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span>Export to Tally (CSV)</span>
            </button>

            {/* Statement PDF */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-2.5 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Print Audited Statement PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Statement (PDF)</span>
            </button>

            {/* Standard CSV */}
            <button
              type="button"
              onClick={handleExportStandardCSV}
              className="px-3.5 py-2.5 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-temple-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export all rows to CSV"
            >
              <Download className="w-4 h-4" />
              <span>Full CSV</span>
            </button>

            {/* New Voucher Entry */}
            <button
              type="button"
              id="new-voucher-entry-btn"
              onClick={() => {
                setVoucherType('Expense');
                setShowVoucherModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-temple-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-600/30 transition-all transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-temple-950" />
              <span>New Voucher Entry</span>
            </button>

            {/* Quick Chanda Button (If parent passed callback) */}
            {onOpenQuickPay && (
              <button
                type="button"
                onClick={onOpenQuickPay}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>POS Chanda</span>
              </button>
            )}
          </div>
        </div>

        {/* Seva Suggestions — contextual cards fired by treasury triggers */}
        {sevaSuggestions.length > 0 && (
          <div className="space-y-3" aria-live="polite">
            {sevaSuggestions.map((s) => (
              <SuggestionCard
                key={s.key}
                suggestion={s}
                onEnable={handleEnableSuggestion}
                onDismiss={dismissSevaSuggestion}
              />
            ))}
          </div>
        )}

        {/* Top-Level Financial KPIs (3 Core Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Inflow */}
          <div className="bg-temple-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden bg-emerald-950/15">
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span className="font-bold uppercase tracking-wider">Total Income (Inflow)</span>
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
              + {formatINR(financialKPIs.totalIncome)}
            </p>
            <p className="text-[11px] text-temple-400 mt-1">Pranami, Seva, Annadanam & Hundi Collections</p>
          </div>

          {/* Total Outflow */}
          <div className="bg-temple-900/90 border border-rose-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden bg-rose-950/15">
            <div className="flex items-center justify-between text-xs text-rose-400">
              <span className="font-bold uppercase tracking-wider">Total Expenses (Outflow)</span>
              <ArrowUpRight className="w-5 h-5 text-rose-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-400 mt-2">
              - {formatINR(financialKPIs.totalExpense)}
            </p>
            <p className="text-[11px] text-temple-400 mt-1">Sevadar Honorarium, Ghee, Utilities, Maintenance</p>
          </div>

          {/* Net Treasury Balance */}
          <div className="bg-temple-900/90 border border-amber-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden bg-amber-950/15">
            <div className="flex items-center justify-between text-xs text-amber-400">
              <span className="font-bold uppercase tracking-wider">Net Available Treasury</span>
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-2">
              {formatINR(financialKPIs.netBalance)}
            </p>
            <p className="text-[11px] text-amber-400/90 mt-1 font-mono font-semibold">
              Reconciled across Bank, Cash & UPI Ledgers
            </p>
          </div>
        </div>

        {/* FUND SEGREGATION: Restricted vs. Unrestricted Funds */}
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-temple-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-temple-100">
                  Trust Fund Segregation (Restricted vs. Unrestricted)
                </h3>
                <p className="text-[11px] text-temple-400">
                  Statutory adherence to donor mandates under the Indian Trust Act & Income Tax Section 11/12
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="px-3 py-1 rounded-lg bg-temple-950 border border-temple-800">
                <span className="text-temple-400 mr-1.5">Unrestricted Corpus:</span>
                <span className="font-bold text-amber-400">
                  {formatINR(fundBreakdown.unrestrictedNet)}
                </span>
              </div>
              <div className="px-3 py-1 rounded-lg bg-temple-950 border border-temple-800">
                <span className="text-temple-400 mr-1.5">Restricted Earmarked:</span>
                <span className="font-bold text-emerald-400">
                  {formatINR(fundBreakdown.restrictedNet)}
                </span>
              </div>
            </div>
          </div>

          {/* Fund Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {fundBreakdown.funds.map((entry) => (
              <FundCard
                key={entry.fund.id}
                fund={entry.fund}
                income={entry.income}
                expense={entry.expense}
                net={entry.net}
                isSelected={selectedFundId === entry.fund.id}
                onSelect={setSelectedFundId}
              />
            ))}
          </div>
        </div>

        {/* TREASURY FLOW ANALYTICS — 8-month Income vs Expense + Trust-fund income mix */}
        {!loading &&
          (allLedgerRecords.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No Treasury Records Yet"
              description="Post your first voucher to start building the audited double-entry ledger and unlock flow analytics."
              actionLabel="Post First Voucher"
              onAction={() => setShowVoucherModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Monthly Income vs Expense */}
              <div className="lg:col-span-2 bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-temple-100">Treasury Flow Analytics</h3>
                    <p className="text-[11px] text-temple-400">
                      Monthly Income vs Expense · Last 8 months
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyFlow} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: any) => formatINR(Number(value))}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Trust-fund income mix donut */}
              <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-temple-100">Income by Trust Fund</h3>
                    <p className="text-[11px] text-temple-400">Donor-mandate segmentation</p>
                  </div>
                </div>
                {fundDonutData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={fundDonutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="58%"
                          outerRadius="88%"
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {fundDonutData.map((entry, i) => (
                            <Cell
                              key={entry.name}
                              fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value: any, name: any) => [formatINR(Number(value)), String(name)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="mt-2 space-y-1.5">
                      {fundDonutData.map((entry, i) => (
                        <li key={entry.name} className="flex items-center gap-2 text-[11px]">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                          />
                          <span className="text-temple-300 truncate flex-1">{entry.name}</span>
                          <span className="font-mono font-bold text-temple-100">
                            {fundDonutTotal > 0 ? ((entry.value / fundDonutTotal) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 pt-2 border-t border-temple-800 text-[11px] text-temple-400 flex justify-between">
                      <span>Total inflow:</span>
                      <span className="font-mono font-bold text-amber-300">{formatINR(fundDonutTotal)}</span>
                    </p>
                  </>
                ) : (
                  <div className="flex-1 flex items-center">
                    <EmptyState
                      icon={Layers}
                      title="No Fund Inflows Yet"
                      description="Income will be segmented by trust fund once donations are recorded."
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

        {/* Filters & Search Toolbar */}
        <div className="bg-temple-900/90 border border-temple-800 p-4 rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-temple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Voucher ID, Category, Donor, Vendor, Custody, or Narration..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-temple-950/80 border border-temple-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-temple-100 placeholder-temple-500 focus:outline-none focus:border-amber-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-temple-950/80 border border-temple-700/80 rounded-xl px-2.5 py-1.5 text-xs text-temple-300">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-temple-400 text-[11px]">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-temple-100 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-temple-950/80 border border-temple-700/80 rounded-xl px-2.5 py-1.5 text-xs text-temple-300">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-temple-400 text-[11px]">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-temple-100 text-xs focus:outline-none"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-temple-800 hover:bg-temple-750 text-temple-300 text-xs font-semibold"
                >
                  Clear Dates
                </button>
              )}

              {dateRangeInvalid && (
                <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Start date is after end date — date filter ignored.</span>
                </p>
              )}
            </div>
          </div>

          {/* Quick Filter Tabs: Transaction Type & Category */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-temple-800/80">
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Switcher */}
              <div className="flex items-center gap-1 bg-temple-950 p-1 rounded-xl border border-temple-800">
                {(['all', 'Income', 'Expense'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterType === type
                        ? type === 'Income'
                          ? 'bg-emerald-500 text-temple-950'
                          : type === 'Expense'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-temple-950'
                        : 'text-temple-400 hover:text-temple-200'
                    }`}
                  >
                    {type === 'all' ? 'All Vouchers' : type === 'Income' ? 'Receipts (Income)' : 'Payments (Expense)'}
                  </button>
                ))}
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-temple-950 border border-temple-700/80 text-temple-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">-- All Ledger Heads --</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset All Filters button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-amber-400 hover:underline font-bold px-2"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-temple-400">
                Showing <span className="font-bold text-amber-400">{filteredTransactions.length}</span> of{' '}
                {allLedgerRecords.length} entries
              </div>
              <DataExportButton
                filename="Treasury_Ledger_Filtered"
                headers={[
                  'Date',
                  'Voucher / Ref ID',
                  'Type',
                  'Ledger Head',
                  'Fund',
                  'Amount (INR)',
                  'Entity (Donor / Payee)',
                  'Payment Mode',
                  'Handled By',
                  'Purpose',
                ]}
                rows={filteredTransactions.map((tx) => {
                  const fund = getTransactionFund(tx);
                  return [
                    tx.date ? tx.date.split('T')[0] : '',
                    tx.taxReceiptNumber || tx.referenceNo || tx.id,
                    tx.type,
                    tx.category || 'General Ledger',
                    `${fund.name} (${fund.type})`,
                    Number(tx.amount || 0).toFixed(2),
                    tx.devoteeName || tx.vendorName || '',
                    tx.paymentMode || 'Cash',
                    tx.handledBy || 'Admin',
                    tx.purpose || '',
                  ];
                })}
                label="Export Filtered CSV"
              />
            </div>
          </div>
        </div>

        {/* HIGH-DENSITY PROFESSIONAL DATA TABLE */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </div>
            <TableSkeleton rows={8} />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl">
            <EmptyState
              icon={Receipt}
              title={hasActiveFilters ? 'No Records Match These Filters' : 'No Treasury Records Yet'}
              description={
                hasActiveFilters
                  ? 'Try widening your date range or clearing the search and fund filters.'
                  : 'Post your first voucher to begin the audited double-entry ledger.'
              }
              actionLabel={hasActiveFilters ? 'Reset All Filters' : 'Post First Voucher'}
              onAction={hasActiveFilters ? resetFilters : () => setShowVoucherModal(true)}
            />
          </div>
        ) : (
          <div className="bg-temple-900/90 border border-temple-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs text-temple-200">
              <thead className="bg-temple-950/90 text-temple-400 border-b border-temple-800 text-[11px] uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-3">Voucher / Ref ID</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Ledger Head & Fund</th>
                  <th className="py-3.5 px-3">Payment Mode</th>
                  <th className="py-3.5 px-3">Entity (Donor / Payee)</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-temple-800/60 font-medium">
                {filteredTransactions.map((tx, idx) => {
                    const isIncome = tx.type === 'Income';
                    const fund = getTransactionFund(tx);
                    const entityName = tx.devoteeName || tx.vendorName || '-';

                    return (
                      <tr
                        key={`${tx.id}-${idx}`}
                        className="hover:bg-temple-800/40 transition-colors"
                      >
                        {/* Date */}
                        <td className="py-3 px-4 font-mono text-temple-300 whitespace-nowrap">
                          {formatDateIST(tx.date)}
                        </td>

                        {/* Voucher / Ref ID */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono">
                          <p className="font-bold text-amber-300">
                            {tx.taxReceiptNumber || tx.referenceNo || tx.id}
                          </p>
                          <p className="text-[10px] text-temple-500">{tx.id}</p>
                        </td>

                        {/* Transaction Type Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                              isIncome
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isIncome ? 'Receipt' : 'Payment'}
                          </span>
                        </td>

                        {/* Ledger Head (Category) & Fund Tag */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-temple-100">{tx.category || 'General Ledger'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                fund.type === 'Unrestricted'
                                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {fund.name}
                            </span>
                            <span className="text-[10px] text-temple-400 truncate max-w-[160px]">
                              {tx.purpose}
                            </span>
                          </div>
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-temple-800 text-temple-300 text-[11px] font-mono border border-temple-700">
                            {tx.paymentMode || 'Cash'}
                          </span>
                        </td>

                        {/* Entity (Donor / Vendor / Payee) */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-temple-100 truncate max-w-[180px]">
                            {entityName}
                          </p>
                          <p className="text-[10px] text-temple-400">
                            Handled by: <span className="text-temple-300">{tx.handledBy || 'Admin'}</span>
                          </p>
                        </td>

                        {/* Amount: Green for Income, Red for Expense */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-black font-mono text-sm sm:text-base ${
                              isIncome ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'} ₹{(tx.amount || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {tx.is80GEligible && (
                            <div className="text-[9px] font-mono text-amber-400 mt-0.5">
                              80G Tax Deductible
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Memo Image thumbnail if attached */}
                            {tx.memoImageUrl && (
                              <button
                                type="button"
                                onClick={() => setSelectedMemoUrl(tx.memoImageUrl!)}
                                className="p-1.5 rounded-lg bg-temple-800 hover:bg-temple-750 text-temple-300 hover:text-amber-300 transition-colors"
                                title="View Attached Payment Memo"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                              </button>
                            )}

                            {/* Thermal print slip */}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await printThermalReceipt(tx, activeWorkspace);
                                  showToast('Thermal voucher slip dispatched', 'info');
                                } catch (e) {
                                  showToast('Print error', 'error');
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-temple-800 hover:bg-temple-750 text-indigo-300 hover:text-white border border-temple-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Print 80mm Counter Voucher"
                            >
                              <span>Slip</span>
                            </button>

                            {/* 80G Tax PDF for Incomes */}
                            {isIncome && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    showToast('Compiling 80G Certificate...', 'info');
                                    await generateTaxReceiptPDF(tx, activeWorkspace);
                                    showToast('80G Certificate downloaded', 'success');
                                  } catch (e) {
                                    showToast('Failed to generate PDF', 'error');
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-temple-950 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-all"
                                title="Download Section 80G Receipt"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>80G</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* ATTACHED MEMO MODAL */}
        {selectedMemoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/85 backdrop-blur-md">
            <div className="bg-temple-900 border border-temple-700 rounded-2xl max-w-md w-full p-4 text-temple-100 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-temple-800 mb-3">
                <h4 className="font-bold text-xs">Attached Payment Memo / Voucher Photo</h4>
                <button
                  type="button"
                  onClick={() => setSelectedMemoUrl(null)}
                  className="text-temple-400 hover:text-temple-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={selectedMemoUrl || undefined}
                alt="Payment Memo"
                className="rounded-xl w-full max-h-96 object-contain border border-temple-800"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* NEW VOUCHER ENTRY MODAL */}
        {showVoucherModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/85 backdrop-blur-md animate-in fade-in">
            <div className="bg-temple-900 border border-amber-500/40 rounded-3xl w-full max-w-xl shadow-2xl p-6 text-temple-200 max-h-[92vh] overflow-y-auto custom-scrollbar">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-amber-300 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-amber-400" />
                    New General Ledger Voucher Entry
                  </h3>
                  <p className="text-xs text-temple-400 mt-0.5">
                    Log double-entry disbursements, priest honorariums, vendor bills, or manual receipts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="p-1.5 rounded-xl bg-temple-800 hover:bg-temple-700 text-temple-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveVoucher} className="space-y-4">
                {/* Voucher Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-temple-300 uppercase mb-1.5">
                    Voucher Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherType('Expense');
                        setVoucherCategory('Utilities & Maintenance');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                        voucherType === 'Expense'
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/25'
                          : 'bg-temple-950 text-temple-400 border-temple-800 hover:border-temple-700'
                      }`}
                    >
                      Payment Voucher (Expense Outflow)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherType('Income');
                        setVoucherCategory('Chanda / General Donation');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                        voucherType === 'Income'
                          ? 'bg-emerald-500 text-temple-950 border-emerald-400 shadow-md shadow-emerald-500/25'
                          : 'bg-temple-950 text-temple-400 border-temple-800 hover:border-temple-700'
                      }`}
                    >
                      Receipt Voucher (Income Inflow)
                    </button>
                  </div>
                </div>

                {/* Amount & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-temple-950 border border-temple-700/80 rounded-xl px-3.5 py-2 text-base font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                      Voucher Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="w-full bg-temple-950 border border-temple-700/80 rounded-xl px-3.5 py-2 text-sm text-temple-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Ledger Head & Fund Segregation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                      Ledger Head / Category *
                    </label>
                    <select
                      value={voucherCategory}
                      onChange={(e) => setVoucherCategory(e.target.value)}
                      className="w-full bg-temple-950 border border-temple-700/80 rounded-xl px-3 py-2 text-xs text-temple-200 focus:outline-none focus:border-amber-500"
                    >
                      {voucherType === 'Expense' ? (
                        <>
                          <option value="Staff / Priest Honorarium">Staff / Priest (Purohit) Honorarium</option>
                          <option value="Utilities & Maintenance">Utilities, Electricity & Temple Water</option>
                          <option value="Groceries & Mandir Supplies">Groceries, Ghee & Samagri</option>
                          <option value="Flower & Decoration Seva">Flower Garland & Sanctum Decor</option>
                          <option value="Prasadam & Annadanam Kitchen">Prasadam & Annadanam Kitchen Expenses</option>
                          <option value="Gaushala Maintenance">Gaushala & Fodder Purchases</option>
                          <option value="Mandir Construction & Civil Work">Mandir Construction & Civil Work</option>
                          <option value="Legal & Audit Professional Fees">Legal, Trust & Audit Professional Fees</option>
                          <option value="Miscellaneous Temple Expense">Miscellaneous Temple Expense</option>
                        </>
                      ) : (
                        <>
                          <option value="Chanda / General Donation">Chanda / General Donation</option>
                          <option value="Annadanam Sponsorship">Annadanam Sponsorship</option>
                          <option value="Mandir Nirman Fund">Mandir Nirman Fund</option>
                          <option value="Gau Seva Nidhi">Gau Seva Nidhi</option>
                          <option value="Pooja Dakshina">Pooja Dakshina</option>
                          <option value="Hundi Collection">Hundi (Golak) Collection</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                      Fund Allocation Tag
                    </label>
                    <select
                      value={voucherFundId}
                      onChange={(e) => setVoucherFundId(e.target.value)}
                      className="w-full bg-temple-950 border border-temple-700/80 rounded-xl px-3 py-2 text-xs text-temple-200 focus:outline-none focus:border-amber-500"
                    >
                      {TRUST_FUNDS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Entity (Donor / Vendor Name) */}
                <div>
                  <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                    {voucherType === 'Expense' ? 'Payee / Vendor Name *' : 'Devotee / Donor Name *'}
                  </label>
                  <MemberSearchSelect
                    value={voucherEntityName}
                    onChange={(name) => setVoucherEntityName(name)}
                    placeholder={
                      voucherType === 'Expense'
                        ? 'Vendor or Payee (e.g. Ramesh Purohit, Shiv Florist)'
                        : 'Donor Name'
                    }
                  />
                </div>

                {/* Payment Mode & Ref / UTR */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={voucherPaymentMode}
                      onChange={(e) => setVoucherPaymentMode(e.target.value)}
                      className="w-full bg-temple-950 border border-temple-700/80 rounded-xl px-3 py-2 text-xs text-temple-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Demand Draft">Demand Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                      Cheque / UTR / Voucher Ref No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR123456 / CHQ-00123"
                      value={voucherRefNo}
                      onChange={(e) => setVoucherRefNo(e.target.value)}
                      className="w-full bg-temple-950 border border-temple-700/80 rounded-xl px-3 py-2 text-xs text-temple-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Purpose / Narration */}
                <div>
                  <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                    Narration / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Specific purpose for CA audit trail and Tally narration..."
                    value={voucherPurpose}
                    onChange={(e) => setVoucherPurpose(e.target.value)}
                    className="w-full bg-temple-950 border border-temple-700/80 rounded-xl px-3 py-2 text-xs text-temple-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Custody Handled By */}
                <div>
                  <label className="block text-xs font-bold text-temple-300 uppercase mb-1">
                    Custody (Handled By)
                  </label>
                  <input
                    type="text"
                    required
                    value={voucherHandledBy}
                    onChange={(e) => setVoucherHandledBy(e.target.value)}
                    className="w-full bg-temple-950 border border-temple-700/80 rounded-xl px-3 py-2 text-xs text-temple-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 80G Tax Exemption Toggle (For Incomes) */}
                {voucherType === 'Income' && (
                  <div className="pt-2 border-t border-temple-800">
                    <label className="flex items-center gap-2 text-xs text-temple-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={voucherIs80G}
                        onChange={(e) => setVoucherIs80G(e.target.checked)}
                        className="rounded bg-temple-950 border-temple-700 text-amber-500 focus:ring-0"
                      />
                      <span className="font-semibold text-amber-300">
                        Mark as Section 80G(5)(vi) Tax Exemption Eligible
                      </span>
                    </label>
                  </div>
                )}

                {/* Voucher Memo Photo Attachment */}
                <div className="pt-2 border-t border-temple-800">
                  <label className="block text-xs font-bold text-temple-400 mb-1">
                    Attach Bill / Invoice / Voucher Photo (Compressed locally)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMemoUpload}
                    className="w-full text-xs text-temple-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-temple-800 file:text-temple-300 hover:file:bg-temple-750 cursor-pointer"
                  />
                  {voucherMemoUrl && (
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Voucher photo compressed and attached
                    </p>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-temple-800">
                  <button
                    type="button"
                    onClick={() => setShowVoucherModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-temple-800 hover:bg-temple-750 text-temple-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-temple-950 font-black text-xs shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                  >
                    Post Voucher to General Ledger
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
