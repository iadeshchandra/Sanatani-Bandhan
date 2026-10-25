/**
 * ExecutiveLiveTicker — GodMode dashboard ticker.
 * World-Readiness B4 (G-M4): this feed is ILLUSTRATIVE SAMPLE DATA —
 * it was previously labelled as a live telemetry stream over invented
 * amounts, pilgrim counts and latencies, which an owner could mistake
 * for real platform telemetry. Every label now says what it is: a
 * sample feed showing the SHAPE of events, never live figures. Wire a
 * real telemetry source before any label may claim "live" again.
 */
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
  { id: '1', type: 'system', text: 'Sample: P99 API latency reading (illustrative)', badge: 'FAST' },
  { id: '2', type: 'system', text: 'Sample: multi-tenant isolation check (illustrative)', badge: 'SECURE' },
  { id: '3', type: 'drop', text: 'Sample hundi entry: ₹5,100 — Annapurna Bhandar', highlight: true },
  { id: '4', type: 'drop', text: 'Sample hundi entry: ₹21,000 — Somnath Swarna Daan', highlight: true },
  { id: '5', type: 'gate', text: 'Sample gate reading: 480 pilgrims/min at Gate 4', badge: 'MONITOR' },
  { id: '6', type: 'audit', text: 'Sample: Kashi Vishwanath double-entry ledger auto-reconciled', badge: '80G SYNC' },
  { id: '7', type: 'drop', text: 'Sample UPI booking: ₹1,008 — Maha Rudrabhishek' },
  { id: '8', type: 'gate', text: 'Sample queue reading: 14 min average darshan wait, Corridor 2', badge: 'FLOW NORMAL' },
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
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-tight">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>SAMPLE FEED · ILLUSTRATIVE DATA</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span>P99 API: <strong>sample</strong></span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Wifi className="w-3.5 h-3.5" />
              <span>DB Sync: <strong>sample</strong></span>
            </span>
          </div>
        </div>

        {/* Central Marquee / Active Highlight */}
        <div className="flex-1 overflow-hidden px-2 text-xs font-mono">
          <div className="flex items-center gap-2 transition-all duration-300">
            <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-slate-400 hidden lg:inline">SAMPLE:</span>
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
            Feed: sample data
          </span>
          <span className="text-amber-400 font-bold">● Demo workspace</span>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveLiveTicker;
