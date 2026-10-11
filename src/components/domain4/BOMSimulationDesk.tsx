import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Zap,
  Database,
  CheckCircle2,
  AlertTriangle,
  ChefHat,
  Flame,
  Sparkles,
  RefreshCw,
  Scale,
  ArrowRight,
  TrendingDown,
  Layers,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface MockIngredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  startStock: number;
  deductRatio: number; // per 10,000 portions
  safetyThreshold: number;
  location: string;
}

const RECIPE_INGREDIENTS: MockIngredient[] = [
  {
    id: 'mat-rice',
    name: 'Basmati Gobindobhog Rice',
    category: 'Grains & Cereals',
    unit: 'kg',
    startStock: 1500,
    deductRatio: 1350, // 1,350 kg for 10k portions
    safetyThreshold: 100,
    location: 'Central Godown (Mukhya Bhandar) - Pallet A2',
  },
  {
    id: 'mat-dal',
    name: 'Yellow Moong Dal (Dhuli)',
    category: 'Pulses',
    unit: 'kg',
    startStock: 900,
    deductRatio: 720, // 720 kg for 10k portions
    safetyThreshold: 150,
    location: 'Central Godown (Mukhya Bhandar) - Pallet B1',
  },
  {
    id: 'mat-ghee',
    name: 'Shuddha Desi Cow Ghee (A2)',
    category: 'Dairy & Sacred Fats',
    unit: 'L',
    startStock: 250,
    deductRatio: 225, // 225 L for 10k portions -> leaves 25L (below threshold 50)
    safetyThreshold: 50,
    location: 'Sanctum Sattvic Decanter Store - Tank 01',
  },
  {
    id: 'mat-spices',
    name: 'Himalayan Rock Salt & Jeera Cumin Blend',
    category: 'Spices & Seasoning',
    unit: 'kg',
    startStock: 180,
    deductRatio: 90, // 90 kg for 10k portions
    safetyThreshold: 30,
    location: 'Kitchen Pakshala Ready Rack',
  },
];

export const BOMSimulationDesk: React.FC = () => {
  const { showToast } = useToast();

  const [recipeName, setRecipeName] = useState('Maha Annadanam Khichdi & Halwa');
  const [portionCount, setPortionCount] = useState<number>(10000);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationComplete, setSimulationComplete] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);

  // Scaled calculations based on portionCount (base 10,000)
  const scale = portionCount / 10000;
  const costPerPortion = 14.25;
  const totalCost = Math.round(portionCount * costPerPortion);

  // Animate simulation progress
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating) {
      setSimulationProgress(0);
      setSimulationComplete(false);
      const interval = setInterval(() => {
        setSimulationProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 150);

      timer = setTimeout(() => {
        setIsSimulating(false);
        setSimulationComplete(true);
        clearInterval(interval);
        setSimulationProgress(100);
        showToast(
          `Kinetic deduction verified: Stock debited for ${portionCount.toLocaleString('en-IN')} portions of ${recipeName}.`,
          'success',
          'BOM Ledger'
        );
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isSimulating, portionCount, recipeName, showToast]);

  const handleTriggerDeduction = () => {
    if (isSimulating) return;
    setIsSimulating(true);
  };

  const handleResetSimulation = () => {
    setIsSimulating(false);
    setSimulationComplete(false);
    setSimulationProgress(0);
    showToast('BOM kinetic simulator reset to initial warehouse inventory.', 'info', 'Smart Bhandar');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* UI Section 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-amber-500" />
              <span>Real-Time Warehouse Depletion Engine</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Terminal: BHANDAR-MEGA-BOM-01 &bull; Mode: High-Volume Industrial
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-8 h-8 text-amber-600" />
            <span>Live BOM Deduction & Kinetic Dispatch Terminal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time interactive Bill of Materials (BOM) simulator calculating mass ingredient draw, portion unit economics, and safety buffers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {simulationComplete && (
            <button
              type="button"
              onClick={handleResetSimulation}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Warehouse Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* UI Section 2: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* UI Section 3: Left Pane - Controls */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-amber-600" />
                Production Batch Parameters
              </span>
              <span className="text-xs font-mono font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Industrial Scale
              </span>
            </div>

            {/* Recipe Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Sacred Recipe / Prasadam BOM
              </label>
              <select
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                disabled={isSimulating}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              >
                <option value="Maha Annadanam Khichdi & Halwa">
                  Maha Annadanam Khichdi & Halwa (Gobindobhog Rice & Ghee)
                </option>
                <option value="Shree Mahaprasad Besan Ladoo">
                  Shree Mahaprasad Besan Ladoo (Tirupati & Kashi Style)
                </option>
                <option value="Panchamrit Abhishek Prasad">
                  Panchamrit Abhishek Prasad (Sanctum Deity Snanam)
                </option>
              </select>
            </div>

            {/* Target Portion Count with Slider & Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Target Devotee Portions
                </label>
                <span className="text-xs font-mono font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                  {portionCount.toLocaleString('en-IN')} Meals
                </span>
              </div>

              <input
                type="range"
                min="1000"
                max="25000"
                step="500"
                value={portionCount}
                disabled={isSimulating}
                onChange={(e) => setPortionCount(parseInt(e.target.value, 10))}
                className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>1,000 (Small Aarti)</span>
                <span>10,000 (Standard)</span>
                <span>25,000 (Mahotsav)</span>
              </div>
            </div>

            {/* Financial Telemetry Display */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
                <span>UNIT COST TELEMETRY</span>
                <span className="text-emerald-400 font-bold">₹14.25 / portion</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total Estimated Batch Cost
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white font-mono">
                    ₹{totalCost.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Earmarked Fund
                  </span>
                  <span className="text-xs font-bold text-amber-400">
                    Annadanam Trust
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trigger Button */}
          <div className="pt-6">
            <button
              type="button"
              onClick={handleTriggerDeduction}
              disabled={isSimulating}
              className={`w-full py-4 sm:py-4.5 rounded-2xl font-black text-sm sm:text-base shadow-xl transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2.5 ${
                isSimulating
                  ? 'bg-amber-600/60 text-white cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/25'
              }`}
            >
              <Zap className={`w-5 h-5 ${isSimulating ? 'animate-bounce text-white' : 'text-slate-950 fill-slate-950'}`} />
              <span>
                {isSimulating
                  ? `Simulating Kitchen Draw (${simulationProgress}%)...`
                  : 'TRIGGER KINETIC PRODUCTION DEDUCTION'}
              </span>
            </button>
          </div>
        </div>

        {/* UI Section 4: Right Pane - Kinetic Depletion Ledger */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between text-slate-100 relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                Live Warehouse Depletion Ledger
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                {isSimulating ? (
                  <span className="text-amber-400 font-bold animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Decanting Ingredients...
                  </span>
                ) : simulationComplete ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Batch Dispatched to Pakshala
                  </span>
                ) : (
                  <span>Ready for Batch Run</span>
                )}
              </span>
            </div>

            {/* Ingredients Progress Waterfall */}
            <div className="space-y-4">
              {RECIPE_INGREDIENTS.map((ing) => {
                const deductAmt = Math.round(ing.deductRatio * scale);
                const isGhee = ing.id === 'mat-ghee';
                
                // Final balance
                const endStock = Math.max(0, ing.startStock - deductAmt);
                
                // Dynamic current value during animation
                let currentVisualStock = ing.startStock;
                if (isSimulating) {
                  currentVisualStock = Math.round(ing.startStock - (deductAmt * (simulationProgress / 100)));
                } else if (simulationComplete) {
                  currentVisualStock = endStock;
                }

                // Progress percentage
                const initialPercent = 100;
                const finalPercent = Math.max(8, Math.round((currentVisualStock / ing.startStock) * 100));
                const isUnderThreshold = currentVisualStock <= ing.safetyThreshold;

                return (
                  <div
                    key={ing.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white tracking-tight">
                            {ing.name}
                          </h4>
                          {isUnderThreshold && (simulationComplete || isSimulating) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              LOW STOCK
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {ing.location}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {currentVisualStock.toLocaleString('en-IN')} {ing.unit}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          Safety: {ing.safetyThreshold} {ing.unit}
                        </span>
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative shadow-inner">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isUnderThreshold && (simulationComplete || isSimulating)
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                            : isGhee
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                            : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        }`}
                        style={{ width: `${finalPercent}%` }}
                      />
                    </div>

                    {/* The Arithmetic Display: 1,500kg - 1,350kg = 150kg */}
                    <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">
                        {ing.startStock.toLocaleString('en-IN')}{ing.unit} &minus; {deductAmt.toLocaleString('en-IN')}{ing.unit}
                      </span>
                      <span className={`font-black ${isUnderThreshold && (simulationComplete || isSimulating) ? 'text-rose-400' : 'text-emerald-400'}`}>
                        = {endStock.toLocaleString('en-IN')} {ing.unit} remaining
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Decantation Seal: APPROVED &bull; Batch Token: #BOM-2026-9810</span>
            </span>
            <span className="text-slate-500">
              Auto-Sync: Central Mandir Godown
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMSimulationDesk;
