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
 * Access: the platform owner (allowlisted email / canonical UID) or a
 * delegated admin holding a platformAdmins/{uid} grant (QUEUED #21).
 * Email+password or Google sign-in. A refused attempt NEVER signs the
 * user out of the main app (QUEUED #42): this console gates ITSELF, not
 * the app session — the old "signed straight back out" behaviour meant
 * one mistyped gate attempt destroyed the owner's app session, and the
 * refusal itself was invisible (a transient corner toast was the only
 * signal). Refusals now state their reason in plain words ON the gate.
 * Delegated roles see only their sections — owner-only tabs (API keys,
 * billing, commission, finance, database, settings, system, admins)
 * stay hidden — and firestore.rules remain the real boundary behind
 * every action.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { appLocale } from '../../lib/format';
import {
  Lock, KeyRound, LayoutDashboard, Users, Building2, BadgeCheck,
  ShieldAlert, CreditCard, MessageSquare, ScrollText, Server,
  X, AlertTriangle, CheckCircle2, RefreshCw,
  Database, Megaphone, SlidersHorizontal, LifeBuoy, HandCoins, Store, Crown, Rocket,
  Wallet, Languages, ShieldCheck,
} from 'lucide-react';
import { auth, signInWithEmailAndPassword, signInWithPopup, googleProvider, sendPasswordResetEmail } from '../../firebase';
import { isOwnerEmail } from '../../config/ownerAllowlist';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { adminApi, BACKEND_URL, BACKEND_DEPLOYED_HINT, type PlatformOverview, type HealthStatus } from '../../lib/adminApi';
import { runDueJobs, getDueJobsRunLog } from '../../lib/dueJobsService';
import { runTotals, type DueJobsRunReport } from '../../lib/dueJobs';
import { UsersTab, WorkspacesTab, VerificationTab } from './godmode/AdminTabsA';
import { ModerationTab, BillingTab, MessagesTab, AuditTab } from './godmode/AdminTabsB';
import { InsightsTab, DatabaseExplorerTab } from './godmode/AdminTabsC';
import { CommissionTab, ContentTab } from './godmode/AdminTabsD';
import { SettingsTab, SupportTab } from './godmode/AdminTabsE';
import { MarketplaceTab } from './godmode/AdminTabsF';
import { ProfessionalsTab } from './godmode/AdminTabsJ';
import { FinanceTab } from './godmode/AdminTabsJ';
import { AppGrowthTab } from '../../appgrowth/admin/AppGrowthTab';
import { ApiKeyManager } from '../../apikeys/admin/ApiKeyManager';
import { TranslationsTab } from './godmode/TranslationsTab';
import { RankingTab } from './godmode/RankingTab';
import { CopilotLauncher } from '../../ai/godmode/CopilotPanel';
import { AdminsTab } from './godmode/AdminsTab';
import { ConsoleHeader } from './godmode/ConsoleHeader';
import { NeedsAttention } from './godmode/NeedsAttention';
import { useConsoleStatus } from './godmode/useConsoleStatus';
import { buildHandItems, identityFor } from './godmode/consoleChrome';
import { resolveRoleForUserDetailed } from '../../lib/platformAdmins';
import { canAccessTab, type PlatformRole, type RoleResolutionReason } from '../../lib/platformAdminRoles';

interface GodModeConsole2Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'overview' | 'users' | 'admins' | 'workspaces' | 'verification' | 'moderation'
  | 'billing' | 'commission' | 'finance' | 'messages' | 'audit'
  | 'database' | 'content' | 'settings' | 'support' | 'marketplace'
  | 'professionals' | 'growth' | 'apikeys' | 'translations' | 'ranking' | 'system';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Insights', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'admins', label: 'Admins', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'workspaces', label: 'Workspaces', icon: <Building2 className="w-4 h-4" /> },
  { id: 'verification', label: 'Verification', icon: <BadgeCheck className="w-4 h-4" /> },
  { id: 'moderation', label: 'Moderation', icon: <ShieldAlert className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'commission', label: 'Commission', icon: <HandCoins className="w-4 h-4" /> },
  { id: 'finance', label: 'Finance', icon: <Wallet className="w-4 h-4" /> },
  { id: 'marketplace', label: 'Marketplace', icon: <Store className="w-4 h-4" /> },
  { id: 'professionals', label: 'Professionals', icon: <Crown className="w-4 h-4" /> },
  { id: 'growth', label: 'App Growth', icon: <Rocket className="w-4 h-4" /> },
  { id: 'apikeys', label: 'API Keys', icon: <KeyRound className="w-4 h-4" /> },
  { id: 'translations', label: 'Translations', icon: <Languages className="w-4 h-4" /> },
  { id: 'ranking', label: 'Ranking', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" /> },
  { id: 'content', label: 'Content', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'support', label: 'Support', icon: <LifeBuoy className="w-4 h-4" /> },
  { id: 'audit', label: 'Audit Log', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Server className="w-4 h-4" /> },
];

/* --------------------- Gate refusal language (QUEUED #42) -------------------- */

/**
 * Plain-words reason for a refused unlock, rendered ON the gate itself.
 * The gate previously reported every outcome only through a transient
 * corner toast — in a modal flow that is effectively silence, which is
 * how a refused attempt could look like "nothing happened". These lines
 * are persistent, specific, and name the signed-in account so a
 * wrong-account state is obvious at a glance.
 */
function gateReasonText(reason: RoleResolutionReason, email: string | null | undefined): string {
  const who = email ? ` (${email})` : '';
  switch (reason) {
    case 'no-grant':
      return `This account${who} has no platform admin access. Only the platform owner or a delegated admin can open this console — if this should be the owner, check that the email above is the owner email.`;
    case 'revoked':
      return `This account's admin access has been revoked${who}. The platform owner can restore it from the Admins tab inside the console.`;
    case 'malformed':
      return `This account's admin grant could not be read (its stored role is damaged)${who}. The platform owner can repair it from the Admins tab inside the console.`;
    case 'lookup-failed':
      return 'Your admin access could not be verified — the admin registry could not be read (connection or permissions problem). Nothing was changed and you have NOT been signed out of the app. Check your connection and try again.';
    case 'signed-out':
      return 'You are not signed in. Enter the owner or delegated-admin email and password below.';
    default:
      return 'This account is not authorized for system override.';
  }
}

/** Plain-words translation of the Firebase sign-in errors the gate can hit. */
function authErrorText(err: any): string {
  const code = typeof err?.code === 'string' ? err.code : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password do not match a Firebase account. If the owner account was created with Google sign-in it may have no password at all — use "Continue with Google" below instead. You have NOT been signed out of the app.';
    case 'auth/invalid-email':
      return 'That email address does not look valid.';
    case 'auth/user-disabled':
      return 'This account has been disabled in Firebase Authentication.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts — Firebase has paused sign-ins for this account for a while. Wait a few minutes, then try again.';
    case 'auth/network-request-failed':
      return 'Network problem — the sign-in request never reached Firebase. Check your connection and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The Google sign-in window was closed before it finished. Nothing was changed.';
    default:
      return err?.message || 'Authentication failed.';
  }
}

/**
 * Session note for a refused gate attempt (QUEUED #42). A refused attempt
 * NEVER signs the user out — but if the attempt itself signed in as a
 * DIFFERENT account than the one the app was using, Firebase has already
 * replaced the session and it cannot be silently restored (that would
 * need the old account's credentials). Say so plainly instead of letting
 * the user discover it later at a bounced /app/home.
 */
function sessionNote(priorUid: string | null, priorEmail: string | null, nowUid: string | null): string {
  if (priorUid && nowUid && priorUid !== nowUid) {
    return ` Note: this attempt signed the app in as a different account, replacing your previous session (${priorEmail || 'a different account'}). It cannot be restored without that account's credentials — sign in again from the main login if you need it back.`;
  }
  if (priorUid) return ' Your main app session has NOT been signed out.';
  return '';
}

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

/** Shared: badge for actions that genuinely need the Express backend
 * (Firebase Auth Admin API, FCM, outbound email). Shown on the button itself —
 * the tab keeps working for everything else. */
export const RequiresBackendBadge: React.FC<{ label?: string }> = ({ label }) => (
  <span
    title="This action needs the deployed Cloud Functions backend (Firebase Auth Admin API). Everything else on this tab works in Spark-native mode."
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/40 text-[11px] font-black"
  >
    <Server className="w-3 h-3" /> {label || 'Requires backend'}
  </span>
);

/** Shared: destructive-action confirm dialog. */
export const ConfirmDialog: React.FC<{
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  working?: boolean;
  children?: React.ReactNode;
}> = ({ title, body, confirmLabel = 'Confirm', onConfirm, onCancel, working, children }) => (
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
      {children}
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

/* ------------------------------ System tab ------------------------------- */

/* ------------------------- Due jobs (QUEUED #15) ------------------------- */

const DUE_JOB_LABELS: Record<string, string> = {
  'samskara-age': 'Samskara age milestones',
  shraddha: 'Shraddha remembrances',
  ceremony: 'Ceremony plans',
  'reminder-queue': 'Server reminder queue',
};

const DueJobsCard: React.FC = () => {
  const { firebaseUser } = useAuthWorkspace();
  const [running, setRunning] = useState(false);
  const [fresh, setFresh] = useState<DueJobsRunReport | null>(null);
  const [log, setLog] = useState<DueJobsRunReport[]>(() => getDueJobsRunLog());

  const run = async () => {
    if (!firebaseUser?.uid || running) return;
    setRunning(true);
    try {
      const r = await runDueJobs({ uid: firebaseUser.uid, trigger: 'manual' });
      setFresh(r);
      setLog(getDueJobsRunLog());
    } finally {
      setRunning(false);
    }
  };

  const shown = fresh ?? log[0] ?? null;
  const totals = shown ? runTotals(shown) : null;

  return (
    <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
      <h3 className="text-sm font-bold text-slate-200 mb-2">🕐 Scheduled jobs — run due jobs</h3>
      <p className="text-xs text-slate-400 leading-relaxed mb-3">
        Spark has no server cron and Cloud Functions are not deployed, so due work is dispatched
        from devices: every app open runs these jobs for the signed-in devotee (throttled,
        idempotent — a job can never send twice). This button runs them now, for your account,
        on this device, and reports honestly what happened.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={running || !firebaseUser?.uid}
        className="px-4 py-2 min-h-[44px] rounded-xl bg-saffron-500/90 text-xs font-bold text-white hover:bg-saffron-500 disabled:opacity-50"
      >
        {running ? 'Running…' : 'Run due jobs now'}
      </button>
      {shown && totals && (
        <div className="mt-4 text-xs space-y-2">
          <p className="text-slate-400">
            Last run: <span className="text-slate-200 font-semibold">{new Date(shown.at).toLocaleString(appLocale())}</span>
            {' '}({shown.trigger}) — scanned {totals.scanned} · due {totals.due} ·{' '}
            <span className="text-emerald-400">delivered {totals.delivered}</span> · skipped {totals.skipped} ·{' '}
            <span className={totals.failed > 0 ? 'text-red-400' : 'text-slate-400'}>failed {totals.failed}</span>
          </p>
          {shown.outcomes.map((o) => (
            <div key={o.job} className="rounded-lg bg-slate-900/70 border border-slate-800 px-3 py-2">
              <p className="text-slate-200 font-semibold">{DUE_JOB_LABELS[o.job] ?? o.job}</p>
              <p className="text-slate-400">
                scanned {o.scanned} · due {o.due} · delivered {o.delivered} · skipped {o.skipped} · failed {o.failed}
              </p>
              {o.note && <p className="text-slate-500 italic">{o.note}</p>}
            </div>
          ))}
          {log.length > 1 && (
            <p className="text-slate-500">
              Recent runs on this device: {log.slice(0, 5).map((r) => `${new Date(r.at).toLocaleDateString(appLocale())} ${new Date(r.at).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })} (${r.trigger}, ${runTotals(r).delivered} delivered)`).join(' · ')}
            </p>
          )}
        </div>
      )}
      {!shown && (
        <p className="mt-3 text-xs text-slate-500">No runs recorded on this device yet.</p>
      )}
    </div>
  );
};

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
          {health?.mode === 'spark-native' && (
            <p className="font-sans text-sky-300/90 bg-sky-500/10 border border-sky-500/30 rounded-xl p-3">
              Spark-native mode is active: admin operations run directly on Firestore under owner-validated
              security rules — no server, no cost. Deploy Cloud Functions to unlock Auth user disable/enable,
              FCM push, and outbound email.
            </p>
          )}
          <p className="text-slate-500 font-sans">Set this env var to your deployed Cloud Functions base URL. Deploy with:</p>
          <p className="bg-slate-900 rounded-lg p-2.5 text-emerald-300">firebase deploy --only functions</p>
        </div>
      </div>

      <DueJobsCard />

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
            {health?.functionsDeployed
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              : <X className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>Cloud Functions — {health?.functionsDeployed ? 'reachable' : 'not detected (deploy required)'}</span>
          </li>
          {health?.mode === 'spark-native' && (
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Spark-native admin — active (Firestore + owner rules)</span>
            </li>
          )}
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
  const [adminRole, setAdminRole] = useState<PlatformRole | null>(null);
  const [godEmail, setGodEmail] = useState('');
  const [godAccessKey, setGodAccessKey] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Persistent on-gate notice (QUEUED #42): every refusal or sign-in
  // failure explains itself HERE, in the gate card — never only via a
  // transient toast the user may never see.
  const [gateNotice, setGateNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // Shell chrome facts (QUEUED #39): API light, pending claims, due
  // subscriptions, new support — loaded only for the unlocked role and
  // gated per fact by the same #21 matrix as the tabs. Feeds the
  // branded header's status strip + the "Needs your hand" summary.
  const status = useConsoleStatus(isUnlocked ? adminRole : null);

  // Unlock resolution (QUEUED #21): the owner unlocks from the allowlist
  // alone — the delegation registry is never consulted for them, so a broken
  // or empty registry can never lock the owner out. Anyone else must hold a
  // platformAdmins grant; resolution failure fails safe to locked.
  // (QUEUED #42): resolution is DETAILED — a signed-in user who is refused
  // gets the reason on the gate itself, instead of a locked gate in silence.
  useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    void resolveRoleForUserDetailed(firebaseUser.uid, firebaseUser.email).then((res) => {
      if (cancelled) return;
      if (res.role) {
        setAdminRole(res.role);
        setIsUnlocked(true);
        setGateNotice(null);
      } else {
        setGateNotice({ kind: 'error', text: gateReasonText(res.reason, firebaseUser.email) });
      }
    });
    return () => { cancelled = true; };
  }, [firebaseUser?.uid, firebaseUser?.email]);

  // Tabs this role may see; if the open tab falls outside the role (e.g.
  // role resolved after mount), fall back to the first visible tab.
  const visibleTabs = TABS.filter((t) => canAccessTab(adminRole, t.id));
  useEffect(() => {
    if (isUnlocked && adminRole && !canAccessTab(adminRole, tab)) {
      setTab((TABS.find((t) => canAccessTab(adminRole, t.id))?.id ?? 'overview') as TabId);
    }
  }, [isUnlocked, adminRole, tab]);

  // Landing on Insights re-checks the hand facts (throttled in the hook).
  const statusRefresh = status.refresh;
  useEffect(() => {
    if (isUnlocked && tab === 'overview') statusRefresh();
  }, [isUnlocked, tab, statusRefresh]);

  if (!isOpen) return null;

  const handleForgotPassword = async () => {
    const email = godEmail.trim();
    if (!email) {
      showToast('Enter your owner email first, then tap Forgot password.', 'error');
      return;
    }
    if (resetCooldown > 0) {
      showToast(`Please wait ${resetCooldown}s before requesting another reset email.`, 'error');
      return;
    }
    try {
      // SECURITY: Only the owner email can receive a reset link.
      // Non-owner emails get a generic message (no email enumeration).
      if (isOwnerEmail(email)) {
        await sendPasswordResetEmail(auth, email);
      }
      // Generic message either way — never reveal whether the email is the owner.
      setResetSent(true);
      setResetCooldown(60);
      const timer = setInterval(() => {
        setResetCooldown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
      showToast('If this email is registered, a password reset link has been sent.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset email.', 'error');
    }
  };

  const handleUnlockGodMode = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = godEmail.trim();
    if (!email) {
      setGateNotice({ kind: 'error', text: 'Please enter your administrator email and password.' });
      return;
    }
    // The session that was live BEFORE this attempt (QUEUED #42): a
    // refused attempt must never destroy it, so this handler NEVER calls
    // auth.signOut() — the console gates itself, not the app.
    const priorUid = auth.currentUser?.uid ?? null;
    const priorEmail = auth.currentUser?.email ?? null;
    try {
      await signInWithEmailAndPassword(auth, email, godAccessKey);
      const res = await resolveRoleForUserDetailed(auth.currentUser?.uid, auth.currentUser?.email);
      if (!res.role) {
        setGateNotice({
          kind: 'error',
          text: gateReasonText(res.reason, auth.currentUser?.email ?? email)
            + sessionNote(priorUid, priorEmail, auth.currentUser?.uid ?? null),
        });
        return;
      }
      setGateNotice(null);
      setAdminRole(res.role);
      setIsUnlocked(true);
      switchRole('SuperAdmin');
      showToast('Authenticated successfully.', 'success');
    } catch (err: any) {
      setGateNotice({ kind: 'error', text: authErrorText(err) });
    }
  };

  const handleGoogleGodMode = async () => {
    // Same law as the password path (QUEUED #42): never sign out on a
    // refusal; the reason is stated on the gate.
    const priorUid = auth.currentUser?.uid ?? null;
    const priorEmail = auth.currentUser?.email ?? null;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const res = await resolveRoleForUserDetailed(result.user?.uid, result.user?.email);
      if (!res.role) {
        setGateNotice({
          kind: 'error',
          text: gateReasonText(res.reason, result.user?.email)
            + sessionNote(priorUid, priorEmail, result.user?.uid ?? null),
        });
        return;
      }
      setGateNotice(null);
      setAdminRole(res.role);
      setIsUnlocked(true);
      switchRole('SuperAdmin');
      showToast('Authenticated successfully via Google.', 'success');
    } catch (err: any) {
      setGateNotice({ kind: 'error', text: authErrorText(err) });
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setIsUnlocked(false);
    setAdminRole(null);
    onClose();
  };

  const renderTab = () => {
    switch (tab) {
      case 'overview': return <InsightsTab goToTab={(t: string) => setTab(t as TabId)} />;
      case 'users': return <UsersTab />;
      case 'admins': return <AdminsTab />;
      case 'workspaces': return <WorkspacesTab />;
      case 'verification': return <VerificationTab />;
      case 'moderation': return <ModerationTab />;
      case 'billing': return <BillingTab />;
      case 'commission': return <CommissionTab />;
      case 'finance': return <FinanceTab goToTab={(t: string) => setTab(t as TabId)} />;
      case 'marketplace': return <MarketplaceTab />;
      case 'professionals': return <ProfessionalsTab />;
      case 'growth': return <AppGrowthTab />;
      case 'apikeys': return <ApiKeyManager />;
      case 'translations': return <TranslationsTab />;
      case 'ranking': return <RankingTab />;
      case 'messages': return <MessagesTab />;
      case 'database': return <DatabaseExplorerTab />;
      case 'content': return <ContentTab />;
      case 'settings': return <SettingsTab />;
      case 'support': return <SupportTab />;
      case 'audit': return <AuditTab />;
      case 'system': return <SystemTab />;
    }
  };

  const handItems = buildHandItems(adminRole, status.facts);
  const identity = identityFor(firebaseUser, adminRole);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-saffron-500/40 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Branded header + status strip (QUEUED #39) */}
        <ConsoleHeader
          unlocked={isUnlocked}
          role={adminRole}
          identity={identity}
          facts={status.facts}
          handItems={handItems}
          loadedAt={status.loadedAt}
          tabs={visibleTabs}
          onNavigate={(t) => setTab(t as TabId)}
          onSignOut={handleSignOut}
          onClose={onClose}
        />

        {!isUnlocked ? (
          /* ------------------------- Login (unchanged security) ------------------------- */
          <div className="p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-saffron-500/10 border border-saffron-500/30 flex items-center justify-center text-saffron-400 mb-4 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Sovereign Access</h3>
            <p className="text-xs text-slate-400 mb-6">Platform admin authentication required. The console stays locked for accounts without owner status or a delegation grant — and a refused attempt never signs you out of the app.</p>
            {firebaseUser && (
              <p className="text-[11px] text-slate-500 -mt-4 mb-4">
                Signed in to the app as{' '}
                <span className="text-slate-300 font-semibold">{firebaseUser.email ?? firebaseUser.uid}</span>
              </p>
            )}
            {gateNotice && (
              <div
                role="alert"
                className={`w-full rounded-xl border px-4 py-3 mb-5 text-left text-xs leading-relaxed ${
                  gateNotice.kind === 'error'
                    ? 'border-red-500/40 bg-red-500/10 text-red-200'
                    : 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                }`}
              >
                {gateNotice.text}
              </div>
            )}
            <form onSubmit={handleUnlockGodMode} className="w-full space-y-4">
              <input
                type="email"
                value={godEmail}
                onChange={(e) => setGodEmail(e.target.value)}
                placeholder="Admin email"
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
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetCooldown > 0}
                className="w-full text-xs text-slate-500 hover:text-saffron-400 underline underline-offset-2 disabled:opacity-50 disabled:no-underline"
              >
                {resetCooldown > 0 ? `Reset email sent — retry in ${resetCooldown}s` : resetSent ? 'Resend password reset email' : 'Forgot password?'}
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
              {visibleTabs.map((t) => (
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
              {visibleTabs.map((t) => (
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
              {tab === 'overview' && (
                <NeedsAttention
                  role={adminRole}
                  facts={status.facts}
                  loadedAt={status.loadedAt}
                  loading={status.loading}
                  onRefresh={() => status.refresh(true)}
                  onNavigate={(t) => setTab(t as TabId)}
                />
              )}
              {renderTab()}
            </main>
          </div>
        )}
        {/* GodMode Copilot — owner-only AI assistant (its intents are
            owner-scoped by design, so delegated admins do not get it). */}
        {isUnlocked && adminRole === 'owner' && (
          <CopilotLauncher
            uid={(firebaseUser as { uid?: string } | null)?.uid || 'owner'}
            lang="en"
            onNavigateToTab={(t) => setTab(t as TabId)}
          />
        )}
      </div>
    </div>
  );
};

export default GodModeConsole2;
