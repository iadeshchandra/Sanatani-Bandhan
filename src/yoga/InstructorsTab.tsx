import React, { useState } from 'react';
import { useYoga, uid, batchStudents } from './yogaStore';
import { YogaInstructor } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill } from './ui';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Yoga One — instructor roster with honorarium tracking. */

export const InstructorsTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { state, add, update, remove } = useYoga();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState<Partial<YogaInstructor> | null>(null);

  const save = () => {
    if (!forming || !forming.name?.trim()) { showToast(t('suites.yoga.instructors.toastNeedName'), 'warning'); return; }
    const ins: YogaInstructor = {
      id: forming.id || uid('ins'),
      name: forming.name.trim(),
      phone: forming.phone?.trim() || undefined,
      specialties: forming.specialties?.trim() || undefined,
      honorariumMonthly: forming.honorariumMonthly || undefined,
      active: forming.active !== false,
      notes: forming.notes?.trim() || undefined,
    };
    if (forming.id) { update('instructors', forming.id, ins); showToast(t('suites.yoga.instructors.toastUpdated'), 'success'); }
    else { add('instructors', ins); showToast(t('suites.yoga.instructors.toastAdded').replace('{name}', ins.name), 'success'); }
    setForming(null);
  };

  const tryDelete = (ins: YogaInstructor) => {
    const nb = state.batches.filter((b) => b.instructorId === ins.id).length;
    if (nb > 0) { showToast(t('suites.yoga.instructors.toastReassign').replace('{count}', String(nb)), 'warning'); return; }
    remove('instructors', ins.id);
    showToast(t('suites.yoga.instructors.toastRemoved'), 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Instructors" bn="প্রশিক্ষক" hi="प्रशिक्षक" /></h2>
        <Btn onClick={() => setForming({ name: '', active: true })}>＋ <T en="Add instructor" bn="প্রশিক্ষক যোগ করুন" hi="प्रशिक्षक जोड़ें" /></Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.instructors.map((ins) => {
          const batches = state.batches.filter((b) => b.instructorId === ins.id);
          const students = batches.reduce((s, b) => s + batchStudents(state, b.id).length, 0);
          return (
            <Card key={ins.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">🧘 {ins.name}</div>
                  {ins.specialties && <div className="text-xs text-stone-500 mt-0.5">{ins.specialties}</div>}
                  {ins.phone && <div className="text-xs text-stone-500">{ins.phone}</div>}
                  <div className="text-xs text-stone-500 mt-1">
                    {batches.length} <T en="batch(es)" bn="ব্যাচ" hi="बैच" /> · {students} <T en="students" bn="শিক্ষার্থী" hi="छात्र" />
                    {ins.honorariumMonthly ? <> · {inr(ins.honorariumMonthly)}/<T en="mo" bn="মাস" hi="माह" /></> : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusPill status={ins.active ? 'active' : 'inactive'} />
                  <div className="flex gap-1 no-print">
                    <button onClick={() => setForming({ ...ins })} className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm" aria-label="Edit">✏️</button>
                    <button onClick={() => tryDelete(ins)} className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm" aria-label="Delete">🗑️</button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {state.instructors.length === 0 && <Card><p className="text-sm text-stone-500"><T en="No instructors yet." bn="এখনও কোনো প্রশিক্ষক নেই।" hi="अभी कोई प्रशिक्षक नहीं।" /></p></Card>}

      {forming && (
        <Modal title={<T en={forming.id ? 'Edit instructor' : 'Add instructor'} bn={forming.id ? 'প্রশিক্ষক সম্পাদনা' : 'প্রশিক্ষক যোগ করুন'} hi={forming.id ? 'प्रशिक्षक संपादित करें' : 'प्रशिक्षक जोड़ें'} />} onClose={() => setForming(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Full name" bn="পুরো নাম" hi="पूरा नाम" />} className="sm:col-span-2">
              <input className={inputCls} value={forming.name || ''} onChange={(e) => setForming({ ...forming, name: e.target.value })} placeholder="Yogacharya name" />
            </Field>
            <Field label={<T en="Phone" bn="ফোন" hi="फ़ोन" />}>
              <input className={inputCls} value={forming.phone || ''} onChange={(e) => setForming({ ...forming, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={<T en={`Monthly honorarium (${wsCurrency.symbol})`} bn={`মাসিক সম্মানী (${wsCurrency.symbol})`} hi={`मासिक मानदेय (${wsCurrency.symbol})`} />}>
              <input type="number" min={0} className={inputCls} value={forming.honorariumMonthly ?? ''} onChange={(e) => setForming({ ...forming, honorariumMonthly: Number(e.target.value) || undefined })} placeholder="Optional" />
            </Field>
            <Field label={<T en="Specialties" bn="বিশেষত্ব" hi="विशेषज्ञता" />} className="sm:col-span-2">
              <input className={inputCls} value={forming.specialties || ''} onChange={(e) => setForming({ ...forming, specialties: e.target.value })} placeholder="Hatha, Pranayama, Meditation…" />
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={forming.active === false ? 'inactive' : 'active'} onChange={(e) => setForming({ ...forming, active: e.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save instructor" bn="প্রশিক্ষক সংরক্ষণ" hi="प्रशिक्षक सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
