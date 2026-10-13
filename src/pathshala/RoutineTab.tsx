import React, { useMemo, useState } from 'react';
import { Plus, Printer, Download, Wand2, Radio } from 'lucide-react';
import { usePathshala, buildAutoRoutine } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { Card, T, Btn, Field, inputCls, Empty, Modal, useLocaleText } from './ui';
import { todayISO, uid, downloadWord, fmtDateEn } from './bn';
import { ExamRoutineSlot, ClassPeriod } from './types';

/* Checklist #5 — পরীক্ষার রুটিন + প্রবেশপত্র + সিট লেবেল.
   Checklist #6 — স্মার্ট ক্লাস রুটিন (auto, guru-conflict-free).
   Checklist #7 — লাইভ রুটিন (animated "now"). */

const DAYS_BN = ['সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayName = (i: number, lang: string): string => (lang === 'bn' ? DAYS_BN : DAYS_EN)[i] || '';

export const RoutineTab: React.FC = () => {
  const { digits, lang, tr } = useLocaleText();
  const { state, add, update, remove } = usePathshala();
  const { gurukulStudents } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [mode, setMode] = useState<'exam' | 'class' | 'live'>('exam');
  const [parikshaId, setParikshaId] = useState(state.parikshas[0]?.id || '');
  const [printDoc, setPrintDoc] = useState<'routine' | 'admit' | 'seats' | null>(null);
  const [slotForm, setSlotForm] = useState({ date: todayISO(), subjectId: '', startTime: '10:00', endTime: '13:00', room: '' });
  const [classVarga, setClassVarga] = useState(state.vargas[0]?.id || '');
  const [tick, setTick] = useState(Date.now());
  React.useEffect(() => { if (mode === 'live') { const t = setInterval(() => setTick(Date.now()), 30000); return () => clearInterval(t); } }, [mode]);

  const pariksha = state.parikshas.find((p) => p.id === parikshaId);
  const routine = state.examRoutines.find((r) => r.parikshaId === parikshaId);
  const vargaOf = (sid: string) => state.shishyaMeta.find((m) => m.studentId === sid)?.vargaId || '';
  const examStudents = useMemo(() => pariksha ? gurukulStudents.filter((s) => !vargaOf(s.id) || vargaOf(s.id) === pariksha.vargaId) : [], [pariksha, gurukulStudents, state.shishyaMeta]);
  const examSubjects = useMemo(() => pariksha ? state.subjects.filter((s) => s.vargaId === pariksha.vargaId) : [], [pariksha, state.subjects]);
  const orgName = activeWorkspace.name || tr('pathshala.routine.org_fallback', 'Pathshala', 'পাঠশালা', 'पाठशाला');

  const ensureRoutine = (): string => {
    if (routine) return routine.id;
    const id = uid('er');
    add('examRoutines', { id, parikshaId: parikshaId, title: `${lang === 'bn' ? (pariksha?.nameBn || pariksha?.name) : (pariksha?.name || pariksha?.nameBn)} — ${lang === 'bn' ? 'রুটিন' : 'Routine'}`, slots: [] });
    return id;
  };
  const addSlot = () => {
    if (!slotForm.subjectId || !slotForm.date) { alert(tr('pathshala.routine.enter_date_subject', 'Enter date and subject', 'তারিখ ও বিষয় দিন', 'तिथि व विषय दें')); return; }
    const rid = ensureRoutine();
    const r = (state.examRoutines.find((x) => x.id === rid) || routine);
    const slots: ExamRoutineSlot[] = [...(r?.slots || []), { id: uid('es'), ...slotForm }];
    slots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    if (r) update('examRoutines', rid, { slots }); else add('examRoutines', { id: rid, parikshaId, title: tr('pathshala.routine.routine', 'Routine', 'রুটিন', 'रूटीन'), slots });
    setSlotForm({ date: todayISO(), subjectId: '', startTime: '10:00', endTime: '13:00', room: '' });
  };
  const removeSlot = (rid: string, sid: string) => {
    const r = state.examRoutines.find((x) => x.id === rid);
    if (r) update('examRoutines', rid, { slots: r.slots.filter((s) => s.id !== sid) });
  };

  const routineTableHtml = () => {
    if (!routine) return '<p>—</p>';
    return `<table border="1" cellpadding="6" cellspacing="0"><tr><th>{tr('pathshala.routine.date', 'Date', 'তারিখ', 'तिथि')}</th><th>{tr('pathshala.routine.subject', 'Subject', 'বিষয়', 'विषय')}</th><th>{tr('pathshala.routine.time', 'Time', 'সময়', 'समय')}</th><th>{tr('pathshala.routine.room', 'Room', 'কক্ষ', 'कक्ष')}</th></tr>` +
      routine.slots.map((s) => {
        const sub = state.subjects.find((x) => x.id === s.subjectId);
        return `<tr><td>${s.date}</td><td>${sub?.nameBn || ''} (${sub?.name || ''})</td><td>${s.startTime} – ${s.endTime}</td><td>${s.room || '—'}</td></tr>`;
      }).join('') + `</table>`;
  };

  /* ---------- class routine ---------- */
  const classRoutine = state.classRoutines.find((r) => r.vargaId === classVarga);
  const vargaSubjects = useMemo(() => state.subjects.filter((s) => s.vargaId === classVarga), [state.subjects, classVarga]);
  const guruName = (id: string) => state.gurus.find((g) => g.id === id)?.name || '—';
  const subjName = (id: string) => { const s = state.subjects.find((x) => x.id === id); if (!s) return '—'; return lang === 'bn' ? (s.nameBn || s.name) : (s.name || s.nameBn); };
  const autoGenerate = () => {
    if (!vargaSubjects.length) { alert(tr('pathshala.routine.add_subjects_first', 'Add subjects first', 'আগে বিষয় যোগ করুন', 'पहले विषय जोड़ें')); return; }
    const periodsPerDay = 6;
    const periodTimes = ['09:00-09:45', '09:45-10:30', '10:45-11:30', '11:30-12:15', '13:00-13:45', '13:45-14:30'];
    const slots = buildAutoRoutine(classVarga, vargaSubjects, periodsPerDay);
    if (classRoutine) update('classRoutines', classRoutine.id, { slots, periodsPerDay, periodTimes, updatedAt: new Date().toISOString() });
    else add('classRoutines', { id: uid('cr'), vargaId: classVarga, title: 'Saptahik Varga Suchi', periodsPerDay, periodTimes, slots, updatedAt: new Date().toISOString() });
  };
  const setCell = (day: number, period: number, subjectId: string) => {
    if (!classRoutine) return;
    const sub = state.subjects.find((s) => s.id === subjectId);
    const slots = classRoutine.slots.filter((s) => !(s.day === day && s.period === period));
    if (subjectId) slots.push({ day, period, subjectId, guruId: sub?.guruId || '' });
    update('classRoutines', classRoutine.id, { slots });
  };
  const slotAt = (day: number, period: number): ClassPeriod | undefined => classRoutine?.slots.find((s) => s.day === day && s.period === period);

  /* ---------- live ---------- */
  const nowMin = (() => { const d = new Date(tick); return d.getHours() * 60 + d.getMinutes(); })();
  const nowDay = (() => { const d = new Date(tick).getDay(); return d === 0 ? -1 : d - 1; })(); // Mon=0
  const parseStart = (t: string) => { const [h, m] = t.split('-')[0].split(':').map(Number); return h * 60 + m; };
  const parseEnd = (t: string) => { const [h, m] = (t.split('-')[1] || t.split('-')[0]).split(':').map(Number); return h * 60 + m; };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><T bn="রুটিন" en="Routines" /></h2>
        <div className="flex gap-2 no-print">
          <Btn variant="ghost" onClick={() => setMode('exam')} className={mode === 'exam' ? '!bg-amber-100' : ''}>{tr('pathshala.routine.tab_exam', 'Exam', 'পরীক্ষা', 'परीक्षा')}</Btn>
          <Btn variant="ghost" onClick={() => setMode('class')} className={mode === 'class' ? '!bg-amber-100' : ''}>{tr('pathshala.routine.tab_class', 'Class', 'ক্লাস', 'कक्षा')}</Btn>
          <Btn variant="ghost" onClick={() => setMode('live')} className={mode === 'live' ? '!bg-amber-100' : ''}><Radio className="w-4 h-4" /> {tr('pathshala.routine.tab_live', 'Live', 'লাইভ', 'लाइव')}</Btn>
        </div>
      </div>

      {mode === 'exam' && (
        <>
          <Card className="no-print">
            <div className="flex flex-wrap gap-2 items-end">
              <Field label={<T bn="পরীক্ষা" en="Pariksha" />}>
                <select value={parikshaId} onChange={(e) => setParikshaId(e.target.value)} className={`${inputCls} !w-52`}>
                  {state.parikshas.map((p) => <option key={p.id} value={p.id}>{p.nameBn || p.name}</option>)}
                </select>
              </Field>
              {pariksha && (
                <div className="flex gap-2 ml-auto flex-wrap">
                  <Btn variant="ghost" onClick={() => setPrintDoc('routine')}><Printer className="w-4 h-4" /> {tr('pathshala.routine.print_routine', 'Print routine', 'রুটিন প্রিন্ট', 'रूटीन प्रिंट करें')}</Btn>
                  <Btn variant="ghost" onClick={() => downloadWord(`exam-routine-${parikshaId}.doc`, `${orgName} — ${lang === 'bn' ? (pariksha.nameBn || pariksha.name) : (pariksha.name || pariksha.nameBn)} ${lang === 'bn' ? 'রুটিন' : 'Routine'}`, routineTableHtml())}><Download className="w-4 h-4" /> Word</Btn>
                  <Btn variant="ghost" onClick={() => setPrintDoc('admit')}><Printer className="w-4 h-4" /> {tr('pathshala.routine.admit', 'Admit cards', 'প্রবেশপত্র', 'प्रवेश-पत्र')}</Btn>
                  <Btn variant="ghost" onClick={() => setPrintDoc('seats')}><Printer className="w-4 h-4" /> {tr('pathshala.routine.seats', 'Seat labels', 'সিট লেবেল', 'सीट लेबल')}</Btn>
                </div>
              )}
            </div>
          </Card>

          {pariksha ? (
            <Card>
              <h3 className="font-bold text-stone-800 mb-3"><T bn="পরীক্ষার রুটিন তৈরি" en="Build exam routine" /></h3>
              <div className="grid sm:grid-cols-5 gap-2 mb-3 no-print">
                <Field label={<T bn="তারিখ" en="Date" />}><input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} className={inputCls} /></Field>
                <Field label={<T bn="বিষয়" en="Subject" />}><select value={slotForm.subjectId} onChange={(e) => setSlotForm({ ...slotForm, subjectId: e.target.value })} className={inputCls}><option value="">—</option>{examSubjects.map((s) => <option key={s.id} value={s.id}>{s.nameBn}</option>)}</select></Field>
                <Field label={tr('pathshala.routine.start', 'Start', 'শুরু', 'प्रारंभ')}><input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} className={inputCls} /></Field>
                <Field label={tr('pathshala.routine.end', 'End', 'শেষ', 'समाप्त')}><input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} className={inputCls} /></Field>
                <Field label={<T bn="কক্ষ" en="Room" />}><input value={slotForm.room} onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })} className={inputCls} placeholder="Kaksha 1" /></Field>
              </div>
              <Btn onClick={addSlot} className="no-print"><Plus className="w-4 h-4" /> {tr('pathshala.routine.add', 'Add', 'যোগ করুন', 'जोड़ें')}</Btn>
              <div className="mt-3 space-y-1.5">
                {(routine?.slots || []).map((s) => {
                  const sub = state.subjects.find((x) => x.id === s.subjectId);
                  return (
                    <div key={s.id} className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm">
                      <div><span className="font-semibold">{fmtDateEn(s.date)}</span> • <span className="font-bold">{sub?.nameBn}</span> <span className="text-stone-500 text-xs">({sub?.name})</span></div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">{s.startTime}–{s.endTime}{s.room ? ` • ${s.room}` : ''}<button onClick={() => removeSlot(routine!.id, s.id)} className="text-red-500 font-bold no-print">✕</button></div>
                    </div>
                  );
                })}
                {!(routine?.slots?.length) && <Empty text={tr('pathshala.routine.no_routine', 'No routine added yet', 'এখনো কোনো রুটিন যোগ হয়নি', 'अभी तक कोई रूटीन नहीं')} />}
              </div>
            </Card>
          ) : <Empty text={tr('pathshala.routine.create_exam_first', 'Create an exam first (Results tab)', 'আগে পরীক্ষা তৈরি করুন (ফলাফল ট্যাব)', 'पहले परीक्षा बनाएँ (परिणाम टैब)')} />}

          {/* print docs */}
          {printDoc && pariksha && (
            <Modal title={<T bn="প্রিন্ট প্রিভিউ" en="Print preview" />} onClose={() => setPrintDoc(null)} wide>
              {printDoc === 'routine' && (
                <div className="print-area rounded-xl border p-5">
                  <h2 className="text-center font-extrabold text-xl">{orgName}</h2>
                  <h3 className="text-center font-bold text-lg mb-1">॥ {tr('pathshala.routine.exam_routine', 'Exam routine', 'পরীক্ষার রুটিন', 'परीक्षा रूटीन')} ॥</h3>
                  <p className="text-center text-sm mb-3">{pariksha.nameBn || pariksha.name} ({pariksha.term})</p>
                  <table><thead><tr><th>{tr('pathshala.routine.date', 'Date', 'তারিখ', 'तिथि')}</th><th>{tr('pathshala.routine.subject', 'Subject', 'বিষয়', 'विषय')}</th><th>{tr('pathshala.routine.time', 'Time', 'সময়', 'समय')}</th><th>{tr('pathshala.routine.room', 'Room', 'কক্ষ', 'कक्ष')}</th></tr></thead>
                    <tbody>{(routine?.slots || []).map((s) => { const sub = state.subjects.find((x) => x.id === s.subjectId); return (<tr key={s.id}><td>{fmtDateEn(s.date)}</td><td>{lang === 'bn' ? `${sub?.nameBn || sub?.name} (${sub?.name})` : (sub?.name || sub?.nameBn)}</td><td>{s.startTime} – {s.endTime}</td><td>{s.room || '—'}</td></tr>); })}</tbody></table>
                  <div className="mt-8 text-sm"><div className="border-t border-black inline-block pt-1 px-8">{tr('pathshala.routine.acharya_sign_seal', 'Acharya\'s signature & seal', 'আচার্যের স্বাক্ষর ও সিলমোহর', 'आचार्य के हस्ताक्षर व मुहर')}</div></div>
                </div>
              )}
              {printDoc === 'admit' && (
                <div className="print-area rounded-xl border p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {examStudents.map((s) => (
                      <div key={s.id} className="border-2 border-black p-3" style={{ breakInside: 'avoid' }}>
                        <h3 className="text-center font-extrabold">{orgName}</h3>
                        <p className="text-center text-sm font-bold">॥ {tr('pathshala.routine.admit_title', 'Admit Card', 'প্রবেশপত্র', 'प्रवेश-पत्र')} ॥</p>
                        <p className="text-center text-xs mb-2">{pariksha.nameBn || pariksha.name}</p>
                        <table className="text-xs">
                          <tbody>
                            <tr><td><b>{tr('pathshala.routine.name', 'Name', 'নাম', 'नाम')}</b></td><td>{s.studentName}</td></tr>
                            <tr><td><b>{tr('pathshala.routine.roll', 'Roll', 'রোল', 'रोल')}</b></td><td>{s.rollNo}</td></tr>
                            <tr><td><b>{tr('pathshala.routine.varga', 'Varga', 'বর্গ', 'वर्ग')}</b></td><td>{state.vargas.find((v) => v.id === pariksha.vargaId)?.name}</td></tr>
                          </tbody>
                        </table>
                        <table className="text-xs mt-1"><thead><tr><th>{tr('pathshala.routine.date', 'Date', 'তারিখ', 'तिथि')}</th><th>{tr('pathshala.routine.subject', 'Subject', 'বিষয়', 'विषय')}</th><th>{tr('pathshala.routine.time', 'Time', 'সময়', 'समय')}</th></tr></thead>
                          <tbody>{(routine?.slots || []).map((sl) => { const sub = state.subjects.find((x) => x.id === sl.subjectId); return (<tr key={sl.id}><td>{fmtDateEn(sl.date)}</td><td>{sub?.nameBn}</td><td>{sl.startTime}</td></tr>); })}</tbody></table>
                        <div className="mt-3 text-xs"><div className="border-t border-black inline-block pt-0.5 px-4">{tr('pathshala.routine.signature', 'Signature', 'স্বাক্ষর', 'हस्ताक्षर')}</div></div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-stone-500 mt-2">{tr('pathshala.routine.admit_note', '2 admit cards per A4 page', 'A4 পাতায় ২টি প্রবেশপত্র (2 admit cards per A4 page)')}</p>
                </div>
              )}
              {printDoc === 'seats' && (
                <div className="print-area rounded-xl border p-4">
                  <h3 className="text-center font-bold mb-2">॥ {tr('pathshala.routine.seat_title', 'Seat Labels', 'সিট লেবেল', 'सीट लेबल')} ॥ — {pariksha.nameBn || pariksha.name}</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {examStudents.map((s, i) => (
                      <div key={s.id} className="border border-black p-2 text-center text-xs" style={{ breakInside: 'avoid' }}>
                        <div className="font-extrabold text-sm">{s.rollNo}</div>
                        <div>{s.studentName}</div>
                        <div className="text-stone-600">{state.vargas.find((v) => v.id === pariksha.vargaId)?.name} • {routine?.slots?.[0]?.room || ''}</div>
                        <div className="text-stone-400">#{i + 1}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-stone-500 mt-2">{tr('pathshala.routine.seat_note', '16 seat labels per page', 'এক পাতায় ১৬টি (16 per page)')}</p>
                </div>
              )}
              <div className="flex gap-2 mt-3 no-print">
                <Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> {tr('pathshala.routine.print', 'Print', 'প্রিন্ট', 'प्रिंट')}</Btn>
                <Btn variant="ghost" onClick={() => setPrintDoc(null)}>{tr('pathshala.routine.close', 'Close', 'বন্ধ', 'बंद करें')}</Btn>
              </div>
            </Modal>
          )}
        </>
      )}

      {mode === 'class' && (
        <>
          <Card className="no-print">
            <div className="flex flex-wrap gap-2 items-end">
              <Field label={<T bn="বর্গ" en="Varga" />}>
                <select value={classVarga} onChange={(e) => setClassVarga(e.target.value)} className={`${inputCls} !w-52`}>
                  {state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.sanskrit})</option>)}
                </select>
              </Field>
              <Btn onClick={autoGenerate}><Wand2 className="w-4 h-4" /> {tr('pathshala.routine.gen_smart', 'Generate smart routine', 'স্মার্ট রুটিন তৈরি', 'स्मार्ट रूटीन बनाएँ')}</Btn>
              <span className="text-xs text-stone-500">{tr('pathshala.routine.conflict_note', 'Teacher conflicts are auto-avoided', 'গুরুর সময়-সংঘর্ষ স্বয়ংক্রিয়ভাবে এড়ানো হয়', 'गुरु के समय-टकराव स्वतः टाले जाते हैं')}</span>
            </div>
          </Card>
          <Card>
            {!classRoutine ? <Empty text={tr('pathshala.routine.no_routine_smart', 'No routine yet — generate a smart routine above', 'এখনো রুটিন তৈরি হয়নি — উপরে স্মার্ট রুটিন তৈরি করুন', 'अभी तक कोई रूटीन नहीं — ऊपर स्मार्ट रूटीन बनाएँ')} /> : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead><tr><th className="border p-1.5 bg-stone-50">{tr('pathshala.routine.day', 'Day', 'দিন', 'दिन')}</th>{classRoutine.periodTimes.map((t, i) => <th key={i} className="border p-1.5 bg-stone-50 min-w-[110px]">{i + 1}<br /><span className="font-normal text-stone-500">{t}</span></th>)}</tr></thead>
                  <tbody>
                    {DAYS_BN.map((_, day) => {
                      const d = dayName(day, lang);
                      return (
                      <tr key={day}>
                        <td className="border p-1.5 font-bold bg-stone-50">{d}{lang !== 'en' && (<><br /><span className="font-normal text-stone-500 text-[10px]">{DAYS_EN[day]}</span></>)}</td>
                        {classRoutine.periodTimes.map((_, p) => {
                          const sl = slotAt(day, p);
                          return (
                            <td key={p} className="border p-1">
                              <select value={sl?.subjectId || ''} onChange={(e) => setCell(day, p, e.target.value)} className="w-full text-xs rounded border-stone-200 py-1 no-print">
                                <option value="">—</option>
                                {vargaSubjects.map((s) => <option key={s.id} value={s.id}>{s.nameBn}</option>)}
                              </select>
                              {sl && <div className="text-[10px] text-stone-500 mt-0.5">{subjName(sl.subjectId)}<br />{guruName(sl.guruId)}</div>}
                            </td>
                          );
                        })}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {mode === 'live' && (
        <div key={tick}>
          <Card>
            <h3 className="font-bold text-stone-800 mb-1 flex items-center gap-2">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" /></span>
              <T bn="লাইভ রুটিন — এখন চলছে" en="Live routine — happening now" />
            </h3>
            <p className="text-xs text-stone-500 mb-4">{new Date(tick).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-IN', { hour: '2-digit', minute: '2-digit' })} • {nowDay < 0 ? tr('routine.sunday_closed', 'Sunday (holiday)', 'রবিবার (ছুটি)') : dayName(nowDay, lang)}</p>
            {nowDay < 0 ? <Empty text={tr('pathshala.routine.sunday_closed2', 'Sunday — Pathshala closed', 'আজ রবিবার — পাঠশালা বন্ধ')} /> : (
              <div className="grid sm:grid-cols-2 gap-3">
                {state.classRoutines.map((cr) => {
                  const v = state.vargas.find((x) => x.id === cr.vargaId);
                  const cur = cr.slots.find((s) => s.day === nowDay && nowMin >= parseStart(cr.periodTimes[s.period] || '') && nowMin < parseEnd(cr.periodTimes[s.period] || ''));
                  return (
                    <div key={cr.id} className={`rounded-2xl border-2 p-4 ${cur ? 'border-red-400 bg-red-50 animate-pulse' : 'border-stone-200 bg-stone-50'}`}>
                      <div className="font-bold">{v?.name} <span className="text-stone-500 font-normal text-sm">({v?.sanskrit})</span></div>
                      {cur ? (
                        <div className="mt-1"><div className="text-lg font-extrabold text-red-700">{subjName(cur.subjectId)}</div>
                          <div className="text-sm text-stone-600">{guruName(cur.guruId)} • {cr.periodTimes[cur.period]}</div></div>
                      ) : <div className="text-sm text-stone-500 mt-1">{tr('pathshala.routine.no_class', 'No class right now', 'এই মুহূর্তে ক্লাস নেই', 'इस समय कोई कक्षा नहीं')}</div>}
                    </div>
                  );
                })}
                {!state.classRoutines.length && <Empty text={tr('pathshala.routine.no_class_routine', 'No class routine created', 'কোনো ক্লাস রুটিন তৈরি হয়নি', 'कोई कक्षा रूटीन नहीं बना')} />}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
