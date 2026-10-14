/**
 * AdminTabsG — Console 3.0: Payment Insights (per-method intelligence).
 * =====================================================================
 * Spark-native (firestoreAdmin direct via adminApi fallback).
 * Per-method cards, time filters, volume bar chart, chronological
 * timeline, CSV export. Answers: "when did we use which method,
 * how much came through it, how well did it convert?"
 */
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, TrendingUp } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { useToast } from '../../../context/ToastContext';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-slate-950/70 border border-slate-800 p-4 ${className}`}>{children}</div>
);
const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-slate-500 py-6 text-center">{text}</p>
);
const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500';
const btnGhost = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors';

const METHOD_COLORS: Record<string, string> = {
  bd_banglaqr: '#f59e0b', bd_bkash: '#e2136e', bd_nagad: '#f97316',
  in_upi: '#16a34a', intl_wise: '#0ea5e9', intl_payoneer: '#8b5cf6',
  unknown: '#64748b',
};
const METHOD_LABELS: Record<string, string> = {
  bd_banglaqr: 'Bangla QR', bd_bkash: 'bKash', bd_nagad: 'Nagad',
  in_upi: 'UPI', intl_wise: 'Wise', intl_payoneer: 'Payoneer', unknown: 'Unknown',
};

type Period = '7d' | '30d' | '90d' | 'all';

export const PaymentInsightsTab: React.FC = () => {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<Period>('30d');
  const [methods, setMethods] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, h] = await Promise.all([
      adminApi.paymentMethodStats(period),
      adminApi.paymentHistory({ limit: 200 }),
    ]);
    if (s.ok) setMethods((s.data as any)?.methods || []);
    if (h.ok) setRows((h.data as any)?.rows || []);
    setLoading(false);
  }, [period]);
  useEffect(() => { load(); }, [load]);

  const doExport = async () => {
    setExporting(true);
    const r = await adminApi.exportPaymentCSV(period);
    setExporting(false);
    if (r.ok && (r.data as any)?.csv) {
      const blob = new Blob([(r.data as any).csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `payment-history-${period}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${(r.data as any).count} rows.`, 'success');
    } else showToast(r.error || 'Export failed.', 'error');
  };

  const maxVol = Math.max(1, ...methods.map((m) => m.volume));
  const filtered = methodFilter === 'all' ? rows : rows.filter((r) => r.methodId === methodFilter);
  const totalVol = methods.reduce((s, m) => s + m.volume, 0);
  const totalCount = methods.reduce((s, m) => s + m.count, 0);

  if (loading) return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading payment insights…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={`${inputCls} w-auto`}>
          <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option><option value="all">All time</option>
        </select>
        <button type="button" onClick={doExport} disabled={exporting} className={btnGhost}>
          <Download className="w-3.5 h-3.5 inline mr-1" />{exporting ? 'Exporting…' : 'CSV'}
        </button>
        <div className="flex-1" />
        <p className="text-[11px] text-slate-500">{totalCount} payments · ৳/₹ {totalVol.toLocaleString('en-IN')}</p>
      </div>

      {/* Per-method cards */}
      <div className="grid grid-cols-2 gap-3">
        {methods.length === 0 && <div className="col-span-2"><Empty text="No payment activity in this period." /></div>}
        {methods.map((m) => (
          <Card key={m.methodId} className="border-l-4" >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: METHOD_COLORS[m.methodId] || METHOD_COLORS.unknown }} />
              <p className="text-xs font-black text-slate-200">{m.label}</p>
            </div>
            <p className="text-lg font-black text-slate-100">₹{m.volume.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-500">{m.count} txns · avg ₹{m.avgTicket.toLocaleString('en-IN')} · {m.approvalRate}% approved</p>
          </Card>
        ))}
      </div>

      {/* Volume bar chart */}
      {methods.length > 0 && (
        <Card>
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Volume by method
          </h4>
          <div className="space-y-2">
            {methods.map((m) => (
              <div key={m.methodId}>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>{m.label}</span><span>₹{m.volume.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((m.volume / maxVol) * 100)}%`, background: METHOD_COLORS[m.methodId] || METHOD_COLORS.unknown }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Timeline — when we used which</h4>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={`${inputCls} w-auto !py-1.5 !min-h-0 text-xs`}>
            <option value="all">All methods</option>
            {Object.entries(METHOD_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? <Empty text="No payments match." /> : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {filtered.slice(0, 100).map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 bg-slate-900 rounded-lg px-2.5 py-2">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: `${METHOD_COLORS[r.methodId] || METHOD_COLORS.unknown}22`, color: METHOD_COLORS[r.methodId] || METHOD_COLORS.unknown }}>
                  {METHOD_LABELS[r.methodId] || r.methodId}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-200 truncate">₹{Number(r.amount || 0).toLocaleString('en-IN')} <span className="text-slate-500 font-normal">· {r.trxId || 'no trx'}</span></p>
                  <p className="text-[9px] text-slate-500 truncate">{r.applicant} · {r.createdAt?.slice(0, 10) || ''}</p>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                  String(r.status).toLowerCase() === 'approved' ? 'bg-emerald-500/15 text-emerald-300'
                  : String(r.status).toLowerCase().includes('reject') ? 'bg-red-500/15 text-red-300'
                  : 'bg-yellow-500/15 text-yellow-300'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
