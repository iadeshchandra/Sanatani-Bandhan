import React, { useState } from 'react';
import { useMatha, uid } from './mathaStore';
import { DinacharyaItem } from './types';
import { T, Card, Btn, Field, inputCls, Modal, Empty, fmtTime } from './ui';
import { useToast } from '../context/ToastContext';

/* Dinacharya — the matha's daily routine schedule. */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const emptyForm = { time: '06:00', activity: '', days: [] as number[], notes: '' };

export const DinacharyaTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<DinacharyaItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditing(null); setForming(true); };
  const openEdit = (d: DinacharyaItem) => {
    setForm({ time: d.time, activity: d.activity, days: [...d.days], notes: d.notes || '' });
    setEditing(d);
    setForming(true);
  };

  const save = () => {
    if (!form.activity.trim()) { showToast('Please name the activity.', 'warning'); return; }
    const payload = {
      time: form.time, activity: form.activity.trim(),
      days: form.days, notes: form.notes.trim() || undefined,
    };
    if (editing) { update('dinacharya', editing.id, payload); showToast('Routine updated.', 'success'); }
    else { add('dinacharya', { ...payload, id: uid('dc'), createdAt: Date.now() }); showToast('Added to the daily routine.', 'success'); }
    setForming(false);
    setEditing(null);
  };

  const toggleDay = (d: number) => {
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));
  };

  const list = [...state.dinacharya].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ <T en="Add routine item" bn="রুটিন যোগ করুন" hi="दिनचर्या जोड़ें" /></Btn></div>
      {list.length === 0 && <Empty text="The daily routine is not set yet." />}
      <Card>
        <div className="space-y-1">
          {list.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
              <span className="font-mono font-bold text-orange-800 w-20 shrink-0">{fmtTime(d.time)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-stone-800">{d.activity}</div>
                <div className="text-xs text-stone-500">
                  {d.days.length === 0 ? <T en="Every day" bn="প্রতিদিন" hi="प्रतिदिन" /> : d.days.sort().map((x) => DAYS[x]).join(', ')}
                  {d.notes ? ` · ${d.notes}` : ''}
                </div>
              </div>
              <div className="flex gap-1 no-print shrink-0">
                <button onClick={() => openEdit(d)} className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold" aria-label="Edit">✎</button>
                <button onClick={() => { remove('dinacharya', d.id); showToast('Removed.', 'info'); }} className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold" aria-label="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {forming && (
        <Modal title={editing ? 'Edit routine item' : 'Add routine item'} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Time" bn="সময়" hi="समय" />}>
              <input type="time" className={inputCls} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
            <Field label={<T en="Activity" bn="কার্যক্রম" hi="गतिविधि" />}>
              <input className={inputCls} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="Mangala Aarti" />
            </Field>
          </div>
          <div className="mt-3">
            <span className="block text-xs font-bold text-stone-600 mb-1.5">
              <T en="Days (leave empty for every day)" bn="দিন (প্রতিদিনের জন্য খালি রাখুন)" hi="दिन (प्रतिदिन हेतु खाली छोड़ें)" />
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={d} type="button" onClick={() => toggleDay(i)}
                  className={`min-h-[44px] px-3 rounded-xl text-sm font-bold border transition ${form.days.includes(i) ? 'bg-orange-700 text-orange-50 border-orange-700' : 'bg-white text-stone-600 border-stone-200'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Field label={<T en="Notes" bn="নোট" hi="टिप्पणी" />} className="mt-3">
            <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};