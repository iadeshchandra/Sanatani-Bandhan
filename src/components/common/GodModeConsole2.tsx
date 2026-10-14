/**
 * GodModeConsole2 — sovereign admin console, rebuilt.
 *
 * Replaces the old inspection-panel GodModeBackend with a real admin console
 * wired to the Cloud Functions backend (adminApi.ts).
 *
 * Honesty rules baked in:
 * - Every metric shows loading → live data → or an honest error/empty state.
 * - No fake timers, no fake "100% isolated" badges, no invented figures.
 * - If the backend is unreachable, every tab says so plainly with deploy
 *   instructions instead of failing silently.
 *
 * Access: owner-only. Email+password or Google sign-in, verified email must be
 * on the owner allowlist (src/config/ownerAllowlist.ts). Non-owners are signed
 * straight back out.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock, KeyRound, LayoutDashboard, Users, Building2, BadgeCheck,
  ShieldAlert, CreditCard, MessageSquare, ScrollText, Server,
  X, AlertTriangle, CheckCircle2, RefreshCw, LogOut,
} from 'lucide-react';
import { auth, signInWithEmailAndPassword, signInWithPopup, googleProvider } from '../../firebase';
import { isOwnerEmail } from '../../config/ownerAllowlist';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { adminApi, BACKEND_URL, BACKEND_DEPLOYED_HINT, type PlatformOverview, type HealthStatus } from '../../lib/adminApi';
import { UsersTab, WorkspacesTab, VerificationTab } from './godmode/AdminTabsA';
import { ModerationTab, BillingTab, MessagesTab, AuditTab } from './godmode/AdminTabsB';

interface GodModeConsole2Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'overview' | 'users' | 'workspaces' | 'verification' | 'moderation' | 'billing' | 'messages' | 'audit' | 'system';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'workspaces', label: 'Workspaces', icon: <Building2 className="w-4 h-4" /> },
  { id: 'verification', label: 'Verification', icon: <BadgeCheck className="w-4 h-4" /> },
  { id: 'moderation', label: 'Moderation', icon: <ShieldAlert className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'audit', label: 'Audit Log', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Server className="w-4 h-4" /> },
];

/** Shared: honest backend-down banner shown inside any tab. */
export const BackendDownBanner: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-amber-200">Backend not reachable</p>
        <p className="text-amber-200/70 text-xs mt-1 font-mono break-all">{BACKEND_DEPLOYED_HINT}</p>
        <p className="text-amber-200/50 text-xs mt-2">
          Target: <span className="font-mono">{BACKEND_URL}</span>
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 px-4 py-2 min-h-[44px] rounded-xl bg-amber-500/20 text-amber-200 text-xs font-bold hover:bg-amber-500/30"
          >
            <span className="inline-flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Retry</span>
          </button>
        )}
      </div>
    </div>
  </div>
);

/** Shared: destructive-action confirm dialog. */
export const ConfirmDialog: React.FC<{
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  working?: boolean;
}> = ({ title, body, confirmLabel = 'Confirm', onConfirm, onCancel, working }) => (
  <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
    <div
      className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-400 mb-5">{body}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={working}
          className="flex-1 px-4 py-3 min-h-[44px] rounded-xl bg-slate-800 text-slate-200 text-sm font-bold hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={working}
          className="flex-1 px-4 py-3 min-h-[44px] rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-50"
        >
          {working ? 'Working…' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

/* ------------------------------ Overview tab ----------------------------- */

const OverviewTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [backendDown, setBackendDown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setBackendDown(false);
    const [ov, hl] = await Promise.all([adminApi.overview(), adminApi.health()]);
    if (ov.backendDown || hl.backendDown) {
      setBackendDown(true);
    } else {
      if (ov.ok && ov.data?.overview) setOverview(ov.data.overview);
      else setErr(ov.error || 'Could not load overview.');
      if (hl.ok && hl.data) setHealth(hl.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading live platform data…
      </div>
    );
  }
  if (backendDown) return <BackendDownBanner onRetry={load} />;
  if (err) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200">
        {err}
        <button type="button" onClick={load} className="ml-3 underline text-xs">Retry</button>
      </div>
    );
  }

  const cards = [
    { label: 'Workspaces', value: overview?.workspaces ?? '—' },
    { label: 'Users', value: overview?.users ?? '—' },
    { label: 'Tenants', value: overview?.tenants ?? '—' },
  ];

  return (
    <div className="space-y-5">
      {/* Backend health strip — real data only */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
        health?.status === 'ok' ? 'border-emerald-500/30 bg-emerald-500/5'
        : health?.status === 'degraded' ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-red-500/30 bg-red-500/5'
      }`}>
        <span className={`w-3 h-3 rounded-full ${
          health?.status === 'ok' ? 'bg-emerald-400' : health?.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
        }`} />
        <div className="text-sm">
          <span className="font-bold text-slate-200">Backend: {health?.status ?? 'unknown'}</span>
          {health?.version && <span className="text-slate-500 text-xs ml-2 font-mono">v{health.version}</span>}
          {health?.region && <span className="text-slate-500 text-xs ml-2 font-mono">{health.region}</span>}
          {typeof health?.uptimeSeconds === 'number' && (
            <span className="text-slate-500 text-xs ml-2">uptime {Math.floor(health.uptimeSeconds / 3600)}h</span>
          )}
        </div>
        <button type="button" onClick={load} className="ml-auto p-2 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-white" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">{c.label}</p>
            <p className="text-2xl font-black text-white mt-1">{typeof c.value === 'number' && c.value < 0 ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
        <h3 className="text-sm font-bold text-slate-200 mb-3">Recent workspaces</h3>
        {!overview?.recentWorkspaces?.length ? (
          <p className="text-xs text-slate-500">No workspaces yet.</p>
        ) : (
          <div className="space-y-2">
            {overview.recentWorkspaces.map((w) => (
              <div key={w.id} className="flex items-center gap-3 text-xs py-2 border-b border-slate-800/50 last:border-0">
                <span className="font-bold text-slate-200 truncate flex-1">{w.name || w.id}</span>
                {w.type && <span className="text-slate-500">{w.type}</span>}
                {w.planId && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">{w.planId}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {overview?.generatedAt && (
          <p className="text-[11px] text-slate-600 mt-3">Updated {new Date(overview.generatedAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
};

/* ------------------------------ System tab ------------------------------- */

const SystemTab: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const hl = await adminApi.health();
    setBackendDown(!!hl.backendDown);
    if (hl.ok && hl.data) setHealth(hl.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-3">Backend configuration</h3>
        <div className="text-xs space-y-2 font-mono break-all">
          <p><span className="text-slate-500">VITE_BACKEND_URL = </span><span className="text-saffron-300">{BACKEND_URL}</span></p>
          <p className="text-slate-500 font-sans">Set this env var to your deployed Cloud Functions base URL. Deploy with:</p>
          <p className="bg-slate-900 rounded-lg p-2.5 text-emerald-300">firebase deploy --only functions</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-3">Live health</h3>
        {loading ? (
          <p className="text-xs text-slate-500"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Checking…</p>
        ) : backendDown ? (
          <BackendDownBanner onRetry={load} />
        ) : health ? (
          <div className="text-xs space-y-2">
            <p><span className="text-slate-500">Status:</span> <span className="font-bold text-white">{health.status}</span></p>
            {health.version && <p><span className="text-slate-500">Version:</span> <span className="font-mono text-slate-300">{health.version}</span></p>}
            {health.region && <p><span className="text-slate-500">Region:</span> <span className="font-mono text-slate-300">{health.region}</span></p>}
            {typeof health.uptimeSeconds === 'number' && <p><span className="text-slate-500">Uptime:</span> <span className="text-slate-300">{Math.floor(health.uptimeSeconds / 60)} min</span></p>}
            {health.checks && (
              <div className="pt-2">
                <p className="text-slate-500 mb-1.5">Dependency checks:</p>
                {Object.entries(health.checks).map(([k, v]) => (
                  <p key={k} className="font-mono">
                    <span className="text-slate-400">{k}:</span>{' '}
                    <span className={v === 'ok' ? 'text-emerald-400' : v === 'degraded' ? 'text-amber-400' : 'text-red-400'}>{String(v)}</span>
                  </p>
                ))}
              </div>
            )}
            <button type="button" onClick={load} className="mt-2 px-4 py-2 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700">
              Re-check
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No health data.</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-2">Deployment status</h3>
        <ul className="text-xs text-slate-400 space-y-1.5">
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Hosting + Firestore rules — deployed via CI</li>
          <li className="flex items-center gap-2">
            {backendDown
              ? <X className="w-4 h-4 text-amber-400 shrink-0" />
              : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>Cloud Functions — {backendDown ? 'not detected (deploy required)' : 'reachable'}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

/* ------------------------------ Main console ----------------------------- */

export const GodModeConsole2: React.FC<GodModeConsole2Props> = ({ isOpen, onClose }) => {
  const { switchRole, firebaseUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>('overview');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [godEmail, setGodEmail] = useState('');
  const [godAccessKey, setGodAccessKey] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isOwnerEmail(firebaseUser?.email)) setIsUnlocked(true);
  }, [firebaseUser?.email]);

  if (!isOpen) return null;

  const handleUnlockGodMode = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      showToast(err.message || 'Authentication failed.', 'error');
    }
  };

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

  const handleSignOut = async () => {
    await auth.signOut();
    setIsUnlocked(false);
    onClose();
  };

  const renderTab = () => {
    switch (tab) {
      case 'overview': return <OverviewTab />;
      case 'users': return <UsersTab />;
      case 'workspaces': return <WorkspacesTab />;
      case 'verification': return <VerificationTab />;
      case 'moderation': return <ModerationTab />;
      case 'billing': return <BillingTab />;
      case 'messages': return <MessagesTab />;
      case 'audit': return <AuditTab />;
      case 'system': return <SystemTab />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-saffron-500/40 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-saffron-950/70 border-b border-saffron-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-saffron-400 to-saffron-500 flex items-center justify-center text-slate-950 text-xl shrink-0">👑</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-saffron-200">Sovereign Console</h2>
                <span className="px-2 py-0.5 rounded-md bg-saffron-500/20 text-saffron-300 text-[10px] font-mono border border-saffron-500/40 uppercase font-bold">v2.0</span>
              </div>
              <p className="text-xs text-slate-400 truncate">Platform administration — live backend data</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isUnlocked && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              Exit
            </button>
          </div>
        </div>

        {!isUnlocked ? (
          /* ------------------------- Login (unchanged security) ------------------------- */
          <div className="p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-saffron-500/10 border border-saffron-500/30 flex items-center justify-center text-saffron-400 mb-4 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Sovereign Access</h3>
            <p className="text-xs text-slate-400 mb-6">Owner authentication required. Non-owner accounts are signed straight back out.</p>
            <form onSubmit={handleUnlockGodMode} className="w-full space-y-4">
              <input
                type="email"
                value={godEmail}
                onChange={(e) => setGodEmail(e.target.value)}
                placeholder="Owner email"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 min-h-[44px] text-sm text-saffron-300 focus:ring-2 focus:ring-saffron-500 outline-none"
              />
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={godAccessKey}
                  onChange={(e) => setGodAccessKey(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-sm text-saffron-300 font-mono focus:ring-2 focus:ring-saffron-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110"
              >
                Authenticate
              </button>
            </form>
            <div className="w-full flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
            <button
              type="button"
              onClick={handleGoogleGodMode}
              className="w-full py-3 min-h-[44px] rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 flex items-center justify-center gap-2"
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
          /* ------------------------- Console body ------------------------- */
          <div className="flex flex-1 min-h-0">
            {/* Sidebar — desktop */}
            <nav className="hidden md:flex flex-col w-52 shrink-0 border-r border-slate-800 p-3 space-y-1 overflow-y-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-left transition-colors ${
                    tab === t.id ? 'bg-saffron-500/15 text-saffron-300 border border-saffron-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Mobile tab bar */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 z-10 bg-slate-950/95 border-t border-slate-800 px-1 py-1 flex overflow-x-auto gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[64px] min-h-[52px] rounded-lg text-[10px] font-semibold shrink-0 ${
                    tab === t.id ? 'text-saffron-300 bg-saffron-500/10' : 'text-slate-500'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
              <h2 className="text-lg font-black text-white mb-4 md:hidden">
                {TABS.find((t) => t.id === tab)?.label}
              </h2>
              {renderTab()}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default GodModeConsole2;
