import React, { useState } from 'react';
import { useMatha, uid, displayName, nextOccurrence, daysUntil } from './mathaStore';
import { Observance } from './types';
import { T, Card, Btn, Field, inputCls, Modal, Empty, fmtMonthDay } from './ui';
import { useToast } from '../context/ToastContext';

/* Utsav — matha-specific observances: Guru Purnima, diksha anniversaries, festivals. */

const emptyForm = { name: '', monthDay: '', kind: 'festival' as Observance['kind'], relatedId: '', notes: '' };

export const UtsavTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<Observance | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditing(null); setForming(true); };
  const openEdit = (o: Observance) => {
    setForm({ name: o.name, monthDay: o.monthDay, kind: o.kind, relatedId: o.relatedId || '', notes: o.notes || '' });
    setEditing(o);
    setForming(true);
  };

  const save = () => {
    if (!form.name.trim() || !/^\d{2}-\d{2}$/.test(form.monthDay)) {
      showToast('Please give a name and a valid MM-DD date.', 'warning');
      return;
    }
    const payload = {
      name: form.name.trim(), monthDay: form.monthDay, kind: form.kind,
      relatedId: form.relatedId || undefined, notes: form.notes.trim() || undefined,
    };
    if (editing) { update('observances', editing.id, payload); showToast('Observance updated.', 'success'); }
    else { add('observances', { ...payload, id: uid('ob'), createdAt: Date.now() }); showToast('Observance added.', 'success'); }
    setForming(false);
    setEditing(null);
  };

  const relatedName = (id?: string) => {
    if (!id) return null;
    const s = state.sannyasis.find((x) => x.id === id);
    return s ? displayName(s) : null;
  };

  const list = [...state.observances].sort((a, b) => daysUntil(nextOccurrence(a.monthDay)) - daysUntil(nextOccurrence(b.monthDay)));

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ <T en="Add observance" bn="পালনীয় যোগ করুন" hi="अनुष्ठान जोड़ें" /></Btn></div>
      {list.length === 0 && <Empty text="No observances recorded yet." />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((o) => {
          const inDays = daysUntil(nextOccurrence(o.monthDay));
          const rel = relatedName(o.relatedId);
          return (
            <Card key={o.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-extrabold text-stone-800">🪔 {o.name}</div>
                <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1 shrink-0">
                  {inDays === 0 ? <T en="today" bn="আজ" hi="आज" /> : <T en={`${inDays}d`} bn={`${inDays}দিন`} hi={`${inDays}दिन`} />}
                </span>
              </div>
              <div className="mt-2 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-stone-500"><T en="Date (yearly)" bn="তারিখ (বার্ষিক)" hi="तिथि (वार्षिक)" /></span><span className="font-semibold">{fmtMonthDay(o.monthDay)}</span></div>
                {rel && <div className="flex justify-between"><span className="text-stone-500"><T en="Whose" bn="কার" hi="किसकी" /></span><span className="font-semibold">{rel}</span></div>}
                {o.notes && <div className="text-xs text-stone-500 pt-1">{o.notes}</div>}
              </div>
              <div className="flex gap-2 mt-3 no-print">
                <Btn variant="ghost" onClick={() => openEdit(o)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
                <Btn variant="danger" onClick={() => { remove('observances', o.id); showToast('Observance removed.', 'info'); }}>
                  <T en="Remove" bn="মুছুন" hi="हटाएं" />
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {forming && (
        <Modal title={editing ? 'Edit observance' : 'Add observance'} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Name" bn="নাম" hi="नाम" />}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Guru Purnima" />
            </Field>
            <Field label={<T en="Date (MM-DD, recurs yearly)" bn="তারিখ (MM-DD, বার্ষিক)" hi="तिथि (MM-DD, वार्षिक)" />}>
              <input className={inputCls} value={form.monthDay} onChange={(e) => setForm({ ...form, monthDay: e.target.value })} placeholder="07-10" />
            </Field>
            <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Observance['kind'] })}>
                <option value="guru-purnima">Guru Purnima</option>
                <option value="diksha-anniversary">Diksha anniversary</option>
                <option value="festival">Festival</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label={<T en="Related sannyasi (for anniversaries)" bn="সংশ্লিষ্ট সন্ন্যাসী" hi="संबंधित संन्यासी" />}>
              <select className={inputCls} value={form.relatedId} onChange={(e) => setForm({ ...form, relatedId: e.target.value })}>
                <option value="">—</option>
                {state.sannyasis.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={<T en="Notes" bn="নোট" hi="टिप्पणी" />}>
                <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
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
