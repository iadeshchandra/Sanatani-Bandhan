import React, { useState } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Users,
  UtensilsCrossed,
  CheckCircle2,
  Sparkles,
  Flame,
} from 'lucide-react';

export const PredictiveCrowdForecast: React.FC = () => {
  const [sevadarsDeployed, setSevadarsDeployed] = useState(false);
  const [prasadOrdered, setPrasadOrdered] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between text-slate-100">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header Tag & Title */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Gemini 2.5 Panchang & Surge Forecast
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  Real-Time AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Panchang Tithi Engine &bull; Predictive Crowd Velocity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-mono text-amber-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Vikram Samvat 2083</span>
          </div>
        </div>

        {/* Live Intelligence Banner */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-amber-400 uppercase tracking-wider text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Nirjala Ekadashi Detected in 72 Hours
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Confidence: <strong className="text-emerald-400">96.4%</strong>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Correlating historical Tithi models and regional YatraNet corridor telemetry...{' '}
            <span className="text-amber-300 font-bold">
              Expected footfall surge: +380% (Est. 280,000 devotees)
            </span>{' '}
            across Garbhagriha Entry Corridors 1, 3, and Annapurna Dining Hall.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Peak Darshan Window</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5 block">04:30 AM &ndash; 11:30 AM</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Estimated Maha-Prasad BOM</span>
              <span className="text-xs font-mono font-bold text-amber-300 mt-0.5 block">4.2 Metric Tonnes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSevadarsDeployed(true)}
          disabled={sevadarsDeployed}
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            sevadarsDeployed
              ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40 cursor-default'
              : 'bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 shadow-md shadow-amber-500/20'
          }`}
        >
          {sevadarsDeployed ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>50 Sevadars Auto-Dispatched</span>
            </>
          ) : (
            <>
              <Users className="w-3.5 h-3.5 text-slate-900" />
              <span>Auto-Deploy 50 Extra Sevadars</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setPrasadOrdered(true)}
          disabled={prasadOrdered}
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            prasadOrdered
              ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40 cursor-default'
              : 'bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-100 border border-slate-700'
          }`}
        >
          {prasadOrdered ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>4 Tonnes BOM Dispatched to Bhandar</span>
            </>
          ) : (
            <>
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
              <span>Pre-Order 4 Tonnes Prasad BOM</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PredictiveCrowdForecast;
