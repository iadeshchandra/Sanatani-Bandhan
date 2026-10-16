/**
 * AdminTabsJ — Console 3.0: Finance Command Center.
 * =================================================
 * P0 from the admin review: the owner's money was scattered across Billing,
 * Commission, Marketplace and Dues tabs with no unified cash-position view.
 * This tab answers: "how much is pending in, pending out, overdue, and
 * what is my net position right now?"
 *
 * Spark-native: all data from firestoreAdmin (owner-gated Firestore reads).
 * Never throws — every load is guarded, empty states are honest.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw, Wallet, ArrowDownCircle, ArrowUpCircle, AlertTriangle,
  TrendingUp, ChevronDown, ExternalLink,
} from 'lucide-react';
import { firestoreAdmin } from '../../../lib/firestoreAdmin';
import { useToast } from '../../../context/ToastContext';

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
        firestoreAdmin.topupQueue('pending').catch(() => ({ ok: false })),
        firestoreAdmin.payoutQueue('all').catch(() => ({ ok: false })),
        firestoreAdmin.duesList('pending').catch(() => ({ ok: false })),
        firestoreAdmin.paymentClaims('pending').catch(() => ({ ok: false })),
        firestoreAdmin.marketplaceTransactions('all', 200).catch(() => ({ ok: false })),
      ]);
      if (t.ok) setTopups((t.data as any)?.claims || []);
      if (p.ok) setPayouts((p.data as any)?.payouts || []);
      if (d.ok) setDues((d.data as any)?.dues || []);
      if (c.ok) setClaims((c.data as any)?.claims || []);
      if (x.ok) setTxns((x.data as any)?.transactions || []);
      if (!t.ok && !p.ok && !d.ok && !c.ok && !x.ok) setLoadError('Could not load financial data. Check your connection and owner sign-in.');
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load financial data.');
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
