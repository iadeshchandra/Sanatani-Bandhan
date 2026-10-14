import React, { useState } from 'react';
import { useYoga, uid, batchStudents, batchesWithRoom } from './yogaStore';
import { YogaBatch, BatchLevel, WEEKDAYS_SHORT } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, fmtTime, inr } from './ui';
import { useToast } from '../context/ToastContext';

/* Yoga One — batch registry CRUD. */

const LEVELS: BatchLevel[] = ['beginner', 'intermediate', 'advanced'];
const LEVEL_BN: Record<BatchLevel, string> = { beginner: 'প্রারম্ভিক', intermediate: 'মধ্যম', advanced: 'উন্নত' };
const LEVEL_HI: Record<BatchLevel, string> = { beginner: 'प्रारंभिक', intermediate: 'मध्यम', advanced: 'उन्नत' };

export const BatchesTab: React.FC = () => {
  const { state, add, update, remove } = useYoga();
  const { showToast } = useToast();
  const [forming, setForming] = useState<Partial<YogaBatch> | null>(null);
  const [confirmDel, setConfirmDel] = useState<YogaBatch | null>(null);

  const openNew = () =>
    setForming({ name: '', level: 'beginner', days: [1, 3, 5], startTime: '06:00', endTime: '07:00', capacity: 20, feeMonthly: state.settings.defaultFeeMonthly, active: true });

  const save = () => {
    if (!forming || !forming.name?.trim()) { showToast('Batch name is required.', 'warning'); return; }
    if (!forming.days?.length) { showToast('Pick at least one day.', 'warning'); return; }
    if ((forming.capacity || 0) <= 0) { showToast('Capacity must be at least 1.', 'warning'); return; }
    const batch: YogaBatch = {
      id: forming.id || uid('bt'),
      name: forming.name.trim(),
      level: forming.level || 'beginner',
      days: forming.days || [],
      startTime: forming.startTime || '06:00',
      endTime: forming.endTime || '07:00',
      instructorId: forming.instructorId || undefined,
      capacity: forming.capacity || 20,
      feeMonthly: forming.feeMonthly ?? state.settings.defaultFeeMonthly,
      active: forming.active !== false,
      notes: forming.notes?.trim() || undefined,
    };
    if (forming.id) { update('batches', forming.id, batch); showToast('Batch updated.', 'success'); }
    else { add('batches', batch); showToast(`Batch "${batch.name}" created.`, 'success'); }
    setForming(null);
  };

  const doDelete = () => {
    if (!confirmDel) return;
    const n = batchStudents(state, confirmDel.id).length;
    if (n > 0) { showToast(`Move or remove ${n} student(s) first — the register keeps history.`, 'warning'); setConfirmDel(null); return; }
    remove('batches', confirmDel.id);
    showToast('Batch deleted.', 'success');
    setConfirmDel(null);
  };

  const toggleDay = (d: number) => {
    const days = forming?.days || [];
    setForming({ ...forming, days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort() });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Batches" bn="ব্যাচ" hi="बैच" /></h2>
        <Btn onClick={openNew}>＋ <T en="New batch" bn="নতুন ব্যাচ" hi="नया बैच" /></Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.batches.map((b) => {
          const n = batchStudents(state, b.id).length;
          const full = n >= b.capacity;
          const instructor = state.instructors.find((i) => i.id === b.instructorId);
          return (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">{b.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {b.days.map((d) => WEEKDAYS_SHORT[d]).join(' · ')} · {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                  </div>
                  {instructor && <div className="text-xs text-stone-500">🧘 {instructor.name}</div>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusPill status={b.level} />
                  {!b.active && <StatusPill status="inactive" />}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className={`font-extrabold ${full ? 'text-red-700' : 'text-emerald-700'}`}>{n}/{b.capacity}</span>
                  <span className="text-stone-500 text-xs"> students</span>
                  <span className="text-stone-400 text-xs"> · {inr(b.feeMonthly)}/mo</span>
                </div>
                <div className="flex gap-1 no-print">
                  <button onClick={() => setForming({ ...b })} className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm" aria-label="Edit">✏️</button>
                  <button onClick={() => setConfirmDel(b)} className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm" aria-label="Delete">🗑️</button>
                </div>
              </div>
              {full && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <T en="Full — new students can join:" bn="পূর্ণ — নতুনরা যোগ দিতে পারে:" hi="भरा हुआ — नए छात्र जुड़ सकते हैं:" />{' '}
                  {batchesWithRoom(state, b.id).map((x) => x.name).slice(0, 3).join(', ') || <T en="no other batch has room" bn="অন্য কোনো ব্যাচে জায়গা নেই" hi="किसी अन्य बैच में जगह नहीं" />}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {state.batches.length === 0 && <Card><p className="text-sm text-stone-500"><T en="No batches yet — create your first batch." bn="এখনও কোনো ব্যাচ নেই।" hi="अभी कोई बैच नहीं।" /></p></Card>}

      {forming && (
        <Modal title={<T en={forming.id ? 'Edit batch' : 'New batch'} bn={forming.id ? 'ব্যাচ সম্পাদনা' : 'নতুন ব্যাচ'} hi={forming.id ? 'बैच संपादित करें' : 'नया बैच'} />} onClose={() => setForming(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Batch name" bn="ব্যাচের নাম" hi="बैच का नाम" />} className="sm:col-span-2">
              <input className={inputCls} value={forming.name || ''} onChange={(e) => setForming({ ...forming, name: e.target.value })} placeholder="Morning Beginners" />
            </Field>
            <Field label={<T en="Level" bn="স্তর" hi="स्तर" />}>
              <select className={inputCls} value={forming.level} onChange={(e) => setForming({ ...forming, level: e.target.value as BatchLevel })}>
                {LEVELS.map((l) => <option key={l} value={l}>{l === 'beginner' ? 'Beginner' : l === 'intermediate' ? 'Intermediate' : 'Advanced'}</option>)}
              </select>
            </Field>
            <Field label={<T en="Instructor" bn="প্রশিক্ষক" hi="प्रशिक्षक" />}>
              <select className={inputCls} value={forming.instructorId || ''} onChange={(e) => setForming({ ...forming, instructorId: e.target.value || undefined })}>
                <option value="">—</option>
                {state.instructors.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <span className="block text-xs font-bold text-stone-600 mb-1.5"><T en="Days" bn="দিন" hi="दिन" /></span>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS_SHORT.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`w-11 h-11 rounded-xl text-xs font-bold border transition ${(forming.days || []).includes(i) ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-600 border-stone-200'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <Field label={<T en="Start time" bn="শুরুর সময়" hi="प्रारंभ समय" />}>
              <input type="time" className={inputCls} value={forming.startTime || '06:00'} onChange={(e) => setForming({ ...forming, startTime: e.target.value })} />
            </Field>
            <Field label={<T en="End time" bn="শেষের সময়" hi="समाप्ति समय" />}>
              <input type="time" className={inputCls} value={forming.endTime || '07:00'} onChange={(e) => setForming({ ...forming, endTime: e.target.value })} />
            </Field>
            <Field label={<T en="Capacity" bn="ধারণক্ষমতা" hi="क्षमता" />}>
              <input type="number" min={1} className={inputCls} value={forming.capacity ?? 20} onChange={(e) => setForming({ ...forming, capacity: Number(e.target.value) })} />
            </Field>
            <Field label={<T en="Monthly fee (₹)" bn="মাসিক ফি (₹)" hi="मासिक शुल्क (₹)" />}>
              <input type="number" min={0} className={inputCls} value={forming.feeMonthly ?? state.settings.defaultFeeMonthly} onChange={(e) => setForming({ ...forming, feeMonthly: Number(e.target.value) })} />
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={forming.active === false ? 'inactive' : 'active'} onChange={(e) => setForming({ ...forming, active: e.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label={<T en="Notes" bn="নোট" hi="नोट" />}>
              <input className={inputCls} value={forming.notes || ''} onChange={(e) => setForming({ ...forming, notes: e.target.value })} placeholder="Optional" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save batch" bn="ব্যাচ সংরক্ষণ" hi="बैच सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title={<T en="Delete batch?" bn="ব্যাচ মুছবেন?" hi="बैच हटाएं?" />} onClose={() => setConfirmDel(null)}>
          <p className="text-sm text-stone-600"><T en={`Delete "${confirmDel.name}"? Students keep their history; only the batch is removed.`} bn={`"${confirmDel.name}" মুছবেন?`} hi={`"${confirmDel.name}" हटाएं?`} /></p>
          <div className="flex gap-2 mt-4">
            <Btn variant="danger" onClick={doDelete}><T en="Delete" bn="মুছুন" hi="हटाएं" /></Btn>
            <Btn variant="ghost" onClick={() => setConfirmDel(null)}><T en="Keep" bn="রাখুন" hi="रखें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
