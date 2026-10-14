/**
 * AdminTabsA — Users, Workspaces, Verification tabs for GodModeConsole2.
 * All data comes from the backend via adminApi. Honest loading/error states.
 */
import React, { useState, useCallback } from 'react';
import { Search, RefreshCw, Ban, CheckCircle2, XCircle } from 'lucide-react';
import { adminApi, type UserRecord, type WorkspaceRecord, type VerificationApplication } from '../../../lib/adminApi';
import { BackendDownBanner, ConfirmDialog, RequiresBackendBadge } from '../GodModeConsole2';
import { useToast } from '../../../context/ToastContext';

/* -------------------------------- Users --------------------------------- */

export const UsersTab: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendDown, setBackendDown] = useState(false);
  const [confirm, setConfirm] = useState<'disable' | 'enable' | null>(null);
  const [working, setWorking] = useState(false);
  const [needsBackend, setNeedsBackend] = useState(false);

  const search = useCallback(async () => {
    if (!email.trim()) return;
    setLoading(true);
    setUser(null);
    setBackendDown(false);
    const r = await adminApi.lookupUser(email.trim());
    setLoading(false);
    if (r.backendDown) { setBackendDown(true); return; }
    if (r.ok && r.data?.user) {
      setUser(r.data.user);
    } else {
      showToast(r.error || 'User not found.', 'error');
    }
  }, [email, showToast]);

  const doToggle = async () => {
    if (!user || !confirm) return;
    setWorking(true);
    const r = confirm === 'disable'
      ? await adminApi.disableUser(user.uid)
      : await adminApi.enableUser(user.uid);
    setWorking(false);
    setConfirm(null);
    if (r.ok) {
      showToast(`User ${confirm}d.`, 'success');
      setUser({ ...user, disabled: confirm === 'disable' });
    } else if (r.requiresBackend) {
      setNeedsBackend(true);
    } else {
      showToast(r.error || 'Action failed.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search user by email…"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500"
          />
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="px-5 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black hover:brightness-110 disabled:opacity-50"
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {backendDown && <BackendDownBanner onRetry={search} />}

      {user && (
        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-white">{user.displayName || 'No name'}</p>
              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-1">UID: {user.uid}</p>
              <div className="flex gap-2 mt-2 text-[11px]">
                <span className={`px-2 py-0.5 rounded-full font-bold ${user.disabled ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {user.disabled ? 'DISABLED' : 'ACTIVE'}
                </span>
                {user.emailVerified && <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">email verified</span>}
              </div>
              {user.lastSignInTime && <p className="text-[11px] text-slate-500 mt-2">Last sign-in: {new Date(user.lastSignInTime).toLocaleString()}</p>}
            </div>
            <button
              type="button"
              onClick={() => setConfirm(user.disabled ? 'enable' : 'disable')}
              className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black flex items-center gap-2 ${
                user.disabled ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30'
              }`}
            >
              {user.disabled ? <><CheckCircle2 className="w-4 h-4" /> Enable</> : <><Ban className="w-4 h-4" /> Disable</>}
            </button>
            {needsBackend && <div className="mt-2"><RequiresBackendBadge label="Disable/enable needs the backend" /></div>}
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm === 'disable' ? 'Disable this account?' : 'Re-enable this account?'}
          body={confirm === 'disable'
            ? `The user ${user?.email} will be signed out immediately and cannot sign back in until re-enabled. This is logged in the audit trail.`
            : `The user ${user?.email} will be able to sign in again. This is logged in the audit trail.`}
          confirmLabel={confirm === 'disable' ? 'Disable account' : 'Enable account'}
          onConfirm={doToggle}
          onCancel={() => setConfirm(null)}
          working={working}
        />
      )}
    </div>
  );
};

/* ------------------------------ Workspaces ------------------------------- */

export const WorkspacesTab: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<WorkspaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);
  const [filter, setFilter] = useState('');
  const [planFor, setPlanFor] = useState<WorkspaceRecord | null>(null);
  const [newPlan, setNewPlan] = useState('STANDARD');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setBackendDown(false);
    const r = await adminApi.listWorkspaces(100);
    setLoading(false);
    if (r.backendDown) { setBackendDown(true); return; }
    if (r.ok && r.data?.workspaces) setItems(r.data.workspaces);
    else showToast(r.error || 'Could not load workspaces.', 'error');
  }, [showToast]);

  React.useEffect(() => { load(); }, [load]);

  const doSetPlan = async () => {
    if (!planFor) return;
    setWorking(true);
    const r = await adminApi.setPlan(planFor.id, newPlan);
    setWorking(false);
    if (r.ok) {
      showToast(`Plan set to ${newPlan}.`, 'success');
      setItems(items.map((w) => (w.id === planFor.id ? { ...w, planId: newPlan } : w)));
      setPlanFor(null);
    } else {
      showToast(r.error || 'Plan change failed.', 'error');
    }
  };

  const toggleBypass = async (w: WorkspaceRecord) => {
    const cur = (w as WorkspaceRecord & { limitsBypassed?: boolean }).limitsBypassed === true;
    const label = cur ? 're-enable freemium limits for' : 'BYPASS all freemium limits for';
    if (!window.confirm(`${label} ${w.name || w.id}?\n\nBypassed workspaces skip devotee/seat/transaction/branch caps. This is recorded in the audit trail.`)) return;
    setWorking(true);
    const r = await adminApi.setLimitsBypass(w.id, !cur);
    setWorking(false);
    if (r.ok) {
      showToast(cur ? 'Limits re-enabled.' : 'Limits bypassed.', 'success');
      setItems(items.map((x) => (x.id === w.id ? { ...x, limitsBypassed: !cur } as WorkspaceRecord : x)));
    } else {
      showToast(r.error || 'Could not update bypass.', 'error');
    }
  };

  const shown = filter.trim()
    ? items.filter((w) => `${w.name || ''} ${w.id} ${w.type || ''}`.toLowerCase().includes(filter.toLowerCase()))
    : items;

  if (loading) return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading workspaces…</p>;
  if (backendDown) return <BackendDownBanner onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, type, or ID…"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500"
        />
      </div>
      <p className="text-xs text-slate-500">{shown.length} workspace{shown.length === 1 ? '' : 's'} (live data)</p>
      <div className="space-y-2">
        {shown.map((w) => (
          <div key={w.id} className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-200 text-sm truncate">{w.name || w.id}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">{w.id}{w.type ? ` · ${w.type}` : ''}{w.city ? ` · ${w.city}` : ''}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-bold">{w.planId || 'LITE'}</span>
            {(w as WorkspaceRecord & { limitsBypassed?: boolean }).limitsBypassed && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-[11px] font-bold">Limits bypassed</span>
            )}
            <button
              type="button"
              onClick={() => toggleBypass(w)}
              disabled={working}
              title="Owner override: skip all freemium usage limits for this workspace"
              className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold ${
                (w as WorkspaceRecord & { limitsBypassed?: boolean }).limitsBypassed
                  ? 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {(w as WorkspaceRecord & { limitsBypassed?: boolean }).limitsBypassed ? '✓ Bypass on' : 'Bypass limits'}
            </button>
            <button
              type="button"
              onClick={() => { setPlanFor(w); setNewPlan(w.planId || 'LITE'); }}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              Change plan
            </button>
          </div>
        ))}
        {shown.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No workspaces found.</p>}
      </div>

      {planFor && (
        <ConfirmDialog
          title={`Set plan for ${planFor.name || planFor.id}?`}
          body={`This changes the workspace plan immediately and is recorded in the audit trail. Current: ${planFor.planId || 'LITE'}.`}
          confirmLabel={`Set to ${newPlan}`}
          onConfirm={doSetPlan}
          onCancel={() => setPlanFor(null)}
          working={working}
        />
      )}
      {/* Plan picker rendered inside the dialog flow */}
      {planFor && (
        <div className="fixed inset-0 z-[55] pointer-events-none flex items-end sm:items-center justify-center p-4 pb-24">
          <div className="pointer-events-auto bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm shadow-2xl">
            <p className="text-xs font-bold text-slate-300 mb-2">New plan</p>
            <div className="grid grid-cols-2 gap-2">
              {['DEMO', 'LITE', 'STANDARD', 'ENTERPRISE'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPlan(p)}
                  className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-black ${
                    newPlan === p ? 'bg-saffron-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ----------------------------- Verification ------------------------------ */
/* Unified queue on the backend's verificationApplications collection.
   Replaces the old PurohitReviewQueue's direct client writes to
   purohitApplications (unsafe — self-approval possible). All decisions now
   go through the API, which denies self-approval and tier-skipping. */

export const VerificationTab: React.FC = () => {
  const { showToast } = useToast();
  const [apps, setApps] = useState<VerificationApplication[]>([]);
  const [kind, setKind] = useState<'all' | 'purohit' | 'jyotish'>('all');
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setBackendDown(false);
    const r = await adminApi.verificationPending(kind === 'all' ? undefined : kind);
    setLoading(false);
    if (r.backendDown) { setBackendDown(true); return; }
    if (r.ok && r.data?.applications) setApps(r.data.applications);
    else showToast(r.error || 'Could not load queue.', 'error');
  }, [kind, showToast]);

  React.useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setWorking(id);
    const r = await adminApi.verificationApprove(id);
    setWorking(null);
    if (r.ok) {
      showToast('Approved — tier updated on the canonical profile.', 'success');
      setApps(apps.filter((a) => a.id !== id));
    } else {
      showToast(r.error || 'Approval failed.', 'error');
    }
  };

  const reject = async (id: string) => {
    if (!reason.trim()) { showToast('Give a rejection reason — the applicant sees it.', 'error'); return; }
    setWorking(id);
    const r = await adminApi.verificationReject(id, reason.trim().slice(0, 500));
    setWorking(null);
    if (r.ok) {
      showToast('Rejected with reason.', 'success');
      setApps(apps.filter((a) => a.id !== id));
      setRejectFor(null);
      setReason('');
    } else {
      showToast(r.error || 'Rejection failed.', 'error');
    }
  };

  if (loading) return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading verification queue…</p>;
  if (backendDown) return <BackendDownBanner onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['all', 'purohit', 'jyotish'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black capitalize ${
              kind === k ? 'bg-saffron-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {k}
          </button>
        ))}
        <button type="button" onClick={load} className="ml-auto p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-white" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-10 text-center">
          <p className="text-3xl mb-2">🪔</p>
          <p className="text-sm font-bold text-slate-300">No pending applications</p>
          <p className="text-xs text-slate-500 mt-1">New purohit/jyotishi tier requests appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm">{a.displayName || a.profileId || a.id}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{a.kind} · profile {a.profileId || '—'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {a.currentTier || 'REGISTERED'} → <span className="text-saffron-300 font-bold">{a.requestedTier || 'next tier'}</span>
                  </p>
                  {a.notes && <p className="text-xs text-slate-500 mt-1.5">{a.notes}</p>}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-black uppercase">pending</span>
              </div>
              {rejectFor === a.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Rejection reason (visible to applicant)…"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={working === a.id}
                      onClick={() => reject(a.id)}
                      className="px-4 py-2.5 min-h-[44px] rounded-xl bg-red-600 text-white text-xs font-black disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Confirm rejection
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectFor(null); setReason(''); }}
                      className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    disabled={working === a.id}
                    onClick={() => approve(a.id)}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50"
                  >
                    {working === a.id ? 'Working…' : '✓ Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectFor(a.id)}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200"
                  >
                    Reject with reason
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-600">Self-approval is denied. Every decision is written to the audit trail.</p>
    </div>
  );
};
