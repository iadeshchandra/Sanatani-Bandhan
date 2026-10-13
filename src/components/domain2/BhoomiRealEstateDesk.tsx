import React, { useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  X,
  Download,
  IndianRupee,
  Home,
  CalendarClock,
  User,
  Phone,
  FileText,
  TrendingUp,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { BhoomiProperty } from '../../types';
import { useToast } from '../../context/ToastContext';
import { exportToCSV } from '../../utils/csvEngine';
import { nextReceiptSeq, formatReceiptNumber } from '../../utils/receiptNumbers';
import { LocalOnlyBadge } from '../common/LocalOnlyBadge';

const inputCls =
  'w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-temple-950/80 border border-temple-800 text-temple-100 placeholder-temple-500 text-sm focus:border-saffron-500 focus:outline-none transition-colors';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-temple-400 mb-1';
const btnPrimary =
  'min-h-[44px] px-4 py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer';
const btnGhost =
  'min-h-[44px] px-3 py-2 rounded-xl bg-temple-800 hover:bg-temple-700 text-temple-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';

const PROPERTY_TYPES = [
  'Commercial Shop',
  'Office Space',
  'Community Hall',
  'Agricultural Land',
  'Residential Flat',
  'Warehouse',
];
const STATUSES: BhoomiProperty['status'][] = ['Occupied', 'Vacant', 'Under Maintenance'];
const PAYMENT_MODES = ['UPI / QR', 'Cash', 'Bank Transfer', 'Cheque', 'Card'];

const daysUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(ms / 86400000);
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const currentRentMonth = () => new Date().toISOString().slice(0, 7);

export const BhoomiRealEstateDesk: React.FC = () => {
  const { activeWorkspace, currentRole } = useAuthWorkspace();
  const { bhoomiProperties, rentReceipts, addBhoomiProperty, updateBhoomiProperty, deleteBhoomiProperty, addRentReceipt, addTreasuryTransaction } = useData();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<BhoomiProperty | null>(null);
  const [collectingFor, setCollectingFor] = useState<BhoomiProperty | null>(null);

  // --- Property form state ---
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState<string>('Commercial Shop');
  const [pAddress, setPAddress] = useState('');
  const [pArea, setPArea] = useState<number | ''>('');
  const [pRent, setPRent] = useState<number | ''>('');
  const [pDeposit, setPDeposit] = useState<number | ''>('');
  const [pTenant, setPTenant] = useState('');
  const [pTenantPhone, setPTenantPhone] = useState('');
  const [pLeaseStart, setPLeaseStart] = useState(todayISO());
  const [pLeaseEnd, setPLeaseEnd] = useState('');
  const [pEscalation, setPEscalation] = useState<number | ''>('');
  const [pStatus, setPStatus] = useState<BhoomiProperty['status']>('Occupied');
  const [pDocRef, setPDocRef] = useState('');
  const [pNotes, setPNotes] = useState('');

  // --- Rent collection form state ---
  const [rMonth, setRMonth] = useState(currentRentMonth());
  const [rAmount, setRAmount] = useState<number | ''>('');
  const [rPaidDate, setRPaidDate] = useState(todayISO());
  const [rMode, setRMode] = useState<string>('UPI / QR');
  const [rCollectedBy, setRCollectedBy] = useState('');
  const [rNotes, setRNotes] = useState('');

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const total = bhoomiProperties.length;
    const occupied = bhoomiProperties.filter((p) => p.status === 'Occupied');
    const rentRoll = occupied.reduce((s, p) => s + (p.monthlyRent || 0), 0);
    const occupancyPct = total > 0 ? Math.round((occupied.length / total) * 100) : 0;
    const month = currentRentMonth();
    const overdue = occupied.filter(
      (p) => !rentReceipts.some((r) => r.propertyId === p.id && r.rentMonth === month)
    ).reduce((s, p) => s + (p.monthlyRent || 0), 0);
    return { total, occupied: occupied.length, rentRoll, occupancyPct, overdue };
  }, [bhoomiProperties, rentReceipts]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bhoomiProperties.filter((p) => {
      const matchTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.tenantName || '').toLowerCase().includes(term) ||
        p.propertyType.toLowerCase().includes(term) ||
        p.address.toLowerCase().includes(term);
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchTerm && matchStatus;
    });
  }, [bhoomiProperties, searchTerm, statusFilter]);

  // ---------- Property modal helpers ----------
  const openAddModal = () => {
    setEditingProperty(null);
    setPName(''); setPType('Commercial Shop'); setPAddress(''); setPArea(''); setPRent('');
    setPDeposit(''); setPTenant(''); setPTenantPhone(''); setPLeaseStart(todayISO());
    setPLeaseEnd(''); setPEscalation(''); setPStatus('Occupied'); setPDocRef(''); setPNotes('');
    setIsPropertyModalOpen(true);
  };

  const openEditModal = (p: BhoomiProperty) => {
    setEditingProperty(p);
    setPName(p.name); setPType(p.propertyType); setPAddress(p.address); setPArea(p.areaSqFt ?? '');
    setPRent(p.monthlyRent); setPDeposit(p.depositAmount ?? ''); setPTenant(p.tenantName || '');
    setPTenantPhone(p.tenantPhone || ''); setPLeaseStart(p.leaseStartDate || todayISO());
    setPLeaseEnd(p.leaseEndDate || ''); setPEscalation(p.escalationPercent ?? '');
    setPStatus(p.status as BhoomiProperty['status']); setPDocRef(p.documentRef || ''); setPNotes(p.notes || '');
    setIsPropertyModalOpen(true);
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pAddress.trim() || !pRent) {
      showToast('Property name, address and monthly rent are required', 'warning', 'Bhoomi Registry');
      return;
    }
    const payload = {
      workspaceId: activeWorkspace.id,
      name: pName.trim(),
      propertyType: pType,
      address: pAddress.trim(),
      areaSqFt: pArea === '' ? undefined : Number(pArea),
      monthlyRent: Number(pRent),
      depositAmount: pDeposit === '' ? undefined : Number(pDeposit),
      tenantName: pTenant.trim() || undefined,
      tenantPhone: pTenantPhone.trim() || undefined,
      leaseStartDate: pLeaseStart || undefined,
      leaseEndDate: pLeaseEnd || undefined,
      escalationPercent: pEscalation === '' ? undefined : Number(pEscalation),
      status: pStatus,
      documentRef: pDocRef.trim() || undefined,
      notes: pNotes.trim() || undefined,
    };
    if (editingProperty) {
      updateBhoomiProperty(editingProperty.id, payload);
    } else {
      const ok = addBhoomiProperty(payload);
      if (!ok) return;
    }
    setIsPropertyModalOpen(false);
  };

  const handleDelete = (p: BhoomiProperty) => {
    if (window.confirm(`Delete "${p.name}" and its rent receipts from the registry?`)) {
      deleteBhoomiProperty(p.id);
    }
  };

  // ---------- Rent collection ----------
  const openRentModal = (p: BhoomiProperty) => {
    setCollectingFor(p);
    setRMonth(currentRentMonth());
    setRAmount(p.monthlyRent);
    setRPaidDate(todayISO());
    setRMode('UPI / QR');
    setRCollectedBy('');
    setRNotes('');
    setIsRentModalOpen(true);
  };

  const isMonthPaid = (p: BhoomiProperty, month: string) =>
    rentReceipts.some((r) => r.propertyId === p.id && r.rentMonth === month);

  const handleCollectRent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingFor) return;
    if (!rAmount) {
      showToast('Enter the collected rent amount', 'warning', 'Rent Collection');
      return;
    }
    if (isMonthPaid(collectingFor, rMonth)) {
      showToast(`Rent for ${rMonth} is already recorded for ${collectingFor.name}`, 'warning', 'Rent Collection');
      return;
    }
    // M-18: max(existing seqs)+1 — never length+1, which reuses numbers after deletion.
    const year = new Date().getFullYear();
    const receiptNo = formatReceiptNumber(
      'SB-RENT',
      year,
      nextReceiptSeq(rentReceipts.map((r) => r.receiptNo), 'SB-RENT', year)
    );
    const collector = rCollectedBy.trim() || currentRole || 'Office Staff';
    const ok = addRentReceipt({
      workspaceId: activeWorkspace.id,
      propertyId: collectingFor.id,
      propertyName: collectingFor.name,
      tenantName: collectingFor.tenantName || '—',
      rentMonth: rMonth,
      amount: Number(rAmount),
      paidDate: rPaidDate,
      paymentMode: rMode,
      receiptNo,
      collectedBy: collector,
      notes: rNotes.trim() || undefined,
    });
    if (!ok) return;

    // Auto-post Income to Treasury Ledger
    addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      type: 'Income',
      category: 'Property Rent Income',
      date: rPaidDate,
      amount: Number(rAmount),
      handledBy: collector,
      paymentMode: rMode,
      purpose: `Rent — ${collectingFor.name} — ${collectingFor.tenantName || '—'} — ${rMonth}`,
      devoteeName: collectingFor.tenantName || undefined,
      referenceNo: receiptNo,
    });
    showToast(`Treasury auto-posted: ${receiptNo}`, 'info', 'Treasury Sync');
    setIsRentModalOpen(false);
  };

  const handleExportLedger = () => {
    if (rentReceipts.length === 0) {
      showToast('No rent receipts to export yet', 'warning', 'CSV Export');
      return;
    }
    exportToCSV(
      'Sanatani_Bhoomi_Rent_Ledger',
      ['Receipt No', 'Property', 'Tenant', 'Rent Month', 'Amount (₹)', 'Paid Date', 'Payment Mode', 'Collected By', 'Notes'],
      rentReceipts.map((r) => [
        r.receiptNo, r.propertyName, r.tenantName, r.rentMonth, r.amount,
        r.paidDate, r.paymentMode, r.collectedBy, r.notes || '',
      ])
    );
    showToast(`${rentReceipts.length} receipts exported to CSV`, 'success', 'CSV Export');
  };

  const handleExportRegister = () => {
    if (bhoomiProperties.length === 0) {
      showToast('No properties to export yet', 'warning', 'CSV Export');
      return;
    }
    exportToCSV(
      'Sanatani_Bhoomi_Property_Register',
      ['Property', 'Type', 'Address', 'Area (sqft)', 'Monthly Rent (₹)', 'Deposit (₹)', 'Tenant', 'Tenant Phone', 'Lease Start', 'Lease End', 'Escalation %', 'Status', 'Doc Ref'],
      bhoomiProperties.map((p) => [
        p.name, p.propertyType, p.address, p.areaSqFt ?? '', p.monthlyRent, p.depositAmount ?? '',
        p.tenantName || '', p.tenantPhone || '', p.leaseStartDate || '', p.leaseEndDate || '',
        p.escalationPercent ?? '', p.status, p.documentRef || '',
      ])
    );
    showToast(`${bhoomiProperties.length} properties exported to CSV`, 'success', 'CSV Export');
  };

  const projectedRent = (p: BhoomiProperty) =>
    p.escalationPercent ? Math.round(p.monthlyRent * (1 + p.escalationPercent / 100)) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Land & Lease Management
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {kpis.total} properties • ₹{kpis.rentRoll.toLocaleString()}/mo
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Bhoomi & Property Leases
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Commercial leases, rent roll collection & lease renewals — auto-posted to the Treasury Ledger
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleExportRegister} className={btnGhost}>
            <Download className="w-4 h-4" /> <span>Register CSV</span>
          </button>
          <button type="button" onClick={handleExportLedger} className={btnGhost}>
            <Download className="w-4 h-4" /> <span>Ledger CSV</span>
          </button>
          <button type="button" onClick={openAddModal} className={btnPrimary}>
            <Plus className="w-4 h-4" /> <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-saffron-400" /> Total Properties
          </div>
          <p className="text-3xl font-extrabold text-temple-100 mt-2">{kpis.total}</p>
          <p className="text-xs text-temple-500 mt-1">{kpis.occupied} occupied • {kpis.total - kpis.occupied} vacant / maintenance</p>
        </div>
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wider">
            <IndianRupee className="w-4 h-4 text-saffron-400" /> Monthly Rent Roll
          </div>
          <p className="text-3xl font-extrabold text-temple-100 mt-2">₹{kpis.rentRoll.toLocaleString()}</p>
          <p className="text-xs text-temple-500 mt-1">From occupied properties</p>
        </div>
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wider">
            <Home className="w-4 h-4 text-saffron-400" /> Occupancy
          </div>
          <p className="text-3xl font-extrabold text-temple-100 mt-2">{kpis.occupancyPct}%</p>
          <p className="text-xs text-temple-500 mt-1">{kpis.occupied} of {kpis.total} units let</p>
        </div>
        <div className={`bg-temple-900/90 border rounded-2xl p-5 shadow-lg ${kpis.overdue > 0 ? 'border-red-500/40' : 'border-temple-800'}`}>
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle className={`w-4 h-4 ${kpis.overdue > 0 ? 'text-red-400' : 'text-saffron-400'}`} /> Overdue Rent ({currentRentMonth()})
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${kpis.overdue > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
            ₹{kpis.overdue.toLocaleString()}
          </p>
          <p className="text-xs text-temple-500 mt-1">{kpis.overdue > 0 ? 'Collection pending this month' : 'All dues collected 🎉'}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-temple-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search property, tenant, address…"
            className={`${inputCls} pl-10`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} sm:w-48`}>
          {['All', ...STATUSES].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Property Cards */}
      {filtered.length === 0 ? (
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-12 text-center">
          <Building2 className="w-10 h-10 text-temple-600 mx-auto mb-3" />
          <p className="text-temple-200 font-bold">No properties found</p>
          <p className="text-xs text-temple-500 mt-1">Register your first trust property to start the rent roll.</p>
          <button type="button" onClick={openAddModal} className={`${btnPrimary} mx-auto mt-4`}>
            <Plus className="w-4 h-4" /> <span>Add Property</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const leaseDays = daysUntil(p.leaseEndDate);
            const paidThisMonth = isMonthPaid(p, currentRentMonth());
            const proj = projectedRent(p);
            return (
              <div key={p.id} className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-saffron-400">{p.propertyType}</span>
                      <h3 className="font-extrabold text-sm text-temple-100 mt-0.5">{p.name}</h3>
                      <p className="text-[11px] text-temple-500 mt-0.5">{p.address}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                      p.status === 'Occupied'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : p.status === 'Vacant'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="py-2 space-y-1.5 text-xs text-temple-300">
                    <p className="flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-saffron-400" />
                      <span className="text-temple-400">Rent:</span>{' '}
                      <span className="font-extrabold text-temple-100">₹{p.monthlyRent.toLocaleString()}/mo</span>
                      {proj && <span className="text-[10px] text-temple-500">→ ₹{proj.toLocaleString()} next yr ({p.escalationPercent}%)</span>}
                    </p>
                    {p.tenantName && (
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-saffron-400" />
                        <span className="text-temple-400">Tenant:</span> <span className="font-medium text-temple-100">{p.tenantName}</span>
                        {p.tenantPhone && <span className="text-temple-500 flex items-center gap-0.5"><Phone className="w-3 h-3" />{p.tenantPhone}</span>}
                      </p>
                    )}
                    {p.leaseEndDate && (
                      <p className="flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-saffron-400" />
                        <span className="text-temple-400">Lease ends:</span> <span className="text-temple-100">{p.leaseEndDate}</span>
                        {leaseDays !== null && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            leaseDays < 0 ? 'bg-red-500/20 text-red-300'
                            : leaseDays <= 60 ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-temple-800 text-temple-300'
                          }`}>
                            {leaseDays < 0 ? `Expired ${Math.abs(leaseDays)}d ago` : `${leaseDays}d left`}
                          </span>
                        )}
                      </p>
                    )}
                    {p.depositAmount !== undefined && (
                      <p className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-saffron-400" />
                        <span className="text-temple-400">Deposit:</span> <span className="text-temple-100">₹{p.depositAmount.toLocaleString()}</span>
                      </p>
                    )}
                    {paidThisMonth && (
                      <p className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {currentRentMonth()} rent collected
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openRentModal(p)}
                    disabled={p.status !== 'Occupied'}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 disabled:bg-temple-800 disabled:text-temple-500 disabled:cursor-not-allowed text-temple-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <IndianRupee className="w-4 h-4" /> <span>Collect Rent</span>
                  </button>
                  <button type="button" onClick={() => openEditModal(p)} className={btnGhost} aria-label="Edit property">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(p)} className={`${btnGhost} hover:!bg-red-900/60`} aria-label="Delete property">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rent Ledger */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-temple-100 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-saffron-400" /> Rent Collection Ledger
          </h3>
          <span className="text-[11px] text-temple-500 font-mono">
            Total collected: ₹{rentReceipts.reduce((s, r) => s + r.amount, 0).toLocaleString()}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-temple-500 uppercase text-[10px] tracking-wider border-b border-temple-800">
                <th className="py-2 pr-3">Receipt</th>
                <th className="py-2 pr-3">Property</th>
                <th className="py-2 pr-3">Tenant</th>
                <th className="py-2 pr-3">Month</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Paid Date</th>
                <th className="py-2 pr-3">Mode</th>
                <th className="py-2">Collected By</th>
              </tr>
            </thead>
            <tbody>
              {rentReceipts.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-temple-500">No rent collected yet.</td></tr>
              )}
              {rentReceipts.map((r) => (
                <tr key={r.id} className="border-b border-temple-800/50 text-temple-200">
                  <td className="py-2.5 pr-3 font-mono text-saffron-300">{r.receiptNo}</td>
                  <td className="py-2.5 pr-3 font-medium">{r.propertyName}</td>
                  <td className="py-2.5 pr-3">{r.tenantName}</td>
                  <td className="py-2.5 pr-3 font-mono">{r.rentMonth}</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-emerald-300">₹{r.amount.toLocaleString()}</td>
                  <td className="py-2.5 pr-3">{r.paidDate}</td>
                  <td className="py-2.5 pr-3">{r.paymentMode}</td>
                  <td className="py-2.5">{r.collectedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Property Modal */}
      {isPropertyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setIsPropertyModalOpen(false)}>
          <div className="bg-temple-900 border border-temple-700 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap"><h3 className="text-lg font-extrabold text-temple-100">{editingProperty ? 'Edit Property' : 'Add Property'}</h3><LocalOnlyBadge /></div>
              <button type="button" onClick={() => setIsPropertyModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-temple-800 text-temple-300 hover:bg-temple-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProperty} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className={labelCls}>Property Name *</label><input value={pName} onChange={(e) => setPName(e.target.value)} className={inputCls} placeholder="e.g. Shree Ganesh Complex — Shop 12" /></div>
              <div><label className={labelCls}>Property Type</label><select value={pType} onChange={(e) => setPType(e.target.value)} className={inputCls}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className={labelCls}>Status</label><select value={pStatus} onChange={(e) => setPStatus(e.target.value as BhoomiProperty['status'])} className={inputCls}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="sm:col-span-2"><label className={labelCls}>Address *</label><input value={pAddress} onChange={(e) => setPAddress(e.target.value)} className={inputCls} placeholder="Full address" /></div>
              <div><label className={labelCls}>Area (sq ft)</label><input type="number" min={0} value={pArea} onChange={(e) => setPArea(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>Monthly Rent (₹) *</label><input type="number" min={0} value={pRent} onChange={(e) => setPRent(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>Deposit Amount (₹)</label><input type="number" min={0} value={pDeposit} onChange={(e) => setPDeposit(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>Annual Escalation %</label><input type="number" min={0} max={100} value={pEscalation} onChange={(e) => setPEscalation(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="e.g. 5" /></div>
              <div><label className={labelCls}>Tenant Name</label><input value={pTenant} onChange={(e) => setPTenant(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Tenant Phone</label><input value={pTenantPhone} onChange={(e) => setPTenantPhone(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Lease Start</label><input type="date" value={pLeaseStart} onChange={(e) => setPLeaseStart(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Lease End</label><input type="date" value={pLeaseEnd} onChange={(e) => setPLeaseEnd(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Document Ref (Agreement No)</label><input value={pDocRef} onChange={(e) => setPDocRef(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Notes</label><input value={pNotes} onChange={(e) => setPNotes(e.target.value)} className={inputCls} /></div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <button type="submit" className={`${btnPrimary} flex-1`}><TrendingUp className="w-4 h-4" /> <span>{editingProperty ? 'Save Changes' : 'Register Property'}</span></button>
                <button type="button" onClick={() => setIsPropertyModalOpen(false)} className={btnGhost}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Rent Modal */}
      {isRentModalOpen && collectingFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setIsRentModalOpen(false)}>
          <div className="bg-temple-900 border border-temple-700 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-extrabold text-temple-100">Collect Rent</h3>
              <button type="button" onClick={() => setIsRentModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-temple-800 text-temple-300 hover:bg-temple-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-temple-400 mb-4">
              {collectingFor.name} • Tenant: <span className="text-temple-200 font-medium">{collectingFor.tenantName || '—'}</span>
            </p>
            <form onSubmit={handleCollectRent} className="space-y-4">
              <div><label className={labelCls}>Rent Month (YYYY-MM)</label><input type="month" value={rMonth} onChange={(e) => setRMonth(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Amount (₹) *</label><input type="number" min={0} value={rAmount} onChange={(e) => setRAmount(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>Paid Date</label><input type="date" value={rPaidDate} onChange={(e) => setRPaidDate(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Payment Mode</label><select value={rMode} onChange={(e) => setRMode(e.target.value)} className={inputCls}>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className={labelCls}>Collected By</label><input value={rCollectedBy} onChange={(e) => setRCollectedBy(e.target.value)} className={inputCls} placeholder={currentRole || 'Office Staff'} /></div>
              <div><label className={labelCls}>Notes</label><input value={rNotes} onChange={(e) => setRNotes(e.target.value)} className={inputCls} /></div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-[11px] text-emerald-200">
                Auto-posts an <span className="font-bold">Income → "Property Rent Income"</span> entry to the Treasury Ledger with receipt reference.
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`${btnPrimary} flex-1`}><IndianRupee className="w-4 h-4" /> <span>Confirm Collection</span></button>
                <button type="button" onClick={() => setIsRentModalOpen(false)} className={btnGhost}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
