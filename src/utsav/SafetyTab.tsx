import React, { useState } from 'react';
import { useUtsav, uid, todayISO } from './utsavStore';
import { SafetyItem, SAFETY_CATEGORIES } from './types';
import { T, Card, Btn, Field, Modal, inputCls, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';

/* Utsav One — crowd & safety checklist + gate check-in counts.
 *
 * Footfall above 500 triggers the Seva Suggestions gate check-in nudge;
 * this tab owns the checklist and the recorded counts. */

const blank: Omit<SafetyItem, 'id' | 'festivalId'> = {
  item: '', category: SAFETY_CATEGORIES[0], done: false, owner: '', notes: '',
};

export const SafetyTab: React.FC = () => {
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editing, setEditing] = useState<SafetyItem | null>(null);
  const [form, setForm] = useState(blank);
  const [gate, setGate] = useState('Main Gate');
  const [count, setCount] = useState('');

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text="Add a festival first, then run its safety checklist." /></Card>;

  const items = state.safety.filter((s) => s.festivalId === fest.id);
  const checkins = state.checkins.filter((c) => c.festivalId === fest.id).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const total = checkins.reduce((s, c) => s + c.count, 0);
  const donePct = items.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : 0;

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '', festivalId: fest.id } as SafetyItem); };
  const save = () => {
    if (!form.item.trim()) { showToast('Checklist item is required.', 'error'); return; }
    if (editing && editing.id) { update('safety', editing.id, { ...form }); showToast('Item updated.', 'success'); }
    else { add('safety', { ...form, id: uid('sf'), festivalId: fest.id }); showToast('Item added.', 'success'); }
    setEditing(null);
  };

  const recordCheckin = () => {
    const n = Math.floor(Number(count) || 0);
    if (n <= 0) { showToast('Enter a headcount.', 'warning'); return; }
    if (!gate.trim()) { showToast('Enter a gate name.', 'warning'); return; }
    add('checkins', { id: uid('ck'), festivalId: fest.id, date: todayISO(), gate: gate.trim(), count: n, recordedAt: new Date().toISOString() });
    setCount('');
    showToast(`${n.toLocaleString('en-IN')} recorded at ${gate.trim()}.`, 'success');
  };

  const byCat: Record<string, SafetyItem[]> = {};
  for (const i of items) { (byCat[i.category] = byCat[i.category] || []).push(i); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Field label={<T en="Festival" bn="উৎসব" hi="उत्सव" />}>
          <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
            value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
            {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
          </select>
        </Field>
        <Btn onClick={openNew}>＋ <T en="Add checklist item" bn="তালিকা যোগ" hi="सूची जोड़ें" /></Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-1">
            <T en="Safety checklist" bn="নিরাপত্তা তালিকা" hi="सुरक्षा सूची" />
            <span className="ml-2 text-xs font-normal text-stone-500">{donePct}% <T en="complete" bn="সম্পন্ন" hi="पूर्ण" /></span>
          </h3>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden mb-3 no-print">
            <div className="h-full bg-gradient-to-r from-orange-600 to-red-700 transition-all" style={{ width: `${donePct}%` }} />
          </div>
          {items.length === 0 && <Empty text="No checklist items yet." />}
          {Object.keys(byCat).sort().map((cat) => (
            <div key={cat} className="mb-3">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">{cat}</div>
              <div className="space-y-1.5">
                {byCat[cat].map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-xl border border-stone-100 px-3 py-2">
                    <input
                      type="checkbox" checked={i.done} onChange={() => update('safety', i.id, { done: !i.done })}
                      className="w-5 h-5 accent-orange-700 shrink-0" aria-label={i.item}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${i.done ? 'line-through text-stone-400' : 'text-stone-800'}`}>{i.item}</div>
                      {i.owner && <div className="text-[11px] text-stone-500"><T en="Owner" bn="দায়িত্বে" hi="जिम्मेदार" />: {i.owner}</div>}
                    </div>
                    <button onClick={() => { remove('safety', i.id); showToast('Item removed.', 'success'); }}
                      className="text-stone-400 hover:text-red-600 text-lg leading-none px-2 py-2 no-print" aria-label="Remove">🗑</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-extrabold text-stone-800 mb-3">
              <T en="Gate check-in counts" bn="গেট চেক-ইন গণনা" hi="गेट चेक-इन गणना" />
              <span className="ml-2 text-xs font-normal text-stone-500"><T en="Total" bn="মোট" hi="कुल" />: {total.toLocaleString('en-IN')} / {fest.expectedFootfall.toLocaleString('en-IN')}</span>
            </h3>
            <div className="flex flex-wrap gap-2 no-print">
              <input className={`${inputCls} !w-36`} value={gate} onChange={(e) => setGate(e.target.value)} placeholder="Gate name" aria-label="Gate name" />
              <input type="number" min={1} className={`${inputCls} !w-32`} value={count} onChange={(e) => setCount(e.target.value)} placeholder="Headcount" aria-label="Headcount" />
              <Btn onClick={recordCheckin}>📋 <T en="Record" bn="নথিভুক্ত" hi="दर्ज करें" /></Btn>
            </div>
            {checkins.length === 0 && <p className="text-xs text-stone-400 mt-3"><T en="No counts recorded yet." bn="এখনও গণনা হয়নি।" hi="अभी कोई गणना नहीं।" /></p>}
            <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
              {checkins.map((c) => (
                <div key={c.id} className="flex justify-between text-sm rounded-lg bg-stone-50 px-3 py-2">
                  <span className="font-semibold text-stone-700">{c.gate} <span className="text-stone-400 font-normal">· {fmtDate(c.date)}</span></span>
                  <span className="font-extrabold text-orange-800">{c.count.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-extrabold text-stone-800 mb-2">🚦 <T en="Crowd guidance" bn="ভিড় নির্দেশনা" hi="भीड़ मार्गदर्शन" /></h3>
            <p className="text-xs text-stone-600">
              <T
                en="Above 500 expected footfall, staff every gate with check-in volunteers, keep a medical desk and drinking water within 100m of the pandal, and brief volunteers on the lost-and-found point. Counts above are the samiti's own records."
                bn="৫০০-এর বেশি প্রত্যাশিত ভিড়ে প্রতিটি গেটে চেক-ইন স্বেচ্ছাসেবক রাখুন, প্যান্ডেলের ১০০ মিটারের মধ্যে চিকিৎসা ডেস্ক ও পানীয় জল রাখুন।"
                hi="500 से अधिक अपेक्षित भीड़ पर हर गेट पर चेक-इन स्वयंसेवक रखें, पंडाल के 100 मीटर के भीतर चिकित्सा डेस्क व पेयजल रखें।"
              />
            </p>
          </Card>
        </div>
      </div>

      {editing && (
        <Modal title={<T en="Add checklist item" bn="তালিকা যোগ" hi="सूची जोड़ें" />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Item *" bn="বিষয় *" hi="विषय *" />} className="sm:col-span-2">
              <input className={inputCls} value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="Barricades at main gate" />
            </Field>
            <Field label={<T en="Category" bn="বিভাগ" hi="श्रेणी" />}>
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {SAFETY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={<T en="Owner" bn="দায়িত্বে" hi="जिम्मेदार" />}>
              <input className={inputCls} value={form.owner || ''} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Volunteer name" />
            </Field>
            <Field label={<T en="Notes" bn="মন্তব্য" hi="टिप्पणी" />} className="sm:col-span-2">
              <input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
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
