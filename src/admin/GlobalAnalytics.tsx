import React from 'react';
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
  TrendingUp,
  Activity,
  BrainCircuit,
  AlertTriangle,
  Users,
  IndianRupee,
  Sparkles,
} from 'lucide-react';

const footfallData = [
  { day: 'Mon', footfall: 42500, previousWeek: 38000 },
  { day: 'Tue', footfall: 46200, previousWeek: 41200 },
  { day: 'Wed', footfall: 49800, previousWeek: 44500 },
  { day: 'Thu', footfall: 58900, previousWeek: 51200 },
  { day: 'Fri', footfall: 74200, previousWeek: 68000 },
  { day: 'Sat', footfall: 112000, previousWeek: 99400 },
  { day: 'Sun', footfall: 138500, previousWeek: 122000 },
];

const financialData = [
  { name: 'Kashi Vishwanath', donations: 4200000, expenses: 1850000 },
  { name: 'Somnath Mandir', donations: 3600000, expenses: 1420000 },
  { name: 'Tirupati Balaji', donations: 8900000, expenses: 3100000 },
  { name: 'Mahakaleshwar', donations: 2950000, expenses: 1180000 },
  { name: 'Badrinath Dham', donations: 2400000, expenses: 980000 },
];

export const GlobalAnalytics: React.FC = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
              Enterprise Intelligence
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Model: Gemini 2.5 Dharmic Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Global AI Analytics & Forecasting
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Predictive crowd velocity, real-time treasury telemetry, and cross-partition Mandir metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-Time Engine Active
          </span>
        </div>
      </div>

      {/* 2. Top Row (Predictive AI Insights) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-200/80 rounded-2xl p-6 relative overflow-hidden shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                  Predictive Alert
                </span>
                <span className="text-xs text-slate-500">Confidence Score: 94.8%</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Surge Forecast: 42% expected increase in footfall at Kashi Vishwanath for upcoming Shravan Somwar
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                AI forecasting models indicate peak crowd density around Temple Corridor Entry Gates 2 & 4 between 04:30 AM and 09:00 AM. Recommend provisioning +25 additional Sevadars, activating Queue Bypass Protocols, and increasing security in Sector 3.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Anomalies Detected
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-slate-900">0 Critical</div>
            <p className="text-xs text-slate-500 mt-1">
              All 14 Mandir partitions operating within nominal capacity thresholds.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Audit Status</span>
            <span className="text-emerald-600">Compliant</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Grid (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: LineChart Devotee Footfall */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Global Devotee Footfall (Last 7 Days)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Aggregated unique darshan entries</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
              +14.2% vs last week
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={footfallData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('en-IN')} Devotees`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="footfall"
                  name="Current Week"
                  stroke="#d97706"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#d97706' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="previousWeek"
                  name="Previous Week"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: BarChart Donations vs Expenses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Donations vs Expenses (Top Mandirs)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Verified digital & treasury ledger in INR</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              Healthy Margin
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString('en-IN')}`, name]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="donations" name="Donations" fill="#d97706" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#64748b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalAnalytics;
