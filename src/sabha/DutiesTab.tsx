import React, { useState } from 'react';
import { useSabha, uid, todayISO, activeMembers } from './sabhaStore';
import { DutyAssignment, DutyStatus } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Festival duty roster — assign purohits to duties across member      */
/* mandirs, with availability and confirmations.                      */
/* ------------------------------------------------------------------ */

const STATUSES: DutyStatus[] = ['assigned', 'confirmed', 'completed', 'cancelled'];

const emptyForm = { festival: '', mandir: '', date: todayISO(), slot: '', memberId: '', status: 'assigned' as DutyStatus, notes: '' };

export const DutiesTab: React.FC = () => {
  const { state, add, update, remove } = useSabha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<DutyAssignment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const members = activeMembers(state);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: todayISO() }); setForming(true); };
  const openEdit = (d: DutyAssignment) => {
    setEditing(d);
    setForm({ festival: d.festival, mandir: d.mandir || '', date: d.date, slot: d.slot || '', memberId: d.memberId, status: d.status, notes: d.notes || '' });
    setForming(true);
  };

  const save = () => {
    if (!form.festival.trim()) { showToast('Please enter the festival / occasion.', 'warning'); return; }
    if (!form.memberId) { showToast('Please choose a purohit.', 'warning'); return; }
    const base = {
      festival: form.festival.trim(), mandir: form.mandir.trim() || undefined,
      date: form.date, slot: form.slot.trim() || undefined,
      memberId: form.memberId, status: form.status, notes: form.notes.trim() || undefined,
    };
    if (editing) { update('duties', editing.id, base); showToast('Duty updated.', 'success'); }
    else { add('duties', { id: uid('du'), ...base, createdAt: Date.now() }); showToast('Duty assigned.', 'success'); }
    setForming(false);
  };

  const cycleStatus = (d: DutyAssignment) => {
    const next: Record<DutyStatus, DutyStatus> = { assigned: 'confirmed', confirmed: 'completed', completed: 'assigned', cancelled: 'assigned' };
    update('duties', d.id, { status: next[d.status] });
  };

  const list = [...state.duties].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-stone-700">
            <T en={`${state.duties.length} duty assignments`} bn={`${state.duties.length} দায়িত্ব`} hi={`${state.duties.length} कर्तव्य`} />
          </div>
          <Btn onClick={openNew} className="no-print">＋ <T en="Assign duty" bn="দায়িত্ব দিন" hi="कर्तव्य सौंपें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text="No duties assigned yet." />}

      <div className="space-y-2">
        {list.map((d) => {
          const who = state.members.find((m) => m.id === d.memberId)?.name || '—';
          return (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-extrabold text-stone-800">{d.festival}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {fmtDate(d.date)}{d.slot && <> · {d.slot}</>}{d.mandir && <> · {d.mandir}</>} · <span className="font-bold text-stone-700">{who}</span>
                  </div>
                  {d.notes && <div className="text-xs text-stone-500 mt-1">{d.notes}</div>}
                </div>
                <button type="button" onClick={() => cycleStatus(d)} title="Tap to advance status" className="no-print">
                  <StatusPill status={d.status} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 no-print">
                <Btn variant="ghost" onClick={() => openEdit(d)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
                <Btn variant="danger" onClick={() => { if (window.confirm('Remove this duty?')) { remove('duties', d.id); showToast('Removed.', 'info'); } }}>
                  <T en="Remove" bn="মুছুন" hi="हटाएं" />
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {forming && (
        <Modal title={editing ? <T en="Edit duty" bn="দায়িত্ব সম্পাদনা" hi="कर्तव्य संपादित करें" /> : <T en="Assign duty" bn="দায়িত্ব দিন" hi="कर्तव्य सौंपें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Festival / occasion" bn="উৎসব / উপলক্ষ" hi="उत्सव / अवसर" />} className="sm:col-span-2">
              <input className={inputCls} value={form.festival} onChange={(e) => setForm({ ...form, festival: e.target.value })} placeholder="e.g. Navratri — Durga Puja" />
            </Field>
            <Field label={<T en="Purohit" bn="পুরোহিত" hi="पुरोहित" />}>
              <select className={inputCls} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Mandir (optional)" bn="মন্দির (ঐচ্ছিক)" hi="मंदिर (वैकल्पिक)" />}>
              <input className={inputCls} value={form.mandir} onChange={(e) => setForm({ ...form, mandir: e.target.value })} placeholder="e.g. Shri Ram Mandir" />
            </Field>
            <Field label={<T en="Slot (optional)" bn="স্লট (ঐচ্ছিক)" hi="स्लॉट (वैकल्पिक)" />}>
              <input className={inputCls} value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })} placeholder="e.g. Morning, Evening" />
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />} className="sm:col-span-2">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DutyStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label={<T en="Notes (optional)" bn="নোট (ঐচ্ছিক)" hi="टिप्पणी (वैकल्पिक)" />} className="sm:col-span-2">
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
