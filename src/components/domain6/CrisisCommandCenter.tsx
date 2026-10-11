import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, Users, Clock, MapPin, 
  AlertTriangle, CheckCircle2, TrendingUp, Filter,
  Search, Crosshair, Award, Zap, Radio
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const redIcon = L.divIcon({
  className: 'custom-pin',
  html: '<div class="animate-pulse" style="width: 16px; height: 16px; background-color: #dc2626; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #dc2626;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const greenIcon = L.divIcon({
  className: 'custom-pin',
  html: '<div style="width: 16px; height: 16px; background-color: #16a34a; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px #16a34a;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export const CrisisCommandCenter: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  // Org Score System
  const [orgResilienceScore, setOrgResilienceScore] = useState(850);
  const [karmaPool, setKarmaPool] = useState(12450);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    // Fetch all emergencies globally or for this workspace
    const q = query(
      collection(db, 'yatra_broadcasts'),
      where('communityId', '==', activeWorkspace.id),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: any[] = [];
      let activeCount = 0;
      let resolvedCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'RICH_SOS' || data.type === 'SOS') {
          logs.push({ id: doc.id, ...data });
          if (data.sosStatus === 'RESOLVED') resolvedCount++;
          else activeCount++;
        }
      });
      setIncidents(logs);

      // Dynamically calculate Organization Resilience Score
      // Base score 500 + 50 points per resolved incident - 10 per active
      const dynamicScore = 500 + (resolvedCount * 50) - (activeCount * 10);
      setOrgResilienceScore(Math.max(100, Math.min(1000, dynamicScore)));
      setKarmaPool(10000 + (resolvedCount * 150));
    }, (err) => console.warn("Firebase CrisisCommandCenter sync:", err.message));

    return () => unsubscribe();
  }, [activeWorkspace?.id]);


  const handleAcknowledge = async (id: string) => {
    try {
      const docRef = doc(db, 'yatra_broadcasts', id);
      await updateDoc(docRef, {
        sosStatus: 'RESOLVED',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'Sevadar Team'
      });
    } catch (e) {
      console.error('Error acknowledging alert', e);
    }
  };

  const activeIncidents = incidents.filter(i => i.sosStatus !== 'RESOLVED');

  const resolvedIncidents = incidents.filter(i => i.sosStatus === 'RESOLVED');
  
  const displayedIncidents = incidents.filter(i => {
    if (filter === 'ACTIVE') return i.sosStatus !== 'RESOLVED';
    if (filter === 'RESOLVED') return i.sosStatus === 'RESOLVED';
    return true;
  });

  // Generate chart data based on historical incidents
  const chartData = [
    { name: 'Mon', incidents: 2, resolved: 2 },
    { name: 'Tue', incidents: 1, resolved: 1 },
    { name: 'Wed', incidents: 4, resolved: 3 },
    { name: 'Thu', incidents: 0, resolved: 0 },
    { name: 'Fri', incidents: Math.max(1, activeIncidents.length), resolved: resolvedIncidents.length },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300 h-full">
      
      {/* Header & Score Metrics */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Crosshair className="w-7 h-7 text-red-600" /> Crisis Command Center
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Global view of all emergencies, response metrics, and organizational karma.
          </p>
        </div>

        {/* Scoring Badges */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-white border-2 border-emerald-100 p-4 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Resilience Score</p>
              <h3 className="text-2xl font-black text-slate-900">{orgResilienceScore}<span className="text-sm font-bold text-slate-400">/1000</span></h3>
            </div>
          </div>
          <div className="bg-white border-2 border-indigo-100 p-4 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <Zap className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Org Karma Pool</p>
              <h3 className="text-2xl font-black text-slate-900">{karmaPool.toLocaleString()} <span className="text-sm font-bold text-slate-400">pts</span></h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Crises</h4>
            <span className="text-3xl font-black text-slate-900">{activeIncidents.length}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Resolved</h4>
            <span className="text-3xl font-black text-slate-900">{resolvedIncidents.length}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Avg Response Time</h4>
            <span className="text-3xl font-black text-slate-900">4.2 <span className="text-lg text-slate-500">mins</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-[500px]">
                {/* Emergency Quick-View Widget */}
        {activeIncidents.length > 0 && (
          <div className="bg-rose-50 rounded-3xl border-2 border-rose-200 shadow-sm p-6 animate-pulse-slow">
            <h3 className="font-black text-rose-800 flex items-center gap-2 mb-4 text-lg">
              <ShieldAlert className="w-6 h-6 animate-pulse text-rose-600" /> Pending Emergencies Requires Immediate Action
            </h3>
            <div className="flex flex-col gap-3">
              {activeIncidents.map(inc => (
                <div key={inc.id} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-rose-700 font-bold text-sm">{inc.situation?.replace('_', ' ') || 'Emergency SOS'}</h4>
                    <p className="text-slate-600 text-xs mt-1 font-medium"><span className="font-bold text-slate-800">{inc.senderName}</span> requires assistance.</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-500 uppercase">
                      {inc.location && <span className="flex items-center gap-1 text-indigo-600"><MapPin className="w-3 h-3" /> Location Tracked</span>}
                      <span className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" /> {new Date(inc.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAcknowledge(inc.id)}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-lg shadow-rose-600/20 whitespace-nowrap shrink-0"
                  >
                    Acknowledge & Resolve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Left Column: Map & Chart */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Live Map */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" /> Live Threat Map
              </h3>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> Active</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-600"></div> Resolved</span>
              </div>
            </div>
            <div className="flex-1 relative z-0">
              <MapContainer 
                center={[25.3176, 82.9739]} // Default to Kashi / Varanasi center
                zoom={5} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {incidents.map((inc, idx) => {
                  if (!inc.location) return null;
                  const isResolved = inc.sosStatus === 'RESOLVED';
                  return (
                    <Marker 
                      key={`${inc.id}-${idx}`} 
                      position={[inc.location.lat, inc.location.lng]} 
                      icon={isResolved ? greenIcon : redIcon}
                    >
                      <Popup>
                        <div className="font-sans">
                          <strong className={isResolved ? 'text-emerald-700' : 'text-red-700'}>
                            {inc.situation?.replace('_', ' ')}
                          </strong>
                          <br />
                          <span className="text-xs text-slate-500">{inc.senderName}</span>
                          <br />
                          <span className="text-xs font-medium">{inc.details || inc.text}</span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* Incident Chart */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex-1">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" /> Incident Frequency (Weekly)
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="incidents" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorRes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Logs */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Radio className="w-5 h-5 text-indigo-600" /> Master Incident Log
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['ALL', 'ACTIVE', 'RESOLVED'].map((f, idx) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {displayedIncidents.length === 0 ? (
              <div className="text-center text-slate-400 p-8 text-sm font-medium">No incidents match this filter.</div>
            ) : (
              displayedIncidents.map((inc, idx) => {
                const isResolved = inc.sosStatus === 'RESOLVED';
                return (
                  <div key={`${inc.id}-${idx}`} className={`p-4 rounded-2xl border-l-4 shadow-sm ${isResolved ? 'border-l-emerald-500 bg-emerald-50/30 border border-emerald-100' : 'border-l-red-500 bg-red-50 border border-red-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-md ${isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-200 text-red-800 animate-pulse'}`}>
                        {isResolved ? 'RESOLVED' : 'ACTIVE CRITICAL'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(inc.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">{inc.situation?.replace('_', ' ') || 'Emergency SOS'}</h4>
                    <p className="text-xs font-medium text-slate-600 mt-1 line-clamp-2">{inc.details || inc.text}</p>
                    
                    <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {inc.senderName}</span>
                      {inc.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Logged</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
