import React, { useState } from 'react';
import { useYoga, uid, todayISO, batchStudents, batchHasRoom, batchesWithRoom, attendancePct } from './yogaStore';
import { YogaStudent, FeeCycle, StudentStatus } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Yoga One — student registry. Health notes are private, device-local. */

export const StudentsTab: React.FC = () => {
  const { state, add, update } = useYoga();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState<Partial<YogaStudent> | null>(null);
  const [filterBatch, setFilterBatch] = useState<string>('all');
  const [search, setSearch] = useState('');

  const openNew = (batchId?: string) =>
    setForming({ name: '', phone: '', joinDate: todayISO(), batchId: batchId || state.batches.find((b) => b.active)?.id || '', feeCycle: 'monthly', status: 'active' });

  const save = () => {
    if (!forming || !forming.name?.trim()) { showToast(t('suites.yoga.students.toastNeedName'), 'warning'); return; }
    if (!forming.batchId) { showToast(t('suites.yoga.common.toastNeedBatch'), 'warning'); return; }
    const batch = state.batches.find((b) => b.id === forming.batchId);
    if (!batch) { showToast(t('suites.yoga.students.toastBatchNotFound'), 'error'); return; }
    if (!forming.id && !batchHasRoom(state, batch)) {
      const alt = batchesWithRoom(state, batch.id);
      showToast(
        t('suites.yoga.students.toastBatchFull').replace('{name}', batch.name).replace('{capacity}', String(batch.capacity)) + (alt.length ? t('suites.yoga.students.toastBatchFullAlt').replace('{names}', alt.slice(0, 2).map((a) => a.name).join(', ')) : t('suites.yoga.students.toastNoRoom')),
        'warning'
      );
      return;
    }
    const student: YogaStudent = {
      id: forming.id || uid('st'),
      name: forming.name.trim(),
      phone: forming.phone?.trim() || undefined,
      healthNotes: forming.healthNotes?.trim() || undefined,
      joinDate: forming.joinDate || todayISO(),
      batchId: forming.batchId,
      feeCycle: forming.feeCycle || 'monthly',
      status: forming.status || 'active',
      createdAt: Date.now(),
    };
    if (forming.id) { update('students', forming.id, student); showToast(t('suites.yoga.students.toastUpdated'), 'success'); }
    else { add('students', student); showToast(t('suites.yoga.students.toastEnrolled').replace('{name}', student.name).replace('{batch}', batch.name), 'success'); }
    setForming(null);
  };

  const list = state.students
    .filter((s) => (filterBatch === 'all' || s.batchId === filterBatch))
    .filter((s) => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Students" bn="শিক্ষার্থী" hi="छात्र" /></h2>
        <Btn onClick={() => openNew()}>＋ <T en="Enroll student" bn="শিক্ষার্থী ভর্তি" hi="छात्र नामांकित करें" /></Btn>
      </div>

      <div className="flex gap-2 flex-wrap no-print">
        <select className={inputCls + ' !w-auto'} value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} aria-label="Filter by batch">
          <option value="all">All batches</option>
          {state.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className={inputCls + ' !w-auto flex-1 min-w-[160px]'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name…" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((s) => {
          const b = state.batches.find((x) => x.id === s.batchId);
          const pct = attendancePct(state, s.id, s.batchId);
          return (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">{s.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {b?.name || '—'} · <T en="joined" bn="যোগদান" hi="जुड़े" /> {fmtDate(s.joinDate)}
                    {s.phone && <span> · {s.phone}</span>}
                  </div>
                  {pct !== null && (
                    <div className="text-xs mt-1">
                      <span className={`font-extrabold ${pct >= state.settings.attendanceAlertBelowPct ? 'text-emerald-700' : 'text-amber-700'}`}>{pct}%</span>
                      <span className="text-stone-500"> <T en="attendance" bn="উপস্থিতি" hi="उपस्थिति" /></span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusPill status={s.status} />
                  <button onClick={() => setForming({ ...s })} className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm no-print" aria-label="Edit">✏️</button>
                </div>
              </div>
              {s.healthNotes && (
                <div className="mt-2 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                  🔒 <span className="font-bold"><T en="Private health note (this device only):" bn="ব্যক্তিগত স্বাস্থ্য নোট:" hi="निजी स्वास्थ्य नोट:" /></span> {s.healthNotes}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {list.length === 0 && <Card><p className="text-sm text-stone-500"><T en="No students match." bn="কোনো শিক্ষার্থী নেই।" hi="कोई छात्र नहीं।" /></p></Card>}

      {forming && (
        <Modal title={<T en={forming.id ? 'Edit student' : 'Enroll student'} bn={forming.id ? 'শিক্ষার্থী সম্পাদনা' : 'শিক্ষার্থী ভর্তি'} hi={forming.id ? 'छात्र संपादित करें' : 'छात्र नामांकित करें'} />} onClose={() => setForming(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Full name" bn="পুরো নাম" hi="पूरा नाम" />} className="sm:col-span-2">
              <input className={inputCls} value={forming.name || ''} onChange={(e) => setForming({ ...forming, name: e.target.value })} placeholder="Sadhak name" />
            </Field>
            <Field label={<T en="Phone" bn="ফোন" hi="फ़ोन" />}>
              <input className={inputCls} value={forming.phone || ''} onChange={(e) => setForming({ ...forming, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={<T en="Join date" bn="যোগদানের তারিখ" hi="जुड़ने की तिथि" />}>
              <input type="date" className={inputCls} value={forming.joinDate || todayISO()} onChange={(e) => setForming({ ...forming, joinDate: e.target.value })} />
            </Field>
            <Field label={<T en="Batch" bn="ব্যাচ" hi="बैच" />}>
              <select className={inputCls} value={forming.batchId || ''} onChange={(e) => setForming({ ...forming, batchId: e.target.value })}>
                <option value="">—</option>
                {state.batches.filter((b) => b.active).map((b) => {
                  const n = batchStudents(state, b.id).length;
                  return <option key={b.id} value={b.id}>{b.name} ({n}/{b.capacity})</option>;
                })}
              </select>
            </Field>
            <Field label={<T en="Fee cycle" bn="ফি চক্র" hi="शुल्क चक्र" />}>
              <select className={inputCls} value={forming.feeCycle || 'monthly'} onChange={(e) => setForming({ ...forming, feeCycle: e.target.value as FeeCycle })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={forming.status || 'active'} onChange={(e) => setForming({ ...forming, status: e.target.value as StudentStatus })}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="left">Left</option>
              </select>
            </Field>
            <Field label={<span>🔒 <T en="Health notes (private — stays on this device)" bn="স্বাস্থ্য নোট (ব্যক্তিগত)" hi="स्वास्थ्य नोट (निजी)" /> </span>} className="sm:col-span-2">
              <textarea className={inputCls} rows={2} value={forming.healthNotes || ''} onChange={(e) => setForming({ ...forming, healthNotes: e.target.value })} placeholder="Injuries, conditions the teacher should know…" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save student" bn="শিক্ষার্থী সংরক্ষণ" hi="छात्र सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
