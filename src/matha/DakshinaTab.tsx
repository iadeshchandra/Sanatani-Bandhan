import React, { useState } from 'react';
import { useMatha, uid, todayISO, dakshinaTotal } from './mathaStore';
import { DakshinaRecord } from './types';
import { Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, inr, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';

/* ------------------------------------------------------------------ */
/* Dakshina — guru-dakshina and donations, posted to treasury.         */
/* Honest: 80G eligibility must be confirmed with the CA — donations   */
/* are posted as income and the UI says so plainly.                   */
/* ------------------------------------------------------------------ */

const emptyForm = { date: todayISO(), donorName: '', amount: '', purpose: 'guru-dakshina' as DakshinaRecord['purpose'], paymentMode: 'Cash', notes: '' };

export const DakshinaTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const purposeLabel = (p: DakshinaRecord['purpose']) => {
    const map: Record<DakshinaRecord['purpose'], string> = {
      'guru-dakshina': t('suites.matha.dakshina.purposeGuruDakshina'),
      'general-donation': t('suites.matha.dakshina.purposeGeneralDonation'),
      'annadana': t('suites.matha.dakshina.purposeAnnadana'),
      'other': t('suites.matha.dakshina.purposeOther'),
    };
    return map[p];
  };

  const save = () => {
    const amt = Number(form.amount);
    if (!form.donorName.trim() || !amt || amt <= 0) {
      showToast(t('suites.matha.dakshina.toastNeedDonorAmount'), 'warning');
      return;
    }
    add('dakshina', {
      id: uid('dk'), date: form.date, donorName: form.donorName.trim(), amount: amt,
      purpose: form.purpose, paymentMode: form.paymentMode,
      notes: form.notes.trim() || undefined, createdAt: Date.now(),
    });
    showToast(t('suites.matha.dakshina.toastRecorded'), 'success');
    setForming(false);
    setForm({ ...emptyForm, date: todayISO() });
  };

  const postToTreasury = (d: DakshinaRecord) => {
    if (d.treasuryTxId) { showToast(t('suites.matha.dakshina.toastAlreadyPosted'), 'warning'); return; }
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date(d.date).toISOString(),
      type: 'Income', category: 'Matha Donation',
      subcategory: `Matha One — ${d.purpose}`.trim(),
      amount: d.amount,
      handledBy: 'Matha',
      paymentMode: d.paymentMode, referenceNo: d.id,
      purpose: `Matha donation — ${d.donorName} (${d.purpose})`,
      // Honest: 80G eligibility must be confirmed with the CA.
      is80GEligible: false, taxReceiptIssued: false,
      devoteeName: d.donorName,
    });
    if (ok) {
      update('dakshina', d.id, { treasuryTxId: 'posted' });
      showToast(t('suites.matha.dakshina.toastPosted'), 'success');
    } else {
      showToast(t('suites.matha.dakshina.toastPostFailed'), 'error');
    }
  };

  const list = [...state.dakshina].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-orange-900">{inr(dakshinaTotal(state))}</div>
            <div className="text-xs font-semibold text-stone-500">
              {t('suites.matha.dakshina.totalSub')}
            </div>
          </div>
          <Btn onClick={() => setForming(true)} className="no-print">＋ {t('suites.matha.dakshina.record')}</Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text={t('suites.matha.dakshina.empty')} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((d) => (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{d.donorName}</div>
                <div className="text-xs text-stone-500">{fmtDate(d.date)} · {purposeLabel(d.purpose)} · {d.paymentMode}</div>
              </div>
              <span className="font-extrabold text-orange-900">{inr(d.amount)}</span>
            </div>
            {d.notes && <div className="text-xs text-stone-500 mt-1">{d.notes}</div>}
            <div className="flex flex-wrap items-center gap-2 mt-3 no-print">
              {d.treasuryTxId
                ? <StatusPill status="posted" />
                : <Btn onClick={() => postToTreasury(d)}>💰 {t('suites.matha.dakshina.postToTreasury')}</Btn>}
              <Btn variant="danger" onClick={() => { remove('dakshina', d.id); showToast(t('suites.matha.common.recordRemoved'), 'info'); }}>
                {t('suites.matha.common.remove')}
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={t('suites.matha.dakshina.modalTitle')} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('suites.matha.dakshina.donorName')}>
              <input className={inputCls} value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.dakshina.amount')}>
              <input type="number" min="1" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.common.date')}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.dakshina.purpose')}>
              <select className={inputCls} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as DakshinaRecord['purpose'] })}>
                <option value="guru-dakshina">{t('suites.matha.dakshina.purposeGuruDakshina')}</option>
                <option value="general-donation">{t('suites.matha.dakshina.purposeGeneralDonation')}</option>
                <option value="annadana">{t('suites.matha.dakshina.purposeAnnadana')}</option>
                <option value="other">{t('suites.matha.dakshina.purposeOther')}</option>
              </select>
            </Field>
            <Field label={t('suites.matha.dakshina.paymentMode')}>
              <input className={inputCls} value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.common.notes')}>
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}>{t('suites.matha.common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}>{t('suites.matha.common.cancel')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
