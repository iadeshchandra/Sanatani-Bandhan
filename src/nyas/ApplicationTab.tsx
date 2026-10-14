import React, { useState } from 'react';
import { useNyas, uid, currentFY, appliedForFY, fyRange, todayISO } from './nyasStore';
import { ApplicationEntry } from './types';
import { T, Card, Stat, Btn, Field, Modal, inputCls, Empty, inr, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';

/* Nyas One — 85% application rule tracker.
 *
 * Income base comes from the treasury ledger for the FY; "applied"
 * amounts are entries the trustee/CA confirms as applied for
 * charitable purposes. The suite does not decide what counts —
 * that is the CA's job, and the UI says so.
 */

const blank: Omit<ApplicationEntry, 'id'> = {
  fy: currentFY(), date: todayISO(), amount: 0, purpose: '', reference: '',
};

export const ApplicationTab: React.FC = () => {
  const { state, add, remove } = useNyas();
  const { treasury } = useData();
  const { showToast } = useToast();
  const [fy, setFy] = useState(currentFY());
  const [form, setForm] = useState(blank);
  const [adding, setAdding] = useState(false);

  const fys = [...new Set([...state.applications.map((a) => a.fy), currentFY()])].sort().reverse();
  const [fyStart, fyEnd] = fyRange(fy);
  const fyIncome = (treasury || [])
    .filter((t) => t.type === 'Income' && t.date >= fyStart && t.date.slice(0, 10) <= fyEnd)
    .reduce((s, t) => s + (t.amount || 0), 0);
  const applied = appliedForFY(state, fy);
  const pct = fyIncome > 0 ? Math.round((applied / fyIncome) * 100) : 0;
  const target = Math.round(fyIncome * 0.85);
  const shortfall = Math.max(0, target - applied);

  const save = () => {
    if (!form.amount || form.amount <= 0) { showToast('Enter an amount.', 'error'); return; }
    if (!form.purpose.trim()) { showToast('Describe the purpose.', 'error'); return; }
    add('applications', { ...form, fy, id: uid('ap') });
    showToast('Application entry recorded.', 'success');
    setForm({ ...blank, fy });
    setAdding(false);
  };

  const entries = state.applications.filter((a) => a.fy === fy).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="85% application rule" bn="৮৫% প্রয়োগ নিয়ম" hi="85% प्रयोग नियम" /></h2>
        <div className="flex gap-2 items-center no-print">
          <select className={inputCls} style={{ width: 'auto' }} value={fy} onChange={(e) => { setFy(e.target.value); setForm({ ...blank, fy: e.target.value }); }}>
            {fys.map((f) => <option key={f} value={f}>FY {f}</option>)}
          </select>
          <Btn onClick={() => setAdding(true)}>＋ <T en="Record applied amount" bn="প্রয়োগের পরিমাণ লিখুন" hi="प्रयुक्त राशि दर्ज करें" /></Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat tone="indigo" label={<T en={`Treasury income · FY ${fy}`} bn={`কোষাগার আয় · ${fy}`} hi={`कोषागार आय · ${fy}`} />} value={inr(fyIncome)} sub={<T en="From the treasury ledger" bn="কোষাগার খাতা থেকে" hi="कोषागार बही से" />} />
        <Stat tone="amber" label={<T en="85% target" bn="৮৫% লক্ষ্য" hi="85% लक्ष्य" />} value={inr(target)} />
        <Stat tone={pct >= 85 ? 'emerald' : 'amber'} label={<T en="Confirmed applied" bn="নিশ্চিত প্রয়োগ" hi="पुष्ट प्रयुक्त" />} value={inr(applied)} sub={`${pct}%`} />
        <Stat tone={shortfall > 0 ? 'red' : 'emerald'} label={<T en="Shortfall" bn="ঘাটতি" hi="कमी" />} value={inr(shortfall)} sub={shortfall > 0 ? <T en="To reach 85%" bn="৮৫%-এ পৌঁছাতে" hi="85% तक पहुँचने हेतु" /> : <T en="Target met ✓" bn="লক্ষ্য পূরণ ✓" hi="लक्ष्य पूर्ण ✓" />} />
      </div>

      <Card>
        <div className="h-4 rounded-full bg-stone-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="text-xs text-stone-500 mt-3">
          <T
            en="Section 12A requires at least 85% of income to be applied for charitable purposes each year. Only record amounts your CA confirms as “applied” — this tracker does not decide tax treatment."
            bn="ধারা ১২এ অনুযায়ী প্রতি বছর আয়ের কমপক্ষে ৮৫% দাতব্য উদ্দেশ্যে প্রয়োগ করতে হয়। শুধুমাত্র সিএ-নিশ্চিত পরিমাণ লিখুন — এই ট্র্যাকার কর-বিষয়ক সিদ্ধান্ত দেয় না।"
            hi="धारा 12A के अनुसार प्रत्येक वर्ष आय का कम से कम 85% धर्मार्थ उद्देश्यों हेतु प्रयुक्त होना चाहिए। केवल CA-पुष्ट राशियाँ दर्ज करें — यह ट्रैकर कर-निर्धारण नहीं करता।"
          />
        </p>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="Application entries" bn="প্রয়োগের বিবরণ" hi="प्रयोग प्रविष्टियाँ" /> · FY {fy}</h3>
        {entries.length === 0 && <Empty text="No application entries for this FY yet." />}
        {entries.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
            <div>
              <div className="text-sm font-bold text-stone-800">{inr(a.amount)} — {a.purpose}</div>
              <div className="text-xs text-stone-500">{fmtDate(a.date)}{a.reference ? ` · ${a.reference}` : ''}</div>
            </div>
            <button onClick={() => { remove('applications', a.id); showToast('Entry removed.', 'success'); }} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 font-bold min-w-[44px] min-h-[44px] no-print" aria-label="Delete">✕</button>
          </div>
        ))}
      </Card>

      {adding && (
        <Modal title={<T en="Record applied amount" bn="প্রয়োগের পরিমাণ" hi="प्रयुक्त राशि" />} onClose={() => setAdding(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Amount (₹)" bn="পরিমাণ (₹)" hi="राशि (₹)" />}>
              <input type="number" min="1" className={inputCls} value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="50000" />
            </Field>
            <Field label={<T en="Purpose" bn="উদ্দেশ্য" hi="उद्देश्य" />} className="sm:col-span-2">
              <input className={inputCls} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Annakshetra running expenses — Q2" />
            </Field>
            <Field label={<T en="Reference (optional)" bn="সূত্র (ঐচ্ছিক)" hi="संदर्भ (वैकल्पिक)" />} className="sm:col-span-2">
              <input className={inputCls} value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Voucher / CA note" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
