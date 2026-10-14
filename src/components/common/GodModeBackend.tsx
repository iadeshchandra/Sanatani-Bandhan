import React, { useState, useEffect } from 'react';
import {
  Crown,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Eye,
  Database,
  Building2,
  Lock,
  KeyRound,
  CheckCircle2,
  Layers,
  ArrowRight,
  Server,
  Zap,
  Globe,
  Sliders
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { auth, signInWithEmailAndPassword, signInWithPopup, googleProvider, updatePassword } from '../../firebase';
import { isOwnerEmail } from '../../config/ownerAllowlist';
import { WorkspaceConfig, UserRole } from '../../types';

interface GodModeBackendProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GodModeBackend: React.FC<GodModeBackendProps> = ({
  isOpen,
  onClose
}) => {
  const {
    workspaces,
    activeWorkspace,
    switchWorkspace,
    currentRole,
    switchRole,
    loginAsRole,
    firebaseUser,
  } = useAuthWorkspace();

  const {
    devotees,
    treasury,
    poojaBookings,
    inventory,
    assets,
    cows,
    annadanamList,
    guests,
    families,
    resolutions,
    shifts,
    purgeAutoDeleteRecords
  } = useData();

  const { showToast } = useToast();

  const [godAccessKey, setGodAccessKey] = useState('');
  const [godEmail, setGodEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [selectedInspectWs, setSelectedInspectWs] = useState(activeWorkspace.id);
  const [ttlMinutes, setTtlMinutes] = useState(60);

  useEffect(() => {
    // SECURITY (C-1): auto-unlock only when the Firebase session belongs to
    // the platform owner. Client role state alone never unlocks the console.
    if (isOwnerEmail(firebaseUser?.email)) {
      setIsUnlocked(true);
    }
  }, [firebaseUser?.email]);

  if (!isOpen) return null;

  const handleGoogleGodMode = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const signedInEmail = result.user?.email ?? '';
      if (!isOwnerEmail(signedInEmail)) {
        await auth.signOut();
        showToast('This Google account is not authorized for system override.', 'error');
        return;
      }
      setIsUnlocked(true);
      switchRole('SuperAdmin');
      showToast('Authenticated successfully via Google.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Google authentication failed.', 'error');
    }
  };

  const handleUnlockGodMode = async (e: React.FormEvent) => {
    e.preventDefault();

    // SECURITY (C-1): hardcoded magic keys removed. System override requires a
    // real Firebase email+password sign-in AND the verified email must belong
    // to the platform owner allowlist. Any other Firebase account is signed
    // straight back out — there is no client-side bypass.
    try {
       if (godEmail.trim() !== '') {
          await signInWithEmailAndPassword(auth, godEmail, godAccessKey);
          const signedInEmail = auth.currentUser?.email ?? '';
          if (!isOwnerEmail(signedInEmail)) {
            await auth.signOut();
            showToast('This Firebase account is not authorized for system override.', 'error');
            return;
          }
          setIsUnlocked(true);
          switchRole('SuperAdmin');
          showToast('Authenticated successfully.', 'success');
       } else {
          showToast('Please enter your administrator email and password.', 'error');
       }
    } catch(err: any) {
       showToast(err.message || 'Authentication failed.', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    
    if (!auth.currentUser) {
      showToast('You must be logged in with Firebase to change the password.', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      showToast('System Override credentials updated successfully!', 'success');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update password. You may need to log out and log back in.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleInstantWipeDemoData = () => {
    if (purgeAutoDeleteRecords) {
      purgeAutoDeleteRecords();
      showToast('All temporary demo & sandbox inputs have been wiped from memory.', 'success');
    } else {
      showToast('Auto-delete cleanup triggered across all shards.', 'info');
    }
  };

  const currentInspectWsObj = workspaces.find((w) => w.id === selectedInspectWs) || activeWorkspace;

  // Shard metrics calculation for the inspected workspace
  const shardDevotees = devotees.filter((d) => d.workspaceId === selectedInspectWs);
  const shardTreasury = treasury.filter((t) => t.workspaceId === selectedInspectWs);
  const shardPujas = poojaBookings.filter((p) => p.workspaceId === selectedInspectWs);
  const shardInventory = inventory.filter((i) => i.workspaceId === selectedInspectWs);

  return (
    <div
      id="godmode-backend-modal"
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-saffron-500/40 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Sacred Sovereign Override Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-saffron-950/70 border-b border-saffron-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-saffron-400 to-saffron-500 flex items-center justify-center text-slate-950 shadow-lg font-black text-xl">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-saffron-200 tracking-wide">
                  /system-override
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-saffron-500/20 text-saffron-300 text-[10px] font-mono border border-saffron-500/40 uppercase font-bold">
                  Sovereign Override Console
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-Tenant Shard Isolation, Global RBAC Override & Sandbox TTL Life-Cycle
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
          >
            Exit Backend
          </button>
        </div>

        {/* Modal Main Content */}
        {!isUnlocked ? (
          <div className="p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
            <div className="w-16 h-16 rounded-full bg-saffron-500/10 border border-saffron-500/30 flex items-center justify-center text-saffron-400 mb-4 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Enter Master Reference Access Code</h3>
            <p className="text-xs text-slate-400 mb-6">
              Access to the root control plane requires master authentication clearance.
            </p>

            <form onSubmit={handleUnlockGodMode} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="email"
                  value={godEmail}
                  onChange={(e) => setGodEmail(e.target.value)}
                  placeholder="Super Admin Email (Optional)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-saffron-300 focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 outline-none"
                />
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={godAccessKey}
                  onChange={(e) => setGodAccessKey(e.target.value)}
                  placeholder="Administrator password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-saffron-300 font-mono focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 outline-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg transition-all cursor-pointer"
              >
                Authenticate Sovereign Access
              </button>
            </form>

            <div className="w-full flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <button
              type="button"
              onClick={handleGoogleGodMode}
              className="w-full py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        ) : (
          <div className="grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Top Quick Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
                <Building2 className="w-8 h-8 text-saffron-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Total Shards
                  </span>
                  <span className="text-xl font-black text-white">{workspaces.length}</span>
                  <span className="text-[10px] text-emerald-400 block font-semibold">100% Isolated</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
                <Layers className="w-8 h-8 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Active Shard Focus
                  </span>
                  <span className="text-sm font-bold text-indigo-200 truncate block max-w-[140px]">
                    {activeWorkspace.name}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono block">ID: {activeWorkspace.id}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
                <Zap className="w-8 h-8 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Demo Quota Cap
                  </span>
                  <span className="text-xl font-black text-emerald-300">5 Entries / Mod</span>
                  <span className="text-[10px] text-emerald-400 block font-semibold">Self-Purging Active</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
                <Server className="w-8 h-8 text-saffron-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Auto-Wipe Timer
                  </span>
                  <span className="text-xl font-black text-saffron-500">{ttlMinutes} Mins</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">Automated Rolling TTL</span>
                </div>
              </div>
            </div>

            {/* Shard Cross-Inspection & Tenant Data Isolation Matrix */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-saffron-400" />
                    Multi-Tenant Shard Isolation & Instant Impersonation Engine
                  </h3>
                  <p className="text-xs text-slate-400">
                    Each organization's data is strictly partitioned by its unique Workspace ID. Inspect or switch live into any shard.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInstantWipeDemoData}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Purge All Demo Sandbox Data
                  </button>
                </div>
              </div>

              {/* Shard Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                {workspaces.map((ws, idx) => {
                  const isCurrentActive = ws.id === activeWorkspace.id;
                  const isCurrentlyInspected = ws.id === selectedInspectWs;
                  return (
                    <div
                      key={`${ws.id}-${idx}`}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                        isCurrentlyInspected
                          ? 'bg-saffron-500/10 border-saffron-500/60 text-saffron-100'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800">{ws.type}</span>
                          {isCurrentActive && (
                            <span className="text-emerald-400 font-bold">● Active</span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold truncate text-white">{ws.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{ws.city}</p>
                      </div>

                      <div className="mt-3 flex gap-1 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => setSelectedInspectWs(ws.id)}
                          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 text-center"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            switchWorkspace(ws.id);
                            showToast(`Switched into workspace: ${ws.name}`, 'info');
                          }}
                          className="flex-1 py-1 rounded bg-saffron-500/20 hover:bg-saffron-500/30 text-[10px] font-semibold text-saffron-300 text-center"
                        >
                          Jump In
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Shard Breakdown Panel */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-saffron-300 uppercase tracking-wider">
                    Isolated Shard Telemetry: {currentInspectWsObj.name} ({currentInspectWsObj.id})
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Isolated database scope: No other organization can query or read these records.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
                    PIN: {currentInspectWsObj.adminPin}
                  </span>
                  <span className="text-[11px] font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
                    Currency: {currentInspectWsObj.currency} ({currentInspectWsObj.currencySymbol})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Devotees & Members</span>
                  <span className="text-lg font-bold text-white">{shardDevotees.length}</span>
                  <span className="text-[10px] text-slate-500 block">Strictly tenant-scoped</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Treasury Tx Count</span>
                  <span className="text-lg font-bold text-white">{shardTreasury.length}</span>
                  <span className="text-[10px] text-slate-500 block">
                    Vol: ₹{shardTreasury.reduce((acc, t) => acc + (t.type === 'Income' ? t.amount : 0), 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Pooja & Seva Bookings</span>
                  <span className="text-lg font-bold text-white">{shardPujas.length}</span>
                  <span className="text-[10px] text-slate-500 block">Sankalpam records</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Inventory Units</span>
                  <span className="text-lg font-bold text-white">{shardInventory.length}</span>
                  <span className="text-[10px] text-slate-500 block">Storehouse SKUs</span>
                </div>
              </div>
            </div>

            {/* Global RBAC Role Simulator */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-bold text-saffron-300 uppercase tracking-wider mb-3">
                Change Super Admin Password
              </h4>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password (min 6 chars)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-saffron-500"
                />
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isUpdatingPassword || !newPassword}
                  className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 disabled:opacity-50 text-slate-950 font-bold text-xs"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Note: You must have logged in using platform owner credentials to change your password.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Global RBAC Role Switching (Instant Permission Override)
              </h4>
              {/* SECURITY (C-1): the one-click SuperAdmin self-grant is removed.
                  The owner already holds SuperAdmin from the allowlisted unlock
                  above; these buttons only preview lesser roles. */}
              <div className="flex flex-wrap gap-2">
                {(['Trustee', 'Accountant', 'Priest', 'Sevadar', 'Devotee'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      switchRole(r);
                      showToast(`Role switched to: ${r}`, 'success');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentRole === r
                        ? 'bg-saffron-500 text-slate-950 shadow-md font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Sovereign System Override Active: Cross-workspace supervisory privileges enabled</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
