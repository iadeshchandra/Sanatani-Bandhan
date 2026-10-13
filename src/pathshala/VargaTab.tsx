import React, { useState } from 'react';
import { Plus, Trash2, Copy, Users } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { Card, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { uid } from './bn';

/* Checklist #14 — বর্গ ও বিষয় ব্যবস্থাপনা: add varga, subject setup,
   copy subjects across vargas. Also guru/staff roster (teachers). */

export const VargaTab: React.FC = () => {
  const { digits, lang, tr } = useLocaleText();
  const { state, add, update, remove } = usePathshala();
  const [vForm, setVForm] = useState({ name: '', sanskrit: '', section: 'Ka', room: '' });
  const [sForm, setSForm] = useState({ vargaId: '', name: '', nameBn: '', weeklyPeriods: 4, guruId: '' });
  const [gForm, setGForm] = useState({ name: '', phone: '', designation: 'Shikshak' });
  const [stForm, setStForm] = useState({ name: '', phone: '', role: '' });
  const [copyFrom, setCopyFrom] = useState('');
  const [copyTo, setCopyTo] = useState('');

  const addVarga = () => {
    if (!vForm.name.trim()) { alert(tr('pathshala.varga.enter_varga_name', 'Enter varga name', 'বর্গের নাম দিন', 'वर्ग का नाम दें')); return; }
    add('vargas', { id: uid('v'), ...vForm });
    setVForm({ name: '', sanskrit: '', section: 'Ka', room: '' });
  };
  const addSubject = () => {
    if (!sForm.vargaId || !sForm.nameBn.trim()) { alert(tr('pathshala.varga.enter_varga_subject', 'Enter varga and subject names', 'বর্গ ও বিষয়ের নাম দিন', 'वर्ग व विषय का नाम दें')); return; }
    add('subjects', { id: uid('sub'), ...sForm });
    setSForm({ vargaId: sForm.vargaId, name: '', nameBn: '', weeklyPeriods: 4, guruId: '' });
  };
  const copySubjects = () => {
    if (!copyFrom || !copyTo || copyFrom === copyTo) { alert(tr('pathshala.varga.select_src_dst', 'Select source and target vargas', 'উৎস ও লক্ষ্য বর্গ নির্বাচন করুন', 'स्रोत व लक्ष्य वर्ग चुनें')); return; }
    const src = state.subjects.filter((s) => s.vargaId === copyFrom);
    src.forEach((s) => add('subjects', { id: uid('sub'), vargaId: copyTo, name: s.name, nameBn: s.nameBn, weeklyPeriods: s.weeklyPeriods, guruId: s.guruId }));
    alert(`${src.length} ${tr('pathshala.varga.copied', 'subjects copied', 'টি বিষয় কপি হয়েছে', 'विषय कॉपी हुए')}`);
  };
  const vargaName = (id: string) => state.vargas.find((v) => v.id === id)?.name || '—';
  const guruName = (id?: string) => state.gurus.find((g) => g.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800"><T bn="বর্গ, বিষয় ও গুরু" en="Varga, subjects & gurus" /></h2>

      {/* vargas */}
      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T bn="বর্গ (শ্রেণি)" en="Varga — classes" /></h3>
        <div className="grid sm:grid-cols-5 gap-2 mb-3 no-print">
          <Field label={<T bn="নাম" en="Name" />}><input value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} className={inputCls} placeholder="Prathama" /></Field>
          <Field label={tr('pathshala.varga.sanskrit', 'Sanskrit', 'সংস্কৃত', 'संस्कृत')}><input value={vForm.sanskrit} onChange={(e) => setVForm({ ...vForm, sanskrit: e.target.value })} className={inputCls} placeholder="प्रथमा" /></Field>
          <Field label={<T bn="শাখা" en="Section" />}><input value={vForm.section} onChange={(e) => setVForm({ ...vForm, section: e.target.value })} className={inputCls} /></Field>
          <Field label={<T bn="কক্ষ" en="Room" />}><input value={vForm.room} onChange={(e) => setVForm({ ...vForm, room: e.target.value })} className={inputCls} placeholder="Kaksha 1" /></Field>
          <div className="flex items-end"><Btn onClick={addVarga}><Plus className="w-4 h-4" /> {tr('pathshala.varga.add', 'Add', 'যোগ', 'जोड़ें')}</Btn></div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {state.vargas.map((v) => (
            <div key={v.id} className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
              <div className="font-bold">{v.name} <span className="text-stone-500 font-normal">({v.sanskrit})</span></div>
              <div className="text-xs text-stone-500">{tr('pathshala.varga.section', 'Section', 'শাখা', 'शाखा')} {v.section}{v.room ? ` • ${v.room}` : ''} • {state.subjects.filter((s) => s.vargaId === v.id).length} {tr('pathshala.varga.subjects', 'subjects', 'বিষয়', 'विषय')}</div>
              <div className="flex gap-2 mt-1 no-print">
                <select value={v.classTeacherId || ''} onChange={(e) => update('vargas', v.id, { classTeacherId: e.target.value })} className="text-xs rounded-lg border border-stone-300 px-1.5 py-1 flex-1">
                  <option value="">{tr('pathshala.varga.class_teacher_ph', 'Class teacher…', 'শ্রেণি শিক্ষক…', 'कक्षा अध्यापक…')}</option>
                  {state.gurus.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button onClick={() => { if (window.confirm(tr('pathshala.varga.confirm_varga_delete', 'Delete varga?', 'বর্গ মুছবেন?', 'वर्ग हटाएँ?'))) remove('vargas', v.id); }} className="text-red-400" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* subjects */}
      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T bn="বিষয়" en="Subjects" /></h3>
        <div className="grid sm:grid-cols-6 gap-2 mb-3 no-print">
          <Field label={<T bn="বর্গ" en="Varga" />}><select value={sForm.vargaId} onChange={(e) => setSForm({ ...sForm, vargaId: e.target.value })} className={inputCls}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label={<T bn="বাংলা নাম" en="Bengali" />}><input value={sForm.nameBn} onChange={(e) => setSForm({ ...sForm, nameBn: e.target.value })} className={inputCls} placeholder="ব্যাকরণ" /></Field>
          <Field label="English"><input value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} className={inputCls} placeholder="Vyakarana" /></Field>
          <Field label={<T bn="সাপ্তাহিক পিরিয়ড" en="Periods/wk" />}><input type="number" min={1} max={12} value={sForm.weeklyPeriods} onChange={(e) => setSForm({ ...sForm, weeklyPeriods: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label={<T bn="গুরু" en="Guru" />}><select value={sForm.guruId} onChange={(e) => setSForm({ ...sForm, guruId: e.target.value })} className={inputCls}><option value="">—</option>{state.gurus.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <div className="flex items-end"><Btn onClick={addSubject}><Plus className="w-4 h-4" /> {tr('pathshala.varga.add', 'Add', 'যোগ', 'जोड़ें')}</Btn></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-stone-500 border-b">{[tr('pathshala.varga.varga', 'Varga', 'বর্গ', 'वर्ग'), tr('pathshala.varga.subject', 'Subject', 'বিষয়', 'विषय'), tr('pathshala.varga.periods_week', 'Periods/week', 'পিরিয়ড/সপ্তাহ', 'कालांश/सप्ताह'), tr('pathshala.varga.guru', 'Guru', 'গুরু', 'गुरु'), ''].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
            <tbody>
              {state.subjects.map((s) => (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{vargaName(s.vargaId)}</td>
                  <td className="py-2 pr-3 font-semibold">{s.nameBn} <span className="text-stone-500 font-normal text-xs">({s.name})</span></td>
                  <td className="py-2 pr-3">{s.weeklyPeriods}</td>
                  <td className="py-2 pr-3 text-xs">{guruName(s.guruId)}</td>
                  <td className="py-2"><button onClick={() => remove('subjects', s.id)} className="text-red-400 no-print" aria-label="Delete"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!state.subjects.length && <Empty text={tr('pathshala.varga.no_subjects', 'No subjects', 'কোনো বিষয় নেই', 'कोई विषय नहीं')} />}
        </div>
        <div className="flex flex-wrap gap-2 items-end mt-4 no-print border-t border-stone-100 pt-3">
          <Field label={<T bn="উৎস বর্গ" en="Copy from" />}><select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={`${inputCls} !w-40`}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label={<T bn="লক্ষ্য বর্গ" en="Copy to" />}><select value={copyTo} onChange={(e) => setCopyTo(e.target.value)} className={`${inputCls} !w-40`}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Btn variant="ghost" onClick={copySubjects}><Copy className="w-4 h-4" /> {tr('pathshala.varga.copy_subjects', 'Copy subjects', 'বিষয় কপি করুন', 'विषय कॉपी करें')}</Btn>
        </div>
      </Card>

      {/* gurus + staff */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-amber-600" /><T bn="গুরু মণ্ডলী" en="Gurus — teachers" /></h3>
          <div className="grid grid-cols-3 gap-2 mb-3 no-print">
            <input value={gForm.name} onChange={(e) => setGForm({ ...gForm, name: e.target.value })} placeholder={tr('pathshala.varga.name', 'Name', 'নাম', 'नाम')} className={inputCls} />
            <input value={gForm.phone} onChange={(e) => setGForm({ ...gForm, phone: e.target.value })} placeholder={tr('pathshala.varga.phone', 'Phone', 'ফোন', 'फोन')} className={inputCls} />
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
                <button onClick={() => { if (window.confirm(tr('pathshala.varga.confirm_delete', 'Delete?', 'মুছবেন?', 'हटाएँ?'))) remove('gurus', g.id); }} className="text-red-400 no-print" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><T bn="কর্মচারী" en="Staff" /></h3>
          <div className="grid grid-cols-3 gap-2 mb-3 no-print">
            <input value={stForm.name} onChange={(e) => setStForm({ ...stForm, name: e.target.value })} placeholder={tr('pathshala.varga.name', 'Name', 'নাম', 'नाम')} className={inputCls} />
            <input value={stForm.phone} onChange={(e) => setStForm({ ...stForm, phone: e.target.value })} placeholder={tr('pathshala.varga.phone', 'Phone', 'ফোন', 'फोन')} className={inputCls} />
            <div className="flex gap-2">
              <input value={stForm.role} onChange={(e) => setStForm({ ...stForm, role: e.target.value })} placeholder={tr('pathshala.varga.role', 'Role', 'ভূমিকা', 'भूमिका')} className={inputCls} />
              <Btn onClick={() => { if (!stForm.name.trim()) return; add('staff', { id: uid('s'), name: stForm.name, phone: stForm.phone, role: stForm.role || 'Sahayak' }); setStForm({ name: '', phone: '', role: '' }); }}><Plus className="w-4 h-4" /></Btn>
            </div>
          </div>
          <div className="space-y-1.5">
            {state.staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm">
                <div><div className="font-semibold">{s.name}</div><div className="text-xs text-stone-500">{s.role}{s.phone ? ` • ${s.phone}` : ''}</div></div>
                <button onClick={() => { if (window.confirm(tr('pathshala.varga.confirm_delete', 'Delete?', 'মুছবেন?', 'हटाएँ?'))) remove('staff', s.id); }} className="text-red-400 no-print" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {!state.staff.length && <Empty text={tr('pathshala.varga.no_staff2', 'No staff', 'কোনো কর্মচারী নেই', 'कोई कर्मचारी नहीं')} />}
          </div>
        </Card>
      </div>
    </div>
  );
};
