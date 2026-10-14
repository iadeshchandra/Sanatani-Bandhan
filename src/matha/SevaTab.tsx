import React, { useState } from 'react';
import { useMatha, uid, displayName } from './mathaStore';
import { SevaAssignment } from './types';
import { T, Card, Btn, Field, inputCls, Modal, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* Seva assignments — rotating duties across the matha. */

const SEVA_SUGGESTIONS = ['Rasoi (kitchen)', 'Dwar (gate)', 'Udyan (garden)', 'Pustakalaya (library)', 'Goshala', 'Office', 'Safai', 'Atithi seva'];
const emptyForm = { seva: '', assigneeId: '', assigneeKind: 'sannyasi' as SevaAssignment['assigneeKind'], frequency: 'Daily', notes: '' };

export const SevaTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<SevaAssignment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditing(null); setForming(true); };
  const openEdit = (a: SevaAssignment) => {
    setForm({ seva: a.seva, assigneeId: a.assigneeId, assigneeKind: a.assigneeKind, frequency: a.frequency, notes: a.notes || '' });
    setEditing(a);
    setForming(true);
  };

  const save = () => {
    if (!form.seva.trim() || !form.assigneeId) { showToast('Please choose a seva and an assignee.', 'warning'); return; }
    const payload = {
      seva: form.seva.trim(), assigneeId: form.assigneeId, assigneeKind: form.assigneeKind,
      frequency: form.frequency.trim() || 'Daily', notes: form.notes.trim() || undefined,
    };
    if (editing) { update('seva', editing.id, payload); showToast('Seva assignment updated.', 'success'); }
    else { add('seva', { ...payload, id: uid('sv'), createdAt: Date.now() }); showToast('Seva assigned.', 'success'); }
    setForming(false);
    setEditing(null);
  };

  const assigneeName = (a: SevaAssignment) => {
    if (a.assigneeKind === 'sannyasi') {
      const s = state.sannyasis.find((x) => x.id === a.assigneeId);
      return s ? displayName(s) : '—';
    }
    const s = state.students.find((x) => x.id === a.assigneeId);
    return s ? s.name : '—';
  };

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ <T en="Assign seva" bn="সেবা দিন" hi="सेवा सौंपें" /></Btn></div>
      {state.seva.length === 0 && <Empty text="No seva assignments yet." />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.seva.map((a) => (
          <Card key={a.id}>
            <div className="font-extrabold text-stone-800">🪔 {a.seva}</div>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500"><T en="Assigned to" bn="দায়িত্বে" hi="सौंपी गई" /></span><span className="font-semibold text-right">{assigneeName(a)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500"><T en="Frequency" bn="ঘনত্ব" hi="आवृत्ति" /></span><span className="font-semibold">{a.frequency}</span></div>
              {a.notes && <div className="text-xs text-stone-500 pt-1">{a.notes}</div>}
            </div>
            <div className="flex gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(a)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
              <Btn variant="danger" onClick={() => { remove('seva', a.id); showToast('Assignment removed.', 'info'); }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? 'Edit seva assignment' : 'Assign seva'} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Seva" bn="সেবা" hi="सेवा" />}>
              <input className={inputCls} list="seva-suggestions" value={form.seva} onChange={(e) => setForm({ ...form, seva: e.target.value })} placeholder="Rasoi (kitchen)" />
              <datalist id="seva-suggestions">
                {SEVA_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </Field>
            <Field label={<T en="Assignee type" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={form.assigneeKind} onChange={(e) => setForm({ ...form, assigneeKind: e.target.value as SevaAssignment['assigneeKind'], assigneeId: '' })}>
                <option value="sannyasi">Sannyasi</option>
                <option value="student">Gurukul student</option>
              </select>
            </Field>
            <Field label={<T en="Assignee" bn="দায়িত্বপ্রাপ্ত" hi="सौंपी गई व्यक्ति" />}>
              <select className={inputCls} value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">—</option>
                {form.assigneeKind === 'sannyasi'
                  ? state.sannyasis.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)
                  : state.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label={<T en="Frequency" bn="ঘনত্ব" hi="आवृत्ति" />}>
              <input className={inputCls} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="Daily" />
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
