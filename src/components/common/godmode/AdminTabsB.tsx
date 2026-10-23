/**
 * AdminTabsB — Moderation, Billing, Messages, Audit tabs for GodModeConsole2.
 * All actions go through the backend API (owner-gated, audited server-side).
 */
import React, { useState, useCallback } from 'react';
import { RefreshCw, Flag, EyeOff, AlertTriangle, Ban, CheckCircle2, Send, Clock, CalendarPlus, TimerOff } from 'lucide-react';
import { adminApi, type ModerationReport, type PaymentClaim, type AuditEntry, type MessageTemplate } from '../../../lib/adminApi';
import { findDueSubscriptions, extendedEndDateIso } from '../../../lib/subscriptionAdmin';
import { safeExternalUrl } from '../../../lib/safeUrl';
import { BackendDownBanner, ConfirmDialog } from '../GodModeConsole2';
import { useToast } from '../../../context/ToastContext';
import { PaymentInsightsTab } from './AdminTabsG';
import { TopupsTab, WalletsTab } from './AdminTabsI';
import { PLAN_PRICING } from '../../../config/planPricing';

/** Free-tier display name from the single source (planPricing; "Lite"
 *  since the 2026-10-23 display rename — never hard-code it here). */
const FREE_TIER_NAME = PLAN_PRICING.SEVA.name;

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
            {/* AUDIT FIX #9: contextual actions — warn/suspend only for
                user-targeted reports; hide for content targets. */}
            {(['dismiss', 'hide_content', 'warn_user', 'suspend_user'] as const)
              .filter((a) => {
                if (a === 'warn_user' || a === 'suspend_user') return rep.targetType === 'user';
                if (a === 'hide_content') return rep.targetType !== 'user';
                return true;
              })
              .map((a) => (
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
            : confirm.action === 'warn_user'
            ? 'The user will receive a gentle warning in their Suchana inbox. The reporter is never named. Logged in the audit trail.'
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
              {safeExternalUrl(c.proofUrl) && (
                <a href={safeExternalUrl(c.proofUrl)!} target="_blank" rel="noreferrer" className="text-xs text-sky-400 underline mt-1 inline-block">
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


/* --------------------------- Subscriptions ----------------------------- */

/**
 * AUDIT FIX #7: owner visibility into subscription lifecycle.
 * Lists subscriptions with expiry status badges (Active / Expiring soon /
 * Grace / Expired) so the owner can see who's paid, who's lapsing, and who
 * has been gracefully downgraded to Seva caps.
 *
 * QUEUED #24: visibility becomes execution. Derived status was never
 * written back, so lapsed docs kept stored status 'active' (inflating
 * insights counts/MRR). The owner can now: sweep every DUE subscription
 * (endDate + full grace past, still stored active — dry-run preview
 * first, one audited batch), expire a single row now, or extend a row's
 * endDate by whole months (the Audit Fix #4 correction tool; extending
 * an expired row reactivates it). All writes go through adminApi →
 * firestoreAdmin (owner-gated, audit-logged).
 */
const EXTEND_MONTH_CHOICES = [1, 3, 6, 11, 12, 24];

const SubscriptionsTab: React.FC = () => {
  const { showToast } = useToast();
  const [subs, setSubs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState<string | null>(null);
  const [showDuePreview, setShowDuePreview] = React.useState(false);
  const [expireTarget, setExpireTarget] = React.useState<any | null>(null);
  const [extendTarget, setExtendTarget] = React.useState<any | null>(null);
  const [extendMonths, setExtendMonths] = React.useState(11);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { db } = await import('../../../firebase');
      const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
      const { getSubscriptionStatus, isExpiringSoon, daysUntilExpiry } = await import('../../../lib/subscriptionExpiry');
      const { isProSubscriptionDoc, subscriptionKindLabel } = await import('../../../lib/proSubscription');
      const snap = await getDocs(query(collection(db, 'subscriptions'), orderBy('updatedAt', 'desc'), limit(200)));
      const rows = snap.docs.map((d) => {
        const s: any = { id: d.id, ...d.data() };
        // QUEUED #23: Pro subscriptions are personal (doc id = provider
        // uid) and must not read as organisation plans in this list.
        s._isPro = isProSubscriptionDoc(s);
        s._kindLabel = subscriptionKindLabel(s);
        s._status = getSubscriptionStatus(s);
        s._expiringSoon = isExpiringSoon(s);
        s._daysLeft = daysUntilExpiry(s);
        return s;
      });
      // Expired first, then grace, then expiring soon, then the rest.
      const rank: Record<string, number> = { expired: 0, grace: 1, active: 2, none: 3 };
      rows.sort((a, b) => (rank[a._status] ?? 3) - (rank[b._status] ?? 3) || (a._expiringSoon ? -1 : 0));
      setSubs(rows);
    } catch (e) {
      showToast('Could not load subscriptions.', 'error');
    }
    setLoading(false);
  }, [showToast]);

  React.useEffect(() => { load(); }, [load]);

  const badge = (s: any) => {
    if (s._status === 'expired')
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/15 text-red-300 border border-red-500/30">EXPIRED → free caps</span>;
    if (s._status === 'grace')
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">GRACE · {s._daysLeft != null ? Math.max(0, 7 + s._daysLeft) : '?'}d left</span>;
    if (s._expiringSoon)
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30">EXPIRES IN {s._daysLeft}d</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">ACTIVE</span>;
  };

  // QUEUED #24: due = paid period + full grace past, stored status still
  // 'active'. Computed from the loaded rows for the preview; the sweep
  // itself re-scans everything server-side (well, client-side Firestore).
  const due = findDueSubscriptions(subs, Date.now());
  const storedStatus = (s: any) => String(s.status || 'active').toLowerCase();

  const runExpireDue = async () => {
    setActing('batch');
    const r = await adminApi.subscriptionsExpireDue();
    setActing(null);
    setShowDuePreview(false);
    if (r.ok) {
      const failed = (r.data?.failedIds || []).length;
      showToast(
        failed > 0
          ? `Expired ${r.data?.count ?? 0} subscription(s); ${failed} could not be updated — see console.`
          : `Expired ${r.data?.count ?? 0} due subscription(s). Counts and MRR are truthful again.`,
        failed > 0 ? 'error' : 'success'
      );
      load();
    } else {
      showToast(r.error || 'Expire sweep failed.', 'error');
    }
  };

  const runExpireNow = async () => {
    if (!expireTarget) return;
    setActing(expireTarget.id);
    const r = await adminApi.subscriptionExpireNow(expireTarget.id);
    setActing(null);
    setExpireTarget(null);
    if (r.ok) { showToast('Subscription expired.', 'success'); load(); }
    else showToast(r.error || 'Could not expire subscription.', 'error');
  };

  const runExtend = async () => {
    if (!extendTarget) return;
    setActing(extendTarget.id);
    const r = await adminApi.subscriptionExtend(extendTarget.id, extendMonths);
    setActing(null);
    setExtendTarget(null);
    if (r.ok) {
      showToast(`Extended — new end date ${r.data?.newEndDate ? new Date(r.data.newEndDate).toLocaleDateString() : ''}.`, 'success');
      load();
    } else showToast(r.error || 'Could not extend subscription.', 'error');
  };

  if (loading) return <p className="text-sm text-slate-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading subscriptions…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{subs.length} subscriptions — expired plans gracefully fall back to {FREE_TIER_NAME} (free) caps after a 7-day grace period. Nothing is ever locked out.</p>
      {due.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3 flex-wrap">
          <TimerOff className="w-5 h-5 text-red-300 shrink-0" />
          <p className="text-xs text-red-200 flex-1 min-w-[200px]">
            <b>{due.length} subscription{due.length === 1 ? '' : 's'} past due</b> — paid period and grace are over,
            but the record still says “active”, so counts and MRR overstate reality. Expiring them changes no member's
            access (they already run on {FREE_TIER_NAME} caps) and never blocks a renewal.
          </p>
          <button
            type="button"
            onClick={() => setShowDuePreview(true)}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-500"
          >
            Review &amp; expire due
          </button>
        </div>
      )}
      {subs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-10 text-center">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-sm font-bold text-slate-300">No subscriptions yet</p>
          <p className="text-xs text-slate-500 mt-1">Approved payment claims create subscription docs here.</p>
        </div>
      ) : subs.map((s) => (
        <div key={s.id} className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-bold text-white text-sm">{s._isPro ? (s.providerUid || s.id) : s.workspaceId}</p>
              <p className="text-xs text-slate-400 mt-1">
                <span className="font-black text-saffron-300">{s.planId}</span>
                <span className="text-slate-500"> · {s.status || 'active'}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-black ${s._isPro ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-slate-500/15 text-slate-300 border border-slate-500/30'}`}>
                  {s._isPro ? '🪔 PRO · INDIVIDUAL' : '🏛 ORGANISATION'}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {s.startDate ? new Date(s.startDate).toLocaleDateString() : '?'} → {s.endDate ? new Date(s.endDate).toLocaleDateString() : 'no expiry'}
                {s.transactionId ? <span className="ml-2">· {s.transactionId}</span> : null}
                {typeof s.expiredAt === 'string' && s.expiredAt ? <span className="ml-2 text-red-300/80">· expired {new Date(s.expiredAt).toLocaleDateString()}</span> : null}
              </p>
            </div>
            {badge(s)}
          </div>
          {(s.endDate || storedStatus(s) === 'active') && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {s.endDate && (
                <button
                  type="button"
                  disabled={acting != null}
                  onClick={() => { setExtendTarget(s); setExtendMonths(11); }}
                  className="px-3 py-2 min-h-[44px] rounded-xl text-[11px] font-black bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-50"
                >
                  <CalendarPlus className="w-3.5 h-3.5 inline mr-1.5" />Extend
                </button>
              )}
              {storedStatus(s) === 'active' && (
                <button
                  type="button"
                  disabled={acting != null}
                  onClick={() => setExpireTarget(s)}
                  className="px-3 py-2 min-h-[44px] rounded-xl text-[11px] font-black bg-red-600/15 text-red-300 border border-red-500/30 hover:bg-red-600/25 disabled:opacity-50"
                >
                  <TimerOff className="w-3.5 h-3.5 inline mr-1.5" />Expire now
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={load} className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-slate-800">
        <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />Refresh
      </button>

      {showDuePreview && (
        <ConfirmDialog
          title={`Expire ${due.length} due subscription${due.length === 1 ? '' : 's'}?`}
          body={`Each record's stored status flips to “expired” with today's stamp, and the batch is written to the audit log with every id. Members keep working on ${FREE_TIER_NAME} (free) caps — most already do — and a later payment approval reactivates them cleanly. Subscriptions still in their grace period are NOT touched. The sweep re-scans all subscriptions on confirm, so the final count may include older records beyond the list below.`}
          confirmLabel={`Expire ${due.length} now`}
          working={acting === 'batch'}
          onConfirm={runExpireDue}
          onCancel={() => setShowDuePreview(false)}
        >
          <div className="mb-5 max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {due.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/70 px-3 py-2">
                <p className="text-xs text-slate-200 font-mono truncate">
                  {d.kind === 'pro' ? '🪔 ' : '🏛 '}{d.subject}
                  <span className="text-slate-500"> · {d.planId}</span>
                </p>
                <p className="text-[11px] text-red-300 shrink-0">ended {d.endDate ? new Date(d.endDate).toLocaleDateString() : '?'} · {d.daysOverdue}d ago</p>
              </div>
            ))}
          </div>
        </ConfirmDialog>
      )}

      {expireTarget && (
        <ConfirmDialog
          title="Expire this subscription now?"
          body={`${expireTarget._isPro ? (expireTarget.providerUid || expireTarget.id) : expireTarget.workspaceId} · ${expireTarget.planId} will be marked expired immediately, whatever its end date says, and the action is audit-logged. The member keeps working on ${FREE_TIER_NAME} (free) caps and can renew any time — a fresh approval reactivates the record.`}
          confirmLabel="Expire now"
          working={acting === expireTarget.id}
          onConfirm={runExpireNow}
          onCancel={() => setExpireTarget(null)}
        />
      )}

      {extendTarget && (
        <ConfirmDialog
          title="Extend subscription"
          body={`${extendTarget._isPro ? (extendTarget.providerUid || extendTarget.id) : extendTarget.workspaceId} · ${extendTarget.planId} — currently ends ${extendTarget.endDate ? new Date(extendTarget.endDate).toLocaleDateString() : '—'}.${storedStatus(extendTarget) === 'expired' || extendTarget._status === 'expired' || extendTarget._status === 'grace' ? ' Extending reactivates it (status back to active).' : ''} This is the correction tool for pre-fix annual plans that received a 1-month end date: add 11 months to make the paid year whole.`}
          confirmLabel={`Extend by ${extendMonths} month${extendMonths === 1 ? '' : 's'}`}
          working={acting === extendTarget.id}
          onConfirm={runExtend}
          onCancel={() => setExtendTarget(null)}
        >
          <div className="mb-4">
            <div className="flex gap-1.5 flex-wrap mb-3">
              {EXTEND_MONTH_CHOICES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setExtendMonths(m)}
                  className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-black ${
                    extendMonths === m ? 'bg-saffron-500 text-slate-950' : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  +{m} mo
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              New end date:{' '}
              <b className="text-slate-100">
                {extendedEndDateIso(extendTarget.endDate, extendMonths)
                  ? new Date(extendedEndDateIso(extendTarget.endDate, extendMonths)!).toLocaleDateString()
                  : '—'}
              </b>
            </p>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

/* Billing tab with subtabs: Claims + Subscriptions + Top-ups + Wallets + Payment Insights */
export const BillingTab: React.FC = () => {
  const [sub, setSub] = React.useState('Claims');
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
        💡 Plan <b className="text-slate-300">prices, limits and commission terms</b> are managed in{' '}
        <b className="text-slate-300">Settings → Plans &amp; Terms</b> (with full change history + revert).
        This tab operates on individual claims, subscriptions and wallets.
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['Claims', 'Subscriptions', 'Top-ups', 'Wallets', 'Payment Insights'].map((t) => (
          <button key={t} type="button" onClick={() => setSub(t)}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
              sub === t ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}>{t}</button>
        ))}
      </div>
      {sub === 'Claims' ? <BillingClaims />
        : sub === 'Subscriptions' ? <SubscriptionsTab />
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
