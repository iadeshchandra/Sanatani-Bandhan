import React, { useState } from 'react';
import { useSabha, uid, todayISO, welfareBalance, activeMembers } from './sabhaStore';
import { WelfareEntry } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, inr, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* ------------------------------------------------------------------ */
/* Welfare fund — member-emergency corpus. Contributions build it,     */
/* disbursements need an approval note. Both post to treasury.        */
/* ------------------------------------------------------------------ */

const emptyForm = { date: todayISO(), kind: 'contribution' as WelfareEntry['kind'], memberId: '', amount: '', purpose: '', approvedBy: '' };

export const WelfareTab: React.FC = () => {
  const { state, add, update, remove } = useSabha();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const members = activeMembers(state);

  const save = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { showToast('Please enter a valid amount.', 'warning'); return; }
    if (form.kind === 'disbursement') {
      if (!form.purpose.trim()) { showToast('A disbursement needs a purpose note.', 'warning'); return; }
      if (amt > welfareBalance(state)) { showToast('Disbursement exceeds the fund balance.', 'warning'); return; }
    }
    add('welfare', {
      id: uid('w'), date: form.date, kind: form.kind,
      memberId: form.memberId || undefined, amount: amt,
      purpose: form.purpose.trim() || undefined,
      approvedBy: form.approvedBy.trim() || undefined,
      createdAt: Date.now(),
    });
    showToast(form.kind === 'contribution' ? 'Contribution recorded.' : 'Disbursement recorded.', 'success');
    setForming(false);
    setForm({ ...emptyForm, date: todayISO() });
  };

  const postToTreasury = (w: WelfareEntry) => {
    if (w.treasuryTxId) { showToast('Already posted to treasury.', 'warning'); return; }
    const who = w.memberId ? (state.members.find((m) => m.id === w.memberId)?.name || '') : '';
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date(w.date).toISOString(),
      type: w.kind === 'contribution' ? 'Income' : 'Expense',
      category: 'Welfare Fund',
      subcategory: `Sabha One — ${w.kind}`,
      amount: w.amount,
      handledBy: who || 'Sabha',
      paymentMode: 'Cash', referenceNo: w.id,
      purpose: `Welfare fund ${w.kind}${w.purpose ? ` — ${w.purpose}` : ''}${who ? ` (${who})` : ''}`,
      is80GEligible: false, taxReceiptIssued: false,
      devoteeName: who || 'Sabha welfare',
    });
    if (ok) {
      update('welfare', w.id, { treasuryTxId: 'posted' });
      showToast('Posted to treasury.', 'success');
    } else {
      showToast('Treasury posting failed — entry kept locally, retry later.', 'error');
    }
  };

  const list = [...state.welfare].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-sky-900">{inr(welfareBalance(state))}</div>
            <div className="text-xs font-semibold text-stone-500">
              <T en="Welfare fund balance — contributions minus disbursements (this device)" bn="কল্যাণ তহবিল ব্যালেন্স (এই ডিভাইস)" hi="कल्याण निधि शेष (यह डिवाइस)" />
            </div>
          </div>
          <Btn onClick={() => setForming(true)} className="no-print">＋ <T en="Add entry" bn="এন্ট্রি যোগ করুন" hi="प्रविष्टि जोड़ें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text="No welfare entries yet." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((w) => {
          const who = w.memberId ? (state.members.find((m) => m.id === w.memberId)?.name || '') : '';
          return (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">
                    {w.kind === 'contribution' ? '+' : '−'}{inr(w.amount)}
                    {who && <span className="font-normal text-stone-500 text-sm"> · {who}</span>}
                  </div>
                  <div className="text-xs text-stone-500">{fmtDate(w.date)}{w.purpose && <> · {w.purpose}</>}</div>
                  {w.approvedBy && <div className="text-xs text-stone-500"><T en="Approved by" bn="অনুমোদনকারী" hi="अनुमोदक" />: {w.approvedBy}</div>}
                </div>
                <StatusPill status={w.kind} />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3 no-print">
                {w.treasuryTxId
                  ? <StatusPill status="posted" />
                  : <Btn onClick={() => postToTreasury(w)}>💰 <T en="Post to treasury" bn="কোষাগারে পোস্ট" hi="कोषागार में दर्ज करें" /></Btn>}
                <Btn variant="danger" onClick={() => { if (window.confirm('Remove this entry?')) { remove('welfare', w.id); showToast('Removed.', 'info'); } }}>
                  <T en="Remove" bn="মুছুন" hi="हटाएं" />
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {forming && (
        <Modal title={<T en="Add welfare entry" bn="কল্যাণ এন্ট্রি যোগ করুন" hi="कल्याण प्रविष्टि जोड़ें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as WelfareEntry['kind'] })}>
                <option value="contribution">Contribution</option>
                <option value="disbursement">Disbursement</option>
              </select>
            </Field>
            <Field label={<T en="Amount (₹)" bn="টাকা (₹)" hi="राशि (₹)" />}>
              <input type="number" min="1" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Member" bn="সদস্য" hi="सदस्य" />}>
              <select className={inputCls} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={<T en="Purpose / note" bn="উদ্দেশ্য / নোট" hi="उद्देश्य / टिप्पणी" />} className="sm:col-span-2">
              <input className={inputCls} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder={form.kind === 'disbursement' ? 'e.g. Medical emergency — approved in meeting #12' : 'e.g. Monthly collection'} />
            </Field>
            {form.kind === 'disbursement' && (
              <Field label={<T en="Approved by" bn="অনুমোদনকারী" hi="अनुमोदक" />} className="sm:col-span-2">
                <input className={inputCls} value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} placeholder="e.g. Sabha adhyaksh" />
              </Field>
            )}
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
