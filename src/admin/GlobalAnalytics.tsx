import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Building2,
  Users,
  Layers,
  UserPlus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { auth } from '../services/firebaseClient';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

interface OverviewData {
  workspaces: number;
  users: number;
  tenants: number;
  recentWorkspaces: Array<{ id: string; name?: string; type?: string; planId?: string; createdAt?: any }>;
  generatedAt?: string;
}

interface TimeseriesPoint {
  date: string;
  count: number;
}

interface PlanSlice {
  planId: string;
  count: number;
}

async function authedGet<T>(path: string): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not signed in');
  const token = await currentUser.getIdToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return res.json();
}

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
};

const fmtNum = (n: number) => (n < 0 ? '—' : n.toLocaleString('en-IN'));

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
      <AlertCircle className="w-8 h-8" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-48 flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
    </div>
  );
}

export const GlobalAnalytics: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [signups, setSignups] = useState<TimeseriesPoint[]>([]);
  const [wsGrowth, setWsGrowth] = useState<TimeseriesPoint[]>([]);
  const [plans, setPlans] = useState<PlanSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [ov, ts, pl] = await Promise.all([
          authedGet<{ success: boolean; overview: OverviewData }>('/api/admin/overview'),
          authedGet<{ success: boolean; timeseries: { signups: TimeseriesPoint[]; workspaces: TimeseriesPoint[]; generatedAt: string } }>('/api/admin/analytics/timeseries?days=14'),
          authedGet<{ success: boolean; plans: { total: number; distribution: PlanSlice[]; generatedAt: string } }>('/api/admin/analytics/plans'),
        ]);
        if (cancelled) return;
        setOverview(ov.overview);
        setSignups(ts.timeseries.signups);
        setWsGrowth(ts.timeseries.workspaces);
        setPlans(pl.plans.distribution);
        setGeneratedAt(ov.overview.generatedAt || ts.timeseries.generatedAt);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signupsLast7 = signups.slice(-7).reduce((a, p) => a + p.count, 0);
  const wsLast7 = wsGrowth.slice(-7).reduce((a, p) => a + p.count, 0);

  const statCards = [
    { label: 'Total Workspaces', value: overview ? fmtNum(overview.workspaces) : '—', icon: Building2, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Total Users', value: overview ? fmtNum(overview.users) : '—', icon: Users, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Tenants', value: overview ? fmtNum(overview.tenants) : '—', icon: Layers, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'New Signups (7d)', value: fmtNum(signupsLast7), icon: UserPlus, tone: 'text-rose-600 bg-rose-50' },
  ];

  const planColors: Record<string, string> = {
    DEMO: '#94a3b8',
    LITE: '#d97706',
    STANDARD: '#4f46e5',
    ENTERPRISE: '#059669',
    OTHER: '#cbd5e1',
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
              Owner Console
            </span>
            {generatedAt && (
              <span className="text-xs text-slate-500 font-mono">
                Updated {new Date(generatedAt).toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Platform Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live workspace, user, and plan metrics from the production backend.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Could not load analytics: {error}. The backend functions may not be deployed yet.</span>
        </div>
      )}

      {/* 2. Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.tone}`}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {loading ? '…' : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: User signups */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  User Signups (Last 14 Days)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">New Firebase accounts per day</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
              {loading ? '…' : `${signupsLast7} in last 7d`}
            </span>
          </div>
          <div className="h-72 w-full">
            {loading ? <LoadingState /> : signups.every((p) => p.count === 0) ? (
              <EmptyState message="No signups in the last 14 days" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signups.map((p) => ({ ...p, label: fmtDate(p.date) }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} interval={2} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => [`${value} signups`, '']}
                    labelFormatter={(l) => `${l}`}
                  />
                  <Line type="monotone" dataKey="count" name="Signups" stroke="#d97706" strokeWidth={3} dot={{ r: 3, fill: '#d97706' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Workspace growth */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Workspaces Created (Last 14 Days)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">New organisations joining the platform</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
              {loading ? '…' : `${wsLast7} in last 7d`}
            </span>
          </div>
          <div className="h-72 w-full">
            {loading ? <LoadingState /> : wsGrowth.every((p) => p.count === 0) ? (
              <EmptyState message="No new workspaces in the last 14 days" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wsGrowth.map((p) => ({ ...p, label: fmtDate(p.date) }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} interval={2} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => [`${value} workspaces`, '']}
                  />
                  <Bar dataKey="count" name="Workspaces" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 4. Plan distribution + Recent workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Plan Distribution</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6">Workspaces by subscription tier</p>
          {loading ? <LoadingState /> : plans.every((p) => p.count <= 0) ? (
            <EmptyState message="No plan data yet" />
          ) : (
            <div className="space-y-4">
              {plans.filter((p) => p.count > 0).map((p) => {
                const max = Math.max(...plans.map((x) => Math.max(x.count, 0)), 1);
                const pct = max > 0 ? Math.round((p.count / max) * 100) : 0;
                return (
                  <div key={p.planId}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-bold text-slate-700">{p.planId}</span>
                      <span className="text-slate-500 font-mono">{p.count.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: planColors[p.planId] || '#94a3b8' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent workspaces */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Workspaces</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6">Latest organisations on the platform</p>
          {loading ? <LoadingState /> : !overview || overview.recentWorkspaces.length === 0 ? (
            <EmptyState message="No workspaces yet" />
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {overview.recentWorkspaces.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{ws.name || ws.id}</p>
                    <p className="text-xs text-slate-500">{ws.type || 'Organisation'}</p>
                  </div>
                  <span
                    className="shrink-0 ml-3 px-2 py-0.5 rounded-md text-[11px] font-bold"
                    style={{ backgroundColor: `${planColors[ws.planId || ''] || '#94a3b8'}1a`, color: planColors[ws.planId || ''] || '#64748b' }}
                  >
                    {ws.planId || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Honest footnote */}
      <p className="text-xs text-slate-400 text-center">
        Figures are live from the production backend. If the functions are not yet deployed, charts will show an error instead of estimates — we never invent numbers.
      </p>
    </div>
  );
};

export default GlobalAnalytics;
