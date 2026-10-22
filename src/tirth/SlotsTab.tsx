import React, { useState } from 'react';
import { useTirth, uid, slotIssued } from './tirthStore';
import { DarshanSlot, SLOT_TYPES, SlotType } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtTime } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Tirth One — darshan slot configuration (daily repeating windows). */

const blank: Omit<DarshanSlot, 'id'> = {
  name: '', startTime: '06:00', endTime: '11:00', capacity: 500, slotType: 'General', active: true, notes: '',
};

export const SlotsTab: React.FC = () => {
  const { state, add, update, remove } = useTirth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [editing, setEditing] = useState<DarshanSlot | null>(null);
  const [form, setForm] = useState(blank);

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '' } as DarshanSlot); };
  const openEdit = (s: DarshanSlot) => {
    setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, capacity: s.capacity, slotType: s.slotType, active: s.active, notes: s.notes || '' });
    setEditing(s);
  };

  const save = () => {
    if (!form.name.trim()) { showToast(t('suites.tirth.slots.toastNeedName'), 'error'); return; }
    if (form.endTime <= form.startTime) { showToast(t('suites.tirth.slots.toastEndAfterStart'), 'error'); return; }
    if (form.capacity <= 0) { showToast(t('suites.tirth.slots.toastCapacity'), 'error'); return; }
    const payload = { ...form, name: form.name.trim(), capacity: Math.round(form.capacity) };
    if (editing && editing.id) { update('slots', editing.id, payload); showToast(t('suites.tirth.slots.toastUpdated'), 'success'); }
    else { add('slots', { ...payload, id: uid('sl') }); showToast(t('suites.tirth.slots.toastAdded'), 'success'); }
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Darshan slots" bn="দর্শন স্লট" hi="दर्शन स्लॉट" /></h2>
        <Btn onClick={openNew}>＋ <T en="Add slot" bn="স্লট যোগ" hi="स्लॉट जोड़ें" /></Btn>
      </div>
      <p className="text-xs text-stone-500 -mt-2">Slots repeat daily. Token numbers reset each morning.</p>

      {state.slots.length === 0 && <Card><Empty text={t('suites.tirth.slots.empty')} /></Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.slots.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{s.name}</div>
                <div className="text-xs text-teal-700 font-semibold">{fmtTime(s.startTime)} – {fmtTime(s.endTime)} · {s.slotType}</div>
              </div>
              <StatusPill status={s.active ? 'active' : 'inactive'} />
            </div>
            <div className="mt-2 text-sm text-stone-600">
              Capacity <span className="font-bold text-stone-800">{s.capacity}</span> tokens/day
              {s.notes && <div className="text-xs text-stone-500 mt-1">{s.notes}</div>}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => update('slots', s.id, { active: !s.active })}>
                {s.active ? <T en="Pause" bn="বিরতি" hi="रोकें" /> : <T en="Activate" bn="সক্রিয়" hi="सक्रिय करें" />}
              </Btn>
              <Btn variant="ghost" onClick={() => openEdit(s)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
              <Btn variant="danger" onClick={() => {
                const used = state.tokens.some((t) => t.slotId === s.id);
                if (used) { showToast(t('suites.tirth.slots.toastHasTokens'), 'warning'); return; }
                remove('slots', s.id); showToast(t('suites.tirth.slots.toastRemoved'), 'success');
              }}><T en="Remove" bn="মুছুন" hi="हटाएं" /></Btn>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <Modal title={<T en={editing.id ? 'Edit slot' : 'Add slot'} bn={editing.id ? 'স্লট সম্পাদনা' : 'স্লট যোগ'} hi={editing.id ? 'स्लॉट संपादित करें' : 'स्लॉट जोड़ें'} />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Slot name *" bn="স্লটের নাম *" hi="स्लॉट का नाम *" />} className="sm:col-span-2">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Morning darshan" />
            </Field>
            <Field label={<T en="Start" bn="শুরু" hi="प्रारंभ" />}>
              <input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
            <Field label={<T en="End" bn="শেষ" hi="समाप्ति" />}>
              <input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
            <Field label={<T en="Daily capacity (tokens)" bn="দৈনিক ধারণক্ষমতা" hi="दैनिक क्षमता" />}>
              <input type="number" min={1} className={inputCls} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Math.max(1, Math.round(Number(e.target.value) || 1)) })} />
            </Field>
            <Field label={<T en="Slot type" bn="স্লটের ধরন" hi="स्लॉट प्रकार" />}>
              <select className={inputCls} value={form.slotType} onChange={(e) => setForm({ ...form, slotType: e.target.value as SlotType })}>
                {SLOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
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
