import React, { useState } from 'react';
import { Plus, Trash2, Copy, Users } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useLanguage } from '../context/LanguageContext';
import { Card, Btn, Field, inputCls, Empty } from './ui';
import { uid } from './bn';

/* Checklist #14 — varga & subject management: add varga, subject setup,
   copy subjects across vargas. Also guru/staff roster (teachers). */

export const VargaTab: React.FC = () => {
  const { t } = useLanguage();
  const { state, add, update, remove } = usePathshala();
  const [vForm, setVForm] = useState({ name: '', sanskrit: '', section: 'Ka', room: '' });
  const [sForm, setSForm] = useState({ vargaId: '', name: '', nameBn: '', weeklyPeriods: 4, guruId: '' });
  const [gForm, setGForm] = useState({ name: '', phone: '', designation: 'Shikshak' });
  const [stForm, setStForm] = useState({ name: '', phone: '', role: '' });
  const [copyFrom, setCopyFrom] = useState('');
  const [copyTo, setCopyTo] = useState('');

  const addVarga = () => {
    if (!vForm.name.trim()) { alert(t('suites.pathshala.varga.enterVargaName')); return; }
    add('vargas', { id: uid('v'), ...vForm });
    setVForm({ name: '', sanskrit: '', section: 'Ka', room: '' });
  };
  const addSubject = () => {
    if (!sForm.vargaId || !sForm.nameBn.trim()) { alert(t('suites.pathshala.varga.enterVargaSubject')); return; }
    add('subjects', { id: uid('sub'), ...sForm });
    setSForm({ vargaId: sForm.vargaId, name: '', nameBn: '', weeklyPeriods: 4, guruId: '' });
  };
  const copySubjects = () => {
    if (!copyFrom || !copyTo || copyFrom === copyTo) { alert(t('suites.pathshala.varga.selectSrcDst')); return; }
    const src = state.subjects.filter((s) => s.vargaId === copyFrom);
    src.forEach((s) => add('subjects', { id: uid('sub'), vargaId: copyTo, name: s.name, nameBn: s.nameBn, weeklyPeriods: s.weeklyPeriods, guruId: s.guruId }));
    alert(t('suites.pathshala.varga.copiedCount').replace('{count}', String(src.length)));
  };
  const vargaName = (id: string) => state.vargas.find((v) => v.id === id)?.name || '—';
  const guruName = (id?: string) => state.gurus.find((g) => g.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800">{t('suites.pathshala.varga.heading')}</h2>

      {/* vargas */}
      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.pathshala.varga.vargaTitle')}</h3>
        <div className="grid sm:grid-cols-5 gap-2 mb-3 no-print">
          <Field label={t('suites.pathshala.varga.fName')}><input value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} className={inputCls} placeholder="Prathama" /></Field>
          <Field label={t('suites.pathshala.varga.fSanskrit')}><input value={vForm.sanskrit} onChange={(e) => setVForm({ ...vForm, sanskrit: e.target.value })} className={inputCls} placeholder="प्रथमा" /></Field>
          <Field label={t('suites.pathshala.varga.fSection')}><input value={vForm.section} onChange={(e) => setVForm({ ...vForm, section: e.target.value })} className={inputCls} /></Field>
          <Field label={t('suites.pathshala.varga.fRoom')}><input value={vForm.room} onChange={(e) => setVForm({ ...vForm, room: e.target.value })} className={inputCls} placeholder="Kaksha 1" /></Field>
          <div className="flex items-end"><Btn onClick={addVarga}><Plus className="w-4 h-4" /> {t('suites.pathshala.varga.add')}</Btn></div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {state.vargas.map((v) => (
            <div key={v.id} className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
              <div className="font-bold">{v.name} <span className="text-stone-500 font-normal">({v.sanskrit})</span></div>
              <div className="text-xs text-stone-500">{t('suites.pathshala.varga.sectionLabel')} {v.section}{v.room ? ` • ${v.room}` : ''} • {state.subjects.filter((s) => s.vargaId === v.id).length} {t('suites.pathshala.varga.subjectsLabel')}</div>
              <div className="flex gap-2 mt-1 no-print">
                <select value={v.classTeacherId || ''} onChange={(e) => update('vargas', v.id, { classTeacherId: e.target.value })} className="text-xs rounded-lg border border-stone-300 px-1.5 py-1 flex-1">
                  <option value="">{t('suites.pathshala.varga.classTeacherPh')}</option>
                  {state.gurus.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button onClick={() => { if (window.confirm(t('suites.pathshala.varga.confirmVargaDelete'))) remove('vargas', v.id); }} className="text-red-400" aria-label={t('suites.pathshala.varga.deleteTip')}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* subjects */}
      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.pathshala.varga.subjectTitle')}</h3>
        <div className="grid sm:grid-cols-6 gap-2 mb-3 no-print">
          <Field label={t('suites.pathshala.varga.fVarga')}><select value={sForm.vargaId} onChange={(e) => setSForm({ ...sForm, vargaId: e.target.value })} className={inputCls}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label={t('suites.pathshala.varga.fBengali')}><input value={sForm.nameBn} onChange={(e) => setSForm({ ...sForm, nameBn: e.target.value })} className={inputCls} placeholder="ব্যাকরণ" /></Field>
          <Field label={t('suites.pathshala.varga.fEnglish')}><input value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} className={inputCls} placeholder="Vyakarana" /></Field>
          <Field label={t('suites.pathshala.varga.fPeriodsWk')}><input type="number" min={1} max={12} value={sForm.weeklyPeriods} onChange={(e) => setSForm({ ...sForm, weeklyPeriods: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label={t('suites.pathshala.varga.fGuru')}><select value={sForm.guruId} onChange={(e) => setSForm({ ...sForm, guruId: e.target.value })} className={inputCls}><option value="">—</option>{state.gurus.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <div className="flex items-end"><Btn onClick={addSubject}><Plus className="w-4 h-4" /> {t('suites.pathshala.varga.add')}</Btn></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-stone-500 border-b">{[t('suites.pathshala.varga.colVarga'), t('suites.pathshala.varga.colSubject'), t('suites.pathshala.varga.colPeriodsWk'), t('suites.pathshala.varga.colGuru'), ''].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
            <tbody>
              {state.subjects.map((s) => (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{vargaName(s.vargaId)}</td>
                  <td className="py-2 pr-3 font-semibold">{s.nameBn} <span className="text-stone-500 font-normal text-xs">({s.name})</span></td>
                  <td className="py-2 pr-3">{s.weeklyPeriods}</td>
                  <td className="py-2 pr-3 text-xs">{guruName(s.guruId)}</td>
                  <td className="py-2"><button onClick={() => remove('subjects', s.id)} className="text-red-400 no-print" aria-label={t('suites.pathshala.varga.deleteTip')}><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!state.subjects.length && <Empty text={t('suites.pathshala.varga.noSubjects')} />}
        </div>
        <div className="flex flex-wrap gap-2 items-end mt-4 no-print border-t border-stone-100 pt-3">
          <Field label={t('suites.pathshala.varga.copyFrom')}><select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={`${inputCls} !w-40`}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label={t('suites.pathshala.varga.copyTo')}><select value={copyTo} onChange={(e) => setCopyTo(e.target.value)} className={`${inputCls} !w-40`}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Btn variant="ghost" onClick={copySubjects}><Copy className="w-4 h-4" /> {t('suites.pathshala.varga.copySubjects')}</Btn>
        </div>
      </Card>

      {/* gurus + staff */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-amber-600" />{t('suites.pathshala.varga.guruTitle')}</h3>
          <div className="grid grid-cols-3 gap-2 mb-3 no-print">
            <input value={gForm.name} onChange={(e) => setGForm({ ...gForm, name: e.target.value })} placeholder={t('suites.pathshala.varga.phName')} className={inputCls} />
            <input value={gForm.phone} onChange={(e) => setGForm({ ...gForm, phone: e.target.value })} placeholder={t('suites.pathshala.varga.phPhone')} className={inputCls} />
            <div className="flex gap-2">
              <select value={gForm.designation} onChange={(e) => setGForm({ ...gForm, designation: e.target.value })} className={inputCls}>
                {['Acharya', 'Upadhyaya', 'Shikshak', 'Shikshika', 'Vyayam Shikshak'].map((d) => <option key={d}>{d}</option>)}
              </select>
              <Btn onClick={() => { if (!gForm.name.trim()) return; add('gurus', { id: uid('g'), name: gForm.name, phone: gForm.phone, designation: gForm.designation, subjects: [] }); setGForm({ name: '', phone: '', designation: 'Shikshak' }); }}><Plus className="w-4 h-4" /></Btn>
            </div>
          </div>
          <div className="space-y-1.5">
            {state.gurus.map((g) => (
              <div key={g.id} className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm">
                <div><div className="font-semibold">{g.name}</div><div className="text-xs text-stone-500">{g.designation}{g.phone ? ` • ${g.phone}` : ''}</div></div>
                <button onClick={() => { if (window.confirm(t('suites.pathshala.varga.confirmDelete'))) remove('gurus', g.id); }} className="text-red-400 no-print" aria-label={t('suites.pathshala.varga.deleteTip')}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-stone-800 mb-3">{t('suites.pathshala.varga.staffTitle')}</h3>
          <div className="grid grid-cols-3 gap-2 mb-3 no-print">
            <input value={stForm.name} onChange={(e) => setStForm({ ...stForm, name: e.target.value })} placeholder={t('suites.pathshala.varga.phName')} className={inputCls} />
            <input value={stForm.phone} onChange={(e) => setStForm({ ...stForm, phone: e.target.value })} placeholder={t('suites.pathshala.varga.phPhone')} className={inputCls} />
            <div className="flex gap-2">
              <input value={stForm.role} onChange={(e) => setStForm({ ...stForm, role: e.target.value })} placeholder={t('suites.pathshala.varga.phRole')} className={inputCls} />
              <Btn onClick={() => { if (!stForm.name.trim()) return; add('staff', { id: uid('s'), name: stForm.name, phone: stForm.phone, role: stForm.role || 'Sahayak' }); setStForm({ name: '', phone: '', role: '' }); }}><Plus className="w-4 h-4" /></Btn>
            </div>
          </div>
          <div className="space-y-1.5">
            {state.staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm">
                <div><div className="font-semibold">{s.name}</div><div className="text-xs text-stone-500">{s.role}{s.phone ? ` • ${s.phone}` : ''}</div></div>
                <button onClick={() => { if (window.confirm(t('suites.pathshala.varga.confirmDelete'))) remove('staff', s.id); }} className="text-red-400 no-print" aria-label={t('suites.pathshala.varga.deleteTip')}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {!state.staff.length && <Empty text={t('suites.pathshala.varga.noStaff')} />}
          </div>
        </Card>
      </div>
    </div>
  );
};
