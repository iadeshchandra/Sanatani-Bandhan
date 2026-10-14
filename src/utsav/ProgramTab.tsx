import React, { useState } from 'react';
import { useUtsav, uid, todayISO } from './utsavStore';
import { ProgramSlot, PROGRAM_KINDS } from './types';
import { T, Card, Btn, Field, Modal, inputCls, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';

/* Utsav One — program schedule: day-wise / hour-wise कार्यक्रम. */

const blank: Omit<ProgramSlot, 'id' | 'festivalId'> = {
  date: todayISO(), startTime: '19:00', endTime: '20:00', title: '', kind: PROGRAM_KINDS[0], lead: '', venue: '', notes: '',
};

export const ProgramTab: React.FC = () => {
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editing, setEditing] = useState<ProgramSlot | null>(null);
  const [form, setForm] = useState(blank);

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text="Add a festival first, then schedule its program." /></Card>;

  const slots = state.program
    .filter((p) => p.festivalId === fest.id)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  // Group by date for a day-wise view.
  const byDate: Record<string, ProgramSlot[]> = {};
  for (const s of slots) { (byDate[s.date] = byDate[s.date] || []).push(s); }

  const openNew = () => { setForm({ ...blank, date: fest.startDate }); setEditing({ ...blank, date: fest.startDate, id: '', festivalId: fest.id } as ProgramSlot); };
  const openEdit = (s: ProgramSlot) => {
    setForm({ date: s.date, startTime: s.startTime, endTime: s.endTime, title: s.title, kind: s.kind, lead: s.lead || '', venue: s.venue || '', notes: s.notes || '' });
    setEditing(s);
  };

  const save = () => {
    if (!form.title.trim()) { showToast('Program title is required.', 'error'); return; }
    if (form.endTime <= form.startTime) { showToast('End time must be after start time.', 'error'); return; }
    if (editing && editing.id) { update('program', editing.id, { ...form }); showToast('Slot updated.', 'success'); }
    else { add('program', { ...form, id: uid('pg'), festivalId: fest.id }); showToast('Slot added.', 'success'); }
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Field label={<T en="Festival" bn="উৎসব" hi="उत्सव" />}>
          <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
            value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
            {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
          </select>
        </Field>
        <Btn onClick={openNew}>＋ <T en="Add slot" bn="স্লট যোগ" hi="स्लॉट जोड़ें" /></Btn>
      </div>

      {slots.length === 0 && <Card><Empty text="No program slots yet. Schedule aartis, kirtans, pravachans and cultural programs." /></Card>}

      {Object.keys(byDate).sort().map((date) => (
        <Card key={date}>
          <h3 className="font-extrabold text-stone-800 mb-3">📅 {fmtDate(date)} <span className="text-xs font-normal text-stone-500">({byDate[date].length} <T en="slots" bn="স্লট" hi="स्लॉट" />)</span></h3>
          <div className="space-y-2">
            {byDate[date].map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded-xl border border-stone-100 p-3">
                <div className="shrink-0 text-center bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 min-w-[86px]">
                  <div className="font-extrabold text-orange-800 text-sm">{s.startTime}</div>
                  <div className="text-[11px] text-stone-500">→ {s.endTime}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-stone-800">{s.title}</div>
                  <div className="text-xs text-stone-500">{s.kind}{s.lead ? ` · ${s.lead}` : ''}{s.venue ? ` · ${s.venue}` : ''}</div>
                  {s.notes && <div className="text-xs text-stone-400 mt-0.5">{s.notes}</div>}
                </div>
                <div className="flex gap-1 shrink-0 no-print">
                  <Btn variant="ghost" onClick={() => openEdit(s)}>✎</Btn>
                  <Btn variant="danger" onClick={() => { remove('program', s.id); showToast('Slot removed.', 'success'); }}>🗑</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {editing && (
        <Modal title={<T en={editing.id ? 'Edit slot' : 'Add program slot'} bn={editing.id ? 'স্লট সম্পাদনা' : 'স্লট যোগ'} hi={editing.id ? 'स्लॉट संपादित करें' : 'स्लॉट जोड़ें'} />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Title *" bn="শিরোনাম *" hi="शीर्षक *" />} className="sm:col-span-2">
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sandhya Aarti" />
            </Field>
            <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {PROGRAM_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} min={fest.startDate} max={fest.endDate} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Start time" bn="শুরুর সময়" hi="प्रारंभ समय" />}>
              <input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
            <Field label={<T en="End time" bn="শেষের সময়" hi="समाप्ति समय" />}>
              <input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
            <Field label={<T en="Lead / performer" bn="নেতৃত্ব / শিল্পী" hi="नेतृत्व / कलाकार" />}>
              <input className={inputCls} value={form.lead || ''} onChange={(e) => setForm({ ...form, lead: e.target.value })} placeholder="Mukhya Pujari" />
            </Field>
            <Field label={<T en="Venue" bn="স্থান" hi="स्थान" />}>
              <input className={inputCls} value={form.venue || ''} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Main pandal" />
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
