import React, { useState } from 'react';
import { useSoloStore, uid, todayISO } from './soloStore';
import { Card, Stat, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';

/* GivingTab — personal dana history across organisations.
 * ============================================================
 * One honest ledger of the user's giving: organisation, amount,
 * purpose, receipt number. Receipts issued by the organisation's
 * treasury remain the source of truth; this is the devotee's
 * personal copy. Device-local.
 */

export const GivingTab: React.FC = () => {
  const { state, add, remove } = useSoloStore();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [form, setForm] = useState({ orgName: '', amount: '', purpose: '', receiptNo: '', date: todayISO() });

  const total = state.giving.reduce((s, g) => s + g.amount, 0);
  const thisYear = new Date().getFullYear().toString();
  const yearTotal = state.giving.filter((g) => g.date.startsWith(thisYear)).reduce((s, g) => s + g.amount, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.orgName.trim() || !(amount > 0)) {
      showToast(tr('solo.giving.need', 'Enter organisation and amount', 'সংগঠন ও পরিমাণ দিন', 'संगठन और राशि दें'), 'warning');
      return;
    }
    add('giving', {
      id: uid('g'),
      date: form.date,
      orgName: form.orgName.trim(),
      amount,
      purpose: form.purpose.trim() || undefined,
      receiptNo: form.receiptNo.trim() || undefined,
      createdAt: Date.now(),
    });
    setForm({ orgName: '', amount: '', purpose: '', receiptNo: '', date: todayISO() });
    showToast(tr('solo.giving.added', 'Dana recorded — dhanyavaad', 'দান সংরক্ষিত — ধন্যবাদ', 'दान दर्ज — धन्यवाद'), 'success');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={<T en="Total dana" bn="মোট দান" hi="कुल दान" />}
          value={`₹${total.toLocaleString('en-IN')}`}
          sub={<T en="all time" bn="সর্বকাল" hi="सदैव" />}
          tone="amber"
        />
        <Stat
          label={<T en="This year" bn="এই বছর" hi="इस वर्ष" />}
          value={`₹${yearTotal.toLocaleString('en-IN')}`}
          sub={<T en={thisYear} bn={thisYear} hi={thisYear} />}
          tone="emerald"
        />
      </div>

      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="Record dana" bn="দান লিখুন" hi="दान दर्ज करें" />
        </h2>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={<T en="Organisation" bn="সংগঠন" hi="संगठन" />}>
            <input className={inputCls} value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} placeholder="Kashi Vishwanath Mandir" />
          </Field>
          <Field label={<T en="Amount (₹)" bn="পরিমাণ (₹)" hi="राशि (₹)" />}>
            <input type="number" min={1} className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="501" />
          </Field>
          <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label={<T en="Purpose" bn="উদ্দেশ্য" hi="उद्देश्य" />}>
            <input className={inputCls} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Annadanam" />
          </Field>
          <Field label={<T en="Receipt no." bn="রসিদ নং" hi="रसीद सं." />}>
            <input className={inputCls} value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })} placeholder="SB-80G-…" />
          </Field>
          <div className="flex items-end">
            <Btn type="submit"><T en="Record" bn="সংরক্ষণ" hi="दर्ज करें" /></Btn>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="History" bn="ইতিহাস" hi="इतिहास" />
        </h2>
        {state.giving.length === 0 ? (
          <Empty text={tr('solo.giving.none', 'No dana recorded yet.', 'এখনও কোনো দান নেই।', 'अभी कोई दान नहीं।')} />
        ) : (
          <ul className="space-y-1">
            {[...state.giving].sort((a, b) => b.date.localeCompare(a.date)).map((g) => (
              <li key={g.id} className="flex items-center justify-between text-sm py-2 border-b border-stone-50">
                <span>
                  <b className="text-stone-800">{g.orgName}</b>
                  {g.purpose && <span className="text-stone-500"> · {g.purpose}</span>}
                  <span className="text-stone-400 text-xs"> · {g.date}</span>
                  {g.receiptNo && <span className="ml-1 text-xs font-mono text-emerald-700">{g.receiptNo}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <b className="text-amber-800">₹{g.amount.toLocaleString('en-IN')}</b>
                  <button onClick={() => remove('giving', g.id)} className="text-xs text-red-500 hover:underline px-2 py-1">✕</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
