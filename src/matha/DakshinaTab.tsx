import React, { useState } from 'react';
import { useMatha, uid, todayISO, dakshinaTotal } from './mathaStore';
import { DakshinaRecord } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, inr, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

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
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const save = () => {
    const amt = Number(form.amount);
    if (!form.donorName.trim() || !amt || amt <= 0) {
      showToast('Please give a donor name and a valid amount.', 'warning');
      return;
    }
    add('dakshina', {
      id: uid('dk'), date: form.date, donorName: form.donorName.trim(), amount: amt,
      purpose: form.purpose, paymentMode: form.paymentMode,
      notes: form.notes.trim() || undefined, createdAt: Date.now(),
    });
    showToast('Dakshina recorded. Post it to treasury when ready.', 'success');
    setForming(false);
    setForm({ ...emptyForm, date: todayISO() });
  };

  const postToTreasury = (d: DakshinaRecord) => {
    if (d.treasuryTxId) { showToast('Already posted to treasury.', 'warning'); return; }
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
      showToast('Posted to treasury as matha income. Confirm 80G eligibility with your CA before issuing any 80G receipt.', 'success');
    } else {
      showToast('Treasury posting failed — record kept locally, retry later.', 'error');
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
              <T en="Dakshina & donations recorded (this device)" bn="নথিভুক্ত দক্ষিণা ও অনুদান (এই ডিভাইস)" hi="दर्ज दक्षिणा व दान (यह डिवाइस)" />
            </div>
          </div>
          <Btn onClick={() => setForming(true)} className="no-print">＋ <T en="Record dakshina" bn="দক্ষিণা লিখুন" hi="दक्षिणा दर्ज करें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text="No dakshina recorded yet." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((d) => (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{d.donorName}</div>
                <div className="text-xs text-stone-500">{fmtDate(d.date)} · {d.purpose.replace(/-/g, ' ')} · {d.paymentMode}</div>
              </div>
              <span className="font-extrabold text-orange-900">{inr(d.amount)}</span>
            </div>
            {d.notes && <div className="text-xs text-stone-500 mt-1">{d.notes}</div>}
            <div className="flex flex-wrap items-center gap-2 mt-3 no-print">
              {d.treasuryTxId
                ? <StatusPill status="posted" />
                : <Btn onClick={() => postToTreasury(d)}>💰 <T en="Post to treasury" bn="কোষাগারে পোস্ট" hi="कोषागार में दर्ज करें" /></Btn>}
              <Btn variant="danger" onClick={() => { remove('dakshina', d.id); showToast('Record removed.', 'info'); }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title="Record dakshina" onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Donor name" bn="দাতার নাম" hi="दाता का नाम" />}>
              <input className={inputCls} value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} />
            </Field>
            <Field label={<T en="Amount (₹)" bn="টাকা (₹)" hi="राशि (₹)" />}>
              <input type="number" min="1" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Purpose" bn="উদ্দেশ্য" hi="उद्देश्य" />}>
              <select className={inputCls} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as DakshinaRecord['purpose'] })}>
                <option value="guru-dakshina">Guru-dakshina</option>
                <option value="general-donation">General donation</option>
                <option value="annadana">Annadana</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label={<T en="Payment mode" bn="পেমেন্ট মাধ্যম" hi="भुगतान माध्यम" />}>
              <input className={inputCls} value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })} />
            </Field>
            <Field label={<T en="Notes" bn="নোট" hi="टिप्पणी" />}>
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};