import React, { useState } from 'react';
import { useYoga, uid, todayISO } from './yogaStore';
import { ClassDiaryEntry } from './types';
import { T, Card, Btn, Field, Modal, inputCls, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Yoga One — class diary: what was actually taught each session. */

export const DiaryTab: React.FC = () => {
  const { state, add, update, remove } = useYoga();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState<Partial<ClassDiaryEntry> | null>(null);

  const save = () => {
    if (!forming || !forming.batchId) { showToast(t('suites.yoga.common.toastNeedBatch'), 'warning'); return; }
    if (!forming.topics?.trim()) { showToast(t('suites.yoga.diary.toastNeedTaught'), 'warning'); return; }
    const entry: ClassDiaryEntry = {
      id: forming.id || uid('di'),
      date: forming.date || todayISO(),
      batchId: forming.batchId,
      instructorName: forming.instructorName?.trim() || '',
      topics: forming.topics.trim(),
      notes: forming.notes?.trim() || undefined,
      createdAt: Date.now(),
    };
    if (forming.id) { update('diary', forming.id, entry); showToast(t('suites.yoga.diary.toastUpdated'), 'success'); }
    else { add('diary', entry); showToast(t('suites.yoga.diary.toastSaved'), 'success'); }
    setForming(null);
  };

  const entries = [...state.diary].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Class diary" bn="পাঠ-ডায়েরি" hi="पाठ डायरी" /></h2>
        <Btn onClick={() => setForming({ date: todayISO(), batchId: state.batches.find((b) => b.active)?.id || '' })}>＋ <T en="Log a class" bn="ক্লাস লিখুন" hi="कक्षा दर्ज करें" /></Btn>
      </div>
      <p className="text-xs text-stone-500"><T en="A simple record of what was taught — asanas, pranayama, philosophy — so any teacher can pick up where the last left off." bn="কী শেখানো হয়েছে তার সরল রেকর্ড।" hi="क्या पढ़ाया गया, उसका सरल रिकॉर्ड।" /></p>

      <div className="space-y-2">
        {entries.map((e) => {
          const b = state.batches.find((x) => x.id === e.batchId);
          return (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-extrabold text-stone-800 text-sm">{b?.name || '—'} <span className="text-stone-400 font-normal">· {fmtDate(e.date)}</span></div>
                  {e.instructorName && <div className="text-xs text-stone-500">🧘 {e.instructorName}</div>}
                  <div className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{e.topics}</div>
                  {e.notes && <div className="text-xs text-stone-500 mt-1">{e.notes}</div>}
                </div>
                <div className="flex gap-1 no-print shrink-0">
                  <button onClick={() => setForming({ ...e })} className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm" aria-label="Edit">✏️</button>
                  <button onClick={() => { remove('diary', e.id); showToast(t('suites.yoga.diary.toastDeleted'), 'success'); }} className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm" aria-label="Delete">🗑️</button>
                </div>
              </div>
            </Card>
          );
        })}
        {entries.length === 0 && <Card><p className="text-sm text-stone-500"><T en="No classes logged yet." bn="এখনও কোনো ক্লাস লেখা হয়নি।" hi="अभी कोई कक्षा दर्ज नहीं।" /></p></Card>}
      </div>

      {forming && (
        <Modal title={<T en={forming.id ? 'Edit class log' : 'Log a class'} bn={forming.id ? 'ক্লাস সম্পাদনা' : 'ক্লাস লিখুন'} hi={forming.id ? 'कक्षा संपादित करें' : 'कक्षा दर्ज करें'} />} onClose={() => setForming(null)} wide>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Batch" bn="ব্যাচ" hi="बैच" />}>
              <select className={inputCls} value={forming.batchId || ''} onChange={(e) => setForming({ ...forming, batchId: e.target.value })}>
                <option value="">—</option>
                {state.batches.filter((b) => b.active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={forming.date || todayISO()} max={todayISO()} onChange={(e) => setForming({ ...forming, date: e.target.value })} />
            </Field>
            <Field label={<T en="Teacher" bn="শিক্ষক" hi="शिक्षक" />} className="sm:col-span-2">
              <input className={inputCls} value={forming.instructorName || ''} onChange={(e) => setForming({ ...forming, instructorName: e.target.value })} placeholder="Who taught" list="yoga-instructors" />
              <datalist id="yoga-instructors">
                {state.instructors.map((i) => <option key={i.id} value={i.name} />)}
              </datalist>
            </Field>
            <Field label={<T en="What was taught" bn="কী শেখানো হয়েছে" hi="क्या पढ़ाया गया" />} className="sm:col-span-2">
              <textarea className={inputCls} rows={3} value={forming.topics || ''} onChange={(e) => setForming({ ...forming, topics: e.target.value })} placeholder="Surya Namaskar ×6, Tadasana, Vrikshasana, Anulom Vilom 10 min…" />
            </Field>
            <Field label={<T en="Notes" bn="নোট" hi="नोट" />} className="sm:col-span-2">
              <input className={inputCls} value={forming.notes || ''} onChange={(e) => setForming({ ...forming, notes: e.target.value })} placeholder="Optional" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save entry" bn="এন্ট্রি সংরক্ষণ" hi="प्रविष्टि सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
