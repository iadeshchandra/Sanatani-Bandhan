import React, { useState } from 'react';
import { useYoga, uid, todayISO, batchStudents, batchRunsOn, attendanceMap } from './yogaStore';
import { T, Card, Btn, Field, inputCls, StatusPill, fmtDate, fmtTime } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Yoga One — per-batch per-day attendance marking. */

export const AttendanceTab: React.FC = () => {
  const { state, add, update } = useYoga();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [batchId, setBatchId] = useState<string>(state.batches.find((b) => b.active)?.id || '');
  const [date, setDate] = useState(todayISO());

  const batch = state.batches.find((b) => b.id === batchId);
  const students = batch ? batchStudents(state, batch.id) : [];
  const marked = batch ? attendanceMap(state, batch.id, date) : {};
  const runsToday = batch ? batchRunsOn(batch, date) : false;
  const markedCount = students.filter((s) => s.id in marked).length;

  const toggle = (studentId: string) => {
    const current = marked[studentId];
    const existing = state.attendance.find((r) => r.batchId === batchId && r.date === date && r.studentId === studentId);
    if (existing) update('attendance', existing.id, { present: !current, markedAt: Date.now() });
    else add('attendance', { id: uid('at'), date, batchId, studentId, present: current === undefined ? true : !current, markedAt: Date.now() });
  };

  const markAll = (present: boolean) => {
    for (const s of students) {
      if (!(s.id in marked)) add('attendance', { id: uid('at'), date, batchId, studentId: s.id, present, markedAt: Date.now() });
      else {
        const existing = state.attendance.find((r) => r.batchId === batchId && r.date === date && r.studentId === s.id);
        if (existing && existing.present !== present) update('attendance', existing.id, { present, markedAt: Date.now() });
      }
    }
    showToast(present ? t('suites.yoga.attendance.toastAllPresent') : t('suites.yoga.attendance.toastAllAbsent'), 'success');
  };

  const activeBatches = state.batches.filter((b) => b.active);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-stone-800"><T en="Attendance" bn="উপস্থিতি" hi="उपस्थिति" /></h2>

      <div className="flex gap-2 flex-wrap no-print">
        <Field label={<T en="Batch" bn="ব্যাচ" hi="बैच" />}>
          <select className={inputCls} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">—</option>
            {activeBatches.map((b) => <option key={b.id} value={b.id}>{b.name} ({fmtTime(b.startTime)})</option>)}
          </select>
        </Field>
        <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
          <input type="date" className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {batch && !runsToday && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          ⚠️ <T en="This batch does not run on this weekday — marking is allowed but unusual." bn="এই ব্যাচ এই দিনে চলে না।" hi="यह बैच इस दिन नहीं चलता।" />
        </div>
      )}

      {batch && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div>
              <div className="font-extrabold text-stone-800">{batch.name} — {fmtDate(date)}</div>
              <div className="text-xs text-stone-500">{markedCount}/{students.length} <T en="marked" bn="চিহ্নিত" hi="चिह्नित" /></div>
            </div>
            <div className="flex gap-2 no-print">
              <Btn variant="ghost" onClick={() => markAll(true)}><T en="All present" bn="সবাই উপস্থিত" hi="सभी उपस्थित" /></Btn>
              <Btn variant="ghost" onClick={() => markAll(false)}><T en="All absent" bn="সবাই অনুপস্থিত" hi="सभी अनुपस्थित" /></Btn>
            </div>
          </div>
          <div className="space-y-1">
            {students.map((s) => {
              const p = marked[s.id];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border transition min-h-[52px] text-left ${
                    p === true ? 'bg-emerald-50 border-emerald-300' : p === false ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  <span className="font-semibold text-stone-800 text-sm">{s.name}</span>
                  {p === true ? <StatusPill status="present" /> : p === false ? <StatusPill status="absent" /> : <span className="text-xs text-stone-400">tap to mark</span>}
                </button>
              );
            })}
            {students.length === 0 && <p className="text-sm text-stone-500 py-4 text-center"><T en="No active students in this batch." bn="এই ব্যাচে কোনো সক্রিয় শিক্ষার্থী নেই।" hi="इस बैच में कोई सक्रिय छात्र नहीं।" /></p>}
          </div>
        </Card>
      )}
      {!batch && <Card><p className="text-sm text-stone-500"><T en="Pick a batch to mark attendance." bn="উপস্থিতির জন্য ব্যাচ বেছে নিন।" hi="उपस्थिति के लिए बैच चुनें।" /></p></Card>}
    </div>
  );
};
