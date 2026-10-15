import React, { useMemo, useRef, useState } from 'react';
import { Plus, Download, Upload, Printer, Award, FileText } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, Btn, Field, inputCls, Empty, Modal, useLocaleText } from './ui';
import { todayISO, inr, downloadCSV, parseCSV, uid, fmtDateEn } from './bn';

/* Checklist #4 — results: marks entry (Excel/CSV), 1-page + 2-page report
   cards, varga-wise results, merit list (medhakrom), result summary. */

const gradeOf = (pct: number): string =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
const GRADE_KEYS: Record<string, string> = {
  'A+': 'gradeOutstanding', A: 'gradeExcellent',
  'B+': 'gradeGood', B: 'gradeAverage',
  C: 'gradeFair', D: 'gradeWeak', F: 'gradeFail',
};

export const ParikshaTab: React.FC = () => {
  const { t } = useLanguage();
  const { digits, lang } = useLocaleText();
  const { state, add, update, remove } = usePathshala();
  const { gurukulStudents } = useData();
  const [parikshaId, setParikshaId] = useState(state.parikshas[0]?.id || '');
  const [showNew, setShowNew] = useState(false);
  const [newP, setNewP] = useState({ name: '', nameBn: '', vargaId: state.vargas[0]?.id || '', term: '2026 — Pratham', startDate: todayISO() });
  const [reportCard, setReportCard] = useState<{ sid: string; pages: 1 | 2 } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const gradeLabel = (g: string): string => {
    const k = GRADE_KEYS[g];
    return k ? t(`suites.pathshala.pariksha.${k}`) : g;
  };

  const pariksha = state.parikshas.find((p) => p.id === parikshaId) || state.parikshas[0];
  const subjects = useMemo(() => pariksha ? state.subjects.filter((s) => s.vargaId === pariksha.vargaId) : [], [pariksha, state.subjects]);
  const vargaOf = (sid: string) => state.shishyaMeta.find((m) => m.studentId === sid)?.vargaId || '';
  const students = useMemo(() => pariksha ? gurukulStudents.filter((s) => !vargaOf(s.id) || vargaOf(s.id) === pariksha.vargaId) : [], [pariksha, gurukulStudents, state.shishyaMeta]);

  const markOf = (sid: string, subId: string) => state.marks.find((m) => m.parikshaId === pariksha?.id && m.studentId === sid && m.subjectId === subId);
  const setMark = (sid: string, subId: string, marks: number, maxMarks: number) => {
    const ex = markOf(sid, subId);
    if (ex) update('marks', ex.id, { marks, maxMarks });
    else add('marks', { id: uid('mk'), parikshaId: pariksha!.id, studentId: sid, subjectId: subId, marks, maxMarks });
  };

  const totals = useMemo(() => {
    if (!pariksha) return [];
    const maxTotal = subjects.reduce((s, sub) => s + 100, 0);
    return students.map((s) => {
      const ms = subjects.map((sub) => markOf(s.id, sub.id)?.marks ?? 0);
      const total = ms.reduce((a, b) => a + b, 0);
      const pct = maxTotal ? (total / maxTotal) * 100 : 0;
      return { s, total, pct, grade: gradeOf(pct) };
    }).sort((a, b) => b.total - a.total);
  }, [pariksha, students, subjects, state.marks]);

  const createPariksha = () => {
    if (!newP.name.trim() || !newP.vargaId) { alert(t('suites.pathshala.pariksha.enterNameVarga')); return; }
    const id = uid('par');
    add('parikshas', { id, ...newP });
    setParikshaId(id); setShowNew(false);
  };

  const exportMarks = () => {
    if (!pariksha) return;
    const rows = [['StudentId', 'Name', 'RollNo', ...subjects.map((s) => s.name)]];
    for (const s of students) rows.push([s.id, s.studentName, s.rollNo, ...subjects.map((sub) => String(markOf(s.id, sub.id)?.marks ?? ''))]);
    downloadCSV(`marks-${pariksha.name.replace(/\s+/g, '-')}.csv`, rows);
  };
  const importMarks = async (f: File) => {
    if (!pariksha) return;
    const rows = parseCSV(await f.text());
    if (rows.length < 2) return;
    const head = rows[0];
    let n = 0;
    for (const r of rows.slice(1)) {
      const sid = r[0]; const s = students.find((x) => x.id === sid); if (!s) continue;
      subjects.forEach((sub, i) => {
        const v = Number(r[3 + i]);
        if (!isNaN(v)) { setMark(s.id, sub.id, v, 100); n++; }
      });
    }
    void head;
    alert(t('suites.pathshala.pariksha.marksAdded').replace('{count}', digits(n)));
  };

  const summary = useMemo(() => {
    if (!pariksha) return null;
    const subStats = subjects.map((sub) => {
      const vals = students.map((s) => markOf(s.id, sub.id)?.marks).filter((v): v is number => v !== undefined);
      return { sub, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0, high: vals.length ? Math.max(...vals) : 0, low: vals.length ? Math.min(...vals) : 0 };
    });
    const passed = totals.filter((t) => t.pct >= 40).length;
    return { subStats, passed, passPct: students.length ? Math.round((passed / students.length) * 100) : 0 };
  }, [pariksha, subjects, students, state.marks, totals]);

  if (!pariksha) return <Empty text={t('suites.pathshala.pariksha.noExams')} />;

  const rcStudent = reportCard ? students.find((s) => s.id === reportCard.sid) : null;
  const rcTotals = reportCard ? totals.find((t) => t.s.id === reportCard.sid) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.pathshala.pariksha.heading')}</h2>
        <div className="flex gap-2 no-print flex-wrap">
          <select value={pariksha.id} onChange={(e) => setParikshaId(e.target.value)} className={`${inputCls} !w-52`}>
            {state.parikshas.map((p) => <option key={p.id} value={p.id}>{p.nameBn || p.name}</option>)}
          </select>
          <Btn variant="ghost" onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> {t('suites.pathshala.pariksha.newExam')}</Btn>
        </div>
      </div>

      {showNew && (
        <Modal title={t('suites.pathshala.pariksha.newTitle')} onClose={() => setShowNew(false)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('suites.pathshala.pariksha.fName')}><input value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} className={inputCls} placeholder="Dwitiya Pariksha" /></Field>
            <Field label={t('suites.pathshala.pariksha.fNameBn')}><input value={newP.nameBn} onChange={(e) => setNewP({ ...newP, nameBn: e.target.value })} className={inputCls} placeholder="দ্বিতীয় পরীক্ষা" /></Field>
            <Field label={t('suites.pathshala.pariksha.fVarga')}><select value={newP.vargaId} onChange={(e) => setNewP({ ...newP, vargaId: e.target.value })} className={inputCls}>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
            <Field label={t('suites.pathshala.pariksha.fStartDate')}><input type="date" value={newP.startDate} onChange={(e) => setNewP({ ...newP, startDate: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="flex gap-2 mt-3"><Btn onClick={createPariksha}>{t('suites.pathshala.pariksha.create')}</Btn><Btn variant="ghost" onClick={() => setShowNew(false)}>{t('suites.pathshala.pariksha.cancel')}</Btn></div>
        </Modal>
      )}

      {/* marks entry */}
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold text-stone-800">{t('suites.pathshala.pariksha.marksTitle')} <span className="text-xs text-stone-500 font-normal">— {pariksha.nameBn || pariksha.name}</span></h3>
          <div className="flex gap-2 no-print">
            <Btn variant="ghost" onClick={exportMarks}><Download className="w-4 h-4" /> Excel/CSV</Btn>
            <Btn variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> {t('suites.pathshala.pariksha.import')}</Btn>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importMarks(f); e.target.value = ''; }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead><tr className="text-left text-xs text-stone-500 border-b"><th className="py-2 pr-2 sticky left-0 bg-white">{t('suites.pathshala.pariksha.colShishya')}</th>{subjects.map((s) => <th key={s.id} className="py-2 pr-2 min-w-[90px]">{s.nameBn}<br /><span className="font-normal">{s.name}</span></th>)}<th className="py-2">{t('suites.pathshala.pariksha.colTotal')}</th></tr></thead>
            <tbody>
              {students.map((s) => {
                const t2 = totals.find((x) => x.s.id === s.id);
                return (
                  <tr key={s.id} className="border-b border-stone-100">
                    <td className="py-1 pr-2 sticky left-0 bg-white font-semibold text-xs whitespace-nowrap">{s.studentName}</td>
                    {subjects.map((sub) => (
                      <td key={sub.id} className="py-1 pr-2">
                        <input type="number" min={0} max={100} value={markOf(s.id, sub.id)?.marks ?? ''}
                          onChange={(e) => setMark(s.id, sub.id, Number(e.target.value), 100)}
                          className="w-16 rounded-lg border border-stone-300 px-2 py-1 text-sm text-center" />
                      </td>
                    ))}
                    <td className="py-1 font-bold">{t2 ? digits(t2.total) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!students.length && <Empty text={t('suites.pathshala.pariksha.noShishyaVarga')} />}
        </div>
      </Card>

      {/* merit list + summary */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-amber-600" />{t('suites.pathshala.pariksha.meritTitle')}</h3>
          <div className="space-y-1.5">
            {totals.slice(0, 10).map((tt, i) => (
              <div key={tt.s.id} className="flex items-center gap-3 border-b border-stone-100 py-1.5">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold ${i < 3 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>{digits(i + 1)}</span>
                <div className="flex-1"><div className="font-semibold text-sm">{tt.s.studentName}</div><div className="text-xs text-stone-500">{tt.s.rollNo}</div></div>
                <div className="text-right"><div className="font-bold">{digits(tt.total)}</div><div className="text-xs text-stone-500">{tt.grade} • {digits(Math.round(tt.pct))}%</div></div>
                <button onClick={() => setReportCard({ sid: tt.s.id, pages: 1 })} className="text-xs font-bold text-amber-700 hover:underline no-print">{t('suites.pathshala.pariksha.cardBtn')}</button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" />{t('suites.pathshala.pariksha.summaryTitle')}</h3>
          {summary && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-stone-50 rounded-xl p-3 text-center"><div className="text-xl font-extrabold">{digits(students.length)}</div><div className="text-xs text-stone-500">{t('suites.pathshala.pariksha.examinees')}</div></div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center"><div className="text-xl font-extrabold text-emerald-700">{digits(summary.passed)}</div><div className="text-xs text-stone-500">{t('suites.pathshala.pariksha.passed')}</div></div>
                <div className="bg-amber-50 rounded-xl p-3 text-center"><div className="text-xl font-extrabold text-amber-700">{digits(summary.passPct)}%</div><div className="text-xs text-stone-500">{t('suites.pathshala.pariksha.passRate')}</div></div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-stone-500 border-b">{[t('suites.pathshala.pariksha.colSubject'), t('suites.pathshala.pariksha.colAverage'), t('suites.pathshala.pariksha.colHighest'), t('suites.pathshala.pariksha.colLowest')].map((h) => <th key={h} className="py-1 pr-2">{h}</th>)}</tr></thead>
                <tbody>{summary.subStats.map((x) => (
                  <tr key={x.sub.id} className="border-b border-stone-100"><td className="py-1 pr-2 font-semibold">{x.sub.nameBn}</td><td className="py-1 pr-2">{digits(Math.round(x.avg))}</td><td className="py-1 pr-2 text-emerald-700 font-bold">{digits(x.high)}</td><td className="py-1 pr-2 text-red-600">{digits(x.low)}</td></tr>
                ))}</tbody>
              </table>
            </>
          )}
        </Card>
      </div>

      {/* report card modal */}
      {reportCard && rcStudent && rcTotals && (
        <Modal title={t('suites.pathshala.pariksha.rcTitle')} onClose={() => setReportCard(null)} wide>
          <div className="flex gap-2 mb-3 no-print">
            <Btn variant="ghost" onClick={() => setReportCard({ ...reportCard, pages: 1 })} className={reportCard.pages === 1 ? '!bg-amber-100' : ''}>{t('suites.pathshala.pariksha.onePage')}</Btn>
            <Btn variant="ghost" onClick={() => setReportCard({ ...reportCard, pages: 2 })} className={reportCard.pages === 2 ? '!bg-amber-100' : ''}>{t('suites.pathshala.pariksha.twoPage')}</Btn>
            <Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> {t('suites.pathshala.pariksha.print')}</Btn>
          </div>
          <div className="print-area rounded-xl border p-5">
            <h2 className="text-center font-extrabold text-xl">॥ {t('suites.pathshala.pariksha.progressReportTitle')} ॥</h2>
            <p className="text-center text-sm mb-3">Progress Report — {pariksha.nameBn || pariksha.name} ({pariksha.term})</p>
            <table className="mb-3">
              <tbody>
                <tr><td><b>{t('suites.pathshala.pariksha.colName')}</b></td><td>{rcStudent.studentName}</td><td><b>{t('suites.pathshala.pariksha.colRoll')}</b></td><td>{rcStudent.rollNo}</td></tr>
                <tr><td><b>{t('suites.pathshala.pariksha.colVarga')}</b></td><td>{state.vargas.find((v) => v.id === pariksha.vargaId)?.name}</td><td><b>{t('suites.pathshala.pariksha.colGuardian')}</b></td><td>{rcStudent.guardianName}</td></tr>
              </tbody>
            </table>
            <table>
              <thead><tr><th>{t('suites.pathshala.pariksha.colSubject')}</th><th>{t('suites.pathshala.pariksha.colFullMarks')}</th><th>{t('suites.pathshala.pariksha.colObtained')}</th><th>{t('suites.pathshala.pariksha.colGrade')}</th></tr></thead>
              <tbody>
                {subjects.map((sub) => {
                  const m = markOf(rcStudent.id, sub.id)?.marks ?? 0;
                  return (<tr key={sub.id}><td>{lang === 'bn' ? `${sub.nameBn || sub.name} (${sub.name})` : (sub.name || sub.nameBn)}</td><td>{digits(100)}</td><td>{digits(m)}</td><td>{gradeOf(m)}</td></tr>);
                })}
                <tr><td><b>{t('suites.pathshala.pariksha.totalRow')}</b></td><td><b>{digits(subjects.length * 100)}</b></td><td><b>{digits(rcTotals.total)}</b></td><td><b>{rcTotals.grade} ({gradeLabel(rcTotals.grade)})</b></td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-sm"><b>{t('suites.pathshala.pariksha.percentage')}:</b> {digits(Math.round(rcTotals.pct))}% • <b>{t('suites.pathshala.pariksha.merit')}:</b> {digits(totals.findIndex((x) => x.s.id === rcStudent.id) + 1)}</p>
            {reportCard.pages === 2 && (
              <>
                <h3 className="font-bold mt-4 mb-1">{t('suites.pathshala.pariksha.skillAssess')}</h3>
                <table>
                  <thead><tr><th>{t('suites.pathshala.pariksha.colSkill')}</th><th>{t('suites.pathshala.pariksha.colGrade')}</th></tr></thead>
                  <tbody>
                    {state.skills.filter((sk) => sk.vargaId === pariksha.vargaId).map((sk) => {
                      const g = state.skillGrades.find((r) => r.studentId === rcStudent.id && r.skillId === sk.id && r.term === pariksha.term);
                      return (<tr key={sk.id}><td>{lang === 'bn' ? `${sk.nameBn || sk.name} (${sk.name})` : (sk.name || sk.nameBn)}</td><td>{g?.grade || '—'}</td></tr>);
                    })}
                  </tbody>
                </table>
                <h3 className="font-bold mt-4 mb-1">{t('suites.pathshala.pariksha.attendance')}</h3>
                <p className="text-sm">{t('suites.pathshala.pariksha.attRate')}: {digits(rcStudent.attendancePct || 0)}%</p>
                <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
                  <div><div className="border-t border-black pt-1">{t('suites.pathshala.pariksha.classTeacherSign')}</div></div>
                  <div><div className="border-t border-black pt-1">{t('suites.pathshala.pariksha.acharyaSignSeal')}</div></div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
