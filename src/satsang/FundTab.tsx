import React, { useState } from 'react';
import { useSatsang, uid, todayISO, fundBalance, activeMembers } from './satsangStore';
import { FundEntry } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* ------------------------------------------------------------------ */
/* Small fund — voluntary contributions and expenses, with treasury   */
/* posting. Honest: 80G eligibility must be confirmed with the CA —   */
/* entries post as income/expense and the UI says so plainly.         */
/* ------------------------------------------------------------------ */

const emptyForm = { date: todayISO(), kind: 'contribution' as FundEntry['kind'], memberId: '', amount: '', note: '' };

export const FundTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { state, add, update, remove } = useSatsang();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const members = activeMembers(state);

  const save = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { showToast('Please enter a valid amount.', 'warning'); return; }
    add('fund', {
      id: uid('f'), date: form.date, kind: form.kind,
      memberId: form.memberId || undefined, amount: amt,
      note: form.note.trim() || undefined, createdAt: Date.now(),
    });
    showToast(form.kind === 'contribution' ? 'Contribution recorded.' : 'Expense recorded.', 'success');
    setForming(false);
    setForm({ ...emptyForm, date: todayISO() });
  };

  const postToTreasury = (f: FundEntry) => {
    if (f.treasuryTxId) { showToast('Already posted to treasury.', 'warning'); return; }
    const who = f.memberId ? (state.members.find((m) => m.id === f.memberId)?.name || '') : '';
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date(f.date).toISOString(),
      type: f.kind === 'contribution' ? 'Income' : 'Expense',
      category: 'Satsang Fund',
      subcategory: `Satsang One — ${f.kind}`,
      amount: f.amount,
      handledBy: who || 'Satsang',
      paymentMode: 'Cash', referenceNo: f.id,
      purpose: `Satsang fund ${f.kind}${f.note ? ` — ${f.note}` : ''}${who ? ` (${who})` : ''}`,
      // Honest: 80G eligibility must be confirmed with the CA.
      is80GEligible: false, taxReceiptIssued: false,
      devoteeName: who || 'Satsang collection',
    });
    if (ok) {
      update('fund', f.id, { treasuryTxId: 'posted' });
      showToast('Posted to treasury. Confirm 80G eligibility with your CA before issuing any 80G receipt.', 'success');
    } else {
      showToast('Treasury posting failed — entry kept locally, retry later.', 'error');
    }
  };

  const list = [...state.fund].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-rose-900">{inr(fundBalance(state))}</div>
            <div className="text-xs font-semibold text-stone-500">
              <T en="Fund balance — contributions minus expenses (this device)" bn="তহবিল ব্যালেন্স — অবদান বিয়োগ খরচ (এই ডিভাইস)" hi="निधि शेष — अंशदान घटा व्यय (यह डिवाइस)" />
            </div>
          </div>
          <Btn onClick={() => setForming(true)} className="no-print">＋ <T en="Add entry" bn="এন্ট্রি যোগ করুন" hi="प्रविष्टि जोड़ें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text="No fund entries yet." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((f) => {
          const who = f.memberId ? (state.members.find((m) => m.id === f.memberId)?.name || '') : '';
          return (
            <Card key={f.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">
                    {f.kind === 'contribution' ? '+' : '−'}{inr(f.amount)}
                    {who && <span className="font-normal text-stone-500 text-sm"> · {who}</span>}
                  </div>
                  <div className="text-xs text-stone-500">{fmtDate(f.date)}{f.note && <> · {f.note}</>}</div>
                </div>
                <StatusPill status={f.kind} />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3 no-print">
                {f.treasuryTxId
                  ? <StatusPill status="posted" />
                  : <Btn onClick={() => postToTreasury(f)}>💰 <T en="Post to treasury" bn="কোষাগারে পোস্ট" hi="कोषागार में दर्ज करें" /></Btn>}
                <Btn variant="danger" onClick={() => { remove('fund', f.id); showToast('Entry removed.', 'info'); }}>
                  <T en="Remove" bn="মুছুন" hi="हटाएं" />
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {forming && (
        <Modal title={<T en="Add fund entry" bn="তহবিল এন্ট্রি যোগ করুন" hi="निधि प्रविष्टि जोड़ें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as FundEntry['kind'] })}>
                <option value="contribution">Contribution</option>
                <option value="expense">Expense</option>
              </select>
            </Field>
            <Field label={<T en={`Amount (${wsCurrency.symbol})`} bn={`টাকা (${wsCurrency.symbol})`} hi={`राशि (${wsCurrency.symbol})`} />}>
              <input type="number" min="1" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Member (optional)" bn="সদস্য (ঐচ্ছিক)" hi="सदस्य (वैकल्पिक)" />}>
              <select className={inputCls} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={<T en="Note (optional)" bn="নোট (ঐচ্ছিক)" hi="टिप्पणी (वैकल्पिक)" />} className="sm:col-span-2">
              <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Flowers, prasad ingredients" />
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
