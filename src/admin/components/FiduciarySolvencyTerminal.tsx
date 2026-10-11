import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Landmark,
  ShieldCheck,
  TrendingUp,
  Percent,
  Lock,
  ArrowUpRight,
  Clock,
  Globe,
} from 'lucide-react';

const SOLVENCY_DATA = [
  { month: 'Apr', expense: 1850000, corpusGrowth: 4800000 },
  { month: 'May', expense: 2100000, corpusGrowth: 5400000 },
  { month: 'Jun', expense: 1950000, corpusGrowth: 6100000 },
  { month: 'Jul', expense: 2600000, corpusGrowth: 7800000 }, // Shravan Peak
  { month: 'Aug', expense: 2400000, corpusGrowth: 8900000 },
  { month: 'Sep', expense: 2200000, corpusGrowth: 9600000 },
];

export const FiduciarySolvencyTerminal: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between text-slate-100">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Institutional Fiduciary Solvency & Corpus Lock
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Lock className="w-2.5 h-2.5" />
                  Section 11(1)(d)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Double-Entry Capital Endowment & Operational Burn Telemetry
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Solvency: AAA+
          </span>
        </div>

        {/* Sub-Metrics Band */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Stat 1: Burn Rate */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Current Burn Rate
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base font-black font-mono text-white">₹22.0L</span>
              <span className="text-[10px] text-slate-400 font-medium">/ month</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Annadanam & Staff Payroll
            </span>
          </div>

          {/* Stat 2: Operational Runway */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Operational Runway
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base font-black font-mono text-emerald-400">38.4 Months</span>
            </div>
            <span className="text-[10px] text-emerald-500/90 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Zero Solvency Risk
            </span>
          </div>

          {/* Stat 3: FCRA vs Domestic Split */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              FCRA vs Domestic Split
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base font-black font-mono text-indigo-300">14%</span>
              <span className="text-xs text-slate-400">/ 86%</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              MHA FCRA Bank Lock &bull; SBI NDMB
            </span>
          </div>
        </div>

        {/* ComposedChart: Expenses (Bar) vs Corpus Growth (Area) */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={SOLVENCY_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                }}
                formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString('en-IN')}`, name]}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="circle"
              />
              <Bar dataKey="expense" name="Operational Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={22} />
              <Area
                type="monotone"
                dataKey="corpusGrowth"
                name="Perpetual Corpus Lock"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#corpusGrad)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Form 10BD Statutory Reconciliation: Synced</span>
        <span className="text-emerald-400 font-bold">100% Tax Compliant</span>
      </div>
    </div>
  );
};

export default FiduciarySolvencyTerminal;
