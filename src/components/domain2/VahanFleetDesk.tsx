import React, { useMemo, useState } from 'react';
import { useInr, useWorkspaceCurrency } from '../../hooks/useWorkspaceInr';
import {
  Bus,
  Plus,
  Search,
  X,
  Download,
  IndianRupee,
  Fuel,
  Wrench,
  AlertTriangle,
  Pencil,
  Trash2,
  Gauge,
  User,
  Phone,
  ShieldCheck,
  CalendarClock,
  FileCheck,
  BarChart3,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { FleetVehicle } from '../../types';
import { useToast } from '../../context/ToastContext';
import { exportToCSV } from '../../utils/csvEngine';
import { LocalOnlyBadge } from '../common/LocalOnlyBadge';
import { useLanguage } from '../../context/LanguageContext';

const inputCls =
  'w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-temple-950/80 border border-temple-800 text-temple-100 placeholder-temple-500 text-sm focus:border-saffron-500 focus:outline-none transition-colors';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-temple-400 mb-1';
const btnPrimary =
  'min-h-[44px] px-4 py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer';
const btnGhost =
  'min-h-[44px] px-3 py-2 rounded-xl bg-temple-800 hover:bg-temple-700 text-temple-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer';

const VEHICLE_TYPES = ['Yatra Bus', 'Tractor', 'Truck', 'Van', 'Car', 'Ambulance'];
const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'Electric'];
const V_STATUSES: FleetVehicle['status'][] = ['Active', 'In Service', 'Retired'];
const SERVICE_TYPES = ['Routine Service', 'Repair', 'Tyre Replacement', 'Insurance Renewal', 'RTO Renewal'];
const PAYMENT_MODES = ['UPI / QR', 'Cash', 'Bank Transfer', 'Card'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const daysUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(ms / 86400000);
};

const expiryTone = (d: number | null): string => {
  if (d === null) return 'bg-temple-800 text-temple-300 border border-temple-700';
  if (d <= 7) return 'bg-red-500/20 text-red-300 border border-red-500/40';
  if (d <= 30) return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
  return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
};

const expiryLabel = (name: string, d: number | null): string => {
  if (d === null) return `${name}: —`;
  if (d < 0) return `${name}: expired ${Math.abs(d)}d ago`;
  if (d === 0) return `${name}: expires TODAY`;
  return `${name}: ${d}d left`;
};

export const VahanFleetDesk: React.FC = () => {
  const { t } = useLanguage();
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { activeWorkspace, currentRole } = useAuthWorkspace();
  const {
    fleetVehicles, fuelLogs, serviceRecords,
    addFleetVehicle, updateFleetVehicle, deleteFleetVehicle,
    addFuelLog, addServiceRecord, addTreasuryTransaction,
  } = useData();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [loggingVehicle, setLoggingVehicle] = useState<FleetVehicle | null>(null);
  const [serviceVehicle, setServiceVehicle] = useState<FleetVehicle | null>(null);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  // --- Vehicle form state ---
  const [vReg, setVReg] = useState('');
  const [vType, setVType] = useState<string>('Yatra Bus');
  const [vMake, setVMake] = useState('');
  const [vYear, setVYear] = useState<number | ''>('');
  const [vFuel, setVFuel] = useState<string>('Diesel');
  const [vOdo, setVOdo] = useState<number | ''>('');
  const [vRto, setVRto] = useState('');
  const [vIns, setVIns] = useState('');
  const [vPuc, setVPuc] = useState('');
  const [vFit, setVFit] = useState('');
  const [vDriver, setVDriver] = useState('');
  const [vDriverPhone, setVDriverPhone] = useState('');
  const [vStatus, setVStatus] = useState<FleetVehicle['status']>('Active');
  const [vNotes, setVNotes] = useState('');

  // --- Fuel form state ---
  const [fDate, setFDate] = useState(todayISO());
  const [fOdo, setFOdo] = useState<number | ''>('');
  const [fLiters, setFLiters] = useState<number | ''>('');
  const [fRate, setFRate] = useState<number | ''>('');
  const [fStation, setFStation] = useState('');
  const [fLoggedBy, setFLoggedBy] = useState('');
  const [fMode, setFMode] = useState<string>('UPI / QR');

  // --- Service form state ---
  const [sDate, setSDate] = useState(todayISO());
  const [sType, setSType] = useState<string>('Routine Service');
  const [sCost, setSCost] = useState<number | ''>('');
  const [sVendor, setSVendor] = useState('');
  const [sOdo, setSOdo] = useState<number | ''>('');
  const [sNextDue, setSNextDue] = useState('');
  const [sLoggedBy, setSLoggedBy] = useState('');
  const [sMode, setSMode] = useState<string>('UPI / QR');
  const [sNotes, setSNotes] = useState('');

  // ---------- Expiry alert engine ----------
  const urgentRenewals = useMemo(() => {
    const alerts: { vehicle: FleetVehicle; doc: string; days: number }[] = [];
    for (const v of fleetVehicles) {
      const docs: [string, string | undefined][] = [
        ['RTO', v.rtoExpiryDate],
        ['Insurance', v.insuranceExpiryDate],
        ['PUC', v.pucExpiryDate],
        ['Fitness', v.fitnessExpiryDate],
      ];
      for (const [doc, date] of docs) {
        const d = daysUntil(date);
        if (d !== null && d <= 30) alerts.push({ vehicle: v, doc, days: d });
      }
    }
    return alerts.sort((a, b) => a.days - b.days);
  }, [fleetVehicles]);

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const size = fleetVehicles.length;
    const active = fleetVehicles.filter((v) => v.status === 'Active').length;
    const cutoff = Date.now() - 30 * 86400000;
    const fuel30d = fuelLogs
      .filter((l) => new Date(l.logDate).getTime() >= cutoff)
      .reduce((s, l) => s + l.totalCost, 0);
    const servicesDue = serviceRecords.filter((s) => {
      const d = daysUntil(s.nextDueDate);
      return d !== null && d <= 30;
    }).length;
    return { size, active, fuel30d, servicesDue };
  }, [fleetVehicles, fuelLogs, serviceRecords]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return fleetVehicles.filter((v) => {
      const matchTerm =
        !term ||
        v.registrationNo.toLowerCase().includes(term) ||
        v.makeModel.toLowerCase().includes(term) ||
        v.vehicleType.toLowerCase().includes(term) ||
        (v.driverName || '').toLowerCase().includes(term);
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      return matchTerm && matchStatus;
    });
  }, [fleetVehicles, searchTerm, statusFilter]);

  // ---------- Vehicle modal ----------
  const openAddModal = () => {
    setEditingVehicle(null);
    setVReg(''); setVType('Yatra Bus'); setVMake(''); setVYear(''); setVFuel('Diesel');
    setVOdo(''); setVRto(''); setVIns(''); setVPuc(''); setVFit('');
    setVDriver(''); setVDriverPhone(''); setVStatus('Active'); setVNotes('');
    setIsVehicleModalOpen(true);
  };

  const openEditModal = (v: FleetVehicle) => {
    setEditingVehicle(v);
    setVReg(v.registrationNo); setVType(v.vehicleType); setVMake(v.makeModel);
    setVYear(v.yearOfMfg ?? ''); setVFuel(v.fuelType); setVOdo(v.odometerKm);
    setVRto(v.rtoExpiryDate); setVIns(v.insuranceExpiryDate); setVPuc(v.pucExpiryDate);
    setVFit(v.fitnessExpiryDate || ''); setVDriver(v.driverName || '');
    setVDriverPhone(v.driverPhone || ''); setVStatus(v.status as FleetVehicle['status']); setVNotes(v.notes || '');
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vReg.trim() || !vMake.trim() || !vRto || !vIns || !vPuc) {
      showToast(t('surfaces.vahanFleet.registrationMakeModelAndRtoInsurance'), 'warning', 'Vahan Fleet');
      return;
    }
    const payload = {
      workspaceId: activeWorkspace.id,
      registrationNo: vReg.trim().toUpperCase(),
      vehicleType: vType,
      makeModel: vMake.trim(),
      yearOfMfg: vYear === '' ? undefined : Number(vYear),
      fuelType: vFuel,
      odometerKm: vOdo === '' ? 0 : Number(vOdo),
      rtoExpiryDate: vRto,
      insuranceExpiryDate: vIns,
      pucExpiryDate: vPuc,
      fitnessExpiryDate: vFit || undefined,
      driverName: vDriver.trim() || undefined,
      driverPhone: vDriverPhone.trim() || undefined,
      status: vStatus,
      notes: vNotes.trim() || undefined,
    };
    if (editingVehicle) {
      updateFleetVehicle(editingVehicle.id, payload);
    } else {
      const ok = addFleetVehicle(payload);
      if (!ok) return;
    }
    setIsVehicleModalOpen(false);
  };

  const handleDelete = (v: FleetVehicle) => {
    if (window.confirm(`Remove vehicle ${v.registrationNo} from the fleet register?`)) {
      deleteFleetVehicle(v.id);
    }
  };

  // ---------- Fuel logging ----------
  const lastOdoFor = (vehicleId: string): number => {
    const logs = fuelLogs.filter((l) => l.vehicleId === vehicleId);
    return logs.length > 0 ? Math.max(...logs.map((l) => l.odometerKm)) : 0;
  };

  const openFuelModal = (v: FleetVehicle) => {
    setLoggingVehicle(v);
    setFDate(todayISO()); setFOdo(v.odometerKm); setFLiters(''); setFRate('');
    setFStation(''); setFLoggedBy(''); setFMode('UPI / QR');
    setIsFuelModalOpen(true);
  };

  const handleLogFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingVehicle) return;
    if (!fLiters || !fRate || fOdo === '') {
      showToast(t('surfaces.vahanFleet.odometerLitersAndCostLiterAre'), 'warning', 'Fuel Log');
      return;
    }
    const minOdo = Math.max(loggingVehicle.odometerKm, lastOdoFor(loggingVehicle.id));
    if (Number(fOdo) < minOdo) {
      showToast(`Odometer must be ≥ ${minOdo.toLocaleString()} km (last recorded reading)`, 'error', 'Fuel Log');
      return;
    }
    const total = Number(fLiters) * Number(fRate);
    const ok = addFuelLog({
      workspaceId: activeWorkspace.id,
      vehicleId: loggingVehicle.id,
      registrationNo: loggingVehicle.registrationNo,
      logDate: fDate,
      odometerKm: Number(fOdo),
      litersFilled: Number(fLiters),
      costPerLiter: Number(fRate),
      totalCost: total,
      fuelStation: fStation.trim() || undefined,
      loggedBy: fLoggedBy.trim() || currentRole || 'Office Staff',
    });
    if (!ok) return;

    // Auto-post Expense to Treasury Ledger
    addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      type: 'Expense',
      category: 'Vehicle Fuel & Maintenance',
      subcategory: 'Fuel',
      date: fDate,
      amount: total,
      handledBy: fLoggedBy.trim() || currentRole || 'Office Staff',
      paymentMode: fMode,
      purpose: `Fuel — ${loggingVehicle.registrationNo} — ${Number(fLiters)}L @ ${inr(Number(fRate))}/L`,
      vendorName: fStation.trim() || undefined,
    });
    showToast(t('surfaces.vahanFleet.treasuryAutoPostedFuelExpense'), 'info', 'Treasury Sync');
    setIsFuelModalOpen(false);
  };

  // ---------- Service logging ----------
  const openServiceModal = (v: FleetVehicle) => {
    setServiceVehicle(v);
    setSDate(todayISO()); setSType('Routine Service'); setSCost('');
    setSVendor(''); setSOdo(v.odometerKm); setSNextDue(''); setSLoggedBy(''); setSMode('UPI / QR'); setSNotes('');
    setIsServiceModalOpen(true);
  };

  const handleLogService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceVehicle) return;
    if (!sCost) {
      showToast(t('surfaces.vahanFleet.enterTheServiceCost'), 'warning', 'Service Log');
      return;
    }
    const ok = addServiceRecord({
      workspaceId: activeWorkspace.id,
      vehicleId: serviceVehicle.id,
      registrationNo: serviceVehicle.registrationNo,
      serviceDate: sDate,
      serviceType: sType,
      cost: Number(sCost),
      vendorName: sVendor.trim() || undefined,
      odometerKm: sOdo === '' ? undefined : Number(sOdo),
      nextDueDate: sNextDue || undefined,
      notes: sNotes.trim() || undefined,
    });
    if (!ok) return;

    // Auto-post Expense to Treasury Ledger
    addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      type: 'Expense',
      category: 'Vehicle Fuel & Maintenance',
      subcategory: sType,
      date: sDate,
      amount: Number(sCost),
      handledBy: sLoggedBy.trim() || currentRole || 'Office Staff',
      paymentMode: sMode,
      purpose: `Service (${sType}) — ${serviceVehicle.registrationNo}`,
      vendorName: sVendor.trim() || undefined,
    });
    showToast(t('surfaces.vahanFleet.treasuryAutoPostedServiceExpense'), 'info', 'Treasury Sync');
    setIsServiceModalOpen(false);
  };

  // ---------- Per-vehicle analytics ----------
  const vehicleAnalytics = (vehicleId: string) => {
    const logs = fuelLogs.filter((l) => l.vehicleId === vehicleId);
    const services = serviceRecords.filter((s) => s.vehicleId === vehicleId);
    const fuelCost = logs.reduce((s, l) => s + l.totalCost, 0);
    const serviceCost = services.reduce((s, r) => s + r.cost, 0);
    const odos = logs.map((l) => l.odometerKm);
    const km = odos.length > 1 ? Math.max(...odos) - Math.min(...odos) : 0;
    const costPerKm = km > 0 ? (fuelCost + serviceCost) / km : 0;
    return { logs, services, fuelCost, serviceCost, km, costPerKm };
  };

  const handleExportRegister = () => {
    if (fleetVehicles.length === 0) {
      showToast(t('surfaces.vahanFleet.noVehiclesToExportYet'), 'warning', 'CSV Export');
      return;
    }
    exportToCSV(
      'Sanatani_Vahan_Fleet_Register',
      ['Registration No', 'Type', 'Make/Model', 'Year', 'Fuel Type', 'Odometer (km)', 'Driver', 'Driver Phone', 'RTO Expiry', 'Insurance Expiry', 'PUC Expiry', 'Fitness Expiry', 'Status'],
      fleetVehicles.map((v) => [
        v.registrationNo, v.vehicleType, v.makeModel, v.yearOfMfg ?? '', v.fuelType, v.odometerKm,
        v.driverName || '', v.driverPhone || '', v.rtoExpiryDate, v.insuranceExpiryDate, v.pucExpiryDate,
        v.fitnessExpiryDate || '', v.status,
      ])
    );
    showToast(`${fleetVehicles.length} vehicles exported to CSV`, 'success', 'CSV Export');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Yatra & Transport Operations
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {kpis.size} vehicles • {urgentRenewals.length} renewals due
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Vahan Fleet & Transport
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Buses, tractors & support vehicles — fuel, servicing, RTO compliance & cost/km analytics
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleExportRegister} className={btnGhost}>
            <Download className="w-4 h-4" /> <span>{t('surfaces.vahanFleet.fleetCsv')}</span>
          </button>
          <button type="button" onClick={openAddModal} className={btnPrimary}>
            <Plus className="w-4 h-4" /> <span>{t('surfaces.vahanFleet.addVehicle')}</span>
          </button>
        </div>
      </div>

      {/* Renewal Alert Strip */}
      {urgentRenewals.length > 0 && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-extrabold text-red-200">Urgent Renewals ({urgentRenewals.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {urgentRenewals.map((a, i) => (
              <div key={i} className={`px-3 py-2 rounded-xl border text-xs ${a.days <= 7 ? 'bg-red-500/15 border-red-500/40 text-red-200' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
                <span className="font-extrabold font-mono">{a.vehicle.registrationNo}</span>
                <span className="mx-1.5">•</span>{a.doc}
                <span className="mx-1.5">•</span>
                <span className="font-bold">{a.days < 0 ? `expired ${Math.abs(a.days)}d ago` : a.days === 0 ? 'expires TODAY' : `${a.days}d left`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wider">
            <Bus className="w-4 h-4 text-saffron-400" /> Fleet Size
          </div>
          <p className="text-3xl font-extrabold text-temple-100 mt-2">{kpis.size}</p>
          <p className="text-xs text-temple-500 mt-1">{t('surfaces.vahanFleet.registeredVehicles')}</p>
        </div>
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-saffron-400" /> Active Vehicles
          </div>
          <p className="text-3xl font-extrabold text-emerald-300 mt-2">{kpis.active}</p>
          <p className="text-xs text-temple-500 mt-1">{t('surfaces.vahanFleet.onRoadServiceable')}</p>
        </div>
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wider">
            <Fuel className="w-4 h-4 text-saffron-400" /> Fuel Spend (30d)
          </div>
          <p className="text-3xl font-extrabold text-temple-100 mt-2">{inr(Math.round(kpis.fuel30d))}</p>
          <p className="text-xs text-temple-500 mt-1">{t('surfaces.vahanFleet.last30Days')}</p>
        </div>
        <div className={`bg-temple-900/90 border rounded-2xl p-5 shadow-lg ${kpis.servicesDue > 0 ? 'border-amber-500/40' : 'border-temple-800'}`}>
          <div className="flex items-center gap-2 text-temple-400 text-[10px] font-bold uppercase tracking-wider">
            <Wrench className={`w-4 h-4 ${kpis.servicesDue > 0 ? 'text-amber-400' : 'text-saffron-400'}`} /> Services Due
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${kpis.servicesDue > 0 ? 'text-amber-300' : 'text-temple-100'}`}>{kpis.servicesDue}</p>
          <p className="text-xs text-temple-500 mt-1">{t('surfaces.vahanFleet.dueWithin30Days')}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-temple-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('surfaces.vahanFleet.searchRegistrationMakeDriver')}
            className={`${inputCls} pl-10`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} sm:w-48`}>
          {['All', ...V_STATUSES].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Vehicle Cards */}
      {filtered.length === 0 ? (
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-12 text-center">
          <Bus className="w-10 h-10 text-temple-600 mx-auto mb-3" />
          <p className="text-temple-200 font-bold">{t('surfaces.vahanFleet.noVehiclesFound')}</p>
          <p className="text-xs text-temple-500 mt-1">{t('surfaces.vahanFleet.registerYourFirstYatraBusOr')}</p>
          <button type="button" onClick={openAddModal} className={`${btnPrimary} mx-auto mt-4`}>
            <Plus className="w-4 h-4" /> <span>{t('surfaces.vahanFleet.addVehicle')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => {
            const docs: [string, string | undefined][] = [
              ['RTO', v.rtoExpiryDate],
              ['INS', v.insuranceExpiryDate],
              ['PUC', v.pucExpiryDate],
              ['FIT', v.fitnessExpiryDate],
            ];
            const a = vehicleAnalytics(v.id);
            const isExpanded = expandedVehicle === v.id;
            return (
              <div key={v.id} className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-saffron-400">{v.vehicleType}</span>
                      <h3 className="font-extrabold text-base text-temple-100 mt-0.5 font-mono">{v.registrationNo}</h3>
                      <p className="text-[11px] text-temple-400 mt-0.5">{v.makeModel}{v.yearOfMfg ? ` • ${v.yearOfMfg}` : ''} • {v.fuelType}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                      v.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : v.status === 'In Service' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-temple-800 text-temple-400 border border-temple-700'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="py-2 space-y-1.5 text-xs text-temple-300">
                    <p className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-saffron-400" />
                      <span className="text-temple-400">Odometer:</span>{' '}
                      <span className="font-bold text-temple-100">{v.odometerKm.toLocaleString()} km</span>
                    </p>
                    {v.driverName && (
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-saffron-400" />
                        <span className="text-temple-400">Driver:</span> <span className="font-medium text-temple-100">{v.driverName}</span>
                        {v.driverPhone && <span className="text-temple-500 flex items-center gap-0.5"><Phone className="w-3 h-3" />{v.driverPhone}</span>}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {docs.map(([short, date]) => {
                        const d = daysUntil(date);
                        return (
                          <span key={short} title={date || 'Not set'} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${expiryTone(d)}`}>
                            {expiryLabel(short, d)}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 pt-1 text-[11px]">
                      <span className="text-temple-400">Fuel {inr(a.fuelCost)}</span>
                      <span className="text-temple-600">|</span>
                      <span className="text-temple-400">Service {inr(a.serviceCost)}</span>
                      <span className="text-temple-600">|</span>
                      <span className="text-saffron-300 font-bold">{inr(a.costPerKm)}/km</span>
                    </div>
                  </div>

                  {/* Expandable analytics */}
                  {isExpanded && (
                    <div className="mt-2 border-t border-temple-800 pt-3 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-temple-950/60 rounded-xl p-2">
                          <p className="text-[10px] text-temple-500 uppercase">{t('surfaces.vahanFleet.fuelCost')}</p>
                          <p className="text-sm font-extrabold text-temple-100">{inr(a.fuelCost)}</p>
                        </div>
                        <div className="bg-temple-950/60 rounded-xl p-2">
                          <p className="text-[10px] text-temple-500 uppercase">{t('surfaces.vahanFleet.serviceCost')}</p>
                          <p className="text-sm font-extrabold text-temple-100">{inr(a.serviceCost)}</p>
                        </div>
                        <div className="bg-temple-950/60 rounded-xl p-2">
                          <p className="text-[10px] text-temple-500 uppercase">{t('surfaces.vahanFleet.costKm')}</p>
                          <p className="text-sm font-extrabold text-saffron-300">{inr(a.costPerKm)}</p>
                        </div>
                      </div>
                      {a.logs.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-temple-400 uppercase mb-1">{t('surfaces.vahanFleet.last10FuelLogs')}</p>
                          <div className="space-y-1 max-h-44 overflow-y-auto">
                            {a.logs.slice(0, 10).map((l) => (
                              <div key={l.id} className="flex justify-between text-[11px] bg-temple-950/60 rounded-lg px-2.5 py-1.5 text-temple-300">
                                <span>{l.logDate} • {l.litersFilled}L • {l.odometerKm.toLocaleString()} km</span>
                                <span className="font-bold text-temple-100">{inr(l.totalCost)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {a.services.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-temple-400 uppercase mb-1">{t('surfaces.vahanFleet.serviceHistory')}</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {a.services.map((s) => (
                              <div key={s.id} className="flex justify-between text-[11px] bg-temple-950/60 rounded-lg px-2.5 py-1.5 text-temple-300">
                                <span>{s.serviceDate} • {s.serviceType}{s.nextDueDate ? ` → due ${s.nextDueDate}` : ''}</span>
                                <span className="font-bold text-temple-100">{inr(s.cost)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openFuelModal(v)} className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                      <Fuel className="w-4 h-4" /> <span>{t('surfaces.vahanFleet.logFuel')}</span>
                    </button>
                    <button type="button" onClick={() => openServiceModal(v)} className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-temple-700 hover:bg-temple-600 text-temple-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                      <Wrench className="w-4 h-4" /> <span>{t('surfaces.vahanFleet.logService')}</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedVehicle(isExpanded ? null : v.id)}
                      className={`${btnGhost} flex-1`}
                    >
                      <BarChart3 className="w-4 h-4" /> <span>{isExpanded ? 'Hide Analytics' : 'Analytics'}</span>
                    </button>
                    <button type="button" onClick={() => openEditModal(v)} className={btnGhost} aria-label={t('surfaces.vahanFleet.editVehicle')}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(v)} className={`${btnGhost} hover:!bg-red-900/60`} aria-label={t('surfaces.vahanFleet.deleteVehicle')}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Vehicle Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setIsVehicleModalOpen(false)}>
          <div className="bg-temple-900 border border-temple-700 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap"><h3 className="text-lg font-extrabold text-temple-100">{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h3><LocalOnlyBadge /></div>
              <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-temple-800 text-temple-300 hover:bg-temple-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveVehicle} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>{t('surfaces.vahanFleet.registrationNo')}</label><input value={vReg} onChange={(e) => setVReg(e.target.value.toUpperCase())} className={`${inputCls} font-mono uppercase`} placeholder={t('surfaces.vahanFleet.eGUp65At4242')} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.vehicleType')}</label><select value={vType} onChange={(e) => setVType(e.target.value)} className={inputCls}>{VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.makeModel')}</label><input value={vMake} onChange={(e) => setVMake(e.target.value)} className={inputCls} placeholder={t('surfaces.vahanFleet.eGAshokLeylandViking')} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.fuelType')}</label><select value={vFuel} onChange={(e) => setVFuel(e.target.value)} className={inputCls}>{FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.yearOfManufacture')}</label><input type="number" min={1950} max={new Date().getFullYear()} value={vYear} onChange={(e) => setVYear(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.odometerKm')}</label><input type="number" min={0} value={vOdo} onChange={(e) => setVOdo(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.rtoRcExpiry')}</label><input type="date" value={vRto} onChange={(e) => setVRto(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.insuranceExpiry')}</label><input type="date" value={vIns} onChange={(e) => setVIns(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.pucExpiry')}</label><input type="date" value={vPuc} onChange={(e) => setVPuc(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.fitnessExpiry')}</label><input type="date" value={vFit} onChange={(e) => setVFit(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.driverName')}</label><input value={vDriver} onChange={(e) => setVDriver(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.driverPhone')}</label><input value={vDriverPhone} onChange={(e) => setVDriverPhone(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Status</label><select value={vStatus} onChange={(e) => setVStatus(e.target.value as FleetVehicle['status'])} className={inputCls}>{V_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className={labelCls}>Notes</label><input value={vNotes} onChange={(e) => setVNotes(e.target.value)} className={inputCls} /></div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <button type="submit" className={`${btnPrimary} flex-1`}><Bus className="w-4 h-4" /> <span>{editingVehicle ? 'Save Changes' : 'Register Vehicle'}</span></button>
                <button type="button" onClick={() => setIsVehicleModalOpen(false)} className={btnGhost}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Fuel Modal */}
      {isFuelModalOpen && loggingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setIsFuelModalOpen(false)}>
          <div className="bg-temple-900 border border-temple-700 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-wrap"><h3 className="text-lg font-extrabold text-temple-100">{t('surfaces.vahanFleet.logFuel')}</h3><LocalOnlyBadge /></div>
              <button type="button" onClick={() => setIsFuelModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-temple-800 text-temple-300 hover:bg-temple-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-temple-400 mb-4 font-mono">{loggingVehicle.registrationNo} • last: {Math.max(loggingVehicle.odometerKm, lastOdoFor(loggingVehicle.id)).toLocaleString()} km</p>
            <form onSubmit={handleLogFuel} className="space-y-4">
              <div><label className={labelCls}>{t('surfaces.vahanFleet.logDate')}</label><input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.odometerKm2')}</label><input type="number" min={0} value={fOdo} onChange={(e) => setFOdo(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>{t('surfaces.vahanFleet.liters')}</label><input type="number" min={0} step="0.01" value={fLiters} onChange={(e) => setFLiters(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Cost / Liter ({wsCurrency.symbol}) *</label><input type="number" min={0} step="0.01" value={fRate} onChange={(e) => setFRate(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              </div>
              {fLiters !== '' && fRate !== '' && (
                <div className="bg-saffron-500/10 border border-saffron-500/30 rounded-xl p-3 text-sm text-saffron-200 font-bold">
                  Total: {inr((Number(fLiters) * Number(fRate)))}
                </div>
              )}
              <div><label className={labelCls}>{t('surfaces.vahanFleet.fuelStation')}</label><input value={fStation} onChange={(e) => setFStation(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('org.finance.bhoomi.paymentMode')}</label><select value={fMode} onChange={(e) => setFMode(e.target.value)} className={inputCls}>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.loggedBy')}</label><input value={fLoggedBy} onChange={(e) => setFLoggedBy(e.target.value)} className={inputCls} placeholder={currentRole || 'Office Staff'} /></div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-[11px] text-emerald-200">
                Auto-posts an <span className="font-bold">{t('surfaces.vahanFleet.expenseVehicleFuelMaintenance')}</span> entry to the Treasury Ledger.
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`${btnPrimary} flex-1`}><Fuel className="w-4 h-4" /> <span>{t('surfaces.vahanFleet.saveFuelLog')}</span></button>
                <button type="button" onClick={() => setIsFuelModalOpen(false)} className={btnGhost}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Service Modal */}
      {isServiceModalOpen && serviceVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setIsServiceModalOpen(false)}>
          <div className="bg-temple-900 border border-temple-700 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-wrap"><h3 className="text-lg font-extrabold text-temple-100">{t('surfaces.vahanFleet.logService')}</h3><LocalOnlyBadge /></div>
              <button type="button" onClick={() => setIsServiceModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-temple-800 text-temple-300 hover:bg-temple-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-temple-400 mb-4 font-mono">{serviceVehicle.registrationNo}</p>
            <form onSubmit={handleLogService} className="space-y-4">
              <div><label className={labelCls}>{t('surfaces.vahanFleet.serviceDate')}</label><input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.serviceType')}</label><select value={sType} onChange={(e) => setSType(e.target.value)} className={inputCls}>{SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className={labelCls}>Cost ({wsCurrency.symbol}) *</label><input type="number" min={0} value={sCost} onChange={(e) => setSCost(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.vendorGarage')}</label><input value={sVendor} onChange={(e) => setSVendor(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.odometerKm')}</label><input type="number" min={0} value={sOdo} onChange={(e) => setSOdo(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.nextServiceDue')}</label><input type="date" value={sNextDue} onChange={(e) => setSNextDue(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>{t('org.finance.bhoomi.paymentMode')}</label><select value={sMode} onChange={(e) => setSMode(e.target.value)} className={inputCls}>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className={labelCls}>{t('surfaces.vahanFleet.handledBy')}</label><input value={sLoggedBy} onChange={(e) => setSLoggedBy(e.target.value)} className={inputCls} placeholder={currentRole || 'Office Staff'} /></div>
              <div><label className={labelCls}>Notes</label><input value={sNotes} onChange={(e) => setSNotes(e.target.value)} className={inputCls} /></div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-[11px] text-emerald-200">
                Auto-posts an <span className="font-bold">{t('surfaces.vahanFleet.expenseVehicleFuelMaintenance')}</span> entry to the Treasury Ledger.
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`${btnPrimary} flex-1`}><Wrench className="w-4 h-4" /> <span>{t('surfaces.vahanFleet.saveServiceLog')}</span></button>
                <button type="button" onClick={() => setIsServiceModalOpen(false)} className={btnGhost}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compliance Summary */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-temple-100 text-sm flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-saffron-400" /> Compliance Snapshot
          </h3>
          <span className="text-[11px] text-temple-500 font-mono">
            <CalendarClock className="w-3.5 h-3.5 inline mr-1" />
            Documents expiring ≤30 days are flagged red/amber on cards
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-temple-500 uppercase text-[10px] tracking-wider border-b border-temple-800">
                <th className="py-2 pr-3">{t('surfaces.vahanFleet.registration')}</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">{t('surfaces.vahanFleet.rtoRc')}</th>
                <th className="py-2 pr-3">Insurance</th>
                <th className="py-2 pr-3">PUC</th>
                <th className="py-2">Fitness</th>
              </tr>
            </thead>
            <tbody>
              {fleetVehicles.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-temple-500">{t('surfaces.vahanFleet.noVehiclesRegistered')}</td></tr>
              )}
              {fleetVehicles.map((v) => {
                const cell = (date?: string) => {
                  const d = daysUntil(date);
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${expiryTone(d)}`}>
                      {d === null ? '—' : `${date}${d < 0 ? ` (${Math.abs(d)}d over)` : d === 0 ? ' (today)' : ` (${d}d)`}`}
                    </span>
                  );
                };
                return (
                  <tr key={v.id} className="border-b border-temple-800/50 text-temple-200">
                    <td className="py-2.5 pr-3 font-mono font-bold text-saffron-300">{v.registrationNo}</td>
                    <td className="py-2.5 pr-3">{v.vehicleType}</td>
                    <td className="py-2.5 pr-3">{cell(v.rtoExpiryDate)}</td>
                    <td className="py-2.5 pr-3">{cell(v.insuranceExpiryDate)}</td>
                    <td className="py-2.5 pr-3">{cell(v.pucExpiryDate)}</td>
                    <td className="py-2.5">{cell(v.fitnessExpiryDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
