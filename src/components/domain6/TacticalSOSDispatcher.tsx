import React, { useState } from 'react';
import {
  Siren,
  Ambulance,
  PhoneCall,
  CheckCircle2,
  Radio,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  ShieldAlert,
  Send,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface TacticalIncident {
  id: string;
  code: 'CODE_RED' | 'CODE_BLUE' | 'CODE_AMBER';
  title: string;
  location: string;
  timestamp: string;
  elapsedMinutes: number;
  densityReport: string;
  status: 'ACTIVE' | 'DISPATCHED' | 'RESOLVED';
  assignedUnit?: string;
  details: string;
}

const INITIAL_INCIDENTS: TacticalIncident[] = [
  {
    id: 'INC-2026-8910',
    code: 'CODE_RED',
    title: 'Code Red - Crowd Surge Choke Point',
    location: 'Gate 2 Sugam Corridor',
    timestamp: '14:42:10',
    elapsedMinutes: 2,
    densityReport: '5.2 persons/m² (Exceeds Safety Threshold 4.0)',
    status: 'ACTIVE',
    details: 'Pilgrim bottleneck forming near serpentine turnstile. Surge risk elevated. Immediate queue diversion required.',
  },
  {
    id: 'INC-2026-8908',
    code: 'CODE_BLUE',
    title: 'Code Blue - Cardiac/Medical Distress',
    location: 'East Mandap Shoe Drop',
    timestamp: '14:38:05',
    elapsedMinutes: 6,
    densityReport: 'Devotee collapsed; AED required',
    status: 'ACTIVE',
    details: 'Elderly pilgrim experiencing acute breathing distress and syncope. First responders requested.',
  },
  {
    id: 'INC-2026-8905',
    code: 'CODE_AMBER',
    title: 'Code Amber - Lost Elder / Disoriented Pilgrim',
    location: 'North Parikrama Gate 1',
    timestamp: '14:30:15',
    elapsedMinutes: 14,
    densityReport: 'Separated from family group',
    status: 'DISPATCHED',
    assignedUnit: 'QRT Charlie & Sevadar Helpdesk',
    details: '82-year-old pilgrim wearing saffron shawl separated from family from Varanasi. Perimeter gate marshals notified.',
  },
];

export const TacticalSOSDispatcher: React.FC = () => {
  const { showToast } = useToast();
  const [incidents, setIncidents] = useState<TacticalIncident[]>(INITIAL_INCIDENTS);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const handleDispatchQRT = (incidentId: string, qrtName: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? { ...inc, status: 'DISPATCHED', assignedUnit: qrtName }
          : inc
      )
    );
    const incident = incidents.find((i) => i.id === incidentId);
    showToast(
      `${qrtName} dispatched to ${incident?.location || 'scene'}! Radio broadcast & WhatsApp alert sent.`,
      'success',
      'Tactical Dispatch'
    );
  };

  const handleResolveIncident = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId ? { ...inc, status: 'RESOLVED' } : inc
      )
    );
    showToast(
      `Incident ${incidentId} marked as RESOLVED & Contained. Incident report logged to Audit Ledger.`,
      'info',
      'Incident Contained'
    );
  };

  const activeCount = incidents.filter((i) => i.status === 'ACTIVE').length;
  const dispatchedCount = incidents.filter((i) => i.status === 'DISPATCHED').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'ACTIVE') return inc.status === 'ACTIVE' || inc.status === 'DISPATCHED';
    if (filter === 'RESOLVED') return inc.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center gap-1">
              <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
              <span>Priority Rapid-Triage & QRT Deployment</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Emergency Response Target SLA: &lt; 90 Seconds
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Siren className="w-8 h-8 text-rose-600" />
            <span>Tactical SOS Emergency Dispatcher</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time emergency incident feed with automated Quick Response Team (QRT) vectoring, medical triage, and live containment tracking.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'ACTIVE' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active / Dispatched ({activeCount + dispatchedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'RESOLVED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Triage Incident Cards List */}
      <div className="space-y-4">
        {filteredIncidents.map((inc) => {
          const isRed = inc.code === 'CODE_RED';
          const isBlue = inc.code === 'CODE_BLUE';
          const isAmber = inc.code === 'CODE_AMBER';
          const isResolved = inc.status === 'RESOLVED';
          const isDispatched = inc.status === 'DISPATCHED';

          return (
            <div
              key={inc.id}
              className={`p-5 sm:p-6 rounded-3xl border-2 transition-all shadow-sm ${
                isResolved
                  ? 'bg-slate-50 border-slate-200 opacity-75'
                  : isRed
                  ? 'bg-rose-50/70 border-rose-500 shadow-rose-500/10'
                  : isBlue
                  ? 'bg-sky-50/70 border-sky-500 shadow-sky-500/10'
                  : 'bg-amber-50/70 border-amber-500'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Block: Identity & Details */}
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-3 py-0.5 rounded-full text-[10px] font-mono font-black uppercase flex items-center gap-1 ${
                        isRed
                          ? 'bg-rose-600 text-white'
                          : isBlue
                          ? 'bg-sky-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isRed && <AlertTriangle className="w-3 h-3" />}
                      {isBlue && <Ambulance className="w-3 h-3" />}
                      {isAmber && <Users className="w-3 h-3" />}
                      {inc.code.replace('_', ' ')}
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-500">
                      ID: {inc.id} &bull; Time: {inc.timestamp}
                    </span>

                    {/* Status Pill */}
                    {isResolved ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        CONTAINED & RESOLVED
                      </span>
                    ) : isDispatched ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
                        UNIT EN ROUTE ({inc.assignedUnit})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-600 text-white animate-pulse">
                        ⚠️ UNASSIGNED &bull; SLA RUNNING ({inc.elapsedMinutes}m elapsed)
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {inc.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                    <span className="flex items-center gap-1 font-bold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      {inc.location}
                    </span>
                    <span>&bull;</span>
                    <span className="font-mono text-slate-700">
                      <strong>Telemetry:</strong> {inc.densityReport}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    {inc.details}
                  </p>
                </div>

                {/* Right Block: Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:w-56">
                  {!isResolved ? (
                    <>
                      {isRed && (
                        <button
                          type="button"
                          onClick={() => handleDispatchQRT(inc.id, 'QRT Alpha (Corridor Marshals)')}
                          className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>DISPATCH QRT ALPHA</span>
                        </button>
                      )}

                      {isBlue && (
                        <button
                          type="button"
                          onClick={() => handleDispatchQRT(inc.id, 'Paramedic Golf Cart Unit 2')}
                          className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-black text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Ambulance className="w-3.5 h-3.5" />
                          <span>DISPATCH PARAMEDIC CART</span>
                        </button>
                      )}

                      {isAmber && !isDispatched && (
                        <button
                          type="button"
                          onClick={() => handleDispatchQRT(inc.id, 'Sevadar Patrol Unit 4')}
                          className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>DISPATCH PATROL</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleResolveIncident(inc.id)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>MARK AS RESOLVED</span>
                      </button>
                    </>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-xs font-mono font-bold text-emerald-800 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Incident Closed
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TacticalSOSDispatcher;
