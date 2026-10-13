import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Download,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Edit3,
  X,
  Printer,
  Sparkles,
  ArrowUpDown,
  Building,
  Eye,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { generate80GTaxReceipt, generateBulkTaxReceiptsPDF } from '../../utils/pdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { useToast } from '../../context/ToastContext';
import { TreasuryTransaction } from '../../types';
import { isValidPAN } from '../../utils/validation';
import { DataExportButton } from '../common/DataExportButton';
import { findReceiptGaps, findDuplicateReceipts, formatReceiptNumber } from '../../utils/receiptNumbers';

export const TaxReceiptDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { treasury, donations, updateTreasuryTransaction } = useData();
  const { showToast } = useToast();

  // Combined records from donations or treasury
  const rawTransactions = donations || treasury || [];

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [panFilter, setPanFilter] = useState<'all' | 'missing' | 'compliant'>('all');

  // Multi-Selection State for Bulk Export
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // M-18: receipt-number integrity — sequential, gap-detectable per series+year.
  // Gaps are surfaced honestly for review (a gap is a flag, not proof of fraud).
  const receiptIntegrity = useMemo(() => {
    const year = new Date().getFullYear();
    const numbers = (treasury || []).map((t) => t.taxReceiptNumber);
    const gaps80G = findReceiptGaps(numbers, 'SB-80G', year);
    const gapsChanda = findReceiptGaps(numbers, 'SB-CHANDA', year);
    const duplicates = findDuplicateReceipts(numbers);
    return { year, gaps80G, gapsChanda, duplicates };
  }, [treasury]);

  // PDF Preview Modal State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState('');

  // Update PAN Modal State
  const [editingTx, setEditingTx] = useState<TreasuryTransaction | null>(null);
  const [newPan, setNewPan] = useState('');
  const [isUpdatingPan, setIsUpdatingPan] = useState(false);

  // Filter 80G-eligible transactions
  const eligibleTransactions = useMemo(() => {    return rawTransactions.filter((tx) => {
      // Must be income & 80G eligible
      if (tx.type !== 'Income' || !tx.is80GEligible) return false;

      // Date range filtering
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      // PAN status filtering — strict CBDT format validation, not just length
      const hasPan = isValidPAN(tx.devoteePan || '');
      if (panFilter === 'missing' && hasPan) return false;
      if (panFilter === 'compliant' && !hasPan) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const donorMatch = tx.devoteeName?.toLowerCase().includes(query);
        const receiptMatch = (tx.taxReceiptNumber || tx.id)?.toLowerCase().includes(query);
        const panMatch = tx.devoteePan?.toLowerCase().includes(query);
        const catMatch = tx.category?.toLowerCase().includes(query);
        if (!donorMatch && !receiptMatch && !panMatch && !catMatch) return false;
      }

      return true;
    });
  }, [rawTransactions, startDate, endDate, panFilter, searchTerm]);

  // Financial & Compliance Metrics
  const metrics = useMemo(() => {
    const totalAllEligible = rawTransactions.filter((t) => t.type === 'Income' && t.is80GEligible);
    const totalAmount = totalAllEligible.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const missingPanCount = totalAllEligible.filter((t) => !isValidPAN(t.devoteePan || '')).length;
    const compliantCount = totalAllEligible.length - missingPanCount;

    // Duplicate 80G receipt numbers — a CBDT audit red flag
    const seen = new Map<string, number>();
    for (const t of totalAllEligible) {
      const rn = (t.taxReceiptNumber || '').trim();
      if (rn) seen.set(rn, (seen.get(rn) || 0) + 1);
    }
    const duplicateReceiptNumbers = Array.from(seen.entries())
      .filter(([, c]) => c > 1)
      .map(([rn]) => rn);

    return {
      totalAmount,
      totalCount: totalAllEligible.length,
      missingPanCount,
      compliantCount,
      duplicateReceiptNumbers,
    };
  }, [rawTransactions]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedTxIds.size === eligibleTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(eligibleTransactions.map((tx) => tx.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedTxIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTxIds(next);
  };

  // Individual Receipt Download
  const handleDownloadSingle = async (tx: TreasuryTransaction) => {
    try {
      showToast('Generating official 80G Certificate...', 'info');
      await generate80GTaxReceipt(tx, activeWorkspace, { download: true });
      showToast(`Receipt downloaded for ${tx.devoteeName || 'Donor'}`, 'success', '80G Certificate');
    } catch (e: any) {
      console.error(e);
      showToast('Failed to compile 80G Certificate', 'error');
    }
  };

  // Individual Receipt Preview
  const handlePreviewSingle = async (tx: TreasuryTransaction) => {
    try {
      setIsPreviewOpen(true);
      setPreviewFileName(`80G_Receipt_${tx.taxReceiptNumber || tx.id}.pdf`);
      const blobUrl = (await generate80GTaxReceipt(tx, activeWorkspace, {
        download: false,
        returnType: 'bloburl',
      })) as string;
      if (blobUrl) {
        setPreviewPdfUrl(blobUrl);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load PDF preview', 'error');
      setIsPreviewOpen(false);
    }
  };

  // Bulk Generation Action
  const handleBulkGenerate = async () => {
    const targetTransactions =
      selectedTxIds.size > 0
        ? eligibleTransactions.filter((tx) => selectedTxIds.has(tx.id))
        : eligibleTransactions;

    if (targetTransactions.length === 0) {
      showToast('No eligible transactions selected for bulk generation', 'warning');
      return;
    }

    try {
      setIsBulkGenerating(true);
      showToast(
        `Assembling statutory 80G bulk certificates for ${targetTransactions.length} donors...`,
        'info',
        'Form 10BE Compliance'
      );
      await generateBulkTaxReceiptsPDF(targetTransactions, activeWorkspace);
      showToast(
        `Successfully generated bulk package for ${targetTransactions.length} records!`,
        'success',
        'Bulk Export Ready'
      );
    } catch (e) {
      console.error(e);
      showToast('Bulk PDF generation failed', 'error');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Open Update PAN Modal
  const handleOpenPanModal = (tx: TreasuryTransaction) => {
    setEditingTx(tx);
    setNewPan(tx.devoteePan || '');
  };

  // Submit PAN Update
  const handleSavePan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const formattedPan = newPan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (formattedPan && !panRegex.test(formattedPan)) {
      showToast('Please enter a valid 10-character Indian PAN (e.g. ABCDE1234F)', 'warning', 'Invalid PAN Format');
      return;
    }

    try {
      setIsUpdatingPan(true);
      updateTreasuryTransaction(editingTx.id, {
        devoteePan: formattedPan || undefined,
      });
      showToast(
        `Donor PAN for ${editingTx.devoteeName} updated to ${formattedPan || 'N/A'}.`,
        'success',
        'Form 10BE Ready'
      );
      setEditingTx(null);
      setNewPan('');
    } catch (err) {
      console.error(err);
      showToast('Failed to update PAN on the ledger.', 'error');
    } finally {
      setIsUpdatingPan(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* H-1: unregistered workspace → honest SAMPLE state with a path to Settings */}
      {!activeWorkspace?.trust80GRegistered && (
        <div className="rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-900 uppercase tracking-wide">
                Sample state — this organisation is not 80G-registered
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Certificates generated here are clearly marked <strong>SAMPLE</strong> and carry no URN.
                Add your 80G registration in Settings to issue valid statutory receipts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'masterSettings' }))}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Open Settings → 80G
          </button>
        </div>
      )}
      {/* M-18: receipt-number integrity — surface gaps/duplicates honestly */}
      {(receiptIntegrity.gaps80G.length > 0 || receiptIntegrity.gapsChanda.length > 0 || receiptIntegrity.duplicates.length > 0) && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 leading-relaxed">
            <p className="font-black uppercase tracking-wide mb-1">Receipt series integrity — review needed ({receiptIntegrity.year})</p>
            {receiptIntegrity.gaps80G.length > 0 && (
              <p>Missing 80G sequence numbers: <strong>{receiptIntegrity.gaps80G.map((s) => formatReceiptNumber('SB-80G', receiptIntegrity.year, s)).join(', ')}</strong></p>
            )}
            {receiptIntegrity.gapsChanda.length > 0 && (
              <p>Missing Chanda sequence numbers: <strong>{receiptIntegrity.gapsChanda.map((s) => formatReceiptNumber('SB-CHANDA', receiptIntegrity.year, s)).join(', ')}</strong></p>
            )}
            {receiptIntegrity.duplicates.length > 0 && (
              <p>Duplicate receipt numbers: <strong>{receiptIntegrity.duplicates.join(', ')}</strong></p>
            )}
            <p className="mt-1 text-rose-700">A gap is a flag for review — it can come from a voided receipt or two devices issuing offline — not proof of fraud.</p>
          </div>
        </div>
      )}
      {/* Enterprise Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-temple-950 via-temple-900 to-amber-950/70 border border-amber-500/30 p-6 rounded-3xl shadow-2xl">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Statutory Form 10BE & 80G
            </span>
            <span className="text-xs text-temple-300 font-mono bg-temple-950/60 px-2.5 py-1 rounded-lg border border-temple-800">
              80G URN: {activeWorkspace.trust80GRegistered ? (activeWorkspace.trust80GURN || '—') : 'Not registered'}
            </span>
            {!activeWorkspace.trust80GRegistered && (
              <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Sample mode — not statutory
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
            Section 80G Tax Exemption & Form 10BE Desk
          </h2>
          <p className="text-xs sm:text-sm text-temple-400 mt-1 max-w-2xl">
            Enterprise compliance portal to issue statutory certificates under Section 80G(5)(vi) of the Income Tax Act, 1961, audit donor PANs, and prepare annual Form 10BD/10BE statements.
          </p>
        </div>

        {/* Primary Bulk Generation Action */}
        <div className="flex flex-wrap items-center gap-3">
          <DataExportButton
            filename={`80G_register_${new Date().toISOString().slice(0, 10)}.csv`}
            label="Export 80G Register"
            records={eligibleTransactions.map((tx) => ({
              receiptNumber: tx.taxReceiptNumber || tx.referenceNo || tx.id,
              date: tx.date,
              donorName: tx.devoteeName || '',
              pan: tx.devoteePan || '',
              panCompliant: isValidPAN(tx.devoteePan || '') ? 'YES' : 'NO',
              amount: Number(tx.amount) || 0,
              paymentMode: tx.paymentMode || '',
              category: tx.category || '',
            }))}
          />
          <button
            type="button"
            onClick={handleBulkGenerate}
            disabled={isBulkGenerating || eligibleTransactions.length === 0}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-temple-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-600/30 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-temple-950" />
            <span>
              {isBulkGenerating
                ? 'Compiling Bulk Package...'
                : `Bulk Generate 80G (${selectedTxIds.size > 0 ? selectedTxIds.size : 'All Filtered'})`}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {metrics.duplicateReceiptNumbers.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-black text-red-300 uppercase tracking-wider mb-1">
              Duplicate 80G Receipt Numbers Detected
            </p>
            <p className="text-red-200/90">
              {metrics.duplicateReceiptNumbers.length} receipt number{metrics.duplicateReceiptNumbers.length === 1 ? '' : 's'} appear{metrics.duplicateReceiptNumbers.length === 1 ? 's' : ''} more than once:{' '}
              <span className="font-mono font-bold">{metrics.duplicateReceiptNumbers.slice(0, 5).join(', ')}</span>
              {metrics.duplicateReceiptNumbers.length > 5 && ` (+${metrics.duplicateReceiptNumbers.length - 5} more)`}.{' '}
              Duplicate certificate numbers are a CBDT audit red flag — please void and reissue before filing Form 10BD.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deductible Amount */}
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <p className="text-xs font-bold text-temple-400 uppercase tracking-wider">Total 80G Collections</p>
          <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
            ₹{metrics.totalAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-temple-400 mt-1 font-mono">Eligible for 50% Tax Deduction</p>
        </div>

        {/* Total Receipts */}
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <p className="text-xs font-bold text-temple-400 uppercase tracking-wider">80G Eligible Receipts</p>
          <p className="text-xl sm:text-2xl font-black text-temple-100 mt-1">{metrics.totalCount}</p>
          <p className="text-[11px] text-temple-400 mt-1">Recorded in Treasury Ledger</p>
        </div>

        {/* 10BE Compliant (With PAN) */}
        <div className="bg-temple-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-lg bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">10BE Compliant</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">{metrics.compliantCount}</p>
          <p className="text-[11px] text-emerald-400/80 mt-1">Ready for IT Department Filing</p>
        </div>

        {/* Critical Alert: Missing PAN */}
        <div className="bg-temple-900/90 border border-rose-500/40 rounded-2xl p-4 sm:p-5 shadow-lg bg-rose-950/25">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Missing Donor PAN</p>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-300 mt-1">{metrics.missingPanCount}</p>
          <p className="text-[11px] text-rose-400/80 mt-1 font-semibold">Action Required for Form 10BE</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-temple-900/95 border border-temple-800 p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-temple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Donor Name, Receipt No, PAN, or Category..."
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
          </div>
        </div>

        {/* PAN Compliance Quick Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-temple-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs text-temple-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              Filter By:
            </span>
            <button
              type="button"
              onClick={() => setPanFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                panFilter === 'all'
                  ? 'bg-amber-500 text-temple-950'
                  : 'bg-temple-800 text-temple-300 hover:bg-temple-750'
              }`}
            >
              All Records ({eligibleTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setPanFilter('missing')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                panFilter === 'missing'
                  ? 'bg-rose-500 text-white'
                  : 'bg-temple-800 text-rose-300 hover:bg-temple-750'
              }`}
            >
              Missing PAN Only ({metrics.missingPanCount})
            </button>
            <button
              type="button"
              onClick={() => setPanFilter('compliant')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                panFilter === 'compliant'
                  ? 'bg-emerald-500 text-temple-950'
                  : 'bg-temple-800 text-emerald-300 hover:bg-temple-750'
              }`}
            >
              Compliant (With PAN) ({metrics.compliantCount})
            </button>
          </div>

          <div className="text-xs text-temple-400">
            Showing <span className="font-bold text-amber-400">{eligibleTransactions.length}</span> receipts
            {selectedTxIds.size > 0 && ` (${selectedTxIds.size} selected)`}
          </div>
        </div>
      </div>

      {/* High-Density Responsive Data Table */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-temple-200">
            <thead className="bg-temple-950/80 text-temple-400 border-b border-temple-800 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-temple-400 hover:text-amber-400"
                    title="Select All"
                  >
                    {selectedTxIds.size === eligibleTransactions.length && eligibleTransactions.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-3 font-extrabold text-temple-300">Date</th>
                <th className="py-4 px-3 font-extrabold text-temple-300">Receipt No</th>
                <th className="py-4 px-3 font-extrabold text-temple-300">Donor Name</th>
                <th className="py-4 px-3 font-extrabold text-temple-300">Donor PAN (Form 10BE)</th>
                <th className="py-4 px-3 font-extrabold text-temple-300 text-right">Donation Amount</th>
                <th className="py-4 px-3 font-extrabold text-temple-300 text-center">Compliance Status</th>
                <th className="py-4 px-4 font-extrabold text-temple-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-temple-800/60">
              {eligibleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-temple-400">
                    <Receipt className="w-10 h-10 mx-auto text-temple-600 mb-2" />
                    <p className="font-semibold text-sm">No 80G Eligible Receipts Found</p>
                    <p className="text-xs text-temple-500 mt-0.5">Try adjusting your search criteria or date filters.</p>
                  </td>
                </tr>
              ) : (
                eligibleTransactions.map((tx) => {
                  const isSelected = selectedTxIds.has(tx.id);
                  const hasPan = Boolean(tx.devoteePan && tx.devoteePan.trim().length >= 10);
                  const receiptNo = tx.taxReceiptNumber || `SB-80G-${tx.id.slice(-6).toUpperCase()}`;

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-temple-800/40 transition-colors ${
                        isSelected ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(tx.id)}
                          className="text-temple-400 hover:text-amber-400"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-temple-300 whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Receipt No */}
                      <td className="py-3 px-3 font-mono font-bold text-amber-300 whitespace-nowrap">
                        {receiptNo}
                      </td>

                      {/* Donor Name & Purpose */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-temple-100">{tx.devoteeName || 'Anonymous Devotee'}</div>
                        <div className="text-[10px] text-temple-400 truncate max-w-xs">{tx.category} • {tx.purpose}</div>
                      </td>

                      {/* Donor PAN with Critical Missing Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {hasPan ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{tx.devoteePan}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-extrabold animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Missing PAN
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenPanModal(tx)}
                              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
                              title="Add Donor PAN for Form 10BE"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right font-black font-mono text-emerald-400 text-sm whitespace-nowrap">
                        ₹{(tx.amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasPan ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            Form 10BE Ready
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            PAN Required
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Update PAN button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPanModal(tx)}
                            className="p-1.5 rounded-lg bg-temple-800 hover:bg-temple-750 text-temple-300 hover:text-amber-300 transition-colors"
                            title="Update Donor PAN"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Preview PDF */}
                          <button
                            type="button"
                            onClick={() => handlePreviewSingle(tx)}
                            className="p-1.5 rounded-lg bg-temple-800 hover:bg-temple-750 text-temple-300 hover:text-amber-300 transition-colors"
                            title="Preview 80G Certificate"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download 80G Certificate */}
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(tx)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-temple-950 font-bold text-xs shadow transition-all cursor-pointer"
                            title="Download Signed 80G PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>80G PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPDATE PAN MODAL */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-temple-900 border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-temple-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-temple-100">Update Donor PAN (Form 10BE)</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-temple-400 hover:text-temple-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePan} className="space-y-4">
              <div className="bg-temple-950/70 p-3 rounded-xl border border-temple-800 space-y-1">
                <p className="text-xs text-temple-400">
                  Donor: <span className="font-bold text-temple-200">{editingTx.devoteeName}</span>
                </p>
                <p className="text-xs text-temple-400">
                  Receipt No: <span className="font-mono text-amber-400">{editingTx.taxReceiptNumber || editingTx.id}</span>
                </p>
                <p className="text-xs text-temple-400">
                  Amount: <span className="font-bold text-emerald-400">₹{(editingTx.amount || 0).toLocaleString()}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1.5 uppercase tracking-wider">
                  Permanent Account Number (PAN) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  value={newPan}
                  onChange={(e) => setNewPan(e.target.value.toUpperCase())}
                  className="w-full bg-temple-800 border-2 border-amber-500/50 rounded-xl px-3 py-2.5 text-base font-mono font-bold uppercase text-amber-300 placeholder-temple-500 focus:outline-none focus:border-amber-400 tracking-wider"
                  autoFocus
                />
                <p className="text-[11px] text-temple-400 mt-1">
                  10 alphanumeric characters required by CBDT for issuing certificate Form 10BE.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 rounded-xl bg-temple-800 hover:bg-temple-750 text-temple-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPan}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-temple-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {isUpdatingPan ? 'Saving...' : 'Save & Verify PAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfBlobUrl={previewPdfUrl}
        fileName={previewFileName}
        title="Section 80G Statutory Certificate Preview"
      />
    </div>
  );
};
