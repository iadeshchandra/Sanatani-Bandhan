import React, { useState } from 'react';
import { useTirth, uid, todayISO } from './tirthStore';
import { SevaBooking, SEVA_PASS_TYPES } from './types';
import { T, Card, Btn, Field, Modal, inputCls, Empty, fmtDate } from './ui';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Tirth One — seva-darshan bookings (paid special darshan / aarti
 * passes). Posts to treasury as income. Honest 80G copy: darshan fees
 * are generally not 80G-eligible. */

const blank: Omit<SevaBooking, 'id' | 'date' | 'createdAt'> = {
  passType: SEVA_PASS_TYPES[0], name: '', phone: '', persons: 1, amount: 0, notes: '',
};

export const SevaTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { state, add, update, remove } = useTirth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [editing, setEditing] = useState<SevaBooking | null>(null);
  const [form, setForm] = useState(blank);

  const todays = state.seva.filter((s) => s.date === todayISO()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalToday = todays.reduce((s, b) => s + b.amount, 0);

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '', date: todayISO(), createdAt: '' } as SevaBooking); };

  const save = () => {
    if (!form.name.trim()) { showToast(t('suites.tirth.seva.toastNeedName'), 'error'); return; }
    if (form.amount < 0) { showToast(t('suites.tirth.seva.toastNegative'), 'error'); return; }
    const payload = { ...form, name: form.name.trim(), persons: Math.max(1, Math.round(form.persons)), amount: Math.round(form.amount) };
    if (editing && editing.id) { update('seva', editing.id, payload); showToast(t('suites.tirth.seva.toastUpdated'), 'success'); }
    else { add('seva', { ...payload, id: uid('sv'), date: todayISO(), createdAt: new Date().toISOString() }); showToast(t('suites.tirth.seva.toastRecorded'), 'success'); }
    setEditing(null);
  };

  const postToTreasury = (b: SevaBooking) => {
    if (b.treasuryTxId) { showToast(t('suites.tirth.seva.toastAlreadyPosted'), 'warning'); return; }
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(),
      type: 'Income', category: 'Darshan Seva',
      subcategory: `Tirth One — ${b.passType}`,
      amount: b.amount,
      handledBy: b.name,
      paymentMode: 'Cash', referenceNo: b.id,
      purpose: `Seva-darshan — ${b.passType} × ${b.persons} (${b.name})`,
      // Honest: darshan fees are generally not 80G-eligible.
      is80GEligible: false, taxReceiptIssued: false,
      devoteeName: b.name,
    });
    if (ok) {
      update('seva', b.id, { treasuryTxId: 'posted' });
      showToast(t('suites.tirth.seva.toastPosted'), 'success');
    } else {
      showToast(t('suites.tirth.seva.toastPostFailed'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Seva darshan" bn="সেবা দর্শন" hi="सेवा दर्शन" /></h2>
        <div className="text-sm text-stone-600"><T en="Today" bn="আজ" hi="आज" />: <span className="font-extrabold text-emerald-700">{inr(totalToday)}</span></div>
      </div>
      <div className="flex justify-end">
        <Btn onClick={openNew}>＋ <T en="New booking" bn="নতুন বুকিং" hi="नई बुकिंग" /></Btn>
      </div>

      {todays.length === 0 && <Card><Empty text={t('suites.tirth.seva.empty')} /></Card>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {todays.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{b.passType}</div>
                <div className="text-xs text-stone-500">{b.name}{b.phone ? ` · ${b.phone}` : ''} · {b.persons} person(s) · {fmtDate(b.date)}</div>
              </div>
              <div className="font-extrabold text-lg text-teal-700">{inr(b.amount)}</div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              {!b.treasuryTxId
                ? <Btn variant="primary" onClick={() => postToTreasury(b)}>💰 <T en="Post to treasury" bn="কোষাগারে পোস্ট" hi="कोषागार में दर्ज करें" /></Btn>
                : <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">✓ treasury posted</span>}
              <Btn variant="danger" onClick={() => { remove('seva', b.id); showToast(t('suites.tirth.seva.toastRemoved'), 'success'); }}><T en="Remove" bn="মুছুন" hi="हटाएं" /></Btn>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <Modal title={<T en={editing.id ? 'Edit booking' : 'New seva booking'} bn={editing.id ? 'বুকিং সম্পাদনা' : 'নতুন সেবা বুকিং'} hi={editing.id ? 'बुकिंग संपादित करें' : 'नई सेवा बुकिंग'} />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Pass type" bn="পাসের ধরন" hi="पास प्रकार" />}>
              <select className={inputCls} value={form.passType} onChange={(e) => setForm({ ...form, passType: e.target.value })}>
                {SEVA_PASS_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label={<T en="Name *" bn="নাম *" hi="नाम *" />}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Devotee name" />
            </Field>
            <Field label={<T en="Phone" bn="ফোন" hi="फोन" />}>
              <input className={inputCls} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={<T en="Persons" bn="ব্যক্তি" hi="व्यक्ति" />}>
              <input type="number" min={1} className={inputCls} value={form.persons} onChange={(e) => setForm({ ...form, persons: Math.max(1, Math.round(Number(e.target.value) || 1)) })} />
            </Field>
            <Field label={<T en={`Amount (${wsCurrency.symbol})`} bn={`টাকা (${wsCurrency.symbol})`} hi={`राशि (${wsCurrency.symbol})`} />} className="sm:col-span-2">
              <input type="number" min={0} className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </Field>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 sm:col-span-2">
              <T en="Darshan fees are generally not 80G-eligible. Confirm with your CA." bn="দর্শন ফি সাধারণত 80G-যোগ্য নয়। সিএ-এর সঙ্গে নিশ্চিত করুন।" hi="दर्शन शुल्क सामान्यतः 80G-योग्य नहीं है। अपने CA से पुष्टि करें।" />
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
