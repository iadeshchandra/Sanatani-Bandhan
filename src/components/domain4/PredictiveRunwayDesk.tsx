import React, { useState } from 'react';
import {
  Calendar,
  TrendingDown,
  ShoppingCart,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  Package,
  Flame,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface RunwayItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  dailyBurnRate: number;
  runwayDays: number;
  status: 'critical' | 'warning' | 'optimal';
  festivalDemand: string;
  preferredVendor: string;
}

const CRITICAL_INGREDIENTS: RunwayItem[] = [
  {
    id: 'ing-1',
    name: 'Shuddha Desi Cow Ghee (A2)',
    category: 'Sacred Dairy & Fats',
    currentStock: 95,
    unit: 'L',
    dailyBurnRate: 45,
    runwayDays: 2.1,
    status: 'critical',
    festivalDemand: '480L required on Vaikuntha Ekadashi',
    preferredVendor: 'Surabhi Gaushala Trust',
  },
  {
    id: 'ing-2',
    name: 'Basmati Gobindobhog Rice',
    category: 'Grains & Cereals',
    currentStock: 2200,
    unit: 'kg',
    dailyBurnRate: 148,
    runwayDays: 14.8,
    status: 'optimal',
    festivalDemand: '1,800kg required over 3 days',
    preferredVendor: 'Bhandari Agro Mills',
  },
  {
    id: 'ing-3',
    name: 'Premium Gram Flour (Besan)',
    category: 'Flours & Grains',
    currentStock: 340,
    unit: 'kg',
    dailyBurnRate: 85,
    runwayDays: 4.0,
    status: 'warning',
    festivalDemand: '600kg required for 10k Ladoo Prasadam',
    preferredVendor: 'Annapurna Grain Depot',
  },
  {
    id: 'ing-4',
    name: 'Khandsari Desi Sugar (Bura)',
    category: 'Sweeteners',
    currentStock: 480,
    unit: 'kg',
    dailyBurnRate: 52,
    runwayDays: 9.2,
    status: 'optimal',
    festivalDemand: '500kg required for festival sweets',
    preferredVendor: 'Vedic Sugar Traders',
  },
  {
    id: 'ing-5',
    name: 'Green Cardamom (Elaichi - 8mm)',
    category: 'Spices & Herbs',
    currentStock: 6.5,
    unit: 'kg',
    dailyBurnRate: 1.8,
    runwayDays: 3.6,
    status: 'warning',
    festivalDemand: '12kg needed for Abhishek & Sweets',
    preferredVendor: 'Idukki Spices Cooperative',
  },
  {
    id: 'ing-6',
    name: 'Kashmiri Mogra Saffron (Kesar)',
    category: 'Sacred Offerings',
    currentStock: 120,
    unit: 'grams',
    dailyBurnRate: 15,
    runwayDays: 8.0,
    status: 'optimal',
    festivalDemand: '150g for Deity snanam & Bhog',
    preferredVendor: 'Pampore Kesar Federation',
  },
];

export const PredictiveRunwayDesk: React.FC = () => {
  const { showToast } = useToast();
  const [poDrafted, setPoDrafted] = useState(false);

  const handleDraftAutoPO = () => {
    setPoDrafted(true);
    showToast(
      'Automated PO #PO-VAIKUNTHA-2026-01 generated: 400L Shuddha Desi Ghee requisitioned to Surabhi Gaushala Trust at ₹620/L.',
      'success',
      'Procurement Engine'
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* UI Section 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
              <BrainCircuit className="w-3 h-3" />
              <span>Vedic Panchang Predictive Analytics</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Algorithm: Shastric Consumption Horizon (SCH-v4)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-8 h-8 text-amber-600" />
            <span>Panchang Consumption Horizon Radar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Predictive stock burn-rate forecasting synchronized with Hindu lunar Tithis, temple festival footfalls, and supply chain lead times.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Current Tithi: Shukla Saptami</span>
          </span>
        </div>
      </div>

      {/* UI Section 2 & 3: High-Impact AI Alert Banner & Action Button */}
      <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-r from-rose-950 via-slate-900 to-rose-950 border-2 border-rose-500/50 shadow-2xl relative overflow-hidden text-rose-100">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  CRITICAL DEFICIT IMMINENT
                </span>
                <span className="text-xs text-rose-300 font-mono">
                  Horizon Window: 96 Hours
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                ⚠️ Vaikuntha Ekadashi in 4 Days (85,000 Devotees) &bull; Projected Ghee Deficit: -385L
              </h2>
              <p className="text-xs sm:text-sm text-rose-200/80 mt-1 max-w-2xl font-sans leading-relaxed">
                Current stock of <strong>95 Liters</strong> provides only <strong>2.1 days of runway</strong>. Mega-Kitchen Annadanam and Sanctum Aarti require 480 Liters during the sacred Ekadashi fast break. Stockout will occur within 36 hours without urgent procurement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDraftAutoPO}
              disabled={poDrafted}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all active:scale-98 cursor-pointer flex items-center gap-2 ${
                poDrafted
                  ? 'bg-rose-900/60 text-rose-200 border border-rose-500/40 cursor-default'
                  : 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/30'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{poDrafted ? 'Auto-PO #PO-9810 Drafted ✓' : 'Draft Auto-PO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* UI Section 4: Critical Ingredients Runway Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Ingredient Consumption & Runway Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live burn rates calibrated against daily sanctum footfalls and festival meal schedules.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
            Updated 5 mins ago
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Raw Material / Item</th>
                <th className="py-3.5 px-4">Current Godown Stock</th>
                <th className="py-3.5 px-4">Daily Burn Rate</th>
                <th className="py-3.5 px-4">Runway (Days)</th>
                <th className="py-3.5 px-4">Upcoming Festival Surge</th>
                <th className="py-3.5 px-5 text-right">Preferred Vendor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {CRITICAL_INGREDIENTS.map((item) => {
                const isCritical = item.status === 'critical';
                const isWarning = item.status === 'warning';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isCritical
                        ? 'bg-rose-50/60 hover:bg-rose-50'
                        : isWarning
                        ? 'bg-amber-50/30 hover:bg-amber-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {item.name}
                        {isCritical && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-rose-100 text-rose-700 border border-rose-300">
                            CRITICAL
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-800">
                      {item.currentStock.toLocaleString('en-IN')} {item.unit}
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-600">
                      {item.dailyBurnRate} {item.unit} / day
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl font-mono text-xs font-black ${
                          isCritical
                            ? 'bg-rose-500 text-white shadow-xs'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {item.runwayDays} Days
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs font-mono text-slate-600">
                      {item.festivalDemand}
                    </td>

                    <td className="py-4 px-5 text-right font-mono text-xs font-semibold text-slate-600">
                      {item.preferredVendor}
                    </td>
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

export default PredictiveRunwayDesk;
