/**
 * ApprovalsPanel — Blueprint B: the maker–checker surface.
 * ==========================================================================
 * One panel, mounted in the Treasury desk (the finance home) and
 * the Membership desk (the governance home). It shows:
 *  - requests AWAITING MY DECISION (I am an eligible checker and
 *    not the maker — self-approval is impossible here by the same
 *    law that governs the engine and the rules);
 *  - MY requests and their state (pending / approved+applied /
 *    rejected / approved-but-failed-to-apply);
 *  - approved-but-unapplied requests any eligible checker can retry.
 * Approving runs the change through the surface's own applier —
 * payouts commit through DataContext.addTreasuryTransaction (so
 * receipts, summaries and the audit stream behave exactly as for a
 * direct post), role grants replay through MembershipContext, and
 * payment details write through the settings choke point.
 * Renders nothing when there is nothing relevant — no empty chrome.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { appLocale } from '../../lib/format';
import {
  collection, onSnapshot, query, where,
} from 'firebase/firestore';
import {
  ShieldCheck, Check, X, Loader2, AlertTriangle, Ban, RotateCcw,
} from 'lucide-react';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { executeSafeUpdate } from '../../lib/dbUtils';
import { resolveActorName } from '../../bahikhata/bahikhataStore';
import {
  canApplyApproval,
  canCancelApproval,
  canDecideApproval,
  type ApprovalRequestDoc,
  type PaymentDetailsPayload,
  type PayoutPayload,
  type RoleGrantPayload,
} from '../../lib/approvals';
import { approvalService, type ApprovalApplier } from '../../context/data/approvalsStore';
import { friendlyError } from '../../lib/friendlyError';

export const ApprovalsPanel: React.FC = () => {
  const { t } = useLanguage();
  const { activeWorkspace, firebaseUser, effectiveRole, updateWorkspaceDetails } = useAuthWorkspace();
  const { orgMembers, sendInvite, updateMembershipAccess } = useMembership();
  const { addTreasuryTransaction } = useData();
  const { showToast } = useToast();

  const wsId = activeWorkspace?.id || '';
  const [requests, setRequests] = useState<ApprovalRequestDoc[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const actor = useMemo(
    () => ({
      uid: firebaseUser?.uid || '',
      name: resolveActorName([firebaseUser?.displayName], firebaseUser?.email || ''),
      role: (effectiveRole as string) || '',
    }),
    [firebaseUser, effectiveRole]
  );

  useEffect(() => {
    if (!wsId || wsId.startsWith('DEMO_') || !actor.uid) {
      setRequests([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'approvalRequests'), where('workspaceId', '==', wsId)),
      (snap) =>
        setRequests(
          snap.docs
            .map((d) => ({ ...(d.data() as any) }) as ApprovalRequestDoc)
            .sort((a, b) => b.requestedAt - a.requestedAt)
        ),
      () => setRequests([])
    );
    return () => unsub();
  }, [wsId, actor.uid]);

  /** The change-appliers, one per kind — each replays the approved
   *  payload through the surface that owns the write. */
  const applierFor = (req: ApprovalRequestDoc): ApprovalApplier => async (r) => {
    if (r.kind === 'treasury.payout') {
      const tx = (r.payload as unknown as PayoutPayload).tx;
      const posted = addTreasuryTransaction(tx as any);
      if (!posted) throw new Error('The ledger refused the voucher (workspace quota).');
      return;
    }
    if (r.kind === 'payment.details') {
      const fields = (r.payload as unknown as PaymentDetailsPayload).fields;
      updateWorkspaceDetails(fields as any);
      await executeSafeUpdate('workspaces', r.workspaceId, fields, 'update');
      return;
    }
    // role.grant
    const p = r.payload as unknown as RoleGrantPayload;
    if (p.mode === 'invite') {
      await sendInvite({ ...(p.invite as any), viaApproval: true });
      return;
    }
    const member = orgMembers.find((m) => m.id === p.membershipId);
    if (!member) throw new Error('The membership record no longer exists.');
    await updateMembershipAccess(
      member,
      {
        role: p.role,
        templateId: p.templateId,
        deskScope: p.deskScope,
        roleExpiresAt: p.roleExpiresAt,
      },
      { viaApproval: true }
    );
  };

  const decide = async (req: ApprovalRequestDoc, approve: boolean) => {
    setBusyId(req.id);
    try {
      const { applied } = await approvalService.decide(req, actor, approve, applierFor(req));
      showToast(
        approve
          ? applied
            ? t('org.access.approvals.approvedApplied')
            : t('org.access.approvals.approvedApplyFailed')
          : t('org.access.approvals.rejectedDone'),
        approve && !applied ? 'error' : 'success'
      );
    } catch (err: any) {
      console.error(err);
      showToast(friendlyError(err, t, 'save'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const retry = async (req: ApprovalRequestDoc) => {
    setBusyId(req.id);
    try {
      const ok = await approvalService.retryApply(req, actor, applierFor(req));
      showToast(
        ok ? t('org.access.approvals.approvedApplied') : t('org.access.approvals.approvedApplyFailed'),
        ok ? 'success' : 'error'
      );
    } catch (err: any) {
      console.error(err);
      showToast(friendlyError(err, t, 'save'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (req: ApprovalRequestDoc) => {
    setBusyId(req.id);
    try {
      await approvalService.cancel(req, actor);
      showToast(t('org.access.approvals.cancelledDone'), 'info');
    } catch (err: any) {
      console.error(err);
      showToast(friendlyError(err, t, 'save'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const awaitingMe = requests.filter((r) => canDecideApproval(r, actor).ok);
  const mine = requests.filter((r) => r.requestedBy === actor.uid);
  const needsApply = requests.filter(
    (r) => r.status === 'APPROVED' && r.appliedAt == null && canApplyApproval(r, actor).ok
  );
  const othersDecided = requests
    .filter((r) => r.requestedBy !== actor.uid && r.status !== 'PENDING')
    .slice(0, 5);

  if (!wsId || wsId.startsWith('DEMO_')) return null;
  if (awaitingMe.length === 0 && mine.length === 0 && needsApply.length === 0 && othersDecided.length === 0) {
    return null;
  }

  const kindLabel = (r: ApprovalRequestDoc) =>
    r.kind === 'treasury.payout'
      ? t('org.access.approvals.kindPayout')
      : r.kind === 'payment.details'
        ? t('org.access.approvals.kindPayment')
        : t('org.access.approvals.kindRole');

  const chipCls = 'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0';
  const statusChip = (r: ApprovalRequestDoc) => {
    if (r.status === 'PENDING')
      return <span className={`${chipCls} bg-amber-100 text-amber-800`}>{t('org.access.approvals.statusPending')}</span>;
    if (r.status === 'APPROVED' && r.appliedAt != null)
      return <span className={`${chipCls} bg-emerald-100 text-emerald-700`}>{t('org.access.approvals.statusApplied')}</span>;
    if (r.status === 'APPROVED')
      return <span className={`${chipCls} bg-red-100 text-red-700`}>{t('org.access.approvals.statusApplyFailed')}</span>;
    if (r.status === 'REJECTED')
      return <span className={`${chipCls} bg-stone-200 text-stone-600`}>{t('org.access.approvals.statusRejected')}</span>;
    return <span className={`${chipCls} bg-stone-200 text-stone-600`}>{t('org.access.approvals.statusCancelled')}</span>;
  };

  const row = (r: ApprovalRequestDoc, actions: React.ReactNode) => (
    <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-stone-900 truncate">{r.summary}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {kindLabel(r)} · {r.requestedByName} · {new Date(r.requestedAt).toLocaleString(appLocale())}
          </p>
          {r.status !== 'PENDING' && r.decidedByName && (
            <p className="text-[11px] text-stone-400 mt-0.5">
              {r.decidedByName}
              {r.decidedAt ? ` · ${new Date(r.decidedAt).toLocaleString(appLocale())}` : ''}
              {r.note ? ` · “${r.note}”` : ''}
            </p>
          )}
          {r.applyError && (
            <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} /> {friendlyError(r.applyError, t)}
            </p>
          )}
        </div>
        {statusChip(r)}
      </div>
      {actions}
    </div>
  );

  const decideActions = (r: ApprovalRequestDoc) => (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => decide(r, true)}
        disabled={busyId === r.id}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black min-h-[44px] disabled:opacity-50"
      >
        {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {t('org.access.approvals.approve')}
      </button>
      <button
        onClick={() => decide(r, false)}
        disabled={busyId === r.id}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-stone-300 hover:border-red-300 text-stone-600 hover:text-red-600 text-xs font-black min-h-[44px] disabled:opacity-50"
      >
        <X size={14} /> {t('org.access.approvals.reject')}
      </button>
    </div>
  );

  return (
    <section className="bg-amber-50/60 border border-amber-200 rounded-3xl p-4 sm:p-5 space-y-3">
      <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
        <ShieldCheck size={16} className="text-amber-600" />
        {t('org.access.approvals.title')}
      </h3>

      {awaitingMe.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
            {t('org.access.approvals.awaitingYou')}
          </p>
          {awaitingMe.map((r) => row(r, decideActions(r)))}
        </div>
      )}

      {needsApply.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
            {t('org.access.approvals.needsApply')}
          </p>
          {needsApply.map((r) =>
            row(
              r,
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => retry(r)}
                  disabled={busyId === r.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black min-h-[44px] disabled:opacity-50"
                >
                  {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  {t('org.access.approvals.retryApply')}
                </button>
              </div>
            )
          )}
        </div>
      )}

      {mine.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            {t('org.access.approvals.yourRequests')}
          </p>
          {mine.map((r) =>
            row(
              r,
              canCancelApproval(r, actor) ? (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => cancel(r)}
                    disabled={busyId === r.id}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-600 text-xs font-black min-h-[44px] disabled:opacity-50"
                  >
                    <Ban size={14} /> {t('org.access.approvals.cancel')}
                  </button>
                </div>
              ) : null
            )
          )}
        </div>
      )}

      {othersDecided.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
            {t('org.access.approvals.recentDecisions')}
          </p>
          {othersDecided.map((r) => row(r, null))}
        </div>
      )}
    </section>
  );
};
