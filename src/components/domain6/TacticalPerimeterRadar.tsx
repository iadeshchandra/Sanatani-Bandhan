import React, { useState } from 'react';
import {
  Map,
  ShieldAlert,
  Lock,
  Unlock,
  Wifi,
  Siren,
  PowerOff,
  Users,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Eye,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';

export const TacticalPerimeterRadar: React.FC = () => {
  const { showToast } = useToast();
  const { currentRole } = useAuthWorkspace();
  const [isLockdownActive, setIsLockdownActive] = useState<boolean>(false);
  const [csoPinInput, setCsoPinInput] = useState<string>('');
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<string>('corridor-alpha');

  const handleInitiateLockdown = () => {
    setIsLockdownActive(true);
    showToast(
      '🚨 EMERGENCY PERIMETER LOCKDOWN ENGAGED: All digital turnstiles locked. Tatkal ticket issuance suspended across all kiosks.',
      'error',
      'Crisis Command'
    );
  };

  const handleDisengageLockdown = () => {
    if (csoPinInput !== '9999' && csoPinInput !== '1234' && csoPinInput.length < 4) {
      showToast('Invalid CSO Authentication PIN. Authorized security clearance required.', 'error', 'Security Barrier');
      return;
    }

    setIsLockdownActive(false);
    setCsoPinInput('');
    setShowPinModal(false);
    showToast('Perimeter Lockdown Disengaged. Digital turnstiles and kiosk ticketing restored to Normal Operations.', 'success', 'Perimeter Restored');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* UI Section 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center gap-1">
              <Siren className="w-3 h-3 text-rose-500 animate-pulse" />
              <span>YatraNet Tactical Perimeter Defense</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              CSO Station: COMMAND-ALPHA-01 &bull; Perimeter Grid: 20-Acre Mandir Core
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-600" />
            <span>Tactical Perimeter Radar & Crisis Command</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live choke-point velocity radar, physical architectural nodes, and authoritative God-Mode perimeter turnstile override.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-600 shadow-xs">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>Mesh Meshnet: 16 Nodes Active</span>
          </span>
        </div>
      </div>

      {/* UI Section 2: The Emergency Perimeter Lockdown Switch */}
      {currentRole === 'SuperAdmin' ? (
        !isLockdownActive ? (
          <div className="p-6 rounded-3xl bg-emerald-950 border-2 border-emerald-500/40 text-emerald-100 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-emerald-500/30 text-emerald-300">
                    PERIMETER SECURE
                  </span>
                  <span className="text-xs font-mono text-emerald-400">All Turnstiles In Safe Flow</span>
                </div>
                <h3 className="text-xl font-black text-white mt-1">
                  Normal Ingress &amp; Egress Active (24,800 Devotees Inside)
                </h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Tatkal Pass Desks: Online &bull; Turnstiles: Directional &bull; Emergency Exits: Primed
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInitiateLockdown}
              className="px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-xl shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2.5 shrink-0"
            >
              <PowerOff className="w-4 h-4" />
              <span>INITIATE EMERGENCY PERIMETER LOCKDOWN</span>
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-7 rounded-3xl bg-rose-950 border-2 border-rose-500/80 text-rose-100 shadow-2xl animate-pulse space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/30 text-rose-300 border border-rose-500/60 flex items-center justify-center shrink-0 shadow-lg">
                  <Siren className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-black uppercase bg-rose-500 text-slate-950 animate-bounce">
                      PERIMETER LOCKDOWN ACTIVE
                    </span>
                    <span className="text-xs font-mono text-rose-300">RED ALERT LEVEL 4</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                    LOCKDOWN ACTIVE: ALL TURNSTILES FROZEN. TICKETING HALTED.
                  </h2>
                  <p className="text-xs sm:text-sm text-rose-200 mt-1 max-w-2xl font-sans">
                    Inward digital gates sealed. Emergency egress routes forced open. Live Darshan queues held in outer staging pens.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 active:scale-98 text-rose-950 font-black text-xs sm:text-sm shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <Unlock className="w-4 h-4 text-rose-700" />
                <span>DISENGAGE LOCKDOWN</span>
              </button>
            </div>

            {/* CSO PIN Verification Popover / Inline */}
            {showPinModal && (
              <div className="p-5 rounded-2xl bg-slate-950/90 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-200">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold">
                    Enter Chief Security Officer (CSO) Authorization PIN:
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={csoPinInput}
                    onChange={(e) => setCsoPinInput(e.target.value)}
                    placeholder="PIN (9999)"
                    className="w-28 px-3 py-2 bg-slate-900 border border-rose-500/40 rounded-xl text-center font-mono font-black text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleDisengageLockdown}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Verify &amp; Unlock
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="p-6 rounded-3xl bg-slate-100 border border-slate-300 text-slate-500 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-slate-400 shrink-0" />
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-600">
              ⚠️ Emergency Perimeter Lockdown Authority Restricted to Chief Security Command (CSO Override).
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg text-slate-600 font-bold shrink-0">
            CSO Override Clearance Required
          </span>
        </div>
      )}

      {/* UI Section 3: The Vector Radar Map */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Map className="w-4 h-4 text-amber-400" />
              Temple Micro-Perimeter Vector Blueprint
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time crowd velocity, queue density sensor nodes, and emergency exit chutes.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal Flow (&lt;50/min)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Heavy Density (50-90/min)
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Choke Point (&gt;90/min)
            </span>
          </div>
        </div>

        {/* Tactical Schematic Blueprint Canvas */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-8 relative min-h-[380px] flex flex-col justify-between">
          {/* Outer Perimeter Ring: Gates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Gate 1 */}
            <div
              onClick={() => setSelectedNode('gate-1')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedNode === 'gate-1'
                  ? 'border-emerald-400 bg-emerald-950/40'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="font-bold text-slate-300">GATE 1 (EAST GOPURAM)</span>
                <span className="text-emerald-400 font-bold">42/min</span>
              </div>
              <p className="text-[11px] text-slate-400">General Darshan Ingress &bull; Turnstiles 1-4</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                🟢 Fluid Flow
              </span>
            </div>

            {/* Gate 2 Sugam - The Choke Point Node */}
            <div
              onClick={() => setSelectedNode('gate-2')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                selectedNode === 'gate-2'
                  ? 'border-rose-500 bg-rose-950/60 shadow-lg shadow-rose-500/20'
                  : 'border-rose-500/60 bg-rose-950/30 hover:border-rose-400'
              }`}
            >
              <div className="absolute top-2 right-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping inline-block" />
              </div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="font-bold text-rose-300">GATE 2 (VIP & SUGAM)</span>
                <span className="text-rose-400 font-black animate-pulse">138/min</span>
              </div>
              <p className="text-[11px] text-slate-300">Tatkal & Special Pass Entry &bull; Turnstiles 5-8</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white animate-pulse">
                ⚠️ CRITICAL CHOKE POINT
              </span>
            </div>

            {/* Gate 3 Logistics */}
            <div
              onClick={() => setSelectedNode('gate-3')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedNode === 'gate-3'
                  ? 'border-emerald-400 bg-emerald-950/40'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="font-bold text-slate-300">GATE 3 (BHANDAR LOGISTICS)</span>
                <span className="text-emerald-400 font-bold">12/min</span>
              </div>
              <p className="text-[11px] text-slate-400">Prasadam Rations & Kitchen Supply</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                🟢 Operational
              </span>
            </div>
          </div>

          {/* Intermediate Corridors & Connecting Lines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Corridor Alpha - Pulsing Alert Node */}
            <div
              onClick={() => setSelectedNode('corridor-alpha')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedNode === 'corridor-alpha'
                  ? 'border-amber-400 bg-amber-950/50 shadow-md shadow-amber-500/20'
                  : 'border-amber-500/60 bg-amber-950/20 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="font-black text-amber-300">CORRIDOR ALPHA CHUTE</span>
                <span className="text-amber-400 font-mono font-bold animate-pulse">88/min</span>
              </div>
              <p className="text-[11px] text-slate-300">Serpentine Holding Chute leading to Sanctum</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/30 text-amber-300 font-bold">
                🟡 High Density (Queue Static)
              </span>
            </div>

            {/* Holding Pen B */}
            <div
              onClick={() => setSelectedNode('holding-pen-b')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedNode === 'holding-pen-b'
                  ? 'border-emerald-400 bg-emerald-950/40'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="font-bold text-slate-300">HOLDING PEN B (RESERVE)</span>
                <span className="text-emerald-400 font-bold">Capacity: 1,500</span>
              </div>
              <p className="text-[11px] text-slate-400">Emergency buffer pen to vent Corridor Alpha</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                🟢 Ready for Queue Diversion
              </span>
            </div>
          </div>

          {/* Sanctum Core & Egress Gate 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setSelectedNode('sanctum-core')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedNode === 'sanctum-core'
                  ? 'border-amber-400 bg-amber-950/40'
                  : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="font-black text-amber-200">SANCTUM CORE (GARBHAGRIHA)</span>
                <span className="text-amber-400 font-bold">60/min</span>
              </div>
              <p className="text-[11px] text-slate-400">Main Deity Darshan Chute & Aarti Mandap</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
                Controlled Flow
              </span>
            </div>

            <div
              onClick={() => setSelectedNode('gate-4')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedNode === 'gate-4'
                  ? 'border-emerald-400 bg-emerald-950/40'
                  : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="font-bold text-slate-300">GATE 4 (SOUTH EGRESS & SHOE DROP)</span>
                <span className="text-emerald-400 font-bold">110/min</span>
              </div>
              <p className="text-[11px] text-slate-400">Wide Egress Walkway to Outer Plaza</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                🟢 Unhindered Egress
              </span>
            </div>
          </div>
        </div>

        {/* Footer Telemetry */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
          <span className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Telemetry: Live Sensor Feed (Sampling Rate: 2.4 GHz)</span>
          </span>
          <span>
            Selected Zone: <strong className="text-amber-300 uppercase">{selectedNode}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TacticalPerimeterRadar;
