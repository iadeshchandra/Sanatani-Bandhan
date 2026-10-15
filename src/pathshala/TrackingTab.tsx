import React, { useMemo, useState } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, Btn, Field, inputCls, Empty, Modal, useLocaleText } from './ui';
import { uid } from './bn';
import { SkillGrade } from './types';

/* Checklist #12 — learning tracking: indicator-based A/B/C/D grades
   per skill per shishya per term. */

const GRADES: SkillGrade[] = ['A', 'B', 'C', 'D'];
const GRADE_C = (g: SkillGrade) =>
  g === 'A' ? 'bg-emerald-600 text-white border-emerald-600'
  : g === 'B' ? 'bg-lime-500 text-white border-lime-500'
  : g === 'C' ? 'bg-amber-500 text-white border-amber-500'
  : 'bg-red-500 text-white border-red-500';
const GRADE_KEYS: Record<SkillGrade, string> = {
  A: 'gradeOutstanding', B: 'gradeGood', C: 'gradeAverage', D: 'gradeNeedsImprovement',
};

export const TrackingTab: React.FC = () => {
  const { t } = useLanguage();
  const { lang } = useLocaleText();
  const { state, add, update, remove } = usePathshala();
  const { gurukulStudents } = useData();
  const [vargaId, setVargaId] = useState(state.vargas[0]?.id || '');
  const [term, setTerm] = useState('2026 — Pratham');
  const [newSkill, setNewSkill] = useState({ name: '', nameBn: '' });
  const [printView, setPrintView] = useState(false);

  const gradeLabel = (g: SkillGrade): string => t(`suites.pathshala.tracking.${GRADE_KEYS[g]}`);

  const vargaOf = (sid: string) => state.shishyaMeta.find((m) => m.studentId === sid)?.vargaId || '';
  const students = useMemo(() => gurukulStudents.filter((s) => !vargaId || !vargaOf(s.id) || vargaOf(s.id) === vargaId), [gurukulStudents, vargaId, state.shishyaMeta]);
  const skills = useMemo(() => state.skills.filter((sk) => !vargaId || sk.vargaId === vargaId), [state.skills, vargaId]);

  const gradeOf = (sid: string, skillId: string) => state.skillGrades.find((r) => r.studentId === sid && r.skillId === skillId && r.term === term)?.grade;
  const setGrade = (sid: string, skillId: string, grade: SkillGrade) => {
    const ex = state.skillGrades.find((r) => r.studentId === sid && r.skillId === skillId && r.term === term);
    if (ex) update('skillGrades', ex.id, { grade });
    else add('skillGrades', { id: uid('sg'), term, studentId: sid, skillId, grade });
  };

  const addSkill = () => {
    if (!newSkill.nameBn.trim() || !vargaId) { alert(t('suites.pathshala.tracking.enterVargaBnName')); return; }
    add('skills', { id: uid('sk'), vargaId, name: newSkill.name || newSkill.nameBn, nameBn: newSkill.nameBn });
    setNewSkill({ name: '', nameBn: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.pathshala.tracking.heading')}</h2>
        <Btn variant="ghost" onClick={() => setPrintView(true)}><Printer className="w-4 h-4" /> {t('suites.pathshala.tracking.print')}</Btn>
      </div>

      <Card className="no-print">
        <div className="flex flex-wrap gap-2 items-end">
          <Field label={t('suites.pathshala.tracking.fVarga')}>
            <select value={vargaId} onChange={(e) => setVargaId(e.target.value)} className={`${inputCls} !w-44`}>
              {state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Field label={t('suites.pathshala.tracking.fTerm')}><input value={term} onChange={(e) => setTerm(e.target.value)} className={`${inputCls} !w-44`} /></Field>
        </div>
        <div className="mt-3">
          <div className="text-xs font-bold text-stone-600 mb-1">{t('suites.pathshala.tracking.addSkillTitle')}</div>
          <div className="flex flex-wrap gap-2">
            <input value={newSkill.nameBn} onChange={(e) => setNewSkill({ ...newSkill, nameBn: e.target.value })} placeholder={t('suites.pathshala.tracking.phBnName')} className={`${inputCls} !w-52`} />
            <input value={newSkill.name} onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} placeholder={t('suites.pathshala.tracking.phEnName')} className={`${inputCls} !w-44`} />
            <Btn onClick={addSkill}><Plus className="w-4 h-4" /> {t('suites.pathshala.tracking.add')}</Btn>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {skills.map((sk) => (
              <span key={sk.id} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-sm">
                {sk.nameBn} <button onClick={() => { if (window.confirm(t('suites.pathshala.tracking.confirmDelete'))) remove('skills', sk.id); }} className="text-red-400" aria-label={t('suites.pathshala.tracking.confirmDelete')}><Trash2 className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        {!skills.length ? <Empty text={t('suites.pathshala.tracking.addIndicatorsFirst')} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-stone-500 border-b"><th className="py-2 pr-2 sticky left-0 bg-white">{t('suites.pathshala.tracking.colShishya')}</th>{skills.map((sk) => <th key={sk.id} className="py-2 pr-2 min-w-[130px]">{sk.nameBn}<br /><span className="font-normal">{sk.name}</span></th>)}</tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100">
                    <td className="py-1.5 pr-2 sticky left-0 bg-white font-semibold text-xs whitespace-nowrap">{s.studentName}<br /><span className="font-normal text-stone-500">{s.rollNo}</span></td>
                    {skills.map((sk) => {
                      const g = gradeOf(s.id, sk.id);
                      return (
                        <td key={sk.id} className="py-1.5 pr-2">
                          <div className="flex gap-1">
                            {GRADES.map((gr) => (
                              <button key={gr} onClick={() => setGrade(s.id, sk.id, gr)} title={`${gr} — ${gradeLabel(gr)}`}
                                className={`w-10 h-10 rounded-xl text-sm font-extrabold border ${g === gr ? GRADE_C(gr) : 'bg-white text-stone-400 border-stone-200'}`}>{gr}</button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex gap-3 mt-3 text-xs text-stone-500">
          {GRADES.map((g) => <span key={g}><span className={`inline-block w-6 h-6 rounded-lg text-center text-white text-xs font-bold leading-6 ${GRADE_C(g).split(' ')[0]}`}>{g}</span> {gradeLabel(g)}</span>)}
        </div>
      </Card>

      {printView && (
        <Modal title={t('suites.pathshala.tracking.reportTitle')} onClose={() => setPrintView(false)} wide>
          <div className="print-area rounded-xl border p-5">
            <h2 className="text-center font-extrabold text-xl">॥ {t('suites.pathshala.tracking.progressTitle')} — {term} ॥</h2>
            <table className="mt-2">
              <thead><tr><th>{t('suites.pathshala.tracking.colShishya')}</th>{skills.map((sk) => <th key={sk.id}>{lang === 'bn' ? (sk.nameBn || sk.name) : (sk.name || sk.nameBn)}</th>)}</tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}><td>{s.studentName}</td>{skills.map((sk) => <td key={sk.id} className="text-center font-bold">{gradeOf(s.id, sk.id) || '—'}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs mt-2">{t('suites.pathshala.tracking.gradeLegend')}</p>
          </div>
          <div className="flex gap-2 mt-3 no-print"><Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> {t('suites.pathshala.tracking.print')}</Btn><Btn variant="ghost" onClick={() => setPrintView(false)}>{t('suites.pathshala.tracking.close')}</Btn></div>
        </Modal>
      )}
    </div>
  );
};
