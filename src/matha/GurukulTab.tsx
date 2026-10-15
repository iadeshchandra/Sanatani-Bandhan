import React, { useState } from 'react';
import { useMatha, uid, todayISO, displayName } from './mathaStore';
import { GurukulStudent } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* Gurukul — brahmachari students under training. */

const emptyForm = { name: '', age: '', guruId: '', subjects: '', progressNotes: '', joinDate: todayISO(), status: 'studying' as GurukulStudent['status'] };

export const GurukulTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<GurukulStudent | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm({ ...emptyForm, joinDate: todayISO() }); setEditing(null); setForming(true); };
  const openEdit = (s: GurukulStudent) => {
    setForm({
      name: s.name, age: s.age || '', guruId: s.guruId || '', subjects: s.subjects,
      progressNotes: s.progressNotes || '', joinDate: s.joinDate, status: s.status,
    });
    setEditing(s);
    setForming(true);
  };

  const save = () => {
    if (!form.name.trim()) { showToast('Please give the student a name.', 'warning'); return; }
    const payload = {
      name: form.name.trim(), age: form.age.trim() || undefined,
      guruId: form.guruId || undefined, subjects: form.subjects.trim(),
      progressNotes: form.progressNotes.trim() || undefined,
      joinDate: form.joinDate, status: form.status,
    };
    if (editing) { update('students', editing.id, payload); showToast('Student record updated.', 'success'); }
    else { add('students', { ...payload, id: uid('gs'), createdAt: Date.now() }); showToast('Student admitted to the gurukul.', 'success'); }
    setForming(false);
    setEditing(null);
  };

  const guruName = (id?: string) => {
    if (!id) return '—';
    const g = state.sannyasis.find((s) => s.id === id);
    return g ? displayName(g) : '—';
  };

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ <T en="Admit student" bn="শিক্ষার্থী ভর্তি" hi="छात्र प्रवेश" /></Btn></div>
      {state.students.length === 0 && <Empty text="No gurukul students recorded yet." />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.students.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-extrabold text-stone-800">📿 {s.name}</div>
              <StatusPill status={s.status} />
            </div>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500"><T en="Guru" bn="গুরু" hi="गुरु" /></span><span className="font-semibold">{guruName(s.guruId)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500"><T en="Since" bn="থেকে" hi="से" /></span><span className="font-semibold">{fmtDate(s.joinDate)}</span></div>
              {s.age && <div className="flex justify-between"><span className="text-stone-500"><T en="Age" bn="বয়স" hi="आयु" /></span><span className="font-semibold">{s.age}</span></div>}
              {s.subjects && <div className="text-xs text-stone-600 pt-1"><span className="font-bold"><T en="Subjects" bn="বিষয়" hi="विषय" />: </span>{s.subjects}</div>}
              {s.progressNotes && <div className="text-xs text-stone-500 pt-1">{s.progressNotes}</div>}
            </div>
            <div className="flex gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(s)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
              <Btn variant="danger" onClick={() => { remove('students', s.id); showToast('Record removed.', 'info'); }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? 'Edit student record' : 'Admit gurukul student'} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Name" bn="নাম" hi="नाम" />}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={<T en="Age" bn="বয়স" hi="आयु" />}>
              <input className={inputCls} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="14" />
            </Field>
            <Field label={<T en="Guru" bn="গুরু" hi="गुरु" />}>
              <select className={inputCls} value={form.guruId} onChange={(e) => setForm({ ...form, guruId: e.target.value })}>
                <option value="">—</option>
                {state.sannyasis.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)}
              </select>
            </Field>
            <Field label={<T en="Join date" bn="যোগদানের তারিখ" hi="प्रवेश तिथि" />}>
              <input type="date" className={inputCls} value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={<T en="Subjects" bn="বিষয়" hi="विषय" />}>
                <input className={inputCls} value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} placeholder="Veda, Vyakarana, Jyotisha" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={<T en="Progress notes" bn="অগ্রগতি নোট" hi="प्रगति टिप्पणी" />}>
                <textarea className={inputCls} rows={2} value={form.progressNotes} onChange={(e) => setForm({ ...form, progressNotes: e.target.value })} />
              </Field>
            </div>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GurukulStudent['status'] })}>
                <option value="studying">Studying</option>
                <option value="completed">Completed</option>
                <option value="left">Left</option>
              </select>
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