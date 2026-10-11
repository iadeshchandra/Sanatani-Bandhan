import React, { useState, useEffect } from 'react';
import {
  Activity,
  Wifi,
  Radio,
  Server,
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface TickerFeedItem {
  id: string;
  type: 'drop' | 'gate' | 'system' | 'audit';
  text: string;
  badge?: string;
  highlight?: boolean;
}

const STREAM_ITEMS: TickerFeedItem[] = [
  { id: '1', type: 'system', text: 'P99 API Latency: 24ms (ap-south-1)', badge: 'FAST' },
  { id: '2', type: 'system', text: 'Multi-Tenant Firestore Isolation: 100% Nominal', badge: 'SECURE' },
  { id: '3', type: 'drop', text: 'Live Hundi: ₹5,100 Annapurna Bhandar (4s ago)', highlight: true },
  { id: '4', type: 'drop', text: 'Live Hundi: ₹21,000 Somnath Swarna Daan (18s ago)', highlight: true },
  { id: '5', type: 'gate', text: 'Gate 4 Ingress: 480 pilgrims/min (Near Capacity Threshold)', badge: 'MONITOR' },
  { id: '6', type: 'audit', text: 'Kashi Vishwanath Double-Entry Ledger: Auto-Reconciled', badge: '80G SYNC' },
  { id: '7', type: 'drop', text: 'Live UPI QR: ₹1,008 Maha Rudrabhishek Booking (32s ago)' },
  { id: '8', type: 'gate', text: 'Corridor 2 Queue Velocity: 14 mins avg darshan wait', badge: 'FLOW NORMAL' },
];

export const ExecutiveLiveTicker: React.FC = () => {
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveItemIndex((prev) => (prev + 1) % STREAM_ITEMS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 sm:px-4 shadow-lg text-slate-200 overflow-hidden relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left Status Tag */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-tight">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>LIVE TELEMETRY STREAM</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span>P99 API: <strong>24ms</strong></span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3.5 h-3.5" />
              <span>DB Sync: <strong>Nominal</strong></span>
            </span>
          </div>
        </div>

        {/* Central Marquee / Active Highlight */}
        <div className="flex-1 overflow-hidden px-2 text-xs font-mono">
          <div className="flex items-center gap-2 transition-all duration-300">
            <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-slate-400 hidden lg:inline">FEED:</span>
            <span
              key={activeItemIndex}
              className={`truncate font-semibold ${
                STREAM_ITEMS[activeItemIndex].highlight
                  ? 'text-amber-300 font-bold'
                  : 'text-slate-100'
              }`}
            >
              {STREAM_ITEMS[activeItemIndex].text}
            </span>
            {STREAM_ITEMS[activeItemIndex].badge && (
              <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700 font-sans font-bold">
                {STREAM_ITEMS[activeItemIndex].badge}
              </span>
            )}
          </div>
        </div>

        {/* Right Status */}
        <div className="hidden xl:flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Cluster: ap-south-1
          </span>
          <span className="text-emerald-400 font-bold">● 100% Uptime</span>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveLiveTicker;
