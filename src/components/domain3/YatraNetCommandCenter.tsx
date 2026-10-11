import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Radio,
  Users,
  AlertTriangle,
  Flame,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Activity,
  HeartPulse,
  MapPin,
  RefreshCw,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Bell,
  Clock,
  Shuffle,
  Volume2,
  Lock,
  Building,
  UserCheck,
  Eye,
  Sliders,
  BookOpen,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useQuickGuide } from '../../context/QuickGuideContext';
import { useToast } from '../../context/ToastContext';
import { addAlert, updateAlertStatus, subscribeToAlerts } from '../../services/yatranetService';

// Sector Definition & State Interface
export type SectorStatus = 'SAFE' | 'CROWDED' | 'CRITICAL';

export interface SectorZone {
  id: string;
  name: string;
  code: string;
  category: 'ENTRY' | 'HOLDING' | 'SANCTUM' | 'OFFERING' | 'EXIT';
  currentCapacity: number;
  maxCapacity: number;
  assignedSevadars: number;
  flowRatePerMin: number;
  description: string;
  sanctumDistanceMeters: number;
}

// Emergency Alert Interface
export type AlertSeverity = 'CRITICAL_SOS' | 'MEDICAL_HIGH' | 'CROWD_BOTTLENECK' | 'INFO';
export type AlertStatus = 'ACTIVE' | 'RESPONDING' | 'RESOLVED';

export interface EmergencyAlert {
  id: string;
  sectorId: string;
  sectorName: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  timestamp: string;
  reportedBy: string;
  respondersAssigned?: number;
  resolvedAt?: string;
}

// Initial Mock Sectors representing a Grand Mandir Complex
const INITIAL_SECTORS: SectorZone[] = [
  {
    id: 'sec-main-gate',
    name: 'Main Gopuram Gate (Purva Dwar)',
    code: 'SEC-01',
    category: 'ENTRY',
    currentCapacity: 420,
    maxCapacity: 1200,
    assignedSevadars: 14,
    flowRatePerMin: 85,
    description: 'Security bag scanner, metal detectors & barefoot transition portal',
    sanctumDistanceMeters: 280,
  },
  {
    id: 'sec-joota-ghar',
    name: 'Joota Ghar & Cloakroom Bay',
    code: 'SEC-02',
    category: 'ENTRY',
    currentCapacity: 280,
    maxCapacity: 900,
    assignedSevadars: 10,
    flowRatePerMin: 60,
    description: 'Footwear storage tokens, luggage lockers and mobile phone deposition',
    sanctumDistanceMeters: 220,
  },
  {
    id: 'sec-waiting-hall',
    name: 'Pilgrim Holding Hall (Ananda Mandapam)',
    code: 'SEC-03',
    category: 'HOLDING',
    currentCapacity: 2250,
    maxCapacity: 2800,
    assignedSevadars: 18,
    flowRatePerMin: 140,
    description: 'Covered serpentine holding queues with ceiling fans and water stations',
    sanctumDistanceMeters: 90,
  },
  {
    id: 'sec-garbhagriha',
    name: 'Inner Sanctum Garbhagriha Enclosure',
    code: 'SEC-04',
    category: 'SANCTUM',
    currentCapacity: 580,
    maxCapacity: 600,
    assignedSevadars: 24,
    flowRatePerMin: 70,
    description: 'Holy of holies, silver railing barricade and deity darshan line',
    sanctumDistanceMeters: 0,
  },
  {
    id: 'sec-prasadam',
    name: 'Maha-Prasadam Distribution Counter',
    code: 'SEC-05',
    category: 'OFFERING',
    currentCapacity: 310,
    maxCapacity: 800,
    assignedSevadars: 8,
    flowRatePerMin: 95,
    description: 'Laddu / Khichdi prasad counter, theertham dispensing & chanda desk',
    sanctumDistanceMeters: 65,
  },
];

// Initial Active Emergency SOS Alerts
const INITIAL_ALERTS: EmergencyAlert[] = [
  {
    id: 'sos-101',
    sectorId: 'sec-garbhagriha',
    sectorName: 'Inner Sanctum Garbhagriha Enclosure',
    title: 'Garbhagriha Sanctum Threshold Overcrowding',
    description: 'Pilgrim velocity dropped to 12/min. Devotees halting at silver railing for darshan.',
    severity: 'CRITICAL_SOS',
    status: 'ACTIVE',
    timestamp: '12:41 PM',
    reportedBy: 'CCTV AI Flow Tracker #04',
  },
  {
    id: 'sos-102',
    sectorId: 'sec-waiting-hall',
    sectorName: 'Pilgrim Holding Hall (Ananda Mandapam)',
    title: 'Medical Emergency: Dehydration & Dizziness',
    description: 'Elderly pilgrim experiencing heat distress at Queue Row #7. Immediate ORS needed.',
    severity: 'MEDICAL_HIGH',
    status: 'ACTIVE',
    timestamp: '12:44 PM',
    reportedBy: 'Sevadar Ramesh K. (Radio CH-3)',
  },
  {
    id: 'sos-103',
    sectorId: 'sec-main-gate',
    sectorName: 'Main Gopuram Gate (Purva Dwar)',
    title: 'Footwear Token Dispenser Queue Surge',
    description: 'Tourist bus influx of 180 devotees arrived simultaneously at north portico.',
    severity: 'INFO',
    status: 'RESOLVED',
    timestamp: '12:20 PM',
    reportedBy: 'Gate Supervisor Rajesh',
    respondersAssigned: 4,
    resolvedAt: '12:35 PM',
  },
];

export const YatraNetCommandCenter: React.FC = () => {
  const { activeWorkspace, activeWorkspaceId, currentUser } = useAuthWorkspace();
  const workspaceId = activeWorkspaceId || activeWorkspace?.id || 'DEMO_ws-mandir';
  const { openGuide } = useQuickGuide();
  const { showToast } = useToast();

  // Core State
  const [sectors, setSectors] = useState<SectorZone[]>(INITIAL_SECTORS);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(INITIAL_ALERTS);
  const [loading, setLoading] = useState<boolean>(true);

  // Real-time Fetch: subscribe to alerts in Firestore
  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    const unsubscribe = subscribeToAlerts(workspaceId, (liveAlerts) => {
      if (liveAlerts && liveAlerts.length > 0) {
        setAlerts(liveAlerts as EmergencyAlert[]);
      } else {
        setAlerts(INITIAL_ALERTS);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [workspaceId]);

  // Sevadar Redeployment Form State
  const [fromSectorId, setFromSectorId] = useState<string>('sec-main-gate');
  const [toSectorId, setToSectorId] = useState<string>('sec-garbhagriha');
  const [sevadarCountToMove, setSevadarCountToMove] = useState<number>(4);
  const [isRedeploying, setIsRedeploying] = useState<boolean>(false);

  // Complex Aggregate Statistics
  const totalOccupancy = useMemo(() => {
    return sectors.reduce((acc, s) => acc + s.currentCapacity, 0);
  }, [sectors]);

  const totalMaxCapacity = useMemo(() => {
    return sectors.reduce((acc, s) => acc + s.maxCapacity, 0);
  }, [sectors]);

  const complexDensityPercent = useMemo(() => {
    if (totalMaxCapacity === 0) return 0;
    return Math.round((totalOccupancy / totalMaxCapacity) * 100);
  }, [totalOccupancy, totalMaxCapacity]);

  const totalActiveSevadars = useMemo(() => {
    return sectors.reduce((acc, s) => acc + s.assignedSevadars, 0);
  }, [sectors]);

  const activeAlertCount = useMemo(() => {
    return alerts.filter((a) => a.status !== 'RESOLVED').length;
  }, [alerts]);

  // Helper: Get Sector Density Percentage
  const getDensity = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.round((current / max) * 100);
  };

  // Helper: Get Sector Status & Styling
  const getSectorStatus = (density: number): SectorStatus => {
    if (density >= 86) return 'CRITICAL';
    if (density >= 51) return 'CROWDED';
    return 'SAFE';
  };

  // Dispatch Medical Sevadars Action
  const handleDispatchMedical = async (alertId: string) => {
    try {
      await updateAlertStatus(workspaceId, alertId, 'RESPONDING');
    } catch (err) {
      console.error('Failed to update alert status in Firestore:', err);
    }

    setAlerts((prevAlerts) =>
      prevAlerts.map((a) => {
        if (a.id === alertId) {
          return {
            ...a,
            status: 'RESPONDING',
            respondersAssigned: 3,
          };
        }
        return a;
      })
    );

    showToast(
      'Medical Sevadar Squad (3 Volunteers) dispatched with First-Aid & ORS Kit!',
      'success',
      'Medical Squad Deployed'
    );
  };

  // Resolve Alert Action
  const handleResolveAlert = async (alertId: string) => {
    try {
      await updateAlertStatus(workspaceId, alertId, 'RESOLVED');
    } catch (err) {
      console.error('Failed to resolve alert status in Firestore:', err);
    }

    setAlerts((prevAlerts) =>
      prevAlerts.map((a) => {
        if (a.id === alertId) {
          return {
            ...a,
            status: 'RESOLVED',
            resolvedAt: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        }
        return a;
      })
    );

    showToast('Emergency SOS marked as RESOLVED.', 'info', 'Alert Cleared');
  };

  // Broadcast / Trigger New SOS Alert
  const handleBroadcastSOS = async () => {
    const newAlertData: Partial<EmergencyAlert> = {
      sectorId: 'sec-garbhagriha',
      sectorName: 'Inner Sanctum Garbhagriha Enclosure',
      title: 'Crowd Surge Alert: Sanctum Queue',
      description: 'Devotee velocity slowed near sanctum barrier. Sevadar assistance requested.',
      severity: 'CRITICAL_SOS',
      status: 'ACTIVE',
      timestamp: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      reportedBy: currentUser?.fullName || currentUser?.name || 'Central Command',
    };

    try {
      const created = await addAlert(workspaceId, newAlertData);
      setAlerts((prev) => [{ id: created.id, ...newAlertData } as EmergencyAlert, ...prev]);
      showToast('New Emergency SOS Broadcast logged to cloud ledger!', 'success', 'SOS Broadcast');
    } catch (err) {
      console.error('Error broadcasting SOS alert:', err);
      showToast('Failed to broadcast alert to database.', 'error');
    }
  };

  // Execute Sevadar Redeployment
  const handleExecuteRedeployment = () => {
    if (fromSectorId === toSectorId) {
      showToast('Source and Target sectors must be distinct.', 'error', 'Invalid Transfer');
      return;
    }

    const source = sectors.find((s) => s.id === fromSectorId);
    const target = sectors.find((s) => s.id === toSectorId);

    if (!source || !target) return;

    if (source.assignedSevadars < sevadarCountToMove) {
      showToast(
        `Insufficient Sevadars in ${source.name}. Only ${source.assignedSevadars} available.`,
        'error',
        'Transfer Exceeded'
      );
      return;
    }

    setIsRedeploying(true);

    setTimeout(() => {
      setSectors((prev) =>
        prev.map((s) => {
          if (s.id === fromSectorId) {
            return { ...s, assignedSevadars: s.assignedSevadars - sevadarCountToMove };
          }
          if (s.id === toSectorId) {
            return { ...s, assignedSevadars: s.assignedSevadars + sevadarCountToMove };
          }
          return s;
        })
      );

      setIsRedeploying(false);
      showToast(
        `Transferred ${sevadarCountToMove} Sevadars from ${source.name} to ${target.name}. Flow bottleneck assisted!`,
        'success',
        'Sevadars Redeployed'
      );
    }, 400);
  };

  // Simulated Live Telemetry Pulse (Crowd flux fluctuation)
  const handleTriggerTelemetryPulse = () => {
    setSectors((prev) =>
      prev.map((s) => {
        // Random micro delta +/- 15 pilgrims
        const delta = Math.floor(Math.random() * 31) - 15;
        const newCap = Math.max(20, Math.min(s.maxCapacity, s.currentCapacity + delta));
        return {
          ...s,
          currentCapacity: newCap,
        };
      })
    );
    showToast('IoT Turnstile & LiDAR telemetry refreshed across 5 sectors.', 'info', 'Live Pulse Synced');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-amber-500 selection:text-slate-950">
      {/* ========================================================================= */}
      {/* 1. TOP COMMAND HEADER                                                     */}
      {/* ========================================================================= */}
      <header className="bg-slate-900/95 border-b border-amber-500/20 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-red-500/20">
            <Radio className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                YatraNet GIS Command Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                DEFCON-2 PILGRIM OPS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {activeWorkspace.name} • Sanctum Security Desk • Live Watch:{' '}
              <span className="text-amber-400 font-bold">
                {currentUser?.fullName || currentUser?.name || 'Central Command'}
              </span>
            </p>
          </div>
        </div>

        {/* Global Telemetry Bar & SOP Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTriggerTelemetryPulse}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            title="Refresh Turnstile Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Sync Radar</span>
          </button>

          <button
            type="button"
            onClick={() => openGuide('YATRANET_GIS')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer group"
            title="Open Shastric & Statutory Operating Procedures for YatraNet GIS"
          >
            <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">💡 Quick Guide / SOP</span>
            <span className="sm:hidden">SOP</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. REAL-TIME KPI HUD BAR                                                  */}
      {/* ========================================================================= */}
      <section className="bg-slate-900/60 border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Total Live Pilgrims */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Complex Occupancy
              </span>
              <p className="text-lg sm:text-xl font-mono font-black text-white mt-0.5">
                {totalOccupancy.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / {totalMaxCapacity.toLocaleString('en-IN')}
                </span>
              </p>
            </div>
            <Users className="w-6 h-6 text-amber-400 opacity-80" />
          </div>

          {/* Aggregate Density */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Sanctum Density Index
              </span>
              <p
                className={`text-lg sm:text-xl font-mono font-black mt-0.5 ${
                  complexDensityPercent >= 86
                    ? 'text-red-400'
                    : complexDensityPercent >= 51
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {complexDensityPercent}% Capacity
              </p>
            </div>
            <Activity className="w-6 h-6 text-emerald-400 opacity-80" />
          </div>

          {/* Active Sevadars on Field */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Deployed Sevadars
              </span>
              <p className="text-lg sm:text-xl font-mono font-black text-amber-300 mt-0.5">
                {totalActiveSevadars} Active Volunteers
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-indigo-400 opacity-80" />
          </div>

          {/* Active SOS Alerts */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Unresolved SOS Incidents
              </span>
              <p
                className={`text-lg sm:text-xl font-mono font-black mt-0.5 ${
                  activeAlertCount > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {activeAlertCount} Critical Signals
              </p>
            </div>
            <AlertTriangle
              className={`w-6 h-6 ${
                activeAlertCount > 0 ? 'text-red-400' : 'text-slate-600'
              }`}
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAIN COMMAND INTERFACE (Heatmap Grid + Right Dispatch & Redeploy Panel)*/}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ======================================================================= */}
        {/* LEFT / CENTER: LIVE CROWD HEATMAP (cols 1-7)                            */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                Live Sector Crowd Density Heatmap
              </h2>
              <p className="text-xs text-slate-400">
                Turnstile and LiDAR IoT telemetry mapped to consecrated pilgrim corridors.
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                0-50% Safe
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                51-85% Crowded
              </span>
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                86-100% Critical
              </span>
            </div>
          </div>

          {/* Sector Cards Grid */}
          <div className="space-y-3.5">
            {sectors.map((sec) => {
              const density = getDensity(sec.currentCapacity, sec.maxCapacity);
              const status = getSectorStatus(density);

              // Styling per density
              let borderClass = 'border-slate-800';
              let badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
              let progressColor = 'bg-emerald-500';
              let pulseClass = '';

              if (status === 'CRITICAL') {
                borderClass = 'border-red-500/80 shadow-lg shadow-red-500/20';
                badgeColor = 'bg-red-500/20 text-red-300 border-red-500/40';
                progressColor = 'bg-red-500';
                pulseClass = 'animate-pulse';
              } else if (status === 'CROWDED') {
                borderClass = 'border-amber-500/50 shadow-md shadow-amber-500/10';
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                progressColor = 'bg-amber-500';
              }

              return (
                <div
                  key={sec.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-slate-900 border ${borderClass} transition-all duration-200 relative overflow-hidden group`}
                >
                  {/* Top Header of Sector */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {sec.code}
                        </span>
                        <h3 className="font-black text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors">
                          {sec.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {sec.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${badgeColor} ${pulseClass}`}
                      >
                        {status === 'CRITICAL' && (
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                        )}
                        {density}% Density
                      </span>
                    </div>
                  </div>

                  {/* Visual Density Progress Bar */}
                  <div className="space-y-1 my-3">
                    <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${Math.min(100, density)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Sector Metric Counters */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Headcount
                      </span>
                      <p className="font-mono font-bold text-white mt-0.5">
                        {sec.currentCapacity}{' '}
                        <span className="text-slate-400 font-normal">/ {sec.maxCapacity}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Sevadars
                      </span>
                      <p className="font-mono font-bold text-indigo-300 mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        {sec.assignedSevadars} Stationed
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Flow Velocity
                      </span>
                      <p className="font-mono font-bold text-amber-400 mt-0.5">
                        ~{sec.flowRatePerMin} / min
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT: EMERGENCY SOS FEED & SEVADAR REDEPLOYMENT TOOL (cols 8-12)       */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* ===================================================================== */}
          {/* COMPONENT 1: EMERGENCY SOS & DISPATCH FEED                            */}
          {/* ===================================================================== */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-red-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-red-400" />
                  Emergency SOS & Dispatch Feed
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBroadcastSOS}
                  className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  title="Broadcast New Emergency Alert"
                >
                  <Bell className="w-3 h-3 text-red-400" />
                  <span>+ New SOS</span>
                </button>
                <span className="text-[11px] font-mono text-red-400 font-bold">
                  {activeAlertCount} Active Calls
                </span>
              </div>
            </div>

            {/* Alert List */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs font-semibold text-slate-400">Syncing live alerts from Firestore...</p>
                </div>
              ) : alerts.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">
                  No active incidents. Sanctum security is optimal.
                </p>
              ) : (
                alerts.map((al) => {
                  const isResolved = al.status === 'RESOLVED';
                  const isResponding = al.status === 'RESPONDING';

                  let alertCardStyle = 'bg-slate-950 border-slate-800 text-slate-300';
                  if (al.severity === 'CRITICAL_SOS') {
                    alertCardStyle =
                      al.status === 'ACTIVE'
                        ? 'bg-red-950/40 border-red-500/50 shadow-md shadow-red-500/10'
                        : 'bg-slate-950 border-slate-800';
                  } else if (al.severity === 'MEDICAL_HIGH') {
                    alertCardStyle =
                      al.status === 'ACTIVE'
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : 'bg-slate-950 border-slate-800';
                  }

                  return (
                    <div
                      key={al.id}
                      className={`p-3.5 rounded-2xl border transition-all ${alertCardStyle}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                                al.severity === 'CRITICAL_SOS'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {al.severity.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {al.timestamp}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs sm:text-sm text-white mt-1">
                            {al.title}
                          </h4>
                          <p className="text-[11px] text-amber-300/90 font-medium">
                            📍 {al.sectorName}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isResolved
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : isResponding
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {al.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {al.description}
                      </p>

                      <div className="mt-2 text-[10px] text-slate-400 font-mono">
                        Reported by: <span className="text-slate-200">{al.reportedBy}</span>
                      </div>

                      {/* Action Triggers */}
                      {!isResolved && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-2">
                          {al.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleDispatchMedical(al.id)}
                              className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
                            >
                              <HeartPulse className="w-3.5 h-3.5" />
                              <span>Dispatch Medical Sevadars</span>
                            </button>
                          )}

                          {isResponding && (
                            <div className="flex-1 flex items-center justify-between text-xs text-indigo-300 bg-indigo-950/40 px-3 py-2 rounded-xl border border-indigo-500/30">
                              <span className="flex items-center gap-1.5 font-bold">
                                <Activity className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                Squad Responding ({al.respondersAssigned} Sevadars en route)
                              </span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleResolveAlert(al.id)}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* COMPONENT 2: SEVADAR REDEPLOYMENT TOOL                                */}
          {/* ===================================================================== */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  Sevadar Dynamic Redeployment
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Load Balancer
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Transfer idle Sevadars from lower-density zones (e.g., Main Gate) to alleviate critical bottlenecks around the <strong>Garbhagriha</strong> or Waiting Hall.
            </p>

            <div className="space-y-3">
              {/* From Source Sector */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  From Donor Zone (Safe/Green):
                </label>
                <select
                  value={fromSectorId}
                  onChange={(e) => setFromSectorId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs sm:text-sm focus:border-amber-400 focus:outline-none transition-colors cursor-pointer"
                >
                  {sectors.map((s) => (
                    <option key={`from-${s.id}`} value={s.id}>
                      {s.name} ({s.assignedSevadars} Available)
                    </option>
                  ))}
                </select>
              </div>

              {/* To Destination Sector */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  To Target Zone (Bottleneck/Red):
                </label>
                <select
                  value={toSectorId}
                  onChange={(e) => setToSectorId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-bold text-xs sm:text-sm focus:border-amber-400 focus:outline-none transition-colors cursor-pointer"
                >
                  {sectors.map((s) => (
                    <option key={`to-${s.id}`} value={s.id}>
                      {s.name} ({getDensity(s.currentCapacity, s.maxCapacity)}% full)
                    </option>
                  ))}
                </select>
              </div>

              {/* Volunteer Count Slider/Input */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-bold">
                  <span className="text-slate-400 uppercase tracking-wider text-[11px]">
                    Transfer Quantity:
                  </span>
                  <span className="text-amber-400 font-mono text-sm">
                    {sevadarCountToMove} Sevadars
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={sevadarCountToMove}
                  onChange={(e) => setSevadarCountToMove(Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Execute Transfer Button */}
              <button
                type="button"
                disabled={isRedeploying}
                onClick={handleExecuteRedeployment}
                className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRedeploying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting Dispatch Radio Order...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      Redeploy {sevadarCountToMove} Sevadars Now
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default YatraNetCommandCenter;
