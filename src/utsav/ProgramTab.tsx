import React, { useState } from 'react';
import { useUtsav, uid, todayISO } from './utsavStore';
import { ProgramSlot, PROGRAM_KINDS } from './types';
import { T, Card, Btn, Field, Modal, inputCls, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — program schedule: day-wise / hour-wise कार्यक्रम. */

const blank: Omit<ProgramSlot, 'id' | 'festivalId'> = {
  date: todayISO(), startTime: '19:00', endTime: '20:00', title: '', kind: PROGRAM_KINDS[0], lead: '', venue: '', notes: '',
};

export const ProgramTab: React.FC = () => {
  const { t } = useLanguage();
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editing, setEditing] = useState<ProgramSlot | null>(null);
  const [form, setForm] = useState(blank);

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text={t('ritual.utsav.program.empty_add_a_festival_first_then_schedu')} /></Card>;

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
    if (!form.title.trim()) { showToast(t('ritual.utsav.program.toastTitleRequired'), 'error'); return; }
    if (form.endTime <= form.startTime) { showToast(t('ritual.utsav.program.toastTimeOrder'), 'error'); return; }
    if (editing && editing.id) { update('program', editing.id, { ...form }); showToast(t('ritual.utsav.program.toastUpdated'), 'success'); }
    else { add('program', { ...form, id: uid('pg'), festivalId: fest.id }); showToast(t('ritual.utsav.program.toastAdded'), 'success'); }
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Field label={t('ritual.common.festival')}>
          <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
            value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
            {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
          </select>
        </Field>
        <Btn onClick={openNew}>＋ {t('ritual.utsav.program.add_slot')}</Btn>
      </div>

      {slots.length === 0 && <Card><Empty text={t('ritual.utsav.program.empty_no_program_slots_yet_schedule_aa')} /></Card>}

      {Object.keys(byDate).sort().map((date) => (
        <Card key={date}>
          <h3 className="font-extrabold text-stone-800 mb-3">📅 {fmtDate(date)} <span className="text-xs font-normal text-stone-500">({byDate[date].length} {t('ritual.utsav.program.slots')})</span></h3>
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
                  <Btn variant="danger" onClick={() => { remove('program', s.id); showToast(t('ritual.utsav.program.toastRemoved'), 'success'); }}>🗑</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {editing && (
        <Modal title={editing.id ? t('ritual.utsav.program.editSlot') : t('ritual.utsav.program.add_slot')} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('ritual.utsav.program.title')} className="sm:col-span-2">
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sandhya Aarti" />
            </Field>
            <Field label={t('ritual.common.kind')}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {PROGRAM_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label={t('ritual.common.date')}>
              <input type="date" className={inputCls} value={form.date} min={fest.startDate} max={fest.endDate} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={t('ritual.utsav.program.start_time')}>
              <input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
            <Field label={t('ritual.utsav.program.end_time')}>
              <input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
            <Field label={t('ritual.utsav.program.lead_performer')}>
              <input className={inputCls} value={form.lead || ''} onChange={(e) => setForm({ ...form, lead: e.target.value })} placeholder="Mukhya Pujari" />
            </Field>
            <Field label={t('ritual.common.venue')}>
              <input className={inputCls} value={form.venue || ''} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Main pandal" />
            </Field>
            <Field label={t('ritual.common.notes')} className="sm:col-span-2">
              <input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}>{t('ritual.common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}>{t('ritual.common.cancel')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
