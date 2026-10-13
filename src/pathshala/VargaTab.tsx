import React, { useState } from 'react';
import { Plus, Trash2, Copy, Users } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { Card, Bn, Btn, Field, inputCls, Empty } from './ui';
import { uid } from './bn';

/* Checklist #14 — বর্গ ও বিষয় ব্যবস্থাপনা: add varga, subject setup,
   copy subjects across vargas. Also guru/staff roster (teachers). */

export const VargaTab: React.FC = () => {
  const { state, add, update, remove } = usePathshala();
  const [vForm, setVForm] = useState({ name: '', sanskrit: '', section: 'Ka', room: '' });
  const [sForm, setSForm] = useState({ vargaId: '', name: '', nameBn: '', weeklyPeriods: 4, guruId: '' });
  const [gForm, setGForm] = useState({ name: '', phone: '', designation: 'Shikshak' });
  const [stForm, setStForm] = useState({ name: '', phone: '', role: '' });
  const [copyFrom, setCopyFrom] = useState('');
  const [copyTo, setCopyTo] = useState('');

  const addVarga = () => {
    if (!vForm.name.trim()) { alert('বর্গের নাম দিন'); return; }
    add('vargas', { id: uid('v'), ...vForm });
    setVForm({ name: '', sanskrit: '', section: 'Ka', room: '' });
  };
  const addSubject = () => {
    if (!sForm.vargaId || !sForm.nameBn.trim()) { alert('বর্গ ও বিষয়ের নাম দিন'); return; }
    add('subjects', { id: uid('sub'), ...sForm });
    setSForm({ vargaId: sForm.vargaId, name: '', nameBn: '', weeklyPeriods: 4, guruId: '' });
  };
  const copySubjects = () => {
    if (!copyFrom || !copyTo || copyFrom === copyTo) { alert('উৎস ও লক্ষ্য বর্গ নির্বাচন করুন'); return; }
    const src = state.subjects.filter((s) => s.vargaId === copyFrom);
    src.forEach((s) => add('subjects', { id: uid('sub'), vargaId: copyTo, name: s.name, nameBn: s.nameBn, weeklyPeriods: s.weeklyPeriods, guruId: s.guruId }));
    alert(`${src.length}টি বিষয় কপি হয়েছে`);
  };
  const vargaName = (id: string) => state.vargas.find((v) => v.id === id)?.name || '—';
  const guruName = (id?: string) => state.gurus.find((g) => g.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800"><Bn bn="বর্গ, বিষয় ও গুরু" en="Varga, subjects & gurus" /></h2>

      {/* vargas */}
      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><Bn bn="বর্গ (শ্রেণি)" en="Varga — classes" /></h3>
        <div className="grid sm:grid-cols-5 gap-2 mb-3 no-print">
          <Field label={<Bn bn="নাম" en="Name" />}><input value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} className={inputCls} placeholder="Prathama" /></Field>
          <Field label="সংস্কৃত"><input value={vForm.sanskrit} onChange={(e) => setVForm({ ...vForm, sanskrit: e.target.value })} className={inputCls} placeholder="प्रथमा" /></Field>
          <Field label={<Bn bn="শাখা" en="Section" />}><input value={vForm.section} onChange={(e) => setVForm({ ...vForm, section: e.target.value })} className={inputCls} /></Field>
          <Field label={<Bn bn="কক্ষ" en="Room" />}><input value={vForm.room} onChange={(e) => setVForm({ ...vForm, room: e.target.value })} className={inputCls} placeholder="Kaksha 1" /></Field>
          <div className="flex items-end"><Btn onClick={addVarga}><Plus className="w-4 h-4" /> যোগ</Btn></div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {state.vargas.map((v) => (
            <div key={v.id} className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
              <div className="font-bold">{v.name} <span className="text-stone-500 font-normal">({v.sanskrit})</span></div>
              <div className="text-xs text-stone-500">শাখা {v.section}{v.room ? ` • ${v.room}` : ''} • {state.subjects.filter((s) => s.vargaId === v.id).length} বিষয়</div>
              <div className="flex gap-2 mt-1 no-print">
                <select value={v.classTeacherId || ''} onChange={(e) => update('vargas', v.id, { classTeacherId: e.target.value })} className="text-xs rounded-lg border border-stone-300 px-1.5 py-1 flex-1">
                  <option value="">শ্রেণি শিক্ষক…</option>
                  {state.gurus.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button onClick={() => { if (window.confirm('বর্গ মুছবেন?')) remove('vargas', v.id); }} className="text-red-400" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* subjects */}
      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><Bn bn="বিষয়" en="Subjects" /></h3>
        <div className="grid sm:grid-cols-6 gap-2 mb-3 no-print">
          <Field label={<Bn bn="বর্গ" en="Varga" />}><select value={sForm.vargaId} onChange={(e) => setSForm({ ...sForm, vargaId: e.target.value })} className={inputCls}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label={<Bn bn="বাংলা নাম" en="Bengali" />}><input value={sForm.nameBn} onChange={(e) => setSForm({ ...sForm, nameBn: e.target.value })} className={inputCls} placeholder="ব্যাকরণ" /></Field>
          <Field label="English"><input value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} className={inputCls} placeholder="Vyakarana" /></Field>
          <Field label={<Bn bn="সাপ্তাহিক পিরিয়ড" en="Periods/wk" />}><input type="number" min={1} max={12} value={sForm.weeklyPeriods} onChange={(e) => setSForm({ ...sForm, weeklyPeriods: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label={<Bn bn="গুরু" en="Guru" />}><select value={sForm.guruId} onChange={(e) => setSForm({ ...sForm, guruId: e.target.value })} className={inputCls}><option value="">—</option>{state.gurus.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <div className="flex items-end"><Btn onClick={addSubject}><Plus className="w-4 h-4" /> যোগ</Btn></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-stone-500 border-b">{['বর্গ', 'বিষয়', 'পিরিয়ড/সপ্তাহ', 'গুরু', ''].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
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
          {!state.subjects.length && <Empty text="কোনো বিষয় নেই" />}
        </div>
        <div className="flex flex-wrap gap-2 items-end mt-4 no-print border-t border-stone-100 pt-3">
          <Field label={<Bn bn="উৎস বর্গ" en="Copy from" />}><select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={`${inputCls} !w-40`}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label={<Bn bn="লক্ষ্য বর্গ" en="Copy to" />}><select value={copyTo} onChange={(e) => setCopyTo(e.target.value)} className={`${inputCls} !w-40`}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Btn variant="ghost" onClick={copySubjects}><Copy className="w-4 h-4" /> বিষয় কপি করুন</Btn>
        </div>
      </Card>

      {/* gurus + staff */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-amber-600" /><Bn bn="গুরু মণ্ডলী" en="Gurus — teachers" /></h3>
          <div className="grid grid-cols-3 gap-2 mb-3 no-print">
            <input value={gForm.name} onChange={(e) => setGForm({ ...gForm, name: e.target.value })} placeholder="নাম" className={inputCls} />
            <input value={gForm.phone} onChange={(e) => setGForm({ ...gForm, phone: e.target.value })} placeholder="ফোন" className={inputCls} />
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
                <button onClick={() => { if (window.confirm('মুছবেন?')) remove('gurus', g.id); }} className="text-red-400 no-print" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><Bn bn="কর্মচারী" en="Staff" /></h3>
          <div className="grid grid-cols-3 gap-2 mb-3 no-print">
            <input value={stForm.name} onChange={(e) => setStForm({ ...stForm, name: e.target.value })} placeholder="নাম" className={inputCls} />
            <input value={stForm.phone} onChange={(e) => setStForm({ ...stForm, phone: e.target.value })} placeholder="ফোন" className={inputCls} />
            <div className="flex gap-2">
              <input value={stForm.role} onChange={(e) => setStForm({ ...stForm, role: e.target.value })} placeholder="ভূমিকা" className={inputCls} />
              <Btn onClick={() => { if (!stForm.name.trim()) return; add('staff', { id: uid('s'), name: stForm.name, phone: stForm.phone, role: stForm.role || 'Sahayak' }); setStForm({ name: '', phone: '', role: '' }); }}><Plus className="w-4 h-4" /></Btn>
            </div>
          </div>
          <div className="space-y-1.5">
            {state.staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm">
                <div><div className="font-semibold">{s.name}</div><div className="text-xs text-stone-500">{s.role}{s.phone ? ` • ${s.phone}` : ''}</div></div>
                <button onClick={() => { if (window.confirm('মুছবেন?')) remove('staff', s.id); }} className="text-red-400 no-print" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {!state.staff.length && <Empty text="কোনো কর্মচারী নেই" />}
          </div>
        </Card>
      </div>
    </div>
  );
};
