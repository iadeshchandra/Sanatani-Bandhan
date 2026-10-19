/**
 * AdminTabsB — Moderation, Billing, Messages, Audit tabs for GodModeConsole2.
 * All actions go through the backend API (owner-gated, audited server-side).
 */
import React, { useState, useCallback } from 'react';
import { RefreshCw, Flag, EyeOff, AlertTriangle, Ban, CheckCircle2, Send, Clock } from 'lucide-react';
import { adminApi, type ModerationReport, type PaymentClaim, type AuditEntry, type MessageTemplate } from '../../../lib/adminApi';
import { BackendDownBanner, ConfirmDialog } from '../GodModeConsole2';
import { useToast } from '../../../context/ToastContext';
import { PaymentInsightsTab } from './AdminTabsG';
import { TopupsTab, WalletsTab } from './AdminTabsI';

/* ------------------------------- Moderation ------------------------------ */

export const ModerationTab: React.FC = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; targetUid?: string; action: 'dismiss' | 'hide_content' | 'warn_user' | 'suspend_user' | 'unsuspend_user' } | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setBackendDown(false);
    const r = await adminApi.moderationReports('open');
    setLoading(false);
    if (r.backendDown) { setBackendDown(true); return; }
    if (r.ok && r.data?.reports) setReports(r.data.reports);
    else showToast(r.error || 'Could not load reports.', 'error');
  }, [showToast]);

  React.useEffect(() => { load(); }, [load]);

  const doAction = async () => {
    if (!confirm) return;
    setWorking(true);
    const r = confirm.action === 'unsuspend_user' && confirm.targetUid
      ? await adminApi.moderationUnsuspend(confirm.targetUid)
      : await adminApi.moderationAction(confirm.id, confirm.action as 'dismiss' | 'hide_content' | 'warn_user' | 'suspend_user');
    setWorking(false);
    setConfirm(null);
    if (r.ok) {
      showToast(confirm.action === 'unsuspend_user' ? 'Account restored.' : 'Action recorded.', 'success');
      if (confirm.action !== 'unsuspend_user') setReports(reports.filter((x) => x.id !== confirm.id));
    } else {
      showToast(r.error || 'Action failed.', 'error');
    }
  };

  const actionLabel: Record<string, string> = {
    dismiss: 'Dismiss report',
    hide_content: 'Hide content',
    warn_user: 'Warn user',
    suspend_user: 'Suspend user',
    unsuspend_user: 'Unsuspend user',
  };

  if (loading) return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading reports…</p>;
  if (backendDown) return <BackendDownBanner onRetry={load} />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{reports.length} open report{reports.length === 1 ? '' : 's'}</p>
      {reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-10 text-center">
          <p className="text-3xl mb-2">🛡️</p>
          <p className="text-sm font-bold text-slate-300">No open reports</p>
          <p className="text-xs text-slate-500 mt-1">Sangam content reports appear here.</p>
        </div>
      ) : reports.map((rep) => (
        <div key={rep.id} className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <Flag className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{rep.reason || 'Report'}</p>
              <p className="text-[11px] text-slate-500 font-mono">target: {rep.targetType}/{rep.targetId}</p>
              {rep.details && <p className="text-xs text-slate-400 mt-1">{rep.details}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {(['dismiss', 'hide_content', 'warn_user', 'suspend_user'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setConfirm({ id: rep.id, action: a })}
                className={`px-3 py-2 min-h-[44px] rounded-xl text-[11px] font-black ${
                  a === 'suspend_user' ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                  : a === 'dismiss' ? 'bg-slate-800 text-slate-300'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {actionLabel[a]}
              </button>
            ))}
            {rep.targetType === 'user' && rep.targetId && (
              <button
                type="button"
                onClick={() => setConfirm({ id: rep.id, targetUid: rep.targetId, action: 'unsuspend_user' })}
                className="px-3 py-2 min-h-[44px] rounded-xl text-[11px] font-black bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
              >
                {actionLabel['unsuspend_user']}
              </button>
            )}
          </div>
        </div>
      ))}
      {confirm && (
        <ConfirmDialog
          title={actionLabel[confirm.action] + '?'}
          body={confirm.action === 'suspend_user'
            ? 'The reported user will be signed out immediately and see a pause notice. They cannot sign back in until unsuspended. Reversible via Unsuspend. Logged in the audit trail.'
            : confirm.action === 'unsuspend_user'
            ? 'The user will be able to sign in again immediately. Logged in the audit trail.'
            : confirm.action === 'hide_content'
            ? 'The reported content will be hidden from all clients. Logged in the audit trail.'
            : 'This resolves the report. Logged in the audit trail.'}
          confirmLabel={actionLabel[confirm.action]}
          onConfirm={doAction}
          onCancel={() => setConfirm(null)}
          working={working}
        />
      )}
    </div>
  );
};

/* -------------------------------- Billing -------------------------------- */

const BillingClaims: React.FC = () => {
  const { showToast } = useToast();
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState<PaymentClaim | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setBackendDown(false);
    const r = await adminApi.paymentClaims('pending');
    setLoading(false);
    if (r.backendDown) { setBackendDown(true); return; }
    if (r.ok && r.data?.claims) setClaims(r.data.claims);
    else showToast(r.error || 'Could not load claims.', 'error');
  }, [showToast]);

  React.useEffect(() => { load(); }, [load]);

  const approve = async (c: PaymentClaim) => {
    setWorking(c.id);
    const r = await adminApi.claimApprove(c.id);
    setWorking(null);
    setConfirmApprove(null);
    if (r.ok) {
      showToast('Approved — plan activated with server-computed dates.', 'success');
      setClaims(claims.filter((x) => x.id !== c.id));
    } else {
      showToast(r.error || 'Approval failed.', 'error');
    }
  };

  const reject = async (id: string) => {
    if (!reason.trim()) { showToast('Give a rejection reason.', 'error'); return; }
    setWorking(id);
    const r = await adminApi.claimReject(id, reason.trim().slice(0, 500));
    setWorking(null);
    if (r.ok) {
      showToast('Claim rejected.', 'success');
      setClaims(claims.filter((x) => x.id !== id));
      setRejectFor(null);
      setReason('');
    } else {
      showToast(r.error || 'Rejection failed.', 'error');
    }
  };

  if (loading) return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading payment claims…</p>;
  if (backendDown) return <BackendDownBanner onRetry={load} />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{claims.length} pending claim{claims.length === 1 ? '' : 's'} — verify each payment in your bKash/Nagad/UPI account before approving.</p>
      {claims.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-10 text-center">
          <p className="text-3xl mb-2">💳</p>
          <p className="text-sm font-bold text-slate-300">No pending claims</p>
        </div>
      ) : claims.map((c) => (
        <div key={c.id} className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-bold text-white text-sm">{c.workspaceName || c.workspaceId}</p>
              <p className="text-[11px] text-slate-500 font-mono">{c.workspaceId}</p>
              <p className="text-xs text-slate-300 mt-1.5">
                <span className="font-black text-saffron-300">{c.plan}</span>
                <span className="text-slate-500"> · {c.period} · {c.method}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Txn: <span className="font-mono text-slate-200">{c.transactionId}</span>
                {c.amount != null && <span className="ml-2">{c.currency || ''} {c.amount}</span>}
              </p>
              {c.proofUrl && (
                <a href={c.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-400 underline mt-1 inline-block">
                  View payment proof ↗
                </a>
              )}
              {c.notes && <p className="text-xs text-slate-500 mt-1">{c.notes}</p>}
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-black uppercase">pending</span>
          </div>
          {rejectFor === c.id ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Rejection reason…"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500"
              />
              <div className="flex gap-2">
                <button type="button" disabled={working === c.id} onClick={() => reject(c.id)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-red-600 text-white text-xs font-black disabled:opacity-50">Confirm rejection</button>
                <button type="button" onClick={() => { setRejectFor(null); setReason(''); }}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200">Back</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setConfirmApprove(c)}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Verify & approve
              </button>
              <button
                type="button"
                onClick={() => setRejectFor(c.id)}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
      {confirmApprove && (
        <ConfirmDialog
          title="Approve this payment?"
          body={`Confirm you received ${confirmApprove.currency || ''} ${confirmApprove.amount ?? ''} via ${confirmApprove.method} (txn ${confirmApprove.transactionId}). The ${confirmApprove.plan} plan activates with server-computed dates. This cannot be undone from here.`}
          confirmLabel="Payment verified — approve"
          onConfirm={() => approve(confirmApprove)}
          onCancel={() => setConfirmApprove(null)}
          working={working === confirmApprove.id}
        />
      )}
    </div>
  );
};


/* Billing tab with subtabs: Claims + Top-ups + Wallets + Payment Insights */
export const BillingTab: React.FC = () => {
  const [sub, setSub] = React.useState('Claims');
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['Claims', 'Top-ups', 'Wallets', 'Payment Insights'].map((t) => (
          <button key={t} type="button" onClick={() => setSub(t)}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
              sub === t ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}>{t}</button>
        ))}
      </div>
      {sub === 'Claims' ? <BillingClaims />
        : sub === 'Top-ups' ? <TopupsTab />
        : sub === 'Wallets' ? <WalletsTab />
        : <PaymentInsightsTab />}
    </div>
  );
};

/* -------------------------------- Messages ------------------------------- */

const AUDIENCES = [
  { kind: 'all', label: 'Everyone (platform-wide)' },
  { kind: 'role', label: 'By role (e.g. all Trustees)' },
  { kind: 'workspace', label: 'One organisation' },
  { kind: 'single', label: 'Single user' },
] as const;

export const MessagesTab: React.FC = () => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'announcement' | 'reminder' | 'greeting' | 'urgent'>('announcement');
  const [audKind, setAudKind] = useState<'all' | 'role' | 'workspace' | 'single'>('all');
  const [audValue, setAudValue] = useState('');
  const [sending, setSending] = useState(false);
  const [backendDown, setBackendDown] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  React.useEffect(() => {
    adminApi.messageTemplates().then((r) => {
      if (r.ok && r.data?.templates) setTemplates(r.data.templates);
    });
  }, []);

  const send = async (scheduled: boolean) => {
    if (!title.trim() || !body.trim()) { showToast('Title and body are required.', 'error'); return; }
    if (audKind !== 'all' && !audValue.trim()) { showToast('Provide the audience target.', 'error'); return; }
    setSending(true);
    const audience: any = { kind: audKind };
    if (audKind === 'single') audience.uid = audValue.trim();
    if (audKind === 'workspace') audience.workspaceId = audValue.trim();
    if (audKind === 'role') audience.role = audValue.trim();
    const r = scheduled
      ? await adminApi.scheduleMessage({ title: title.trim(), body: body.trim(), type, audience, sendAt: new Date(Date.now() + 3600_000).toISOString() })
      : await adminApi.sendMessage({ title: title.trim(), body: body.trim(), type, audience });
    setSending(false);
    if (r.backendDown) { setBackendDown(true); return; }
    if (r.ok) {
      const fannedOut = (r.data as any)?.fannedOut !== false;
      showToast(
        scheduled ? 'Scheduled for +1h.'
        : fannedOut ? 'Message delivered to inbox.'
        : 'Campaign recorded — broadcast fan-out needs the backend.',
        'success'
      );
      setTitle(''); setBody(''); setAudValue('');
    } else {
      showToast(r.error || 'Send failed.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {backendDown && <BackendDownBanner />}
      {templates.length > 0 && (
        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
          <p className="text-xs font-bold text-slate-300 mb-2">Templates</p>
          <div className="flex gap-2 flex-wrap">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTitle(t.title?.en || '');
                  setBody(t.body?.en || '');
                }}
                className="px-3 py-2 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700"
              >
                {t.name || t.id}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 min-h-[44px] text-sm text-white outline-none focus:ring-2 focus:ring-saffron-500"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Message body…"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-saffron-500"
        />
        <div className="flex gap-2 flex-wrap">
          {(['announcement', 'reminder', 'greeting', 'urgent'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-black capitalize ${type === t ? 'bg-saffron-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-300 mb-2">Audience</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {AUDIENCES.map((a) => (
              <button
                key={a.kind}
                type="button"
                onClick={() => setAudKind(a.kind)}
                className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-left ${audKind === a.kind ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40' : 'bg-slate-800 text-slate-300'}`}
              >
                {a.label}
              </button>
            ))}
          </div>
          {audKind !== 'all' && (
            <input
              value={audValue}
              onChange={(e) => setAudValue(e.target.value)}
              placeholder={audKind === 'single' ? 'User UID' : audKind === 'workspace' ? 'Workspace ID' : 'Role name (e.g. Trustee)'}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 min-h-[44px] text-sm text-white font-mono outline-none focus:ring-2 focus:ring-saffron-500"
            />
          )}
          {audKind === 'all' && (
            <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Platform-wide broadcasts are rate-limited (3/day).</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={sending}
            onClick={() => send(false)}
            className="flex-1 px-4 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send now'}
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => send(true)}
            className="px-4 py-3 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 flex items-center gap-2"
          >
            <Clock className="w-4 h-4" /> +1h
          </button>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------- Audit --------------------------------- */

export const AuditTab: React.FC = () => {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setBackendDown(false);
    const r = await adminApi.auditLogs({
      limit: 50,
      ...(action.trim() ? { action: action.trim() } : {}),
      ...(severity ? { severity } : {}),
    });
    setLoading(false);
    if (r.backendDown) { setBackendDown(true); return; }
    if (r.ok && r.data?.entries) setEntries(r.data.entries);
    else showToast(r.error || 'Could not load audit log.', 'error');
  }, [action, severity, showToast]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading audit trail…</p>;
  if (backendDown) return <BackendDownBanner onRetry={load} />;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action…"
          className="flex-1 min-w-[140px] bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 min-h-[44px] text-xs text-slate-200 font-mono outline-none focus:ring-2 focus:ring-saffron-500"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-xs text-slate-200 outline-none"
        >
          <option value="">All severities</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </select>
        <button type="button" onClick={load} className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200">Apply</button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">No audit entries match.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  e.severity === 'critical' ? 'bg-red-500/20 text-red-300' : e.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>{e.severity || 'info'}</span>
                <span className="text-xs font-mono font-bold text-slate-200">{e.action}</span>
                <span className="text-[11px] text-slate-500 ml-auto">{e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-1.5 truncate">
                actor: {e.actorEmail || e.actorUid || '—'}{e.workspaceId ? ` · ws: ${e.workspaceId}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
