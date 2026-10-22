/**
 * PaymentDetailsCard — Blueprint B: the org's payout/payment
 * account details, under maker–checker dual control.
 * ==========================================================================
 * The workspace's payment fields (paymentAccountName / Number /
 * BankName / Ifsc / UpiId on WorkspaceConfig) answer "where does
 * money for this organisation actually go?" — exactly the field a
 * fraudster changes. So there is NO direct save here: editing
 * files an approvalRequests record of kind `payment.details`, and
 * the change is applied by a DIFFERENT finance/oversight member
 * from the ApprovalsPanel (the apply path writes through
 * updateWorkspaceDetails + the workspaces doc — the settings
 * surface's own choke point).
 * The account number displays masked (last 4) — full values are
 * visible only inside the edit form to the person changing them,
 * and on the approval request itself to the checker.
 */
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { approvalService } from '../../context/data/approvalsStore';
import { resolveActorName } from '../../bahikhata/bahikhataStore';
import {
  PAYMENT_DETAIL_FIELDS,
  type ApprovalRequestDoc,
  type PaymentDetailsPayload,
} from '../../lib/approvals';
import type { WorkspaceConfig } from '../../types';

type PaymentFields = PaymentDetailsPayload['fields'];

const FIELD_LABEL_KEYS: Record<keyof PaymentFields, string> = {
  paymentAccountName: 'org.access.payment.accountName',
  paymentAccountNumber: 'org.access.payment.accountNumber',
  paymentBankName: 'org.access.payment.bankName',
  paymentIfsc: 'org.access.payment.ifsc',
  paymentUpiId: 'org.access.payment.upiId',
};

const inputCls =
  'w-full bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 outline-none min-h-[44px]';

export const PaymentDetailsCard: React.FC = () => {
  const { t } = useLanguage();
  const { activeWorkspace, firebaseUser, effectiveRole } = useAuthWorkspace();
  const { showToast } = useToast();
  const ws = activeWorkspace as WorkspaceConfig | null;
  const wsId = ws?.id || '';
  const isDemo = wsId.startsWith('DEMO_');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PaymentFields>({});
  const [busy, setBusy] = useState(false);
  const [pendingChange, setPendingChange] = useState<ApprovalRequestDoc | null>(null);

  useEffect(() => {
    if (!wsId || isDemo) return;
    const unsub = onSnapshot(
      query(collection(db, 'approvalRequests'), where('workspaceId', '==', wsId)),
      (snap) => {
        const pending = snap.docs
          .map((d) => d.data() as ApprovalRequestDoc)
          .filter((r) => r.kind === 'payment.details' && r.status === 'PENDING')
          .sort((a, b) => b.requestedAt - a.requestedAt)[0];
        setPendingChange(pending || null);
      },
      () => setPendingChange(null)
    );
    return () => unsub();
  }, [wsId, isDemo]);

  if (!ws) return null;

  const current: PaymentFields = {
    paymentAccountName: ws.paymentAccountName,
    paymentAccountNumber: ws.paymentAccountNumber,
    paymentBankName: ws.paymentBankName,
    paymentIfsc: ws.paymentIfsc,
    paymentUpiId: ws.paymentUpiId,
  };

  const maskAccount = (v?: string) => {
    const s = (v || '').trim();
    if (!s) return '—';
    return s.length <= 4 ? '••••' : `••••${s.slice(-4)}`;
  };

  const beginEdit = () => {
    setDraft({ ...current });
    setEditing(true);
  };

  const submit = async () => {
    const fields: PaymentFields = {};
    let changed = false;
    for (const f of PAYMENT_DETAIL_FIELDS) {
      const next = (draft[f] || '').trim();
      const prev = (current[f] || '').trim();
      if (next !== prev) {
        fields[f] = next || undefined;
        changed = true;
      }
    }
    if (!changed) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const labelOf = (f: keyof PaymentFields) =>
        t(FIELD_LABEL_KEYS[f]).replace(/^org\.access\.payment\./, '');
      const summary = `${t('org.access.payment.summaryPrefix')}: ${PAYMENT_DETAIL_FIELDS.filter(
        (f) => f in fields
      )
        .map(labelOf)
        .join(', ')}`;
      await approvalService.request(
        {
          workspaceId: wsId,
          workspaceName: ws?.name || '',
          kind: 'payment.details',
          payload: { fields } as unknown as Record<string, unknown>,
          summary,
        },
        {
          uid: firebaseUser?.uid || '',
          name: resolveActorName([firebaseUser?.displayName], firebaseUser?.email || ''),
          role: (effectiveRole as string) || '',
        }
      );
      showToast(t('org.access.payment.filed'), 'success');
      setEditing(false);
    } catch (err: any) {
      showToast(err?.message || t('org.access.payment.fileFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
      <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
        <CreditCard size={16} className="text-amber-600" />
        {t('org.access.payment.title')}
      </h4>
      <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
        <ShieldCheck size={12} className="text-amber-600 shrink-0" />
        {t('org.access.payment.dualControlNote')}
      </p>

      {pendingChange && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-[11px] font-bold text-amber-800">
          {t('org.access.payment.pendingNote')} — {pendingChange.summary} ({pendingChange.requestedByName})
        </div>
      )}

      {!editing ? (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('org.access.payment.accountName')}</dt>
              <dd className="font-bold text-stone-800 mt-0.5">{current.paymentAccountName || '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('org.access.payment.accountNumber')}</dt>
              <dd className="font-bold text-stone-800 mt-0.5">{maskAccount(current.paymentAccountNumber)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('org.access.payment.bankName')}</dt>
              <dd className="font-bold text-stone-800 mt-0.5">{current.paymentBankName || '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('org.access.payment.ifsc')}</dt>
              <dd className="font-bold text-stone-800 mt-0.5">{current.paymentIfsc || '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('org.access.payment.upiId')}</dt>
              <dd className="font-bold text-stone-800 mt-0.5">{current.paymentUpiId || '—'}</dd>
            </div>
          </dl>
          {!isDemo && (
            <button
              onClick={beginEdit}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black min-h-[44px]"
            >
              {t('org.access.payment.requestChange')}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAYMENT_DETAIL_FIELDS.map((f) => (
              <div key={f}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">
                  {t(FIELD_LABEL_KEYS[f])}
                </label>
                <input
                  value={draft[f] || ''}
                  onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                  className={inputCls}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black min-h-[44px] disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {t('org.access.payment.submitRequest')}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-600 text-xs font-black min-h-[44px]"
            >
              {t('org.access.member.cancelEdit')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
