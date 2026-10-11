import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, History, CheckCircle2 } from 'lucide-react';
import { QRScanner as CommonQRScanner } from '../common/QRScanner';

export const QRScanner: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();

  const [recentScans, setRecentScans] = useState<Array<{
    id: string;
    name: string;
    timestamp: number;
    purpose: string;
    status: 'VERIFIED';
  }>>([]);

  const handleScanSuccess = async (payload: any) => {
    try {
      const devoteeId = payload.uid || payload.id || payload.devoteeId || 'guest';
      const devoteeName = payload.name || payload.fullName || payload.devoteeName || 'Devotee';
      const purpose = payload.purpose || payload.type || 'Sanctum Darshan';

      // Log to Firestore check_ins
      const checkInRef = collection(db, 'check_ins');
      await addDoc(checkInRef, {
        devoteeId,
        workspaceId: activeWorkspace?.id || 'default',
        timestamp: Date.now(),
        type: 'DYNAMIC_QR_PASS',
        status: 'VERIFIED',
        purpose,
        name: devoteeName,
      }).catch((e) => console.warn('Firebase check_ins write warning:', e.message));

      // Append to local live stream
      setRecentScans((prev) => [
        {
          id: `scan_${Date.now()}`,
          name: devoteeName,
          timestamp: Date.now(),
          purpose,
          status: 'VERIFIED',
        },
        ...prev.slice(0, 9),
      ]);

      showToast(`Entry verified: ${devoteeName}`, 'success', 'Security Gate');
    } catch (err: any) {
      console.error('Scan logging error:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-temple-950 via-temple-900 to-amber-950/70 border border-amber-500/30 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Anti-Screenshot Protection Active
            </span>
            <span className="text-[10px] font-mono text-temple-400 bg-temple-950 px-2 py-0.5 rounded-md border border-temple-800">
              5-Min Dynamic Token Expiry
            </span>
          </div>
          <h2 className="text-2xl font-black text-amber-300">Darshan Gate & Security Scanner</h2>
          <p className="text-xs text-temple-400 mt-1 max-w-xl">
            Live camera feed verifying HMAC-signed dynamic passes. Screenshot replays and stale passes are rejected instantly with audio-visual cues.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-temple-950/80 px-4 py-3 rounded-2xl border border-temple-800">
          <div>
            <p className="text-[10px] uppercase font-bold text-temple-400">Total Scans Today</p>
            <p className="text-xl font-black text-emerald-400">{recentScans.length}</p>
          </div>
        </div>
      </div>

      {/* Main Scanner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Scanner Component */}
        <div className="lg:col-span-7 flex justify-center">
          <CommonQRScanner
            title="Temple Gate Entry Scanner"
            subtitle="Point camera at devotee's dynamic QR pass"
            onScanSuccess={handleScanSuccess}
            onScanError={(err) => {
              showToast(`Pass rejected: ${err}`, 'error', 'Security Gate');
            }}
          />
        </div>

        {/* Live Gate Verification Feed */}
        <div className="lg:col-span-5 bg-temple-900/90 border border-temple-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-temple-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-temple-100">Live Security Gate Log</h3>
            </div>
            <span className="text-[10px] text-temple-400 font-mono">Real-time</span>
          </div>

          {recentScans.length === 0 ? (
            <div className="py-12 text-center text-temple-500 space-y-1">
              <ShieldCheck className="w-8 h-8 mx-auto text-temple-700" />
              <p className="text-xs font-semibold">No Check-ins Recorded Yet</p>
              <p className="text-[11px] text-temple-600">Scanned passes will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="p-3 rounded-2xl bg-temple-950/80 border border-temple-800 flex items-center justify-between text-xs animate-in fade-in"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-temple-100">{scan.name}</p>
                      <p className="text-[10px] text-temple-400">{scan.purpose}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      CLEARED
                    </span>
                    <p className="text-[10px] font-mono text-temple-500 mt-1">
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
