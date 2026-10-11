import React, { useState } from 'react';
import {
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  ShieldCheck,
  Scale,
  RefreshCw,
  Coins,
  ArrowRight,
  Landmark,
  Eye,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

type DenominationKey = '500' | '200' | '100' | '50' | '20' | '10';

const DENOMINATIONS: { key: DenominationKey; label: string; multiplier: number }[] = [
  { key: '500', label: '₹500 Notes', multiplier: 500 },
  { key: '200', label: '₹200 Notes', multiplier: 200 },
  { key: '100', label: '₹100 Notes', multiplier: 100 },
  { key: '50', label: '₹50 Notes', multiplier: 50 },
  { key: '20', label: '₹20 Notes', multiplier: 20 },
  { key: '10', label: '₹10 Notes', multiplier: 10 },
];

type DenominationCounts = Record<DenominationKey, number>;

const INITIAL_COUNTS: DenominationCounts = {
  '500': 0,
  '200': 0,
  '100': 0,
  '50': 0,
  '20': 0,
  '10': 0,
};

export const BlindHundiAuditDesk: React.FC = () => {
  const { showToast } = useToast();

  const [counterAData, setCounterAData] = useState<DenominationCounts>({
    '500': 420,
    '200': 150,
    '100': 600,
    '50': 240,
    '20': 500,
    '10': 1000,
  });

  const [counterBData, setCounterBData] = useState<DenominationCounts>({
    '500': 420,
    '200': 150,
    '100': 600,
    '50': 240,
    '20': 500,
    '10': 1000,
  });

  const [isALocked, setIsALocked] = useState(false);
  const [isBLocked, setIsBLocked] = useState(false);
  const [isPosted, setIsPosted] = useState(false);

  const calculateTotal = (data: DenominationCounts) => {
    return DENOMINATIONS.reduce((sum, denom) => {
      return sum + (data[denom.key] || 0) * denom.multiplier;
    }, 0);
  };

  const handleUpdateA = (denom: DenominationKey, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setCounterAData((prev) => ({ ...prev, [denom]: num }));
  };

  const handleUpdateB = (denom: DenominationKey, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setCounterBData((prev) => ({ ...prev, [denom]: num }));
  };

  const handleUnlockRecount = () => {
    setIsALocked(false);
    setIsBLocked(false);
    setIsPosted(false);
    showToast('Dual-Blind counts unlocked for physical re-verification.', 'info', 'Hundi Audit');
  };

  const handlePostToLedger = () => {
    setIsPosted(true);
    showToast(
      `Dual-authenticated Hundi count of ₹${calculateTotal(counterAData).toLocaleString('en-IN')} posted to General Trust Fund.`,
      'success',
      'Treasury Ledger'
    );
  };

  // Variance calculation when both are locked
  const bothLocked = isALocked && isBLocked;
  const variances: {
    denom: (typeof DENOMINATIONS)[0];
    countA: number;
    countB: number;
    diff: number;
    cashDiff: number;
  }[] = [];

  if (bothLocked) {
    DENOMINATIONS.forEach((denom) => {
      const a = counterAData[denom.key] || 0;
      const b = counterBData[denom.key] || 0;
      if (a !== b) {
        variances.push({
          denom,
          countA: a,
          countB: b,
          diff: b - a,
          cashDiff: (b - a) * denom.multiplier,
        });
      }
    });
  }

  const hasVariance = bothLocked && variances.length > 0;
  const isPerfectMatch = bothLocked && variances.length === 0;
  const totalAmount = calculateTotal(counterAData);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* UI Section 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
              <EyeOff className="w-3 h-3" />
              <span>Anti-Collusion Maker-Checker Protocol</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Audit Session: HND-VAR-2026-09B &bull; Box: Golak-Main-Sanctum
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Scale className="w-8 h-8 text-amber-600" />
            <span>Dual-Blind Hundi Physical Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Independent parallel counting terminals for Sevadar Maker and Trustee Checker with automated zero-variance reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bothLocked && (
            <button
              type="button"
              onClick={handleUnlockRecount}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Unlock & Recount</span>
            </button>
          )}
        </div>
      </div>

      {/* UI Section 2: Split View (Counter A vs Counter B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COUNTER A (MAKER 1) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                  A
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Counter A (Maker 1)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">Sevadar Terminal ID: SEV-014</p>
                </div>
              </div>

              {isALocked ? (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Lock className="w-3 h-3 text-amber-600" />
                  Locked & Blinded
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-600">
                  <Unlock className="w-3 h-3 text-slate-400" />
                  Active Input
                </span>
              )}
            </div>

            {isALocked ? (
              <div className="py-14 text-center space-y-3 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                  <EyeOff className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Counter A Input Concealed
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Tally submitted and cryptographically blinded to prevent influencing Counter B.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {DENOMINATIONS.map((denom) => {
                  const count = counterAData[denom.key] || 0;
                  const subtotal = count * denom.multiplier;
                  return (
                    <div
                      key={denom.key}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-400/60 transition-colors"
                    >
                      <div className="w-28">
                        <span className="text-xs font-black text-slate-800 block">
                          {denom.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Multiplier: &times;{denom.multiplier}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={counterAData[denom.key] || ''}
                            onChange={(e) => handleUpdateA(denom.key, e.target.value)}
                            placeholder="0"
                            className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-right font-mono font-bold text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-xs text-slate-400 font-mono">pcs</span>
                        </div>
                        <div className="w-24 text-right">
                          <span className="text-xs font-mono font-black text-slate-700">
                            ₹{subtotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              {isALocked ? 'Total Hidden' : `Subtotal: ₹${calculateTotal(counterAData).toLocaleString('en-IN')}`}
            </span>
            {!isALocked && (
              <button
                type="button"
                onClick={() => {
                  setIsALocked(true);
                  showToast('Counter A (Maker 1) count locked and blinded.', 'info', 'Hundi Audit');
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock & Submit Counter A</span>
              </button>
            )}
          </div>
        </div>

        {/* COUNTER B (CHECKER 2) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold">
                  B
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Counter B (Checker 2)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">Trustee Terminal ID: TRU-003</p>
                </div>
              </div>

              {isBLocked ? (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  Locked & Blinded
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-600">
                  <Unlock className="w-3 h-3 text-slate-400" />
                  Active Input
                </span>
              )}
            </div>

            {isBLocked ? (
              <div className="py-14 text-center space-y-3 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-xs">
                  <EyeOff className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Counter B Input Concealed
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Tally submitted and cryptographically blinded to prevent influencing Counter A.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {DENOMINATIONS.map((denom) => {
                  const count = counterBData[denom.key] || 0;
                  const subtotal = count * denom.multiplier;
                  return (
                    <div
                      key={denom.key}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-400/60 transition-colors"
                    >
                      <div className="w-28">
                        <span className="text-xs font-black text-slate-800 block">
                          {denom.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Multiplier: &times;{denom.multiplier}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={counterBData[denom.key] || ''}
                            onChange={(e) => handleUpdateB(denom.key, e.target.value)}
                            placeholder="0"
                            className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-right font-mono font-bold text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-xs text-slate-400 font-mono">pcs</span>
                        </div>
                        <div className="w-24 text-right">
                          <span className="text-xs font-mono font-black text-slate-700">
                            ₹{subtotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              {isBLocked ? 'Total Hidden' : `Subtotal: ₹${calculateTotal(counterBData).toLocaleString('en-IN')}`}
            </span>
            {!isBLocked && (
              <button
                type="button"
                onClick={() => {
                  setIsBLocked(true);
                  showToast('Counter B (Checker 2) count locked and blinded.', 'info', 'Hundi Audit');
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock & Submit Counter B</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* UI Section 3: Variance Radar & Reconciliation Engine */}
      <div className="pt-2">
        {!bothLocked ? (
          <div className="p-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Awaiting Dual-Blind Submission
            </h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 font-sans">
              Both Counter A (Maker) and Counter B (Checker) must independently lock their physical counts. The automated reconciliation engine will cross-compare inputs bundle-by-bundle once both sides submit.
            </p>
          </div>
        ) : isPerfectMatch ? (
          /* Case 1: Perfect Match */
          <div className="p-6 sm:p-7 rounded-3xl bg-emerald-950 border border-emerald-500/40 text-emerald-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                      ZERO VARIANCE CONFIRMED
                    </span>
                    <span className="text-xs text-emerald-400 font-mono">100% Matching Tally</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                    ₹{totalAmount.toLocaleString('en-IN')} Verified
                  </h2>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    Both Counter A and Counter B inputs matched with zero denomination discrepancy. Ready for ledger entry.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePostToLedger}
                  disabled={isPosted}
                  className={`px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all active:scale-98 cursor-pointer flex items-center gap-2 ${
                    isPosted
                      ? 'bg-emerald-800/60 text-emerald-200 cursor-default border border-emerald-500/30'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span>{isPosted ? 'Posted to Treasury Ledger ✓' : 'Post to Treasury General Ledger'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Case 2: Variance Detected */
          <div className="p-6 sm:p-7 rounded-3xl bg-rose-950 border border-rose-500/40 text-rose-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-rose-500/30 text-rose-300 border border-rose-500/40">
                      DISCREPANCY FLAGGED
                    </span>
                    <span className="text-xs text-rose-300 font-mono">
                      {variances.length} Denomination Mismatch(es)
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight mt-1">
                    Variance Detected in Dual-Blind Physical Count
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUnlockRecount}
                className="px-4 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-white font-bold text-xs border border-rose-400/40 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock & Recount</span>
              </button>
            </div>

            {/* Detailed Variance Table */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/30 space-y-2 font-mono text-xs">
              {variances.map((v) => (
                <div
                  key={v.denom.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/20 text-slate-200"
                >
                  <span className="font-bold text-rose-300">
                    ⚠️ Variance in {v.denom.label}:
                  </span>
                  <div className="flex items-center gap-3 text-slate-300 mt-1 sm:mt-0">
                    <span>Counter A: <strong>{v.countA}</strong></span>
                    <span>&bull;</span>
                    <span>Counter B: <strong>{v.countB}</strong></span>
                    <span>&bull;</span>
                    <span className="text-rose-400 font-bold">
                      Discrepancy: {v.diff > 0 ? `+${v.diff}` : v.diff} Note(s) ({v.cashDiff > 0 ? `+₹${v.cashDiff}` : `-₹${Math.abs(v.cashDiff)}`})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-rose-300/80 mt-3 font-sans">
              Ledger posting is automatically locked under Section 11 internal controls. Trustee supervisor must review the physical bundle count with CCTV verification before unlocking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlindHundiAuditDesk;
