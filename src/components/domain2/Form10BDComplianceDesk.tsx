import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Building2,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  X,
  RefreshCw,
  Info,
  DollarSign,
  Users,
  Check,
  ArrowUpDown,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { TreasuryTransaction } from '../../types';

// ============================================================================
// TYPES & CBDT CODES SPECIFICATION
// ============================================================================

export type CBDTIdType = 'PAN' | 'Aadhaar' | 'Passport' | 'Voter ID' | 'Driving License' | 'Taxpayer ID';
export type CBDTDonationNature = 'Corpus' | 'Specific Grant' | 'Others';
export type CBDTReceiptMode = 'Cash' | 'Electronic' | 'Cheque';

export interface Audited10BDRow {
  txId: string;
  sNo: number;
  date: string;
  donorName: string;
  devoteeId?: string;
  idType: CBDTIdType;
  idNumber: string;
  address: string;
  donationNature: CBDTDonationNature;
  paymentMode: CBDTReceiptMode;
  originalMode: string;
  amount: number;
  taxReceiptNumber?: string;
  is80GEligible: boolean;
  warnings: string[];
  isCompliant: boolean;
}

// CBDT Standard Utility Code Maps
const CBDT_ID_CODES: Record<CBDTIdType, string> = {
  PAN: '1',
  Aadhaar: '2',
  Passport: '3',
  'Voter ID': '4',
  'Driving License': '5',
  'Taxpayer ID': '7',
};

const CBDT_MODE_CODES: Record<CBDTReceiptMode, string> = {
  Cash: '1',
  Electronic: '3', // Electronic modes including account payee cheque/draft
  Cheque: '3',
};

const CBDT_NATURE_CODES: Record<CBDTDonationNature, string> = {
  Corpus: '1',
  'Specific Grant': '2',
  Others: '3',
};

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

export const Form10BDComplianceDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { treasury, donations, devotees, updateTreasuryTransaction } = useData();
  const { showToast } = useToast();

  // All transactions pool
  const rawTransactions = donations || treasury || [];

  // Financial Year Filter State
  const [selectedFY, setSelectedFY] = useState<'FY 2025-2026' | 'FY 2024-2025' | 'FY 2026-2027' | 'ALL'>('FY 2025-2026');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | 'WARNINGS_ONLY' | 'COMPLIANT_ONLY'>('ALL');
  const [natureFilter, setNatureFilter] = useState<'ALL' | CBDTDonationNature>('ALL');

  // Local overrides map (for instantaneous UI feedback when accountant rectifies a row)
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<Audited10BDRow>>>({});

  // Editing Row Modal State
  const [editingRow, setEditingRow] = useState<Audited10BDRow | null>(null);
  const [editForm, setEditForm] = useState<{
    donorName: string;
    idType: CBDTIdType;
    idNumber: string;
    address: string;
    donationNature: CBDTDonationNature;
    paymentMode: CBDTReceiptMode;
  }>({
    donorName: '',
    idType: 'PAN',
    idNumber: '',
    address: '',
    donationNature: 'Others',
    paymentMode: 'Electronic',
  });

  // Export Confirmation Dialog State
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);

  // Financial Year Date Range Resolver
  const fyDateRange = useMemo(() => {
    switch (selectedFY) {
      case 'FY 2024-2025':
        return { start: '2024-04-01', end: '2025-03-31' };
      case 'FY 2025-2026':
        return { start: '2025-04-01', end: '2026-03-31' };
      case 'FY 2026-2027':
        return { start: '2026-04-01', end: '2027-03-31' };
      default:
        return null;
    }
  }, [selectedFY]);

  // Devotee quick index map
  const devoteeMap = useMemo(() => {
    const map = new Map<string, any>();
    if (devotees && Array.isArray(devotees)) {
      devotees.forEach((d) => {
        if (d.id) map.set(d.id, d);
      });
    }
    return map;
  }, [devotees]);

  // Transform and Audit all 80G Eligible Transactions
  const auditedRows: Audited10BDRow[] = useMemo(() => {
    let sNoCounter = 1;

    return rawTransactions
      .filter((tx) => {
        // Filter: Must be donation / income and flagged 80G eligible
        const txType = (tx.type || '').toUpperCase();
        const isDonationOrIncome = txType === 'DONATION' || txType === 'INCOME';
        if (!isDonationOrIncome || !tx.is80GEligible) return false;

        // Financial Year Range Filter
        if (fyDateRange) {
          const txDate = tx.date || '';
          if (txDate < fyDateRange.start || txDate > fyDateRange.end) {
            return false;
          }
        }
        return true;
      })
      .map((tx) => {
        const override = localOverrides[tx.id] || {};
        const matchedDevotee = tx.devoteeId ? devoteeMap.get(tx.devoteeId) : null;

        // Resolve Donor Name
        const donorName =
          override.donorName ||
          tx.devoteeName ||
          (tx as any).donorName ||
          matchedDevotee?.fullName ||
          matchedDevotee?.name ||
          'Anonymous Devotee';

        // Resolve ID Type and ID Number
        let resolvedIdType: CBDTIdType = override.idType || 'PAN';
        let resolvedIdNumber =
          override.idNumber ||
          (tx as any).devoteePan ||
          (tx as any).panNumber ||
          (tx as any).taxId ||
          matchedDevotee?.panNumber ||
          '';

        if (!resolvedIdNumber && (tx as any).aadhaarNumber) {
          resolvedIdType = 'Aadhaar';
          resolvedIdNumber = (tx as any).aadhaarNumber;
        }

        // Resolve Address
        const resolvedAddress =
          override.address ||
          (tx as any).donorAddress ||
          matchedDevotee?.address ||
          activeWorkspace?.city ||
          '';

        // Resolve Payment Mode
        const rawModeStr = (tx.paymentMode || '').toLowerCase();
        let resolvedMode: CBDTReceiptMode = override.paymentMode || 'Electronic';
        if (!override.paymentMode) {
          if (rawModeStr.includes('cash')) {
            resolvedMode = 'Cash';
          } else if (rawModeStr.includes('cheque') || rawModeStr.includes('check')) {
            resolvedMode = 'Cheque';
          } else {
            resolvedMode = 'Electronic';
          }
        }

        // Resolve Donation Nature
        let resolvedNature: CBDTDonationNature = override.donationNature || 'Others';
        if (!override.donationNature) {
          const category = (tx.category || '').toLowerCase();
          const purpose = (tx.purpose || '').toLowerCase();
          if (category.includes('corpus') || purpose.includes('corpus') || category.includes('nirman')) {
            resolvedNature = 'Corpus';
          } else if (
            category.includes('grant') ||
            purpose.includes('project') ||
            category.includes('goshala') ||
            category.includes('annadanam')
          ) {
            resolvedNature = 'Specific Grant';
          } else {
            resolvedNature = 'Others';
          }
        }

        const amount = Number(tx.amount) || 0;

        // ====================================================================
        // STRICT CBDT FORM 10BD VALIDATION ENGINE
        // ====================================================================
        const warnings: string[] = [];

        // Rule A: Cash Guardrail under Sec 80G(5)(d)
        // Cash donations exceeding Rs. 2,000 are strictly NOT eligible for 80G deduction
        if (resolvedMode === 'Cash' && amount > 2000) {
          warnings.push(`Sec 80G(5)(d) Cash Violation: ₹${amount.toLocaleString()} in cash exceeds ₹2,000 threshold.`);
        }

        // Rule B: Missing Unique Identity
        if (!resolvedIdNumber || resolvedIdNumber.trim().length === 0) {
          warnings.push('Missing ID: Form 10BD requires valid PAN, Aadhaar, or authorized Tax ID.');
        } else if (resolvedIdType === 'PAN') {
          // Rule C: PAN Format Validation (10 chars: 5 letters, 4 digits, 1 letter)
          const cleanPan = resolvedIdNumber.trim().toUpperCase();
          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          if (!panRegex.test(cleanPan)) {
            warnings.push(`Invalid PAN Syntax: "${resolvedIdNumber}" does not conform to CBDT structure (AAAAA9999A).`);
          }
        } else if (resolvedIdType === 'Aadhaar') {
          const cleanAadhaar = resolvedIdNumber.replace(/\s|-/g, '');
          if (cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
            warnings.push(`Invalid Aadhaar: Must be exactly 12 numeric digits.`);
          }
        }

        // Rule D: Missing Address
        if (!resolvedAddress || resolvedAddress.trim().length < 3) {
          warnings.push('Missing Address: CBDT requires valid residential/business address.');
        }

        const isCompliant = warnings.length === 0;

        return {
          txId: tx.id,
          sNo: sNoCounter++,
          date: tx.date || '',
          donorName,
          devoteeId: tx.devoteeId,
          idType: resolvedIdType,
          idNumber: resolvedIdNumber,
          address: resolvedAddress,
          donationNature: resolvedNature,
          paymentMode: resolvedMode,
          originalMode: tx.paymentMode || 'Electronic',
          amount,
          taxReceiptNumber: tx.taxReceiptNumber,
          is80GEligible: Boolean(tx.is80GEligible),
          warnings,
          isCompliant,
        };
      });
  }, [rawTransactions, fyDateRange, localOverrides, devoteeMap, activeWorkspace]);

  // Filtered Rows for Data Grid Display
  const filteredRows = useMemo(() => {
    return auditedRows.filter((row) => {
      // Compliance status filter
      if (complianceFilter === 'WARNINGS_ONLY' && row.isCompliant) return false;
      if (complianceFilter === 'COMPLIANT_ONLY' && !row.isCompliant) return false;

      // Nature filter
      if (natureFilter !== 'ALL' && row.donationNature !== natureFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = row.donorName.toLowerCase().includes(q);
        const matchId = row.idNumber.toLowerCase().includes(q);
        const matchAddress = row.address.toLowerCase().includes(q);
        const matchReceipt = (row.taxReceiptNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchAddress && !matchReceipt) return false;
      }

      return true;
    });
  }, [auditedRows, complianceFilter, natureFilter, searchQuery]);

  // High-Level Audit Metrics
  const auditMetrics = useMemo(() => {
    const totalDonationsAmount = auditedRows.reduce((sum, r) => sum + r.amount, 0);

    // Unique donors calculated by normalized ID Number or fallback Donor Name
    const uniqueDonorKeys = new Set(
      auditedRows.map((r) => {
        if (r.idNumber && r.idNumber.trim().length > 3) {
          return `${r.idType}:${r.idNumber.trim().toUpperCase()}`;
        }
        return `NAME:${r.donorName.trim().toLowerCase()}`;
      })
    );

    const totalWarnings = auditedRows.reduce((sum, r) => sum + r.warnings.length, 0);
    const nonCompliantRowsCount = auditedRows.filter((r) => !r.isCompliant).length;
    const compliantRowsCount = auditedRows.filter((r) => r.isCompliant).length;
    const complianceRate = auditedRows.length > 0 ? Math.round((compliantRowsCount / auditedRows.length) * 100) : 100;

    // Critical cash violations
    const cashViolationsCount = auditedRows.filter((r) => r.paymentMode === 'Cash' && r.amount > 2000).length;
    const missingIdCount = auditedRows.filter((r) => !r.idNumber || r.idNumber.trim().length === 0).length;

    return {
      totalDonationsAmount,
      totalRecords: auditedRows.length,
      uniqueDonorsCount: uniqueDonorKeys.size,
      totalWarnings,
      nonCompliantRowsCount,
      compliantRowsCount,
      complianceRate,
      cashViolationsCount,
      missingIdCount,
    };
  }, [auditedRows]);

  // ==========================================================================
  // ROW EDIT & RECTIFICATION MODAL HANDLERS
  // ==========================================================================

  const handleOpenEditModal = (row: Audited10BDRow) => {
    setEditingRow(row);
    setEditForm({
      donorName: row.donorName,
      idType: row.idType,
      idNumber: row.idNumber,
      address: row.address,
      donationNature: row.donationNature,
      paymentMode: row.paymentMode,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    const updatedData: Partial<Audited10BDRow> = {
      donorName: editForm.donorName.trim(),
      idType: editForm.idType,
      idNumber: editForm.idNumber.trim().toUpperCase(),
      address: editForm.address.trim(),
      donationNature: editForm.donationNature,
      paymentMode: editForm.paymentMode,
    };

    // Update local state for immediate feedback
    setLocalOverrides((prev) => ({
      ...prev,
      [editingRow.txId]: updatedData,
    }));

    // Persist to DataContext if possible
    try {
      updateTreasuryTransaction(editingRow.txId, {
        devoteeName: editForm.donorName.trim(),
        paymentMode: editForm.paymentMode === 'Cash' ? 'Cash' : editForm.paymentMode === 'Cheque' ? 'Cheque' : 'Bank Transfer',
        ...({
          devoteePan: editForm.idType === 'PAN' ? editForm.idNumber.trim().toUpperCase() : undefined,
          donorAddress: editForm.address.trim(),
          donationNature: editForm.donationNature,
        } as any),
      });
    } catch (err) {
      console.warn('Could not update treasury record in context', err);
    }

    setEditingRow(null);
    showToast(`Rectified transaction for ${editForm.donorName}. Validation re-audited! ✓`, 'success', 'Form 10BD Audit');
  };

  // ==========================================================================
  // 1-CLICK CBDT-COMPLIANT CSV EXPORTER ENGINE
  // ==========================================================================

  const generateAndDownloadCSV = (onlyCompliant: boolean = false) => {
    const rowsToExport = onlyCompliant ? auditedRows.filter((r) => r.isCompliant) : auditedRows;

    if (rowsToExport.length === 0) {
      showToast('No records available to export for the selected filter.', 'error');
      return;
    }

    // Default Trust Values from active workspace
    const trustURN = activeWorkspace?.taxExemptionNumber || activeWorkspace?.trustRegNumber || 'AAATE1234F21EC01';
    const urnIssuanceDate = '2021-05-28'; // Statutory date or default for Section 80G(5)
    const sectionCode = 'Section 80G(5)(vi)';

    // CSV Headers matching CBDT Form 10BD filing schema
    const headers = [
      'Sr. No.',
      'Pre-acknowledgement Number',
      'ID Code',
      'Unique Identification Number',
      'Section Code',
      'Unique Registration Number (URN)',
      'Date of issuance of Unique Registration Number',
      'Name of donor',
      'Address of donor',
      'Donation Type',
      'Mode of receipt',
      'Amount of donation (INR)',
    ];

    const csvRows: string[] = [];

    // Helper to sanitize CSV field
    const escapeField = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Header row
    csvRows.push(headers.map(escapeField).join(','));

    // Data rows
    rowsToExport.forEach((row, idx) => {
      const idCode = CBDT_ID_CODES[row.idType] || '1';
      const natureCode = CBDT_NATURE_CODES[row.donationNature] || '3';
      const modeCode = CBDT_MODE_CODES[row.paymentMode] || '3';

      const line = [
        idx + 1, // Sr. No.
        row.taxReceiptNumber || `ACK-${row.txId.slice(-6).toUpperCase()}`, // Pre-acknowledgement Number
        idCode, // ID Code
        row.idNumber || 'NOT_PROVIDED', // Unique Identification Number
        sectionCode, // Section Code
        trustURN, // URN
        urnIssuanceDate, // Date of issuance of URN
        row.donorName, // Name of donor
        row.address || 'Address on record', // Address of donor
        natureCode, // Donation Type
        modeCode, // Mode of receipt
        Math.round(row.amount), // Amount in INR
      ];

      csvRows.push(line.map(escapeField).join(','));
    });

    // Add UTF-8 BOM so Excel opens Hindi/English characters cleanly
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const cleanFY = selectedFY.replace(/\s+/g, '_').replace(/-/g, '_');
    const suffix = onlyCompliant ? '_COMPLIANT_ONLY' : '';
    link.setAttribute('download', `Form_10BD_${cleanFY}${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportConfirmOpen(false);
    showToast(
      `Successfully generated Form 10BD CSV (${rowsToExport.length} entries). Ready for Income Tax E-Filing Portal! 📥`,
      'success',
      'CBDT CSV Generated'
    );
  };

  const handleExportClick = () => {
    if (auditMetrics.nonCompliantRowsCount > 0) {
      setIsExportConfirmOpen(true);
    } else {
      generateAndDownloadCSV(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* =====================================================================
          HEADER & FINANCIAL YEAR SELECTOR BANNER
      ===================================================================== */}
      <section className="bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                Domain 2 • Statutory Audit & Tax Compliance
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Trust URN: <span className="text-amber-200 font-bold">{activeWorkspace?.taxExemptionNumber || 'AAATE1234F21EC01'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-amber-100 tracking-tight flex items-center gap-3">
              <span>Income Tax Form 10BD Audit & E-Filing Desk</span>
            </h1>

            <p className="text-sm text-stone-300 mt-1 max-w-3xl leading-relaxed">
              Automated CBDT statement of donations under Section 80G(5) and Rule 18AB of Income Tax Rules, 1962. Audit cash limits (Sec 80G(5)(d)), validate donor PAN/Aadhaar integrity, and export verified CSV for direct portal filing.
            </p>
          </div>

          {/* Financial Year Selector & Export Trigger */}
          <div className="flex flex-wrap items-center gap-3 bg-stone-950/80 p-3 rounded-2xl border border-stone-800 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value as any)}
                aria-label="Select Financial Year for 10BD Audit"
                className="bg-stone-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-black text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner"
              >
                <option value="FY 2025-2026">FY 2025-2026 (Assessment Year 2026-27)</option>
                <option value="FY 2024-2025">FY 2024-2025 (Assessment Year 2025-26)</option>
                <option value="FY 2026-2027">FY 2026-2027 (Assessment Year 2027-28)</option>
                <option value="ALL">All Financial Years</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Export Form 10BD CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          TOP METRICS & STRICT AUDIT GUARDRAIL BAR
      ===================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total 80G Donations */}
        <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-4 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
              Total 80G Donations
            </span>
            <div className="text-xl sm:text-2xl font-black text-white">
              ₹{auditMetrics.totalDonationsAmount.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-stone-400 font-mono mt-0.5 block">
              {auditMetrics.totalRecords} Qualifying Transactions
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Unique Donors */}
        <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-4 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
              Unique Donors
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-300">
              {auditMetrics.uniqueDonorsCount} Donors
            </div>
            <span className="text-[11px] text-stone-400 font-mono mt-0.5 block">
              Form 10BE Eligible Certificates
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Critical CBDT Warnings Counter */}
        <div className={`rounded-2xl border p-4 shadow-xl flex items-center justify-between transition-colors ${
          auditMetrics.nonCompliantRowsCount > 0
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider opacity-80 block mb-1">
              CBDT Audit Warnings
            </span>
            <div className="text-xl sm:text-2xl font-black flex items-center gap-2">
              <span>{auditMetrics.nonCompliantRowsCount} Records</span>
              {auditMetrics.nonCompliantRowsCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold animate-pulse">
                  Action Required
                </span>
              )}
            </div>
            <span className="text-[11px] opacity-80 mt-0.5 block">
              {auditMetrics.cashViolationsCount > 0 ? `${auditMetrics.cashViolationsCount} Cash > ₹2k` : ''}
              {auditMetrics.cashViolationsCount > 0 && auditMetrics.missingIdCount > 0 ? ' • ' : ''}
              {auditMetrics.missingIdCount > 0 ? `${auditMetrics.missingIdCount} Missing ID` : ''}
              {auditMetrics.nonCompliantRowsCount === 0 ? '100% Validated by Shastric Rule 18AB' : ''}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            auditMetrics.nonCompliantRowsCount > 0
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
          }`}>
            {auditMetrics.nonCompliantRowsCount > 0 ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
        </div>

        {/* Metric 4: Filing Readiness Progress */}
        <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              E-Filing Readiness
            </span>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
              auditMetrics.complianceRate === 100
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}>
              {auditMetrics.complianceRate}% Ready
            </span>
          </div>

          <div className="my-2">
            <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  auditMetrics.complianceRate === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${auditMetrics.complianceRate}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
            <span>{auditMetrics.compliantRowsCount} Ready</span>
            <span>{auditMetrics.nonCompliantRowsCount} Incomplete</span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CBDT STATUTORY REGULATORY GUIDANCE BANNER
      ===================================================================== */}
      <section className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 text-xs text-stone-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-amber-300">
            CBDT Income Tax Rule 18AB & Section 80G(5)(d) Compliance Mandate:
          </span>
          <p className="text-stone-400 leading-relaxed">
            1. <strong className="text-stone-200">Cash Donations Limit:</strong> Under Section 80G(5)(d), no deduction is allowed for cash donations exceeding ₹2,000. Such transactions must either be amended or excluded from 80G claims.<br />
            2. <strong className="text-stone-200">Mandatory Unique Identity:</strong> Form 10BD strictly rejects entries without a valid PAN or Aadhaar. Form 10BE tax certificates will only generate for verified tax IDs.<br />
            3. <strong className="text-stone-200">Annual Due Date:</strong> Statement in Form 10BD must be furnished on or before May 31 immediately following the financial year in which donation is received.
          </p>
        </div>
      </section>

      {/* =====================================================================
          CONTROLS, SEARCH & FILTER PILLS
      ===================================================================== */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by Donor Name, PAN, Aadhaar, Receipt No, or City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Compliance Status Filter Pill */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              type="button"
              onClick={() => setComplianceFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                complianceFilter === 'ALL'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              All Records ({auditedRows.length})
            </button>
            <button
              type="button"
              onClick={() => setComplianceFilter('WARNINGS_ONLY')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                complianceFilter === 'WARNINGS_ONLY'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings ({auditMetrics.nonCompliantRowsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setComplianceFilter('COMPLIANT_ONLY')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                complianceFilter === 'COMPLIANT_ONLY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Compliant ({auditMetrics.compliantRowsCount})</span>
            </button>
          </div>

          {/* Donation Nature Filter */}
          <select
            value={natureFilter}
            onChange={(e) => setNatureFilter(e.target.value as any)}
            aria-label="Filter by Donation Nature"
            className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Donation Natures</option>
            <option value="Corpus">Corpus (Sec 11(1)(d))</option>
            <option value="Specific Grant">Specific Grant / Seva</option>
            <option value="Others">Others / General Chanda</option>
          </select>
        </div>

        <div className="text-xs text-stone-400 font-mono text-right self-center">
          Showing <span className="text-amber-300 font-bold">{filteredRows.length}</span> of {auditedRows.length} rows
        </div>
      </section>

      {/* =====================================================================
          PRE-FILING AUDIT DATA GRID
      ===================================================================== */}
      <section className="bg-stone-900/90 rounded-3xl border border-stone-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-950 border-b border-stone-800 text-stone-400 uppercase font-black tracking-wider text-[10px]">
                <th className="py-3.5 px-4 w-12 text-center">S.No</th>
                <th className="py-3.5 px-4">Donor Name & Devotee Tag</th>
                <th className="py-3.5 px-4">ID Type</th>
                <th className="py-3.5 px-4">ID Number</th>
                <th className="py-3.5 px-4">Address</th>
                <th className="py-3.5 px-4">Donation Nature</th>
                <th className="py-3.5 px-4">Mode</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4">Compliance Audit</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-400">
                    <FileCheck2 className="w-12 h-12 text-stone-600 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-sm">No transactions match the selected filter.</p>
                    <p className="text-xs text-stone-500 mt-1">Adjust your search query or financial year.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.txId}
                    className={`transition-colors hover:bg-stone-800/40 ${
                      !row.isCompliant ? 'bg-rose-950/20 hover:bg-rose-950/30' : ''
                    }`}
                  >
                    {/* S.No */}
                    <td className="py-3 px-4 text-center font-mono text-stone-400 text-[11px]">
                      {row.sNo}
                    </td>

                    {/* Donor Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-100 flex items-center gap-1.5">
                        <span>{row.donorName}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>Date: {row.date}</span>
                        {row.taxReceiptNumber && (
                          <span className="text-amber-400 font-semibold">{row.taxReceiptNumber}</span>
                        )}
                      </div>
                    </td>

                    {/* ID Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-stone-800 text-stone-300 border border-stone-700">
                        {row.idType}
                      </span>
                    </td>

                    {/* ID Number */}
                    <td className="py-3 px-4 font-mono">
                      {row.idNumber ? (
                        <span className="font-bold text-amber-200">{row.idNumber}</span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>MISSING</span>
                        </span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-3 px-4 max-w-[160px] truncate text-stone-300" title={row.address}>
                      {row.address || <span className="text-rose-400 italic">No Address on record</span>}
                    </td>

                    {/* Donation Nature */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.donationNature === 'Corpus'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : row.donationNature === 'Specific Grant'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-stone-800 text-stone-300'
                      }`}>
                        {row.donationNature}
                      </span>
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        row.paymentMode === 'Cash'
                          ? row.amount > 2000
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : 'bg-stone-800 text-stone-300'
                      }`}>
                        {row.paymentMode}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-100">
                      ₹{row.amount.toLocaleString('en-IN')}
                    </td>

                    {/* Compliance Audit */}
                    <td className="py-3 px-4">
                      {row.isCompliant ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>CBDT Verified</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {row.warnings.map((w, i) => (
                            <div key={i} className="flex items-center gap-1 text-[10px] font-semibold text-rose-300">
                              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Action: Rectify / Edit */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(row)}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-amber-300 border border-stone-700 text-[11px] font-bold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                        title="Edit & Rectify 10BD Record"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Rectify</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================================
          MODAL: RECTIFY 10BD RECORD
      ===================================================================== */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              type="button"
              onClick={() => setEditingRow(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Income Tax Form 10BD Rectification
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Rectify Donor Tax Credentials
              </h3>
              <p className="text-stone-400">
                Amount: <strong className="text-amber-300">₹{editingRow.amount.toLocaleString()}</strong> • Date: {editingRow.date}
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Donor Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.donorName}
                  onChange={(e) => setEditForm({ ...editForm, donorName: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">ID Code / Type</label>
                  <select
                    value={editForm.idType}
                    onChange={(e) => setEditForm({ ...editForm, idType: e.target.value as CBDTIdType })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PAN">1 - Permanent Account Number (PAN)</option>
                    <option value="Aadhaar">2 - Aadhaar Number</option>
                    <option value="Passport">3 - Passport Number</option>
                    <option value="Voter ID">4 - Elector Photo Identity (Voter ID)</option>
                    <option value="Driving License">5 - Driving License</option>
                    <option value="Taxpayer ID">7 - Taxpayer Identification Number</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">Unique Identification No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABCDE1234F"
                    value={editForm.idNumber}
                    onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value.toUpperCase() })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white font-mono uppercase font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Donor Address (City / State / Pincode) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 108 Kashi Vishwanath Marg, Varanasi, UP - 221001"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Donation Nature</label>
                  <select
                    value={editForm.donationNature}
                    onChange={(e) => setEditForm({ ...editForm, donationNature: e.target.value as CBDTDonationNature })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Corpus">1 - Corpus (Section 11(1)(d))</option>
                    <option value="Specific Grant">2 - Specific Grant</option>
                    <option value="Others">3 - Others</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">Mode of Receipt</label>
                  <select
                    value={editForm.paymentMode}
                    onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value as CBDTReceiptMode })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Electronic">3 - Electronic Mode / UPI / Bank</option>
                    <option value="Cheque">3 - Account Payee Cheque / Draft</option>
                    <option value="Cash">1 - Cash (Limit ₹2,000)</option>
                  </select>
                </div>
              </div>

              {editForm.paymentMode === 'Cash' && editingRow.amount > 2000 && (
                <div className="p-3 bg-rose-950/60 border border-rose-600 rounded-xl text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> Cash donations over ₹2,000 violate Section 80G(5)(d). You may change the mode to Cheque/Electronic if supported by bank deposit records.
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Save & Re-Audit Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONFIRMATION DIALOG: EXPORTING WITH CBDT WARNINGS
      ===================================================================== */}
      {isExportConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-rose-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Compliance Warnings Detected</h3>
                <span className="text-[11px] text-rose-300 font-bold">
                  {auditMetrics.nonCompliantRowsCount} transaction(s) have CBDT violations
                </span>
              </div>
            </div>

            <p className="text-stone-300 leading-relaxed">
              Exporting non-compliant records (e.g. Cash &gt; ₹2,000 or missing PAN) may cause the Income Tax E-Filing Portal utility to reject the batch during schema validation. How would you like to proceed?
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => generateAndDownloadCSV(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Export Only CBDT-Compliant Records ({auditMetrics.compliantRowsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => generateAndDownloadCSV(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export All Records (Include Warnings)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportConfirmOpen(false)}
                className="w-full py-2 px-4 rounded-xl text-stone-400 hover:text-white text-center font-bold cursor-pointer"
              >
                Cancel & Rectify Remaining Rows
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Form10BDComplianceDesk;
