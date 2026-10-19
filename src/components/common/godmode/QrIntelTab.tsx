/**
 * godmode/QrIntelTab.tsx — QR Intelligence dashboard (Phase 1: aggregate only).
 * ============================================================================
 * PRIVACY LAW: this dashboard shows AGGREGATES only — scan counts, conversion
 * rates, trends. No per-user data, no scanner identities, no browsable event
 * stream. The per-user Integrity Radar (Phase 2) is threshold-gated, never
 * browsable.
 *
 * Mounted as the 'QR Intel' subtab in MarketplaceTab (AdminTabsF).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, TrendingUp, Users, MousePointerClick, BadgeCheck, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';

const Kpi: React.FC<{ label: string; value: string; sub?: string; icon?: React.ReactNode }> = ({ label, value, sub, icon }) => (
  <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800">
    <div className="flex items-center gap-2 mb-1">{icon}<p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">{label}</p></div>
    <p className="text-xl font-black text-slate-100">{value}</p>
    {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

const inputCls = 'bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500';

interface QrIntelData {
  kpis: {
    scans: number;
    uniqueScanners: number;
    parsed: number;
    completions: number;
    failures: number;
    conversionRate: number;
    activeQrs: number;
  };
  ranked: {
    qrId: string;
    qrIdFull: string;
    qrType: string;
    receiverId: string;
    totalScans: number;
    uniqueScanners: number;
    completions: number;
    failures: number;
    conversionRate: number;
    lastScannedAt: number;
  }[];
  byType: { type: string; scans: number; completions: number }[];
  trend: { day: string; scans: number }[];
}

export const QrIntelTab: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [data, setData] = useState<QrIntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r: any = await adminApi.qrIntelDashboard(period);
      if (r?.ok && r?.data?.ok) {
        setData(r.data as QrIntelData);
      } else {
        setError('Could not load QR intelligence.');
      }
    } catch {
      setError('Could not load QR intelligence.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxTrend = Math.max(1, ...(data?.trend.map((t) => t.scans) || [1]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <QrCode size={16} className="text-saffron-400" /> QR Intelligence
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Aggregate scan analytics — which payment QRs get scanned, and how many scans become payments.
            No per-user data in this view.
          </p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value as never)} className={inputCls} aria-label="Period">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {loading && <p className="text-slate-500 text-sm">Loading QR intelligence…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Scans" value={String(data.kpis.scans)} sub={`${data.kpis.uniqueScanners} unique scanners`} icon={<MousePointerClick size={14} className="text-saffron-400" />} />
            <Kpi label="Scan → payment" value={`${data.kpis.conversionRate}%`} sub={`${data.kpis.completions} completions`} icon={<BadgeCheck size={14} className="text-emerald-400" />} />
            <Kpi label="Active QRs" value={String(data.kpis.activeQrs)} sub="with at least one scan" icon={<QrCode size={14} className="text-sky-400" />} />
            <Kpi label="Failed payments" value={String(data.kpis.failures)} sub="declined / cancelled after scan" icon={<AlertTriangle size={14} className="text-amber-400" />} />
          </div>

          {/* Trend chart */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-slate-400 text-[11px] uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-saffron-400" /> Scans per day (last 14 days)
            </p>
            <div className="flex items-end gap-1 h-24">
              {data.trend.map((t) => (
                <div key={t.day} className="flex-1 flex flex-col items-center justify-end h-full" title={`${t.day}: ${t.scans} scans`}>
                  <div
                    className="w-full rounded-t bg-saffron-500/70 min-h-[2px]"
                    style={{ height: `${Math.max(2, (t.scans / maxTrend) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-600">{data.trend[0]?.day.slice(5)}</span>
              <span className="text-[10px] text-slate-600">{data.trend[data.trend.length - 1]?.day.slice(5)}</span>
            </div>
          </div>

          {/* Ranked table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <p className="text-slate-400 text-[11px] uppercase tracking-wider font-bold p-4 pb-2 flex items-center gap-2">
              <Users size={14} className="text-saffron-400" /> QRs by scans
            </p>
            {data.ranked.length === 0 ? (
              <p className="text-slate-500 text-sm p-4 pt-0">No QR scans recorded yet. Scans appear here once devotees start scanning payment codes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 text-left border-b border-slate-800">
                      <th className="p-3 font-bold">QR</th>
                      <th className="p-3 font-bold">Type</th>
                      <th className="p-3 font-bold text-right">Scans</th>
                      <th className="p-3 font-bold text-right">Unique</th>
                      <th className="p-3 font-bold text-right">Paid</th>
                      <th className="p-3 font-bold text-right">Conv.</th>
                      <th className="p-3 font-bold text-right">Last scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ranked.map((r) => (
                      <tr key={r.qrIdFull} className="border-b border-slate-800/50 hover:bg-slate-800/30" title={`Full ID: ${r.qrIdFull}`}>
                        <td className="p-3 font-mono text-slate-300">{r.qrId}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">{r.qrType}</span></td>
                        <td className="p-3 text-right font-bold text-slate-100">{r.totalScans}</td>
                        <td className="p-3 text-right text-slate-400">{r.uniqueScanners}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">{r.completions}</td>
                        <td className="p-3 text-right">
                          <span className={`font-bold ${r.conversionRate >= 50 ? 'text-emerald-400' : r.conversionRate >= 20 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {r.conversionRate}%
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-500">
                          {r.lastScannedAt ? new Date(r.lastScannedAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* By-type breakdown */}
          {data.byType.length > 0 && (
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <p className="text-slate-400 text-[11px] uppercase tracking-wider font-bold mb-2">By QR type</p>
              <div className="flex flex-wrap gap-2">
                {data.byType.map((t) => (
                  <span key={t.type} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
                    {t.type}: {t.scans} scans · {t.completions} paid
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-600">
            🛡️ Privacy: aggregates only. Scanner identities are SHA-256 hashes, never shown here.
            Phase 2 (Integrity Radar) will add threshold-gated fraud flags once baseline data flows.
          </p>
        </>
      )}
    </div>
  );
};
