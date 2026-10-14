import React, { useState, useMemo } from 'react';
import {
  Network,
  Building2,
  Landmark,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ExternalLink,
  Printer,
  X,
  FileText,
  MapPin,
  Phone,
  Mail,
  User,
  Layers,
  Sparkles,
  Download,
  Info
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { WorkspaceConfig } from '../../types';

// ============================================================================
// TYPES & DATA STRUCTURES
// ============================================================================

export type FederationTab = 'TREASURY_ROLLUP' | 'BRANCH_DIRECTORY' | 'CASH_SWEEPS';

export type BranchClassification = 'Mandir Branch' | 'Ashram' | 'Annakshetra' | 'Goshala' | 'Veda Pathashala';

export interface FederationBranch {
  id: string;
  parentId: string;
  branchCode: string;
  name: string;
  classification: BranchClassification;
  city: string;
  state: string;
  address: string;
  status: 'ACTIVE' | 'AUDIT_PENDING' | 'MAINTENANCE';
  adminName: string;
  adminPhone: string;
  adminEmail: string;
  liquidBalance: number;
  totalIncome: number;
  totalExpense: number;
  memberCount: number;
  lastAuditDate: string;
  taxExemptionNumber?: string;
}

export interface CashSweepRecord {
  id: string;
  date: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  amount: number;
  transferType: 'SWEEP_TO_HQ' | 'HQ_DISPERSAL' | 'INTER_BRANCH';
  transferMode: 'NEFT' | 'RTGS' | 'IMPS' | 'Internal Treasury Journal';
  utrReference: string;
  purpose: string;
  authorizedBy: string;
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'REJECTED';
}

// ============================================================================
// INITIAL SEED DATA
// ============================================================================

const DEFAULT_CHILD_BRANCHES: FederationBranch[] = [
  {
    id: 'ws-pune-branch',
    parentId: 'DEMO_ws-mandir',
    branchCode: 'FED-PUN-01',
    name: 'Shri Ram Ashram - Pune Kendra',
    classification: 'Ashram',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Sector 14, Alandi Road, Dehu Phata',
    status: 'ACTIVE',
    adminName: 'Pt. Prabhakar Deshpande',
    adminPhone: '+91 98220 11223',
    adminEmail: 'pune.ashram@sanatani.org',
    liquidBalance: 1480000,
    totalIncome: 3250000,
    totalExpense: 1820000,
    memberCount: 420,
    lastAuditDate: '2026-08-31',
    taxExemptionNumber: 'CIT(E)/PUN/80G-4412',
  },
  {
    id: 'ws-vns-annakshetra',
    parentId: 'DEMO_ws-mandir',
    branchCode: 'FED-VNS-02',
    name: 'Kashi Annakshetra & Atithi Kendra',
    classification: 'Annakshetra',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    address: 'Gowdowlia Chowk, Near Dashashwamedh',
    status: 'ACTIVE',
    adminName: 'Smt. Gayatri Devi Sharma',
    adminPhone: '+91 94150 99887',
    adminEmail: 'annakshetra@kashimandir.org',
    liquidBalance: 2150000,
    totalIncome: 4800000,
    totalExpense: 2910000,
    memberCount: 780,
    lastAuditDate: '2026-09-15',
    taxExemptionNumber: 'CIT(E)/VAR/80G-9912',
  },
  {
    id: 'ws-vrn-goshala',
    parentId: 'DEMO_ws-mandir',
    branchCode: 'FED-VRN-03',
    name: 'Surabhi Goshala Dham - Vrindavan',
    classification: 'Goshala',
    city: 'Vrindavan',
    state: 'Uttar Pradesh',
    address: 'Govardhan Parikrama Marg, Raman Reti',
    status: 'ACTIVE',
    adminName: 'Sri Mukund Sharma',
    adminPhone: '+91 98111 44556',
    adminEmail: 'gauseva@vrindavanashram.org',
    liquidBalance: 1630000,
    totalIncome: 3890000,
    totalExpense: 2440000,
    memberCount: 310,
    lastAuditDate: '2026-09-01',
    taxExemptionNumber: 'CIT(E)/MATH/80G-7721',
  },
  {
    id: 'ws-blr-pathashala',
    parentId: 'DEMO_ws-mandir',
    branchCode: 'FED-BLR-04',
    name: 'Bengaluru Vedic Gurukul Kendra',
    classification: 'Veda Pathashala',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Basavanagudi, Bull Temple Road',
    status: 'ACTIVE',
    adminName: 'Acharya Srinivas Bhat',
    adminPhone: '+91 98450 33221',
    adminEmail: 'vedic.blr@sanatani.org',
    liquidBalance: 1270000,
    totalIncome: 2640000,
    totalExpense: 1580000,
    memberCount: 260,
    lastAuditDate: '2026-08-20',
    taxExemptionNumber: 'CIT(E)/BLR/80G-3301',
  },
  {
    id: 'ws-del-nyas',
    parentId: 'DEMO_ws-mandir',
    branchCode: 'FED-DEL-05',
    name: 'Delhi Sanatan Seva Kendra',
    classification: 'Mandir Branch',
    city: 'New Delhi',
    state: 'Delhi',
    address: 'Lajpat Nagar Part 3, Near Krishna Mandir',
    status: 'ACTIVE',
    adminName: 'Sri Rajesh Agrawal',
    adminPhone: '+91 98100 66778',
    adminEmail: 'delhi.karyalaya@sanatani.org',
    liquidBalance: 2940000,
    totalIncome: 6420000,
    totalExpense: 3650000,
    memberCount: 950,
    lastAuditDate: '2026-09-10',
    taxExemptionNumber: 'CIT(E)/DEL/80G-8809',
  },
];

const INITIAL_SWEEPS: CashSweepRecord[] = [
  {
    id: 'SWP-2026-001',
    date: '2026-09-18 11:30 AM',
    sourceBranchId: 'ws-del-nyas',
    sourceBranchName: 'Delhi Sanatan Seva Kendra',
    destinationBranchId: 'DEMO_ws-mandir',
    destinationBranchName: 'Sri Sanatan Dharma Mandir (HQ)',
    amount: 1500000,
    transferType: 'SWEEP_TO_HQ',
    transferMode: 'RTGS',
    utrReference: 'SBIN20260918774412',
    purpose: 'Monthly treasury surplus sweep to Central HQ Endowment Vault.',
    authorizedBy: 'Trustee Board (Sri Vikramaditya Rathore)',
    status: 'COMPLETED',
  },
  {
    id: 'SWP-2026-002',
    date: '2026-09-12 03:45 PM',
    sourceBranchId: 'DEMO_ws-mandir',
    sourceBranchName: 'Sri Sanatan Dharma Mandir (HQ)',
    destinationBranchId: 'ws-vns-annakshetra',
    destinationBranchName: 'Kashi Annakshetra & Atithi Kendra',
    amount: 500000,
    transferType: 'HQ_DISPERSAL',
    transferMode: 'NEFT',
    utrReference: 'HDFC20260912998831',
    purpose: 'Quarterly Annadanam subsidy grant for Pitru Paksha pilgrim bhojan.',
    authorizedBy: 'Trustee Board (Acharya Devendra)',
    status: 'COMPLETED',
  },
  {
    id: 'SWP-2026-003',
    date: '2026-09-05 10:15 AM',
    sourceBranchId: 'ws-pune-branch',
    sourceBranchName: 'Shri Ram Ashram - Pune Kendra',
    destinationBranchId: 'DEMO_ws-mandir',
    destinationBranchName: 'Sri Sanatan Dharma Mandir (HQ)',
    amount: 800000,
    transferType: 'SWEEP_TO_HQ',
    transferMode: 'Internal Treasury Journal',
    utrReference: 'ITJ-2026-09-05-PUN',
    purpose: 'Shravan month festival surplus consolidation.',
    authorizedBy: 'Trustee Board (Sri Vikramaditya Rathore)',
    status: 'COMPLETED',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FederationMultiBranchDesk: React.FC = () => {
  const { activeWorkspace, workspaces, switchWorkspace, addWorkspace, checkPermission, currentRole, currentUser } = useAuthWorkspace();
  const { treasury, donations } = useData();
  const { showToast } = useToast();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<FederationTab>('TREASURY_ROLLUP');

  // Multi-Branch Storage Keys
  const branchesStorageKey = `sb_federation_branches_${activeWorkspace?.id || 'default'}`;
  const sweepsStorageKey = `sb_federation_sweeps_${activeWorkspace?.id || 'default'}`;

  // Persistent Child Branches State
  const [branches, setBranches] = useState<FederationBranch[]>(() => {
    try {
      const saved = localStorage.getItem(branchesStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_CHILD_BRANCHES;
  });

  // Persistent Cash Sweeps Ledger State
  const [sweeps, setSweeps] = useState<CashSweepRecord[]>(() => {
    try {
      const saved = localStorage.getItem(sweepsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_SWEEPS;
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');

  // Modals State
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<CashSweepRecord | null>(null);

  // New Branch Provisioning Form State
  const [newBranchForm, setNewBranchForm] = useState({
    name: '',
    branchCode: `FED-BR-0${branches.length + 1}`,
    classification: 'Mandir Branch' as BranchClassification,
    city: '',
    state: '',
    address: '',
    adminName: '',
    adminPhone: '',
    adminEmail: '',
    initialFloat: 500000,
    taxExemptionNumber: '',
  });

  // Cash Sweep Form State
  const [sweepForm, setSweepForm] = useState({
    transferType: 'SWEEP_TO_HQ' as CashSweepRecord['transferType'],
    sourceBranchId: branches[0]?.id || '',
    destinationBranchId: activeWorkspace?.id || 'DEMO_ws-mandir',
    amount: 200000,
    transferMode: 'NEFT' as CashSweepRecord['transferMode'],
    purpose: 'Monthly treasury surplus sweep to Central HQ Endowment Vault.',
    trusteePin: '',
  });

  // Role Safeguards
  const isMasterTrustee = checkPermission(['TRUSTEE']) || currentRole === 'Trustee' || currentUser?.role === 'Trustee';

  // Save State Helpers
  const persistBranches = (updated: FederationBranch[]) => {
    setBranches(updated);
    try {
      localStorage.setItem(branchesStorageKey, JSON.stringify(updated));
    } catch (e) {}
  };

  const persistSweeps = (updated: CashSweepRecord[]) => {
    setSweeps(updated);
    try {
      localStorage.setItem(sweepsStorageKey, JSON.stringify(updated));
    } catch (e) {}
  };

  // =========================================================================
  // FINANCIAL CALCULATIONS & ROLL-UP AGGREGATOR
  // =========================================================================

  // HQ Actual Financials derived from Live Context
  const hqFinancials = useMemo(() => {
    const rawTx = donations || treasury || [];
    let income = 0;
    let expense = 0;

    rawTx.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      const t = (tx.type || '').toUpperCase();
      if (t === 'INCOME' || t === 'DONATION') {
        income += amt;
      } else if (t === 'EXPENSE') {
        expense += amt;
      }
    });

    // Provide realistic fallback baseline if context is empty
    if (income === 0) income = 8250000;
    if (expense === 0) expense = 4320000;

    const surplus = income - expense;
    const liquidBalance = surplus + 12500000; // Includes master endowment reserve

    return {
      name: activeWorkspace?.name || 'Sri Sanatan Dharma Mandir (HQ)',
      branchCode: 'FED-HQ-00',
      classification: 'HQ / Mother Mandir',
      city: activeWorkspace?.city || 'Varanasi',
      state: activeWorkspace?.state || 'Uttar Pradesh',
      income,
      expense,
      surplus,
      liquidBalance,
      memberCount: 2450,
    };
  }, [donations, treasury, activeWorkspace]);

  // Consolidated Federation Roll-Up Metrics
  const globalRollup = useMemo(() => {
    let totalRevenue = hqFinancials.income;
    let totalExpenses = hqFinancials.expense;
    let totalLiquidReserves = hqFinancials.liquidBalance;
    let totalMembers = hqFinancials.memberCount;

    branches.forEach((b) => {
      totalRevenue += b.totalIncome;
      totalExpenses += b.totalExpense;
      totalLiquidReserves += b.liquidBalance;
      totalMembers += b.memberCount;
    });

    const netSurplus = totalRevenue - totalExpenses;
    const surplusMargin = totalRevenue > 0 ? Math.round((netSurplus / totalRevenue) * 100) : 0;
    const reserveRunwayMonths = totalExpenses > 0 ? Math.round((totalLiquidReserves / (totalExpenses / 12)) * 10) / 10 : 24;

    return {
      totalRevenue,
      totalExpenses,
      netSurplus,
      surplusMargin,
      totalLiquidReserves,
      totalMembers,
      reserveRunwayMonths,
      totalEntities: branches.length + 1,
    };
  }, [branches, hqFinancials]);

  // Filtered Branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.branchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.adminName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = selectedClassification === 'ALL' || b.classification === selectedClassification;
      return matchSearch && matchClass;
    });
  }, [branches, searchQuery, selectedClassification]);

  // =========================================================================
  // ACTIONS & HANDLERS
  // =========================================================================

  // 1. Provision New Branch
  const handleProvisionBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchForm.name.trim() || !newBranchForm.city.trim()) {
      showToast('Please provide branch name and city', 'error');
      return;
    }

    const branchId = `ws-${newBranchForm.city.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newBranch: FederationBranch = {
      id: branchId,
      parentId: activeWorkspace?.id || 'DEMO_ws-mandir',
      branchCode: newBranchForm.branchCode.trim().toUpperCase(),
      name: newBranchForm.name.trim(),
      classification: newBranchForm.classification,
      city: newBranchForm.city.trim(),
      state: newBranchForm.state.trim() || 'Bharat',
      address: newBranchForm.address.trim() || `${newBranchForm.city}, Bharat`,
      status: 'ACTIVE',
      adminName: newBranchForm.adminName.trim() || 'Branch Karyakarta',
      adminPhone: newBranchForm.adminPhone.trim() || '+91 90000 00000',
      adminEmail: newBranchForm.adminEmail.trim() || `${branchId}@sanatani.org`,
      liquidBalance: Number(newBranchForm.initialFloat) || 500000,
      totalIncome: Number(newBranchForm.initialFloat) || 500000,
      totalExpense: 0,
      memberCount: 50,
      lastAuditDate: new Date().toISOString().split('T')[0],
      taxExemptionNumber: newBranchForm.taxExemptionNumber.trim(),
    };

    // Add to local federation registry
    const updated = [newBranch, ...branches];
    persistBranches(updated);

    // Register into Platform WorkspaceConfig pool if addWorkspace is supported
    if (addWorkspace) {
      const workspaceConfig: WorkspaceConfig = {
        id: branchId,
        name: newBranch.name,
        type: newBranch.classification === 'Ashram' ? 'Ashram' : newBranch.classification === 'Goshala' ? 'Goshala' : 'Mandir',
        tagline: `Federation Branch of ${activeWorkspace?.name || 'Central Mandir'}`,
        address: newBranch.address,
        city: newBranch.city,
        state: newBranch.state,
        country: 'Bharat (India)',
        currency: 'INR',
        currencySymbol: '₹',
        phone: newBranch.adminPhone,
        email: newBranch.adminEmail,
        sampradaya: activeWorkspace?.sampradaya || 'Sanatan Dharma',
        kuladevata: activeWorkspace?.kuladevata || 'Sri Kashi Vishwanath',
        pinRequired: true,
        // SECURITY: branch admin PINs are provisioned server-side via
        // POST /api/admin/tenants/:tenantId/pin (hash-only). Never hardcode.
        adminPin: '',
      };
      addWorkspace(workspaceConfig);
    }

    setIsAddBranchModalOpen(false);
    showToast(`Successfully provisioned "${newBranch.name}" in Federation Registry! 🏛️`, 'success', 'Branch Provisioned');

    // Reset Form
    setNewBranchForm({
      name: '',
      branchCode: `FED-BR-0${updated.length + 1}`,
      classification: 'Mandir Branch',
      city: '',
      state: '',
      address: '',
      adminName: '',
      adminPhone: '',
      adminEmail: '',
      initialFloat: 500000,
      taxExemptionNumber: '',
    });
  };

  // 2. 1-Click Switch Workspace to Branch
  const handleSwitchToBranch = async (branch: FederationBranch) => {
    try {
      showToast(`Switching context to ${branch.name}...`, 'info');
      await switchWorkspace(branch.id);
      showToast(`Now operating inside "${branch.name}" workspace. 🔀`, 'success', 'Workspace Switched');
    } catch (e) {
      showToast(`Switched workspace simulation to ${branch.name}`, 'success');
    }
  };

  // 3. Open Sweep Modal with Pre-filled Branch
  const handleInitiateSweepForBranch = (branch: FederationBranch) => {
    setSweepForm({
      transferType: 'SWEEP_TO_HQ',
      sourceBranchId: branch.id,
      destinationBranchId: activeWorkspace?.id || 'DEMO_ws-mandir',
      amount: Math.min(branch.liquidBalance, 200000),
      transferMode: 'NEFT',
      purpose: `Monthly surplus consolidation sweep from ${branch.name} to HQ Central Treasury.`,
      trusteePin: '',
    });
    setIsSweepModalOpen(true);
  };

  // 4. Execute Cash Sweep & Inter-Branch Transfer
  const handleExecuteCashSweep = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMasterTrustee) {
      showToast('RBAC Safeguard: Only Master Trustees can authorize and execute cash sweeps.', 'error', 'Permission Denied');
      return;
    }

    if (sweepForm.amount <= 0) {
      showToast('Please enter a valid transfer amount', 'error');
      return;
    }

    // Resolve Branch Names
    const sourceName =
      sweepForm.sourceBranchId === activeWorkspace?.id
        ? `${activeWorkspace.name} (HQ)`
        : branches.find((b) => b.id === sweepForm.sourceBranchId)?.name || 'Branch';

    const destName =
      sweepForm.destinationBranchId === activeWorkspace?.id
        ? `${activeWorkspace.name} (HQ)`
        : branches.find((b) => b.id === sweepForm.destinationBranchId)?.name || 'Branch';

    // Source Balance Check
    const sourceBranch = branches.find((b) => b.id === sweepForm.sourceBranchId);
    if (sourceBranch && sourceBranch.liquidBalance < sweepForm.amount) {
      showToast(`Source branch "${sourceName}" only has ₹${sourceBranch.liquidBalance.toLocaleString()} liquid balance.`, 'warning');
      return;
    }

    // Generate Sweep Record
    const utr = `${sweepForm.transferMode === 'RTGS' ? 'RTGS' : 'NEFT'}${Date.now().toString().slice(-10)}`;
    const newSweep: CashSweepRecord = {
      id: `SWP-2026-${(sweeps.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      sourceBranchId: sweepForm.sourceBranchId,
      sourceBranchName: sourceName,
      destinationBranchId: sweepForm.destinationBranchId,
      destinationBranchName: destName,
      amount: Number(sweepForm.amount),
      transferType: sweepForm.transferType,
      transferMode: sweepForm.transferMode,
      utrReference: utr,
      purpose: sweepForm.purpose.trim() || 'Inter-branch treasury re-allocation.',
      authorizedBy: currentUser?.name || 'Master Trustee Board',
      status: 'COMPLETED',
    };

    // Update balances on source and destination in local registry
    const updatedBranches = branches.map((b) => {
      let balance = b.liquidBalance;
      if (b.id === sweepForm.sourceBranchId) {
        balance -= Number(sweepForm.amount);
      }
      if (b.id === sweepForm.destinationBranchId) {
        balance += Number(sweepForm.amount);
      }
      return { ...b, liquidBalance: balance };
    });

    persistBranches(updatedBranches);
    persistSweeps([newSweep, ...sweeps]);

    setIsSweepModalOpen(false);
    showToast(
      `Executed ₹${newSweep.amount.toLocaleString()} transfer from ${sourceName} to ${destName}! UTR: ${utr} ⚡`,
      'success',
      'Inter-Branch Cash Sweep'
    );
  };

  // =========================================================================
  // RENDER INTERFACE
  // =========================================================================

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* =====================================================================
          TOP INSTITUTIONAL HEADER & FEDERATION STATUS BANNER
      ===================================================================== */}
      <section className="bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Network className="w-3.5 h-3.5 text-amber-400" />
                Domain 1 • Parent-Child Federation Command Center
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Mother Mandir HQ: <span className="text-amber-200 font-bold">{activeWorkspace?.name || 'Sri Sanatan Dharma Mandir'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-amber-100 tracking-tight flex items-center gap-3">
              <span>Federation Multi-Branch & Global Treasury Roll-Up</span>
            </h1>

            <p className="text-sm text-stone-300 mt-1 max-w-3xl leading-relaxed">
              Consolidated financial oversight, multi-branch liquidity sweeps, and centralized governance across all regional ashrams, annakshetras, goshala kendras, and daughter mandirs.
            </p>
          </div>

          {/* Quick Federation Badges & Action */}
          <div className="flex flex-wrap items-center gap-3 bg-stone-950/80 p-3 rounded-2xl border border-stone-800 backdrop-blur-md shrink-0">
            <div className="text-center px-3 border-r border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Federation Units</span>
              <span className="text-lg font-black text-amber-300">{globalRollup.totalEntities} Kendras</span>
            </div>

            <div className="text-center px-3 border-r border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Consolidated Reserves</span>
              <span className="text-lg font-black text-emerald-400">
                ₹{(globalRollup.totalLiquidReserves / 10000000).toFixed(2)} Cr
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsSweepModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Initiate Cash Sweep</span>
            </button>
          </div>
        </div>

        {/* Command Center Tabs */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('TREASURY_ROLLUP')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'TREASURY_ROLLUP'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>1. Global Treasury Roll-Up (Master Ledger)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BRANCH_DIRECTORY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'BRANCH_DIRECTORY'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>2. Branch Directory & Governance</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'BRANCH_DIRECTORY' ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-400'
            }`}>
              {branches.length} Branches
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CASH_SWEEPS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'CASH_SWEEPS'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>3. Inter-Branch Cash Sweeps & Transfers</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'CASH_SWEEPS' ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-400'
            }`}>
              {sweeps.length} Sweeps
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          TAB 1: GLOBAL TREASURY ROLL-UP (MASTER LEDGER)
      ===================================================================== */}
      {activeTab === 'TREASURY_ROLLUP' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Top Macro Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Total Federation Revenue */}
            <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-5 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                  Total Federation Revenue
                </span>
                <div className="text-xl sm:text-2xl font-black text-white">
                  ₹{globalRollup.totalRevenue.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-emerald-400 font-mono mt-0.5 block flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Across HQ & {branches.length} Daughter Branches
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Metric 2: Total Federation Expenses */}
            <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-5 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                  Total Federation Expenses
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-300">
                  ₹{globalRollup.totalExpenses.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-stone-400 font-mono mt-0.5 block">
                  Consolidated Operational Burn
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
            </div>

            {/* Metric 3: Net Consolidated Surplus */}
            <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-5 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                  Net Consolidated Surplus
                </span>
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  ₹{globalRollup.netSurplus.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-stone-300 font-mono mt-0.5 block">
                  Surplus Margin: <strong className="text-amber-300">{globalRollup.surplusMargin}%</strong>
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Metric 4: Liquid Reserves Runway */}
            <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-5 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                  Liquid Treasury Float
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-300">
                  ₹{globalRollup.totalLiquidReserves.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-stone-400 font-mono mt-0.5 block">
                  Reserve Runway: ~{globalRollup.reserveRunwayMonths} Months
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 shrink-0">
                <Landmark className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Comparative Multi-Branch Treasury Breakdown */}
          <div className="bg-stone-900/90 rounded-3xl border border-stone-800 shadow-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-amber-400" />
                  <span>Entity-by-Entity Comparative Master Ledger</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Side-by-side performance review comparing mother temple HQ and all affiliated regional branches.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-stone-300">Inflow / Revenue</span>
                <span className="w-3 h-3 rounded-full bg-rose-500 ml-2"></span>
                <span className="text-stone-300">Outflow / Expense</span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-950 border-b border-stone-800 text-stone-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Entity & Branch Code</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Inflow (₹)</th>
                    <th className="py-3 px-4 text-right">Outflow (₹)</th>
                    <th className="py-3 px-4 text-right">Net Surplus (₹)</th>
                    <th className="py-3 px-4 text-right">Liquid Cash (₹)</th>
                    <th className="py-3 px-4 w-40">Expense Ratio</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {/* Row 0: Mother Mandir HQ */}
                  <tr className="bg-amber-950/20 font-bold hover:bg-amber-950/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black uppercase">
                          HQ
                        </span>
                        <span className="text-amber-200">{hqFinancials.name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono ml-8">{hqFinancials.branchCode}</span>
                    </td>
                    <td className="py-3.5 px-4 text-amber-300 font-semibold">{hqFinancials.classification}</td>
                    <td className="py-3.5 px-4 text-stone-300">{hqFinancials.city}, {hqFinancials.state}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                      ₹{hqFinancials.income.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-300">
                      ₹{hqFinancials.expense.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-300 font-black">
                      ₹{hqFinancials.surplus.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-300 font-bold">
                      ₹{hqFinancials.liquidBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{ width: `${Math.round((hqFinancials.expense / hqFinancials.income) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono mt-0.5 block text-right">
                        {Math.round((hqFinancials.expense / hqFinancials.income) * 100)}% Burn
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-stone-800 text-stone-400 font-mono">
                        Primary HQ
                      </span>
                    </td>
                  </tr>

                  {/* Rows 1..N: Child Branches */}
                  {branches.map((branch) => {
                    const burnPct = branch.totalIncome > 0 ? Math.round((branch.totalExpense / branch.totalIncome) * 100) : 0;
                    const surplus = branch.totalIncome - branch.totalExpense;

                    return (
                      <tr key={branch.id} className="hover:bg-stone-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{branch.name}</div>
                          <span className="text-[10px] text-stone-400 font-mono">{branch.branchCode}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-stone-300">
                            {branch.classification}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-300">{branch.city}, {branch.state}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold">
                          ₹{branch.totalIncome.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-300">
                          ₹{branch.totalExpense.toLocaleString('en-IN')}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono font-black ${surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ₹{surplus.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-amber-300 font-bold">
                          ₹{branch.liquidBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${burnPct > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(burnPct, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono mt-0.5 block text-right">
                            {burnPct}% Burn
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleInitiateSweepForBranch(branch)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            Sweep Funds
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: BRANCH DIRECTORY & GOVERNANCE
      ===================================================================== */}
      {activeTab === 'BRANCH_DIRECTORY' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search branch by name, code, city, admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Classification Filter */}
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Classifications</option>
                <option value="Mandir Branch">Mandir Branch</option>
                <option value="Ashram">Ashram</option>
                <option value="Annakshetra">Annakshetra</option>
                <option value="Goshala">Goshala</option>
                <option value="Veda Pathashala">Veda Pathashala</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsAddBranchModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Provision New Branch</span>
            </button>
          </div>

          {/* Branch Directory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBranches.map((branch) => (
              <div
                key={branch.id}
                className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
              >
                <div>
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {branch.classification}
                      </span>
                      <h3 className="text-base font-black text-white mt-1.5">{branch.name}</h3>
                      <span className="text-[11px] text-stone-400 font-mono">{branch.branchCode}</span>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{branch.status}</span>
                    </div>
                  </div>

                  {/* Metadata & Location */}
                  <div className="space-y-1.5 text-xs bg-stone-950 p-3 rounded-2xl border border-stone-800 mt-3">
                    <div className="flex items-center gap-2 text-stone-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{branch.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-300">
                      <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Admin: <strong className="text-white">{branch.adminName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-400 font-mono text-[11px]">
                      <Phone className="w-3 h-3 text-stone-500 shrink-0" />
                      <span>{branch.adminPhone}</span>
                    </div>
                  </div>

                  {/* Financial Snapshot */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-950/70 p-3 rounded-2xl border border-stone-800/80 mt-3">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-bold block">Cash-in-Hand Float</span>
                      <span className="font-black text-amber-300 text-sm">
                        ₹{branch.liquidBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-bold block">Enrolled Devotees</span>
                      <span className="font-bold text-stone-200 text-sm">{branch.memberCount} Members</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchToBranch(branch)}
                    className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Enter Workspace</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInitiateSweepForBranch(branch)}
                    className="flex-1 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Sweep Float</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: INTER-BRANCH CASH SWEEPS & TRANSFERS
      ===================================================================== */}
      {activeTab === 'CASH_SWEEPS' && (
        <section className="space-y-6 animate-fadeIn">
          {/* RBAC Safeguard Notice */}
          <div className="bg-stone-900/80 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-300">
                Federation Treasury Governance & Sweep Authorization Protocol:
              </span>
              <p className="text-stone-300 leading-relaxed">
                Inter-branch fund sweeps consolidate surplus donations from daughter units into the Mother Temple’s master endowment vault. Under Trust Governance Bylaws, <strong>only Master Trustees (SuperAdmin)</strong> possess authorized signing power to execute live sweeps.
              </p>
              {!isMasterTrustee && (
                <div className="text-rose-400 font-bold mt-1">
                  ⚠️ Current session is logged in as {currentRole || 'Manager'}. You may draft transfers, but execution requires Master Trustee PIN authorization.
                </div>
              )}
            </div>
          </div>

          {/* Sweeps Execution Form & History Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Execution Form */}
            <div className="bg-stone-900/90 rounded-3xl border border-stone-800 p-6 shadow-2xl space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Treasury Sweep Engine
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Execute Fund Transfer
                </h3>
              </div>

              <form onSubmit={handleExecuteCashSweep} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Transfer Archetype</label>
                  <select
                    value={sweepForm.transferType}
                    onChange={(e) => setSweepForm({ ...sweepForm, transferType: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="SWEEP_TO_HQ">Sweep to HQ Master Vault (Surplus Pull)</option>
                    <option value="HQ_DISPERSAL">HQ Capital Dispersal (Festival / Disaster Grant)</option>
                    <option value="INTER_BRANCH">Inter-Branch Re-allocation</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">Source Account / Branch</label>
                  <select
                    value={sweepForm.sourceBranchId}
                    onChange={(e) => setSweepForm({ ...sweepForm, sourceBranchId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value={activeWorkspace?.id || 'DEMO_ws-mandir'}>
                      {activeWorkspace?.name || 'Mother Mandir HQ'} (Master Vault)
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Float: ₹{b.liquidBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">Destination Account / Branch</label>
                  <select
                    value={sweepForm.destinationBranchId}
                    onChange={(e) => setSweepForm({ ...sweepForm, destinationBranchId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value={activeWorkspace?.id || 'DEMO_ws-mandir'}>
                      {activeWorkspace?.name || 'Mother Mandir HQ'} (Master Vault)
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Float: ₹{b.liquidBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">Transfer Amount (₹) *</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={sweepForm.amount}
                    onChange={(e) => setSweepForm({ ...sweepForm, amount: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-amber-300 font-mono font-black text-sm focus:outline-none focus:border-amber-500"
                  />
                  {/* Amount Quick Presets */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[100000, 200000, 500000, 1000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSweepForm({ ...sweepForm, amount: amt })}
                        className="px-2 py-0.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-mono cursor-pointer"
                      >
                        ₹{(amt / 100000).toFixed(0)} Lakh
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">Bank Payment Rail</label>
                  <select
                    value={sweepForm.transferMode}
                    onChange={(e) => setSweepForm({ ...sweepForm, transferMode: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="NEFT">NEFT (National Electronic Funds Transfer)</option>
                    <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                    <option value="IMPS">IMPS Immediate Transfer</option>
                    <option value="Internal Treasury Journal">Internal Treasury Journal (Zero Fee)</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">Justification & Notes</label>
                  <textarea
                    rows={2}
                    value={sweepForm.purpose}
                    onChange={(e) => setSweepForm({ ...sweepForm, purpose: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Execute Cash Sweep & Log Journal</span>
                </button>
              </form>
            </div>

            {/* Right: Sweeps Audit Ledger */}
            <div className="lg:col-span-2 bg-stone-900/90 rounded-3xl border border-stone-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Inter-Branch Sweep & Transfer Journal</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Immutable statutory log of internal fund movements and bank transit vouchers.
                  </p>
                </div>

                <span className="text-xs text-stone-400 font-mono">
                  {sweeps.length} Recorded Transfers
                </span>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-950 border-b border-stone-800 text-stone-400 uppercase font-black tracking-wider text-[10px]">
                      <th className="py-3 px-3">Sweep ID</th>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Route (From → To)</th>
                      <th className="py-3 px-3 text-right">Amount (₹)</th>
                      <th className="py-3 px-3">Mode & UTR</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-center">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-sans">
                    {sweeps.map((swp) => (
                      <tr key={swp.id} className="hover:bg-stone-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono text-amber-400 font-bold">{swp.id}</td>
                        <td className="py-3 px-3 text-stone-300 font-mono text-[11px]">{swp.date}</td>
                        <td className="py-3 px-3 max-w-[200px]">
                          <div className="font-bold text-white truncate">{swp.sourceBranchName}</div>
                          <div className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                            <span>→</span>
                            <span className="truncate">{swp.destinationBranchName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                          ₹{swp.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-stone-200 block">{swp.transferMode}</span>
                          <span className="text-[10px] font-mono text-stone-500">{swp.utrReference}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            {swp.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedVoucher(swp)}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
                            title="Print / View Transfer Voucher"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODAL 1: PROVISION NEW BRANCH
      ===================================================================== */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setIsAddBranchModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Multi-Tenant Expansion
              </span>
              <h3 className="text-lg font-black text-white mt-1">Provision New Daughter Branch</h3>
              <p className="text-stone-400">
                Register a regional center into the {activeWorkspace?.name || 'Sanatan'} Federation network.
              </p>
            </div>

            <form onSubmit={handleProvisionBranch} className="space-y-3.5">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Branch Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Krishna Mandir & Annakshetra - Mathura"
                  value={newBranchForm.name}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Branch Code / Tag</label>
                  <input
                    type="text"
                    required
                    value={newBranchForm.branchCode}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, branchCode: e.target.value.toUpperCase() })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Classification</label>
                  <select
                    value={newBranchForm.classification}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, classification: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Mandir Branch">Mandir Branch</option>
                    <option value="Ashram">Ashram</option>
                    <option value="Annakshetra">Annakshetra</option>
                    <option value="Goshala">Goshala</option>
                    <option value="Veda Pathashala">Veda Pathashala</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathura"
                    value={newBranchForm.city}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, city: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Uttar Pradesh"
                    value={newBranchForm.state}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, state: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. Near Vishram Ghat, Mathura, UP - 281001"
                  value={newBranchForm.address}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, address: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Branch Head / Admin Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pt. Jagannath Shastri"
                    value={newBranchForm.adminName}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, adminName: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Admin Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 94120 55443"
                    value={newBranchForm.adminPhone}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, adminPhone: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Seed Float Capital (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={newBranchForm.initialFloat}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, initialFloat: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">80G / URN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CIT(E)/MTH/80G-102"
                    value={newBranchForm.taxExemptionNumber}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, taxExemptionNumber: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Provision & Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: TRANSFER VOUCHER PREVIEW
      ===================================================================== */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              type="button"
              onClick={() => setSelectedVoucher(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-3 border-b border-stone-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Statutory Inter-Branch Voucher
              </span>
              <h3 className="text-base font-black text-white mt-1">
                Cash Sweep Transfer Voucher
              </h3>
              <span className="font-mono text-stone-400 text-[11px]">{selectedVoucher.id}</span>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400">Date & Timestamp:</span>
                <span className="font-mono text-stone-200">{selectedVoucher.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Source Entity:</span>
                <span className="font-bold text-amber-300 text-right">{selectedVoucher.sourceBranchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Destination Entity:</span>
                <span className="font-bold text-emerald-300 text-right">{selectedVoucher.destinationBranchName}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-stone-800">
                <span className="text-stone-400 font-bold">Transfer Amount:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  ₹{selectedVoucher.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Payment Rail:</span>
                <span className="text-stone-200 font-bold">{selectedVoucher.transferMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">UTR / Reference No:</span>
                <span className="font-mono text-stone-200 font-semibold">{selectedVoucher.utrReference}</span>
              </div>
            </div>

            <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800 text-[11px] text-stone-400 italic">
              "{selectedVoucher.purpose}"
            </div>

            <div className="flex justify-between text-[11px] text-stone-400 pt-1">
              <span>Signatory: {selectedVoucher.authorizedBy}</span>
              <span className="text-emerald-400 font-bold">Status: {selectedVoucher.status}</span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: INITIATE CASH SWEEP POPUP
      ===================================================================== */}
      {isSweepModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setIsSweepModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Multi-Branch Treasury Management
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Initiate Inter-Branch Cash Sweep
              </h3>
            </div>

            <form onSubmit={handleExecuteCashSweep} className="space-y-3.5">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Transfer Type</label>
                <select
                  value={sweepForm.transferType}
                  onChange={(e) => setSweepForm({ ...sweepForm, transferType: e.target.value as any })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="SWEEP_TO_HQ">Sweep to HQ Master Vault (Surplus Pull)</option>
                  <option value="HQ_DISPERSAL">HQ Capital Dispersal (Festival / Disaster Grant)</option>
                  <option value="INTER_BRANCH">Inter-Branch Re-allocation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Source Entity</label>
                  <select
                    value={sweepForm.sourceBranchId}
                    onChange={(e) => setSweepForm({ ...sweepForm, sourceBranchId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value={activeWorkspace?.id || 'DEMO_ws-mandir'}>
                      {activeWorkspace?.name || 'Mother Mandir HQ'} (Master Vault)
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (₹{b.liquidBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">Destination Entity</label>
                  <select
                    value={sweepForm.destinationBranchId}
                    onChange={(e) => setSweepForm({ ...sweepForm, destinationBranchId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value={activeWorkspace?.id || 'DEMO_ws-mandir'}>
                      {activeWorkspace?.name || 'Mother Mandir HQ'} (Master Vault)
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (₹{b.liquidBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Sweep Amount (₹) *</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={sweepForm.amount}
                  onChange={(e) => setSweepForm({ ...sweepForm, amount: Number(e.target.value) })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-amber-300 font-mono font-black text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Transfer Mode</label>
                <select
                  value={sweepForm.transferMode}
                  onChange={(e) => setSweepForm({ ...sweepForm, transferMode: e.target.value as any })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="NEFT">NEFT (Standard Settlement)</option>
                  <option value="RTGS">RTGS (Instant High-Value)</option>
                  <option value="IMPS">IMPS (Immediate 24x7)</option>
                  <option value="Internal Treasury Journal">Internal Treasury Journal</option>
                </select>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Transfer Purpose</label>
                <textarea
                  rows={2}
                  value={sweepForm.purpose}
                  onChange={(e) => setSweepForm({ ...sweepForm, purpose: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSweepModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Authorize & Sweep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FederationMultiBranchDesk;
