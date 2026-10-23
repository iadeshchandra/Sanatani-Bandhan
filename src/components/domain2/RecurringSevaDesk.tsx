import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useInr, useWorkspaceCurrency } from '../../hooks/useWorkspaceInr';
import {
  Repeat,
  Plus,
  Search,
  Download,
  Pause,
  Play,
  XCircle,
  IndianRupee,
  CalendarClock,
  AlertTriangle,
  TrendingUp,
  Users,
  X,
  CheckCircle2,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { SevaSubscription } from '../../types';
import { exportToCSV } from '../../utils/csvEngine';
import { LocalOnlyBadge } from '../common/LocalOnlyBadge';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';

const PLANS = ['Nitya Annadanam', 'Gau Seva Monthly', 'Deep Seva', 'Nitya Pushpanjali', 'Custom'] as const;
const FREQUENCIES: SevaSubscription['frequency'][] = ['Monthly', 'Quarterly', 'Annually'];
const PAYMENT_MODES = ['UPI / QR', 'Cash', 'Bank Transfer', 'Cheque', 'Card'];
const STATUSES: Array<'all' | SevaSubscription['status']> = ['all', 'Active', 'Paused', 'Cancelled', 'Completed'];

const toISODate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const daysUntil = (iso: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return 0;
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

const monthlyValue = (s: SevaSubscription): number => {
  const divisor = s.frequency === 'Quarterly' ? 3 : s.frequency === 'Annually' ? 12 : 1;
  return Number(s.amount || 0) / divisor;
};

const planBadge: Record<string, string> = {
  'Nitya Annadanam': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Gau Seva Monthly': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Deep Seva': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Nitya Pushpanjali': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Custom: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

export const RecurringSevaDesk: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { t } = useLanguage();
  const taxonomy = useWorkspaceTaxonomy();
  const { activeWorkspace } = useAuthWorkspace();
  const workspaceId = activeWorkspace?.id || 'DEMO_ws-mandir';
  const { sevaSubscriptions, addSevaSubscription, updateSevaSubscription, recordSubscriptionPayment } = useData();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SevaSubscription['status']>('all');
  const [planFilter, setPlanFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [payingSub, setPayingSub] = useState<SevaSubscription | null>(null);

  // --- New subscription form ---
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fPlan, setFPlan] = useState<string>('Nitya Annadanam');
  const [fCustomPlan, setFCustomPlan] = useState('');
  const [fAmount, setFAmount] = useState<number | ''>('');
  const [fFreq, setFFreq] = useState<SevaSubscription['frequency']>('Monthly');
  const [fStart, setFStart] = useState(toISODate(0));
  const [fMode, setFMode] = useState(PAYMENT_MODES[0]);
  const [fNotes, setFNotes] = useState('');

  // --- Payment form ---
  const [pAmount, setPAmount] = useState<number | ''>('');
  const [pDate, setPDate] = useState(toISODate(0));
  const [pMode, setPMode] = useState(PAYMENT_MODES[0]);

  // Seed demo data once per workspace (DEMO only, clearly marked as samples)
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (sevaSubscriptions.length > 0) return;
    if (!workspaceId.startsWith('DEMO_')) return;
    const flag = `sb_seeded_seva_${workspaceId}`;
    if (sessionStorage.getItem(flag)) return;
    seededRef.current = true;
    sessionStorage.setItem(flag, '1');

    const samples: Array<Omit<SevaSubscription, 'id' | 'totalCollected' | 'paymentsCount'> & { silent?: boolean }> = [
      {
        workspaceId,
        devoteeName: 'Sri Ramesh Agarwal',
        devoteePhone: '+91 98200 11223',
        planName: 'Nitya Annadanam',
        amount: 1100,
        frequency: 'Monthly',
        startDate: toISODate(-60),
        nextDueDate: toISODate(-4),
        status: 'Active',
        paymentMode: 'UPI / QR',
        notes: 'Daily meal sponsorship — sample record',
        isSample: true,
        silent: true,
      },
      {
        workspaceId,
        devoteeName: 'Smt. Lakshmi Iyer',
        devoteePhone: '+91 98410 44556',
        planName: 'Gau Seva Monthly',
        amount: 2100,
        frequency: 'Monthly',
        startDate: toISODate(-30),
        nextDueDate: toISODate(3),
        status: 'Active',
        paymentMode: 'Bank Transfer',
        notes: 'Goshala upkeep — sample record',
        isSample: true,
        silent: true,
      },
      {
        workspaceId,
        devoteeName: 'Sri Harish Patel',
        devoteePhone: '+91 98980 77889',
        planName: 'Deep Seva',
        amount: 501,
        frequency: 'Quarterly',
        startDate: toISODate(-90),
        nextDueDate: toISODate(20),
        status: 'Active',
        paymentMode: 'Cash',
        notes: 'Temple lamp oil — sample record',
        isSample: true,
        silent: true,
      },
    ];
    // Stagger ids so Date.now() doesn't collide
    samples.forEach((s, i) => {
      setTimeout(() => addSevaSubscription({ ...s } as any), i * 60);
    });
    showToast('Sample subscriptions loaded for demo — clearly marked SAMPLE.', 'info', 'Demo Data');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sevaSubscriptions.length, workspaceId]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sevaSubscriptions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (planFilter !== 'all' && s.planName !== planFilter) return false;
      if (!term) return true;
      return (
        s.devoteeName?.toLowerCase().includes(term) ||
        s.planName?.toLowerCase().includes(term) ||
        s.devoteePhone?.includes(term)
      );
    });
  }, [sevaSubscriptions, searchTerm, statusFilter, planFilter]);

  const kpis = useMemo(() => {
    const active = sevaSubscriptions.filter((s) => s.status === 'Active');
    const mrr = active.reduce((a, s) => a + monthlyValue(s), 0);
    const dueWeek = active.filter((s) => {
      const d = daysUntil(s.nextDueDate);
      return d >= 0 && d <= 7;
    }).length;
    const overdue = active.filter((s) => daysUntil(s.nextDueDate) < 0);
    const overdueValue = overdue.reduce((a, s) => a + Number(s.amount || 0), 0);
    const churned = sevaSubscriptions.filter((s) => s.status === 'Cancelled' || s.status === 'Paused').length;
    return { activeCount: active.length, mrr, dueWeek, overdueCount: overdue.length, overdueValue, churned };
  }, [sevaSubscriptions]);

  const resetAddForm = () => {
    setFName(''); setFPhone(''); setFPlan('Nitya Annadanam'); setFCustomPlan('');
    setFAmount(''); setFFreq('Monthly'); setFStart(toISODate(0)); setFMode(PAYMENT_MODES[0]); setFNotes('');
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const planName = fPlan === 'Custom' ? fCustomPlan.trim() || 'Custom' : fPlan;
    const ok = addSevaSubscription({
      workspaceId,
      devoteeName: fName.trim(),
      devoteePhone: fPhone.trim() || undefined,
      planName,
      amount: Number(fAmount),
      frequency: fFreq,
      startDate: fStart,
      nextDueDate: fStart,
      status: 'Active',
      paymentMode: fMode,
      notes: fNotes.trim() || undefined,
    });
    if (ok) {
      setShowAddModal(false);
      resetAddForm();
    }
  };

  const openPayModal = (s: SevaSubscription) => {
    setPayingSub(s);
    setPAmount(s.amount);
    setPDate(toISODate(0));
    setPMode(s.paymentMode || PAYMENT_MODES[0]);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSub) return;
    const ok = recordSubscriptionPayment(payingSub.id, Number(pAmount), pDate, pMode);
    if (ok) setPayingSub(null);
  };

  const handlePauseResume = (s: SevaSubscription) => {
    const next = s.status === 'Paused' ? 'Active' : 'Paused';
    updateSevaSubscription(s.id, { status: next });
    showToast(`${s.devoteeName}'s subscription ${next === 'Paused' ? 'paused' : 'resumed'}.`, 'info', 'Nitya Seva');
  };

  const handleCancel = (s: SevaSubscription) => {
    if (!window.confirm(`Cancel ${s.devoteeName}'s ${s.planName} subscription? Collected history is preserved.`)) return;
    updateSevaSubscription(s.id, { status: 'Cancelled' });
    showToast(`Subscription cancelled for ${s.devoteeName}.`, 'warning', 'Nitya Seva');
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      showToast('Nothing to export — no subscriptions match.', 'warning', 'Export');
      return;
    }
    const headers = ['Devotee', 'Phone', 'Plan', 'Amount (INR)', 'Frequency', 'Start Date', 'Next Due', 'Status', 'Total Collected', 'Payments', 'Mode', 'Sample?'];
    const rows = filtered.map((s) => [
      s.devoteeName, s.devoteePhone || '', s.planName, s.amount, s.frequency,
      s.startDate, s.nextDueDate, s.status, s.totalCollected, s.paymentsCount,
      s.paymentMode, s.isSample ? 'YES' : '',
    ]);
    exportToCSV(`SevaSubscriptions_${workspaceId}_${toISODate(0)}.csv`, headers, rows);
    showToast(`${filtered.length} subscriptions exported.`, 'success', 'Export');
  };

  const inputCls =
    'w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2.5 text-sm text-temple-100 placeholder-temple-500 focus:outline-none focus:border-saffron-500 min-h-[44px]';
  const labelCls = 'block text-xs font-bold text-temple-300 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Nitya Seva · Standing Mandates
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {sevaSubscriptions.length} subscriptions · auto-posted to Treasury
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100 flex items-center gap-2">
            <Repeat className="w-6 h-6 text-saffron-400" />{t('org.finance.recurringSeva.recurringSevaSubscriptions')}</h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Monthly annadanam, gau seva & deep seva mandates — predictable temple income, collected on schedule
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl bg-temple-800 hover:bg-temple-700 border border-temple-700 text-temple-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>{t('org.finance.recurringSeva.exportCsv')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Subscription</span>
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-saffron-400" />
            <p className="text-xs text-temple-400 font-bold uppercase tracking-wider">Active Mandates</p>
          </div>
          <p className="text-2xl font-black text-temple-100 mt-2">{kpis.activeCount}</p>
          <p className="text-[11px] text-temple-400 mt-1">{kpis.churned} paused / cancelled</p>
        </div>
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-temple-400 font-bold uppercase tracking-wider">Monthly Recurring</p>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{inr(Math.round(kpis.mrr))}</p>
          <p className="text-[11px] text-temple-400 mt-1">From active monthly mandates</p>
        </div>
        <div className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-sky-400" />
            <p className="text-xs text-temple-400 font-bold uppercase tracking-wider">Due This Week</p>
          </div>
          <p className="text-2xl font-black text-sky-300 mt-2">{kpis.dueWeek}</p>
          <p className="text-[11px] text-temple-400 mt-1">Collections to chase</p>
        </div>
        <div className={`bg-temple-900/90 border rounded-2xl p-5 shadow-lg ${kpis.overdueCount > 0 ? 'border-red-500/50' : 'border-temple-800'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${kpis.overdueCount > 0 ? 'text-red-400' : 'text-temple-400'}`} />
            <p className="text-xs text-temple-400 font-bold uppercase tracking-wider">Overdue</p>
          </div>
          <p className={`text-2xl font-black mt-2 ${kpis.overdueCount > 0 ? 'text-red-400' : 'text-temple-100'}`}>
            {kpis.overdueCount}
          </p>
          <p className="text-[11px] text-temple-400 mt-1">
            {kpis.overdueCount > 0 ? `${inr(kpis.overdueValue)} pending` : 'All caught up 🎉'}
          </p>
        </div>
      </div>

      {/* Search & filters */}
      <div className="bg-temple-900/90 border border-temple-800 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-temple-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search devotee, plan, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-temple-800 border border-temple-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-temple-200 placeholder-temple-500 focus:outline-none focus:border-saffron-500 min-h-[44px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-temple-800 border border-temple-700 rounded-xl px-3 py-2.5 text-xs text-temple-200 min-h-[44px]"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-temple-800 border border-temple-700 rounded-xl px-3 py-2.5 text-xs text-temple-200 min-h-[44px]"
          aria-label="Filter by plan"
        >
          <option value="all">{t('org.finance.recurringSeva.allPlans')}</option>
          {Array.from(new Set(sevaSubscriptions.map((s) => s.planName))).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Subscription cards */}
      {filtered.length === 0 ? (
        <div className="bg-temple-900/90 border border-dashed border-temple-700 rounded-2xl p-12 text-center">
          <Repeat className="w-10 h-10 text-temple-600 mx-auto mb-3" />
          <h3 className="text-temple-200 font-bold">
            {sevaSubscriptions.length === 0 ? 'No seva subscriptions yet' : 'No matches for these filters'}
          </h3>
          <p className="text-xs text-temple-400 mt-1 mb-4">
            {sevaSubscriptions.length === 0
              ? 'Create the first Nitya Seva mandate — recurring income starts here.'
              : 'Try clearing the search or choosing a different status.'}
          </p>
          {sevaSubscriptions.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> New Subscription
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPlanFilter('all'); }}
              className="px-5 py-2.5 rounded-xl bg-temple-800 hover:bg-temple-700 border border-temple-700 text-temple-200 font-bold text-xs cursor-pointer min-h-[44px]"
            >{t('org.finance.recurringSeva.clearFilters')}</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s) => {
            const d = daysUntil(s.nextDueDate);
            const isOverdue = s.status === 'Active' && d < 0;
            const dueSoon = s.status === 'Active' && d >= 0 && d <= 7;
            return (
              <div
                key={s.id}
                className={`bg-temple-900/90 border rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4 transition-all hover:border-saffron-500/40 ${isOverdue ? 'border-red-500/50' : 'border-temple-800'}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-temple-100 truncate">{s.devoteeName}</h3>
                      <p className="text-[11px] text-temple-400">{s.devoteePhone || 'No phone on file'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${planBadge[s.planName] || planBadge.Custom}`}>
                        {s.planName}
                      </span>
                      {s.isSample && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-violet-500/15 text-violet-300 border border-violet-500/30">
                          Sample
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-temple-400 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5" /> Mandate
                      </span>
                      <span className="text-temple-100 font-extrabold">{inr(s.amount)} <span className="font-medium text-temple-400">/ {s.frequency}</span></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-temple-400 flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5" />{t('org.finance.recurringSeva.nextDue')}</span>
                      <span className={`font-bold ${isOverdue ? 'text-red-400' : dueSoon ? 'text-amber-300' : 'text-temple-100'}`}>
                        {s.nextDueDate}
                        {s.status === 'Active' && (
                          <span className="ml-1.5 text-[10px]">
                            {isOverdue ? `(${Math.abs(d)}d overdue)` : d === 0 ? '(today)' : `(${d}d)`}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-temple-400 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5" /> Collected
                      </span>
                      <span className="text-emerald-300 font-bold">
                        {inr(s.totalCollected)} <span className="font-medium text-temple-400">· {s.paymentsCount} payments</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-temple-400">{t('org.finance.recurringSeva.status')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'Active' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : s.status === 'Paused' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-temple-800 text-temple-400 border border-temple-700'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {s.status === 'Active' && (
                    <button
                      type="button"
                      onClick={() => openPayModal(s)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />{t('org.finance.recurringSeva.recordPayment')}</button>
                  )}
                  {(s.status === 'Active' || s.status === 'Paused') && (
                    <button
                      type="button"
                      onClick={() => handlePauseResume(s)}
                      title={s.status === 'Paused' ? 'Resume' : 'Pause'}
                      className="p-2.5 rounded-xl bg-temple-800 hover:bg-temple-700 border border-temple-700 text-temple-300 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      {s.status === 'Paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                  )}
                  {(s.status === 'Active' || s.status === 'Paused') && (
                    <button
                      type="button"
                      onClick={() => handleCancel(s)}
                      title="Cancel subscription"
                      className="p-2.5 rounded-xl bg-temple-800 hover:bg-red-900/40 border border-temple-700 text-temple-300 hover:text-red-300 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New subscription modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-temple-900 border border-temple-700 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="New seva subscription"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-temple-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-saffron-400" />{t('org.finance.recurringSeva.newSevaSubscription')}<LocalOnlyBadge />
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-lg text-temple-400 hover:text-white hover:bg-temple-800 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={t('org.finance.recurringSeva.close')}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className={labelCls} htmlFor="seva-name">{taxonomy.memberNoun} Name *</label>
                <input id="seva-name" className={inputCls} value={fName} onChange={(e) => setFName(e.target.value)} placeholder="e.g. Sri Mohan Sharma" required />
              </div>
              <div>
                <label className={labelCls} htmlFor="seva-phone">{t('org.finance.recurringSeva.phone')}</label>
                <input id="seva-phone" className={inputCls} value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="+91 ..." inputMode="tel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="seva-plan">Seva Plan *</label>
                  <select id="seva-plan" className={inputCls} value={fPlan} onChange={(e) => setFPlan(e.target.value)}>
                    {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="seva-freq">Frequency *</label>
                  <select id="seva-freq" className={inputCls} value={fFreq} onChange={(e) => setFFreq(e.target.value as any)}>
                    {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              {fPlan === 'Custom' && (
                <div>
                  <label className={labelCls} htmlFor="seva-custom">Custom Plan Name *</label>
                  <input id="seva-custom" className={inputCls} value={fCustomPlan} onChange={(e) => setFCustomPlan(e.target.value)} placeholder="e.g. Akhand Ramayan Fund" required />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="seva-amount">Amount ({wsCurrency.symbol}) *</label>
                  <input id="seva-amount" type="number" min="1" className={inputCls} value={fAmount} onChange={(e) => setFAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1100" required />
                </div>
                <div>
                  <label className={labelCls} htmlFor="seva-start">Start Date *</label>
                  <input id="seva-start" type="date" className={inputCls} value={fStart} onChange={(e) => setFStart(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="seva-mode">{t('org.finance.recurringSeva.paymentMode')}</label>
                <select id="seva-mode" className={inputCls} value={fMode} onChange={(e) => setFMode(e.target.value)}>
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="seva-notes">{t('org.finance.recurringSeva.notes')}</label>
                <textarea id="seva-notes" className={inputCls} rows={2} value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Sankalp details, gotra, occasion..." />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-extrabold text-sm transition-all cursor-pointer min-h-[48px]">
                Start Subscription
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {payingSub && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPayingSub(null)}>
          <div
            className="bg-temple-900 border border-temple-700 rounded-t-3xl sm:rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Record seva payment"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-temple-100">Record Payment</h3>
              <button type="button" onClick={() => setPayingSub(null)} className="p-2 rounded-lg text-temple-400 hover:text-white hover:bg-temple-800 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-temple-400 mb-4">
              <span className="text-temple-100 font-bold">{payingSub.devoteeName}</span> · {payingSub.planName} · {payingSub.frequency}
              <br />This auto-posts an <span className="text-emerald-300 font-bold">Income</span> entry to the Treasury Ledger.
            </p>
            <form onSubmit={handlePay} className="flex flex-col min-h-0 grow">
              <div className="overflow-y-auto min-h-0 px-6 py-4 space-y-4">
              <div>
                <label className={labelCls} htmlFor="pay-amount">Amount ({wsCurrency.symbol}) *</label>
                <input id="pay-amount" type="number" min="1" className={inputCls} value={pAmount} onChange={(e) => setPAmount(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="pay-date">Date *</label>
                  <input id="pay-date" type="date" className={inputCls} value={pDate} onChange={(e) => setPDate(e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pay-mode">Mode *</label>
                  <select id="pay-mode" className={inputCls} value={pMode} onChange={(e) => setPMode(e.target.value)}>
                    {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all cursor-pointer min-h-[48px]">{t('org.finance.recurringSeva.collectPostToTreasury')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringSevaDesk;
