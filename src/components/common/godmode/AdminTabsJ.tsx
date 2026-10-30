/**
 * AdminTabsJ — Console 3.0: Finance Command Center + Professionals (Pratham Seva).
 * ===============================================================================
 * FinanceTab: P0 from the admin review — the owner's money was scattered across
 * Billing, Commission, Marketplace and Dues tabs with no unified cash-position view.
 * This tab answers: "how much is pending in, pending out, overdue, and
 * what is my net position right now?"
 *
 * ProfessionalsTab: the Pratham Seva program surface — review queue (PENDING
 * purohit + jyotish applications), per-professional controls, global defaults.
 * Spark-native: talks to src/lib/sevaPro/professionalsAdmin.ts directly
 * (owner-gated, audit-logged).
 *
 * Spark-native: FinanceTab reads from firestoreAdmin (owner-gated Firestore
 * reads). Never throws — every load is guarded, empty states are honest.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { appLocale } from '../../../lib/format';
import {
  RefreshCw,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ExternalLink,
  BadgeCheck,
  XCircle,
  Search,
  Gift,
  Sparkles,
  Crown,
  Settings2,
  FileText,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { firestoreAdmin, type NativeResult } from '../../../lib/firestoreAdmin';
import { safeExternalUrl } from '../../../lib/safeUrl';
import { useToast } from '../../../context/ToastContext';
import { useLanguage } from '../../../context/LanguageContext';
import { friendlyError } from '../../../lib/friendlyError';
import { professionalsAdmin, type PendingApplication, type ProfessionalKind, type ProfessionalSummary } from '../../../lib/sevaPro/professionalsAdmin';
import {
  DEFAULT_PRATHAM_CONFIG, sanitizeConfig, scheduleMultiplierFor,
  type PrathamSevaConfig, type CommissionScheduleBracket,
} from '../../../lib/sevaPro/prathamSeva';
import { tierBadge, TIER_ORDER, type SevaProTier } from '../../../lib/sevaPro/tiers';
import { sevaProCopy, REJECT_TEMPLATE_KEYS, type SevaProLang } from '../../../lib/sevaPro/sevaProCopy';


/* ---------- local shared primitives (match AdminTabsC/G pattern) ---------- */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-slate-950/70 border border-slate-800 p-4 ${className}`}>{children}</div>
);
const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-slate-500 py-6 text-center">{text}</p>
);
const Loading: React.FC<{ text?: string }> = ({ text = 'Loading…' }) => (
  <p className="text-xs text-slate-500 py-8 text-center animate-pulse">{text}</p>
);

/* ---------- helpers ---------- */
const fmtINR = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const fmtAge = (iso?: string) => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  const d = Math.floor(ms / 86400000);
  if (d < 1) { const h = Math.floor(ms / 3600000); return h < 1 ? 'just now' : `${h}h`; }
  return `${d}d`;
};
const ageDays = (iso?: string) => {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isNaN(ms) || ms < 0 ? 0 : Math.floor(ms / 86400000);
};

/* ---------- tiny SVG area chart (no deps) ---------- */
const AreaChart: React.FC<{ inSeries: number[]; outSeries: number[]; labels: string[] }> = ({ inSeries, outSeries, labels }) => {
  const W = 640, H = 180, PAD = 28;
  const max = Math.max(1, ...inSeries, ...outSeries);
  const x = (i: number) => PAD + (i / Math.max(1, inSeries.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const line = (s: number[]) => s.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = (s: number[]) => `${line(s)} L${x(s.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img" aria-label="30-day cash flow chart">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={y(max * f)} y2={y(max * f)} stroke="#1e293b" strokeWidth="1" />
        ))}
        <path d={area(inSeries)} fill="#f59e0b" opacity="0.18" />
        <path d={line(inSeries)} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
        <path d={area(outSeries)} fill="#10b981" opacity="0.12" />
        <path d={line(outSeries)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" />
        <text x={PAD} y={14} fill="#64748b" fontSize="10">{fmtINR(max)}</text>
        <text x={PAD} y={H - 8} fill="#64748b" fontSize="10">{labels[0] || ''}</text>
        <text x={W - PAD} y={H - 8} fill="#64748b" fontSize="10" textAnchor="end">{labels[labels.length - 1] || ''}</text>
      </svg>
      <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-amber-500 inline-block" /> Money in (txn volume)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-emerald-500 inline-block" /> Money out (payouts paid)</span>
      </div>
    </div>
  );
};

/* ================= FinanceTab ================= */
export const FinanceTab: React.FC<{ goToTab: (t: string) => void }> = ({ goToTab }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [topups, setTopups] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [openQueue, setOpenQueue] = useState<string | null>(null); // mobile accordion

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [t, p, d, c, x] = await Promise.all([
        firestoreAdmin.topupQueue('pending').catch((): NativeResult => ({ ok: false })),
        firestoreAdmin.payoutQueue('all').catch((): NativeResult => ({ ok: false })),
        firestoreAdmin.duesList('pending').catch((): NativeResult => ({ ok: false })),
        firestoreAdmin.paymentClaims('pending').catch((): NativeResult => ({ ok: false })),
        firestoreAdmin.marketplaceTransactions('all', 200).catch((): NativeResult => ({ ok: false })),
      ]);
      if (t.ok) setTopups((t.data as any)?.claims || []);
      if (p.ok) setPayouts((p.data as any)?.payouts || []);
      if (d.ok) setDues((d.data as any)?.dues || []);
      if (c.ok) setClaims((c.data as any)?.claims || []);
      if (x.ok) setTxns((x.data as any)?.transactions || []);
      if (!t.ok && !p.ok && !d.ok && !c.ok && !x.ok) setLoadError('Could not load financial data. Check your connection and owner sign-in.');
    } catch (e: any) {
      console.error(e);
      setLoadError(friendlyError(e, t, 'load'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---------- derived ---------- */
  const pendingIn = useMemo(() =>
    [...topups, ...claims].reduce((s, r: any) => s + (Number(r.amount) || 0), 0), [topups, claims]);
  const requestedPayouts = useMemo(() => payouts.filter((p: any) => p.status === 'requested'), [payouts]);
  const pendingOut = useMemo(() =>
    requestedPayouts.reduce((s, p: any) => s + (Number(p.amount) || 0), 0), [requestedPayouts]);
  const GRACE_DAYS = 15;
  const overdueDues = useMemo(() =>
    dues.filter((d: any) => ageDays(d.createdAt) > GRACE_DAYS), [dues]);
  const overdueTotal = useMemo(() =>
    overdueDues.reduce((s, d: any) => s + (Number(d.amount) || 0), 0), [overdueDues]);
  const netPosition = pendingIn - pendingOut;

  const aging = useMemo(() => {
    const buckets = [
      { label: 'Current', sub: '0–15 days', min: 0, max: 15, total: 0, count: 0 },
      { label: '1–7 days overdue', sub: '16–22 days', min: 16, max: 22, total: 0, count: 0 },
      { label: '8–30 days overdue', sub: '23–45 days', min: 23, max: 45, total: 0, count: 0 },
      { label: '30+ days overdue', sub: '46+ days', min: 46, max: Infinity, total: 0, count: 0 },
    ];
    dues.forEach((d: any) => {
      const a = ageDays(d.createdAt);
      const b = buckets.find((x) => a >= x.min && a <= x.max);
      if (b) { b.total += Number(d.amount) || 0; b.count += 1; }
    });
    return buckets;
  }, [dues]);

  const cashflow = useMemo(() => {
    const days: string[] = [];
    const inS: number[] = new Array(30).fill(0);
    const outS: number[] = new Array(30).fill(0);
    for (let i = 29; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      days.push(dt.toISOString().slice(0, 10));
    }
    txns.forEach((t: any) => {
      const day = String(t.createdAt || '').slice(0, 10);
      const idx = days.indexOf(day);
      if (idx >= 0) inS[idx] += Number(t.grossAmount || t.amount || 0);
    });
    payouts.forEach((p: any) => {
      if (p.status !== 'paid') return;
      const day = String(p.processedAt || p.requestedAt || '').slice(0, 10);
      const idx = days.indexOf(day);
      if (idx >= 0) outS[idx] += Number(p.amount || p.netAmount || 0);
    });
    const fmtDay = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; };
    return { inS, outS, labels: days.map(fmtDay) };
  }, [txns, payouts]);

  const kpis = [
    { label: 'Pending In', sub: `${topups.length + claims.length} items awaiting`, value: fmtINR(pendingIn), icon: <ArrowDownCircle className="w-5 h-5" />, tone: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Pending Out', sub: `${requestedPayouts.length} payouts requested`, value: fmtINR(pendingOut), icon: <ArrowUpCircle className="w-5 h-5" />, tone: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/20' },
    { label: 'Overdue Dues', sub: `${overdueDues.length} past ${GRACE_DAYS}d grace`, value: fmtINR(overdueTotal), icon: <AlertTriangle className="w-5 h-5" />, tone: 'text-red-300', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Net Position', sub: 'in − out right now', value: fmtINR(netPosition), icon: <Wallet className="w-5 h-5" />, tone: netPosition >= 0 ? 'text-emerald-300' : 'text-red-300', bg: netPosition >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20' },
  ];

  const queues: { id: string; title: string; count: number; tab: string; rows: React.ReactNode }[] = [
    {
      id: 'topups', title: 'Top-ups awaiting approval', count: topups.length, tab: 'billing',
      rows: topups.length === 0 ? <Empty text="No pending top-ups." /> : (
        <ul className="space-y-2">
          {topups.slice(0, 8).map((r: any) => (
            <li key={r.id} className="flex items-center justify-between gap-2 bg-slate-900 rounded-xl px-3 py-2.5 min-h-[44px]">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{r.uid ? String(r.uid).slice(0, 12) + '…' : 'User'}</p>
                <p className="text-[10px] text-slate-500">{fmtAge(r.createdAt)} ago · {r.currency || ''}</p>
              </div>
              <span className="text-sm font-black text-amber-300 shrink-0">{fmtINR(r.amount)}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'payouts', title: 'Payouts awaiting decision', count: requestedPayouts.length, tab: 'commission',
      rows: requestedPayouts.length === 0 ? <Empty text="No payouts requested." /> : (
        <ul className="space-y-2">
          {requestedPayouts.slice(0, 8).map((p: any) => (
            <li key={p.id} className="flex items-center justify-between gap-2 bg-slate-900 rounded-xl px-3 py-2.5 min-h-[44px]">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{p.providerUid ? String(p.providerUid).slice(0, 12) + '…' : 'Provider'}</p>
                <p className="text-[10px] text-slate-500">{fmtAge(p.requestedAt)} ago</p>
              </div>
              <span className="text-sm font-black text-sky-300 shrink-0">{fmtINR(p.amount)}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'dues', title: 'Dues overdue', count: overdueDues.length, tab: 'marketplace',
      rows: overdueDues.length === 0 ? <Empty text="No overdue dues. All clear." /> : (
        <ul className="space-y-2">
          {overdueDues.slice(0, 8).map((d: any) => (
            <li key={d.id} className="flex items-center justify-between gap-2 bg-slate-900 rounded-xl px-3 py-2.5 min-h-[44px]">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{d.workspaceName || d.providerUid || 'Workspace'}</p>
                <p className="text-[10px] text-red-400/80">{ageDays(d.createdAt) - GRACE_DAYS}d overdue</p>
              </div>
              <span className="text-sm font-black text-red-300 shrink-0">{fmtINR(d.amount)}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  /* ---------- render ---------- */
  if (loading) return <Loading text="Computing live financial position…" />;
  if (loadError) return (
    <Card><p className="text-xs text-red-300 py-6 text-center">{loadError}</p>
      <p className="text-center"><button type="button" onClick={load} className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-slate-800 text-slate-200">Retry</button></p>
    </Card>
  );

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-400" /> Finance Command Center</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Unified cash position — live from Firestore, owner-only.</p>
        </div>
        <button type="button" onClick={load} aria-label="Refresh"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${k.tone}`}>{k.icon}{k.label}</div>
            <p className="text-xl font-black text-white mt-1.5">{k.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Cash flow */}
      <Card>
        <h3 className="text-sm font-extrabold text-white mb-1">Cash flow — last 30 days</h3>
        <p className="text-[11px] text-slate-500 mb-3">Marketplace volume in vs payouts paid out, per day.</p>
        <AreaChart inSeries={cashflow.inS} outSeries={cashflow.outS} labels={cashflow.labels} />
      </Card>

      {/* Queues */}
      <div className="grid md:grid-cols-3 gap-3">
        {queues.map((q) => (
          <Card key={q.id} className="!p-0 overflow-hidden">
            <button type="button"
              onClick={() => setOpenQueue(openQueue === q.id ? null : q.id)}
              className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] md:cursor-default"
              aria-expanded={openQueue === q.id}>
              <span className="text-sm font-extrabold text-white">{q.title}
                <span className="ml-2 text-[10px] font-black bg-saffron-500/20 text-saffron-300 rounded-full px-2 py-0.5">{q.count}</span>
              </span>
              <span className="flex items-center gap-1">
                <span role="button" tabIndex={0} title={`Open ${q.tab}`}
                  onClick={(e) => { e.stopPropagation(); goToTab(q.tab); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') goToTab(q.tab); }}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg text-slate-400 hover:text-amber-300 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4" />
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform md:hidden ${openQueue === q.id ? 'rotate-180' : ''}`} />
              </span>
            </button>
            <div className={`px-4 pb-4 ${openQueue === q.id ? 'block' : 'hidden'} md:block`}>
              {q.rows}
              {q.count > 8 && (
                <button type="button" onClick={() => goToTab(q.tab)}
                  className="mt-2 w-full min-h-[44px] rounded-xl text-xs font-bold bg-slate-800 text-amber-300 hover:bg-slate-700">
                  View all {q.count} in {q.tab === 'billing' ? 'Billing' : q.tab === 'commission' ? 'Commission' : 'Marketplace'} →
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Dues aging */}
      <Card>
        <h3 className="text-sm font-extrabold text-white mb-1">Dues aging</h3>
        <p className="text-[11px] text-slate-500 mb-3">Pending platform dues by age since raised ({GRACE_DAYS}-day grace).</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {aging.map((b) => (
            <div key={b.label} className="bg-slate-900 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{b.label}</p>
              <p className="text-[10px] text-slate-600">{b.sub}</p>
              <p className={`text-lg font-black mt-1 ${b.min === 0 ? 'text-slate-200' : b.min <= 22 ? 'text-amber-300' : 'text-red-300'}`}>{fmtINR(b.total)}</p>
              <p className="text-[10px] text-slate-500">{b.count} due{b.count === 1 ? '' : 's'}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default FinanceTab;

/* =================================================================== */
/* ProfessionalsTab — Pratham Seva program (Phase 2, merged)             */
/* Reuses the shared Card primitive above.                              */
/* =================================================================== */

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; sub?: string }> = ({ icon, title, sub }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="w-9 h-9 rounded-xl bg-saffron-500/15 border border-saffron-500/40 flex items-center justify-center text-saffron-300 shrink-0">{icon}</div>
    <div>
      <h3 className="text-sm font-black text-slate-100">{title}</h3>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);
const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500';
const btnGhost = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors';
const btnGreen = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-colors';
const btnRed = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-500 transition-colors';
const btnSaffron = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-saffron-500 text-slate-950 hover:bg-saffron-400 transition-colors';

/* ============================ Review queue ============================= */

const DOC_KEYS: Array<{ key: string; required: boolean }> = [
  { key: 'govtId', required: true },
  { key: 'photo', required: true },
  { key: 'tradition', required: true },
  { key: 'samples', required: false },
  { key: 'endorsement', required: false },
];

const ReviewQueue: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [apps, setApps] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'all' | ProfessionalKind>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<PendingApplication | null>(null);
  const [template, setTemplate] = useState<string>(REJECT_TEMPLATE_KEYS[0]);
  const [tplLang, setTplLang] = useState<SevaProLang>('en');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await professionalsAdmin.listPendingApplications();
      setApps(kind === 'all' ? all : all.filter((a) => a.kind === kind));
    } catch (e: any) {
      console.error(e);
      showToast(friendlyError(e, t, 'load'), 'error');
    }
    setLoading(false);
  }, [kind, showToast]);
  useEffect(() => { load(); }, [load]);

  const approve = async (a: PendingApplication) => {
    setWorking(a.id);
    try {
      await professionalsAdmin.approveApplication(a.id, a.kind);
      showToast(`🪔 ${a.displayName}'s sacred credentials are honored — VERIFIED with the welcome blessing.`, 'success');
      setApps((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e: any) {
      console.error(e);
      showToast(friendlyError(e, t, 'save'), 'error');
    }
    setWorking(null);
  };

  const openReject = (a: PendingApplication) => {
    setRejectFor(a);
    setTemplate(REJECT_TEMPLATE_KEYS[0]);
    setTplLang('en');
    setReason(sevaProCopy('en', REJECT_TEMPLATE_KEYS[0] as any));
  };

  const reject = async () => {
    if (!rejectFor) return;
    if (!reason.trim()) {
      showToast(sevaProCopy('en', 'reasonRequired'), 'error');
      return;
    }
    setWorking(rejectFor.id);
    try {
      await professionalsAdmin.rejectApplication(rejectFor.id, rejectFor.kind, reason.trim());
      showToast('Declined with respect. The reason was shared with the applicant.', 'success');
      setApps((prev) => prev.filter((x) => x.id !== rejectFor.id));
      setRejectFor(null);
      setReason('');
    } catch (e: any) {
      console.error(e);
      showToast(friendlyError(e, t, 'save'), 'error');
    }
    setWorking(null);
  };

  const renderDocValue = (v: any): React.ReactNode => {
    if (v == null || v === '') return <span className="text-slate-600">—</span>;
    if (typeof v === 'string' && safeExternalUrl(v)) {
      return <a href={safeExternalUrl(v)!} target="_blank" rel="noreferrer" className="text-saffron-400 underline break-all">Open document ↗</a>;
    }
    if (Array.isArray(v)) return <span className="text-slate-300">{v.join(', ')}</span>;
    return <span className="text-slate-300 break-words">{String(v)}</span>;
  };

  if (loading) {
    return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading review queue…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {(['all', 'purohit', 'jyotish'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black capitalize ${kind === k ? 'bg-saffron-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
            {k === 'all' ? 'All' : k === 'purohit' ? 'Purohits' : 'Jyotishis'}
          </button>
        ))}
        <button type="button" onClick={load} className="ml-auto p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-white" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {apps.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-3xl mb-2">🪔</p>
            <p className="text-sm font-bold text-slate-300">All credentials honored</p>
            <p className="text-xs text-slate-500 mt-1">No pending applications. New ones appear here.</p>
          </div>
        </Card>
      ) : apps.map((a) => (
        <Card key={`${a.kind}:${a.id}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-black text-slate-100">{a.displayName}</p>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">{a.kind}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[10px] font-bold">PENDING</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {[a.city, a.experienceYears != null ? `${a.experienceYears} yrs` : null, a.idProofType].filter(Boolean).join(' · ')}
                {a.createdAt && ` · applied ${new Date(a.createdAt).toLocaleDateString(appLocale())}`}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(open === a.id ? null : a.id)}
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 text-slate-300" aria-label="Toggle credentials">
              {open === a.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {open === a.id && (
            <div className="mt-3 rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-2">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Sacred credentials
              </p>
              {DOC_KEYS.map(({ key, required }) => {
                const v = a.documents?.[key];
                const present = v != null && v !== '';
                return (
                  <div key={key} className="flex items-start gap-2 text-xs py-1.5 border-b border-slate-800/60 last:border-0">
                    <span className={`mt-0.5 ${present ? 'text-emerald-400' : required ? 'text-red-400' : 'text-slate-600'}`}>
                      {present ? '●' : '○'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-300 capitalize">{key}</span>
                      {!required && <span className="ml-2 text-[10px] text-slate-500">optional</span>}
                      <div className="mt-0.5">{renderDocValue(v)}</div>
                    </div>
                  </div>
                );
              })}
              {(a.certificates?.length || a.specializations?.length || a.gurukulAffiliation) && (
                <div className="text-xs text-slate-400 pt-1 space-y-0.5">
                  {a.gurukulAffiliation && <p><span className="font-bold text-slate-300">Parampara:</span> {a.gurukulAffiliation}</p>}
                  {a.certificates && a.certificates.length > 0 && <p><span className="font-bold text-slate-300">Certificates:</span> {a.certificates.join(', ')}</p>}
                  {a.specializations && a.specializations.length > 0 && <p><span className="font-bold text-slate-300">Specializations:</span> {a.specializations.join(', ')}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => approve(a)} disabled={working === a.id} className={`${btnGreen} flex-1 disabled:opacity-50`}>
              <span className="inline-flex items-center gap-2 justify-center">
                <BadgeCheck className="w-4 h-4" /> {working === a.id ? 'Honoring…' : sevaProCopy('en', 'approveLabel')}
              </span>
            </button>
            <button type="button" onClick={() => openReject(a)} disabled={working === a.id} className={`${btnRed} flex-1 disabled:opacity-50`}>
              <span className="inline-flex items-center gap-2 justify-center">
                <XCircle className="w-4 h-4" /> {sevaProCopy('en', 'rejectLabel')}
              </span>
            </button>
          </div>
        </Card>
      ))}

      {rejectFor && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center" onClick={() => setRejectFor(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-slate-100 mb-1">Decline {rejectFor.displayName}</h3>
            <p className="text-xs text-slate-400 mb-4">{sevaProCopy(tplLang, 'reasonRequired')}</p>
            <div className="flex gap-2 mb-3">
              {(['en', 'bn', 'hi'] as SevaProLang[]).map((l) => (
                <button key={l} type="button" onClick={() => { setTplLang(l); setReason(sevaProCopy(l, template as any)); }}
                  className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-black uppercase ${tplLang === l ? 'bg-saffron-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                  {l}
                </button>
              ))}
            </div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Kind message template</label>
            <select value={template} onChange={(e) => { setTemplate(e.target.value); setReason(sevaProCopy(tplLang, e.target.value as any)); }} className={`${inputCls} mb-3`}>
              {REJECT_TEMPLATE_KEYS.map((k) => (
                <option key={k} value={k}>{sevaProCopy('en', k as any).slice(0, 60)}…</option>
              ))}
            </select>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Reason (the applicant reads this)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={500} className={`${inputCls} mb-4`} />
            <div className="flex gap-2">
              <button type="button" onClick={reject} disabled={working === rejectFor.id} className={`${btnRed} flex-1 disabled:opacity-50`}>
                {working === rejectFor.id ? 'Sending…' : 'Decline with respect'}
              </button>
              <button type="button" onClick={() => setRejectFor(null)} className={`${btnGhost} flex-1`}>Keep reviewing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ====================== Per-professional controls ======================== */

const ProfessionalControls: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [kind, setKind] = useState<ProfessionalKind>('purohit');
  const [profileId, setProfileId] = useState('');
  const [pro, setPro] = useState<ProfessionalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [freeSevas, setFreeSevas] = useState('0');
  const [bonus, setBonus] = useState('1');
  const [note, setNote] = useState('');
  const [boostDate, setBoostDate] = useState('');
  const [tier, setTier] = useState<SevaProTier>('VERIFIED');
  const [tierNote, setTierNote] = useState('');
  const [scheduleJson, setScheduleJson] = useState('');
  const [working, setWorking] = useState<string | null>(null);

  const lookup = async () => {
    if (!profileId.trim()) { showToast('Enter a profile document ID.', 'error'); return; }
    setLoading(true);
    try {
      const p = await professionalsAdmin.getProfessional(kind, profileId.trim());
      if (!p) { showToast('No professional found with that ID.', 'error'); setPro(null); }
      else {
        setPro(p);
        setFreeSevas(String(p.freeSevasRemaining));
        setTier((p.verificationTier as SevaProTier) || 'REGISTERED');
        setScheduleJson('');
      }
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'load'), 'error'); }
    setLoading(false);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setWorking(label);
    try { await fn(); showToast('Done.', 'success'); if (profileId) await lookup(); }
    catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
    setWorking(null);
  };

  const badge = pro ? tierBadge(pro.verificationTier, 'en') : null;

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex gap-2 flex-wrap">
          {(['purohit', 'jyotish'] as ProfessionalKind[]).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black capitalize ${kind === k ? 'bg-saffron-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
              {k === 'purohit' ? 'Purohit' : 'Jyotishi'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Profile document ID (purohits / jyotishProfiles)" className={inputCls} />
          <button type="button" onClick={lookup} disabled={loading} className={`${btnSaffron} shrink-0 disabled:opacity-50`}>
            <span className="inline-flex items-center gap-2"><Search className="w-4 h-4" /> Find</span>
          </button>
        </div>
      </Card>

      {pro && badge && (
        <>
          <Card>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm font-black text-slate-100">{pro.displayName}</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-black ${badge.accentClass}`}>
                <span>{badge.icon}</span> {badge.label}
              </span>
              {pro.boostUntil && new Date(pro.boostUntil).getTime() > Date.now() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/40 text-[11px] font-black">
                  <Sparkles className="w-3 h-3" /> Boosted till {new Date(pro.boostUntil).toLocaleDateString(appLocale())}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              {[
                { label: 'Free sevas', value: String(pro.freeSevasRemaining) },
                { label: 'Completed', value: String(pro.completedSevas) },
                { label: 'Rating', value: pro.ratingCount > 0 ? `${pro.ratingAggregate.toFixed(1)}★` : '—' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-900 border border-slate-800 py-2.5">
                  <p className="text-base font-black text-slate-100">{s.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Gift className="w-4 h-4" />} title="Commission-free sevas" sub="The welcome blessing counter. Adjust sets it; bonus adds on top." />
            <div className="flex gap-2 flex-wrap">
              <input type="number" min={0} value={freeSevas} onChange={(e) => setFreeSevas(e.target.value)} className={`${inputCls} !w-28`} aria-label="Free sevas count" />
              <button type="button" disabled={working === 'adjust'} onClick={() => run('adjust', () => professionalsAdmin.adjustFreeSevas(kind, pro.profileId, Number(freeSevas), note))} className={`${btnGhost} disabled:opacity-50`}>Set count</button>
              <input type="number" min={1} value={bonus} onChange={(e) => setBonus(e.target.value)} className={`${inputCls} !w-24`} aria-label="Bonus sevas" />
              <button type="button" disabled={working === 'bonus'} onClick={() => run('bonus', () => professionalsAdmin.grantBonusFreeSevas(kind, pro.profileId, Number(bonus), note))} className={`${btnGreen} disabled:opacity-50`}>
                <span className="inline-flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Grant bonus</span>
              </button>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Audit note (optional, e.g. Diwali blessing grant)" className={`${inputCls} mt-2`} />
          </Card>

          <Card>
            <SectionTitle icon={<TrendingUp className="w-4 h-4" />} title="Commission schedule override" sub="Replaces this professional's easing schedule. JSON array of {sevas?, rate} — rate is a multiplier of the standard rate." />
            <textarea value={scheduleJson} onChange={(e) => setScheduleJson(e.target.value)}
              placeholder='[{"sevas": 3, "rate": 0}, {"sevas": 5, "rate": 0.5}, {"rate": 1}]'
              rows={3} className={`${inputCls} font-mono !text-xs`} />
            <button type="button" disabled={working === 'schedule'} onClick={() => run('schedule', async () => {
              let parsed: CommissionScheduleBracket[];
              try { parsed = JSON.parse(scheduleJson); } catch { throw new Error('Invalid JSON.'); }
              if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Schedule must be a non-empty array.');
              await professionalsAdmin.setCommissionSchedule(kind, pro.profileId, parsed, note);
            })} className={`${btnGhost} mt-2 disabled:opacity-50`}>Apply schedule</button>
          </Card>

          <div className="grid sm:grid-cols-2 gap-3">
            <Card>
              <SectionTitle icon={<Clock className="w-4 h-4" />} title="Search boost" sub="Boosted professionals appear first. Leave empty + save to clear." />
              <input type="date" value={boostDate} onChange={(e) => setBoostDate(e.target.value)} className={inputCls} />
              <div className="flex gap-2 mt-2">
                <button type="button" disabled={working === 'boost'} onClick={() => run('boost', () => professionalsAdmin.setBoostUntil(kind, pro.profileId, boostDate ? new Date(boostDate).toISOString() : null))} className={`${btnGhost} flex-1 disabled:opacity-50`}>Save boost</button>
              </div>
            </Card>
            <Card>
              <SectionTitle icon={<Crown className="w-4 h-4" />} title="Manual tier change" sub="Requires an audit note. Downgrades are flagged in the audit log." />
              <select value={tier} onChange={(e) => setTier(e.target.value as SevaProTier)} className={`${inputCls} mb-2`}>
                {TIER_ORDER.map((t) => <option key={t} value={t}>{tierBadge(t, 'en').label}</option>)}
              </select>
              <input value={tierNote} onChange={(e) => setTierNote(e.target.value)} placeholder="Audit note (required)" className={`${inputCls} mb-2`} />
              <button type="button" disabled={working === 'tier'} onClick={() => run('tier', () => professionalsAdmin.setTierManual(kind, pro.profileId, tier, tierNote))} className={`${btnSaffron} w-full disabled:opacity-50`}>Set tier</button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

/* ============================ Global defaults ========================== */

const GlobalDefaults: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [cfg, setCfg] = useState<PrathamSevaConfig>({ ...DEFAULT_PRATHAM_CONFIG });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setCfg(await professionalsAdmin.getPrathamConfig()); }
      catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'load'), 'error'); }
      setLoading(false);
    })();
  }, [showToast]);

  const save = async () => {
    setSaving(true);
    try {
      const clean = await professionalsAdmin.savePrathamConfig(cfg);
      setCfg(clean);
      showToast('🪔 Pratham Seva defaults blessed and saved.', 'success');
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading defaults…</p>;

  const bracketPreview = cfg.commissionSchedule.map((b, i) => {
    const span = typeof b.sevas === 'number' ? `${b.sevas}` : '∞';
    const pct = b.rate === 0 ? 'free' : b.rate >= 1 ? 'full rate' : `${Math.round(b.rate * 100)}% of standard`;
    return `Bracket ${i + 1}: ${span} sevas → ${pct}`;
  }).join(' · ');

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle icon={<Settings2 className="w-4 h-4" />} title="Welcome blessing defaults" sub="Applied to every professional newly honored as VERIFIED. Existing professionals keep the schedule they were promised." />
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-xs font-bold text-slate-400 mb-1.5">Default free sevas</span>
            <input type="number" min={0} max={50} value={cfg.defaultFreeSevas}
              onChange={(e) => setCfg({ ...cfg, defaultFreeSevas: Number(e.target.value) })} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-400 mb-1.5">Trusted boost (days)</span>
            <input type="number" min={0} max={365} value={cfg.trustedBoostDays}
              onChange={(e) => setCfg({ ...cfg, trustedBoostDays: Number(e.target.value) })} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-400 mb-1.5">Manual boost default (days)</span>
            <input type="number" min={0} max={365} value={cfg.manualBoostDays}
              onChange={(e) => setCfg({ ...cfg, manualBoostDays: Number(e.target.value) })} className={inputCls} />
          </label>
        </div>
      </Card>
      <Card>
        <SectionTitle icon={<TrendingUp className="w-4 h-4" />} title="Commission easing schedule" sub="Rate = multiplier of the standard commission rate. 0 = commission-free, 1 = full rate." />
        {cfg.commissionSchedule.map((b, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input type="number" min={1} placeholder="sevas (blank = rest)" value={b.sevas ?? ''}
              onChange={(e) => {
                const next = [...cfg.commissionSchedule];
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                next[i] = { ...next[i], ...(v === undefined ? {} : { sevas: v }) };
                if (v === undefined) delete (next[i] as any).sevas;
                setCfg({ ...cfg, commissionSchedule: next });
              }}
              className={`${inputCls} !w-32`} aria-label={`Bracket ${i + 1} seva count`} />
            <input type="number" min={0} max={1} step={0.01} value={b.rate}
              onChange={(e) => {
                const next = [...cfg.commissionSchedule];
                next[i] = { ...next[i], rate: Number(e.target.value) };
                setCfg({ ...cfg, commissionSchedule: next });
              }}
              className={`${inputCls} !w-32`} aria-label={`Bracket ${i + 1} rate multiplier`} />
            <button type="button" onClick={() => setCfg({ ...cfg, commissionSchedule: cfg.commissionSchedule.filter((_, j) => j !== i) })}
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 text-red-400" aria-label="Remove bracket">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setCfg({ ...cfg, commissionSchedule: [...cfg.commissionSchedule, { rate: 1 }] })} className={btnGhost}>
          + Add bracket
        </button>
        <p className="text-[11px] text-slate-500 mt-3 font-mono break-words">{bracketPreview}</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Preview at 12% standard: sevas 1–3 → 0%, 4–8 → {Math.round(scheduleMultiplierFor(cfg.commissionSchedule, 3) * 12 * 100) / 100}%, 9+ → 12%.
        </p>
      </Card>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className={`${btnSaffron} flex-1 disabled:opacity-50`}>
          {saving ? 'Saving…' : 'Save defaults'}
        </button>
        <button type="button" onClick={() => setCfg(sanitizeConfig(DEFAULT_PRATHAM_CONFIG))} className={btnGhost}>Reset to 3 / 0%→6%→full</button>
      </div>
    </div>
  );
};

/* ================================ Tab ================================== */

export const ProfessionalsTab: React.FC = () => {
  const [section, setSection] = useState<'queue' | 'controls' | 'defaults'>('queue');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'queue', label: 'Review queue', icon: <BadgeCheck className="w-3.5 h-3.5" /> },
          { id: 'controls', label: 'Professionals', icon: <Crown className="w-3.5 h-3.5" /> },
          { id: 'defaults', label: 'Program defaults', icon: <Settings2 className="w-3.5 h-3.5" /> },
        ] as const).map((s) => (
          <button key={s.id} type="button" onClick={() => setSection(s.id)}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black inline-flex items-center gap-2 ${section === s.id ? 'bg-saffron-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>
      {section === 'queue' && <ReviewQueue />}
      {section === 'controls' && <ProfessionalControls />}
      {section === 'defaults' && <GlobalDefaults />}
    </div>
  );
};
