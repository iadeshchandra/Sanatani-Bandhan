/**
 * GrowthAnalytics — App Growth admin: funnel, campaigns, platforms, digest.
 * ========================================================================
 * Reads the owner-only event collections (`appGrowthScans`, `appGrowthInstalls`,
 * `appGrowthWaitlist`) written by the public /get-app page. Charts are
 * hand-rolled SVG — the same approach as AdminTabsC's InsightsTab. No chart.js.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { TrendingUp, Users, Download, CalendarDays } from 'lucide-react';
import { db } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { GROWTH_PLATFORMS, type GrowthPlatform } from '../useAppGrowthConfig';
import { Card, Empty, Loading, SectionTitle } from './ui';

type Preset = 7 | 30 | 90;
const PRESETS: { days: Preset; label: string }[] = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

interface EventRow {
  campaignId: string | null;
  platform: GrowthPlatform;
  ts: Date;
}

const toRow = (d: { data: () => Record<string, unknown> }): EventRow | null => {
  const data = d.data();
  const ts = data.ts;
  const date = ts instanceof Timestamp ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!date) return null;
  const platform = GROWTH_PLATFORMS.includes(data.platform as GrowthPlatform)
    ? (data.platform as GrowthPlatform) : 'unknown';
  return {
    campaignId: typeof data.campaignId === 'string' ? data.campaignId : null,
    platform,
    ts: date,
  };
};

/* ---------------- lightweight SVG charts (AdminTabsC style) ---------------- */
const LineChart: React.FC<{ series: { label: string; color: string; points: number[] }[]; labels: string[] }> = ({ series, labels }) => {
  const W = 560, H = 180, P = 28;
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const x = (i: number) => P + (i / Math.max(1, series[0].points.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={y(max * f)} y2={y(max * f)} stroke="#1e293b" strokeWidth="1" />
        ))}
        {series.map((s) => (
          <polyline
            key={s.label}
            points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="flex items-center justify-between mt-1">
        <div className="flex gap-3">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-slate-600">{labels[0]} → {labels[labels.length - 1]}</span>
      </div>
    </div>
  );
};

const BarChart: React.FC<{ rows: { label: string; value: number }[]; color: string }> = ({ rows, color }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="w-32 shrink-0 truncate text-[11px] text-slate-400" title={r.label}>{r.label}</span>
          <div className="flex-1 h-5 rounded bg-slate-900 overflow-hidden">
            <div className="h-full rounded transition-all" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
          <span className="w-10 shrink-0 text-right text-[11px] font-bold text-slate-200">{r.value}</span>
        </div>
      ))}
    </div>
  );
};

export const GrowthAnalytics: React.FC = () => {
  const { showToast } = useToast();
  const [preset, setPreset] = useState<Preset>(30);
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<EventRow[]>([]);
  const [installs, setInstalls] = useState<EventRow[]>([]);
  const [waitlist, setWaitlist] = useState<EventRow[]>([]);
  const [campaignNames, setCampaignNames] = useState<Record<string, string>>({});

  const load = useCallback(async (days: Preset) => {
    setLoading(true);
    try {
      const start = Timestamp.fromDate(new Date(Date.now() - days * 86_400_000));
      const [scanSnap, installSnap, waitSnap, campSnap] = await Promise.all([
        getDocs(query(collection(db, 'appGrowthScans'), where('ts', '>=', start), orderBy('ts', 'desc'), limit(5000))),
        getDocs(query(collection(db, 'appGrowthInstalls'), where('ts', '>=', start), orderBy('ts', 'desc'), limit(5000))),
        getDocs(collection(db, 'appGrowthWaitlist')),
        getDocs(collection(db, 'appGrowthCampaigns')),
      ]);
      setScans(scanSnap.docs.map(toRow).filter((r): r is EventRow => r !== null));
      setInstalls(installSnap.docs.map(toRow).filter((r): r is EventRow => r !== null));
      setWaitlist(waitSnap.docs.map(toRow).filter((r): r is EventRow => r !== null));
      const names: Record<string, string> = {};
      campSnap.docs.forEach((d) => { names[d.id] = String(d.data().label ?? d.id); });
      setCampaignNames(names);
    } catch {
      showToast('Analytics failed to load.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(preset); }, [load, preset]);

  const stats = useMemo(() => {
    const scanCount = scans.length;
    const installCount = installs.length;
    const conv = scanCount > 0 ? (installCount / scanCount) * 100 : 0;

    const byCampaign = new Map<string, { scans: number; installs: number }>();
    const bump = (id: string | null, kind: 'scans' | 'installs') => {
      const key = id ?? '__none__';
      const cur = byCampaign.get(key) ?? { scans: 0, installs: 0 };
      cur[kind] += 1;
      byCampaign.set(key, cur);
    };
    scans.forEach((s) => bump(s.campaignId, 'scans'));
    installs.forEach((s) => bump(s.campaignId, 'installs'));

    const campaignRows = [...byCampaign.entries()]
      .map(([id, v]) => ({ id, label: id === '__none__' ? 'No campaign' : (campaignNames[id] ?? id.slice(0, 8)), ...v }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 8);
    const topCampaign = campaignRows[0]?.label ?? '—';

    const byPlatform = GROWTH_PLATFORMS.map((p) => ({
      label: p,
      scans: scans.filter((s) => s.platform === p).length,
      installs: installs.filter((s) => s.platform === p).length,
    }));

    // daily series
    const days: string[] = [];
    const scanByDay: Record<string, number> = {};
    const installByDay: Record<string, number> = {};
    for (let i = preset - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      days.push(key.slice(5));
      scanByDay[key] = 0;
      installByDay[key] = 0;
    }
    scans.forEach((s) => { const k = s.ts.toISOString().slice(0, 10); if (k in scanByDay) scanByDay[k] += 1; });
    installs.forEach((s) => { const k = s.ts.toISOString().slice(0, 10); if (k in installByDay) installByDay[k] += 1; });

    const waitByPlatform = GROWTH_PLATFORMS.map((p) => ({
      label: p,
      value: waitlist.filter((w) => w.platform === p).length,
    }));

    const orderedKeys = Object.keys(scanByDay);
    const scanSeries = orderedKeys.map((k) => scanByDay[k]);
    const installSeries = orderedKeys.map((k) => installByDay[k]);

    return { scanCount, installCount, conv, campaignRows, topCampaign, byPlatform, days, scanSeries, installSeries, waitByPlatform };
  }, [scans, installs, waitlist, campaignNames, preset]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Performance</h3>
          <p className="text-xs text-slate-500 mt-0.5">QR scans → confirmed installs, from the public /get-app page.</p>
        </div>
        <div className="flex rounded-xl border border-slate-700 overflow-hidden">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setPreset(p.days)}
              className={`px-4 py-2 min-h-[44px] text-xs font-bold ${preset === p.days ? 'bg-saffron-500 text-slate-950' : 'text-slate-300'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loading text="Crunching numbers…" /> : (
        <>
          {/* weekly digest */}
          <Card className="border-saffron-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-saffron-500/15 border border-saffron-500/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-saffron-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Digest — last {preset}d</p>
                <p className="text-lg font-black text-white mt-1">
                  {stats.scanCount} scans → {stats.installCount} installs ({stats.conv.toFixed(0)}%)
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Top campaign: <span className="text-saffron-300 font-semibold">{stats.topCampaign}</span></p>
              </div>
            </div>
          </Card>

          {/* funnel */}
          <Card>
            <SectionTitle>Funnel</SectionTitle>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center rounded-xl bg-slate-900 border border-slate-800 p-3">
                <p className="text-2xl font-black text-white">{stats.scanCount}</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Scans</p>
              </div>
              <div className="text-saffron-400 font-black">→</div>
              <div className="flex-1 text-center rounded-xl bg-slate-900 border border-saffron-500/40 p-3">
                <p className="text-2xl font-black text-saffron-300">{stats.installCount}</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Installs</p>
              </div>
              <div className="flex-1 text-center rounded-xl bg-slate-900 border border-slate-800 p-3">
                <p className="text-2xl font-black text-emerald-300">{stats.conv.toFixed(0)}%</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Conversion</p>
              </div>
            </div>
          </Card>

          {/* daily trend */}
          <Card>
            <SectionTitle hint="Daily scans vs installs.">Trend</SectionTitle>
            <LineChart
              labels={stats.days}
              series={[
                { label: 'Scans', color: '#f59e0b', points: stats.scanSeries },
                { label: 'Installs', color: '#34d399', points: stats.installSeries },
              ]}
            />
          </Card>

          {/* by campaign */}
          <Card>
            <SectionTitle hint="Which printed QR is working hardest.">By campaign</SectionTitle>
            {stats.campaignRows.length === 0
              ? <Empty text="No scans in this range yet." />
              : <BarChart rows={stats.campaignRows.map((r) => ({ label: r.label, value: r.scans }))} color="#f59e0b" />}
          </Card>

          {/* by platform */}
          <Card>
            <SectionTitle>By platform</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.byPlatform.map((p) => (
                <div key={p.label} className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{p.label}</p>
                  <p className="text-xl font-black text-white mt-1">{p.scans}</p>
                  <p className="text-[11px] text-slate-500">{p.installs} installs</p>
                </div>
              ))}
            </div>
          </Card>

          {/* waitlist */}
          <Card>
            <SectionTitle hint="Visitors who asked to be told when their platform's app is ready.">
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-saffron-400" /> Waitlist</span>
            </SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.waitByPlatform.map((p) => (
                <div key={p.label} className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{p.label}</p>
                  <p className="text-xl font-black text-white mt-1 flex items-center justify-center gap-1.5"><CalendarDays className="w-4 h-4 text-slate-500" />{p.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <p className="flex items-center gap-1.5 text-[11px] text-slate-600"><Download className="w-3.5 h-3.5" /> Event docs are append-only and owner-read-only; clients can only create strictly-validated records (see firestore.rules).</p>
        </>
      )}
    </div>
  );
};
