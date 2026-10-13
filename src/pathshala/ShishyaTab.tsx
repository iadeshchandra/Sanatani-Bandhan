import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, ArrowUpCircle, Download, Upload, Printer } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { GurukulStudent } from '../types';
import { Card, Bn, Btn, Field, inputCls, Modal, Empty } from './ui';
import { todayISO, toBnDigits, downloadCSV, parseCSV, uid, fmtDateEn } from './bn';

/* Checklist #2 — শিষ্য ব্যবস্থাপনা: admission, edit, varga promotion,
   CSV import/export. Checklist #13 — ভর্তি ও উপবৃত্তি রেজিস্টার. */

const LEVELS: GurukulStudent['courseLevel'][] = ['Prathama (Grammar)', 'Madhyama (Shastras)', 'Shastri (Philosophy)', 'Acharya (Vedanta)'];
const LEVEL_BN: Record<string, string> = {
  'Prathama (Grammar)': 'প্রথমা', 'Madhyama (Shastras)': 'মধ্যমা',
  'Shastri (Philosophy)': 'শাস্ত্রী', 'Acharya (Vedanta)': 'আচার্য',
};

export const ShishyaTab: React.FC = () => {
  const { state, setShishyaMeta } = usePathshala();
  const { gurukulStudents, addGurukulStudent, updateGurukulStudent } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [view, setView] = useState<'list' | 'admission' | 'stipend'>('list');
  const [search, setSearch] = useState('');
  const [vargaFilter, setVargaFilter] = useState('');
  const [editing, setEditing] = useState<GurukulStudent | null>(null);
  const [printReg, setPrintReg] = useState<'admission' | 'stipend' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Admission meta (varga/admissionNo) for records created via DataContext,
  // which returns only boolean — applied when the new record appears.
  const pendingMeta = useRef<Record<string, { vargaId?: string; admissionNo: string; admissionDate: string }>>({});
  useEffect(() => {
    const pending = pendingMeta.current;
    const names = Object.keys(pending);
    if (!names.length) return;
    for (const name of names) {
      const s = gurukulStudents.find((x) => x.studentName === name && !state.shishyaMeta.some((m) => m.studentId === x.id));
      if (s) { setShishyaMeta(s.id, pending[name]); delete pending[name]; }
    }
  }, [gurukulStudents, state.shishyaMeta]);

  const metaOf = (id: string) => state.shishyaMeta.find((m) => m.studentId === id);
  const vargaName = (id?: string) => state.vargas.find((v) => v.id === id)?.name || '—';

  const attPctOf = (s: GurukulStudent): number => {
    const recs = state.upasthiti.filter((u) => u.studentId === s.id && u.status !== 'holiday');
    if (recs.length) return Math.round((recs.filter((u) => u.status === 'present').length / recs.length) * 100);
    return s.attendancePct || 0;
  };

  const filtered = useMemo(() => gurukulStudents.filter((s) => {
    const m = metaOf(s.id);
    if (vargaFilter && m?.vargaId !== vargaFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.studentName.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q) || (m?.admissionNo || '').toLowerCase().includes(q);
    }
    return true;
  }), [gurukulStudents, search, vargaFilter, state.shishyaMeta, state.upasthiti]);

  const stipendCutoff = state.settings.stipendAttendancePct;
  const stipendList = useMemo(() => gurukulStudents
    .map((s) => ({ s, pct: attPctOf(s) }))
    .filter((x) => x.pct >= stipendCutoff)
    .sort((a, b) => b.pct - a.pct),
  [gurukulStudents, state.upasthiti, stipendCutoff]);

  /* ---------- admission / edit form ---------- */
  const [form, setForm] = useState({ studentName: '', rollNo: '', courseLevel: LEVELS[0], guardianName: '', guardianPhone: '', vargaId: '', admissionNo: '', admissionDate: todayISO() });
  const openEdit = (s: GurukulStudent) => {
    const m = metaOf(s.id);
    setEditing(s);
    setForm({ studentName: s.studentName, rollNo: s.rollNo, courseLevel: s.courseLevel, guardianName: s.guardianName, guardianPhone: s.guardianPhone, vargaId: m?.vargaId || '', admissionNo: m?.admissionNo || '', admissionDate: m?.admissionDate || todayISO() });
  };
  const saveForm = () => {
    if (!form.studentName.trim()) { alert('শিষ্যের নাম দিন'); return; }
    if (editing) {
      updateGurukulStudent(editing.id, { studentName: form.studentName, rollNo: form.rollNo, courseLevel: form.courseLevel, guardianName: form.guardianName, guardianPhone: form.guardianPhone });
      setShishyaMeta(editing.id, { vargaId: form.vargaId || undefined, admissionNo: form.admissionNo, admissionDate: form.admissionDate });
      setEditing(null);
    } else {
      const ok = addGurukulStudent({ workspaceId: activeWorkspace.id, studentName: form.studentName, rollNo: form.rollNo || `GS-${Date.now().toString().slice(-6)}`, courseLevel: form.courseLevel, sandhyaVandanaRegularity: 0, shlokaRecitationScore: 0, guardianName: form.guardianName, guardianPhone: form.guardianPhone, attendancePct: 0 });
      if (ok) {
        // Attach varga/admission meta when the new record lands (see effect above).
        pendingMeta.current[form.studentName] = { vargaId: form.vargaId || undefined, admissionNo: form.admissionNo, admissionDate: form.admissionDate };
      }
    }
    setForm({ studentName: '', rollNo: '', courseLevel: LEVELS[0], guardianName: '', guardianPhone: '', vargaId: '', admissionNo: '', admissionDate: todayISO() });
  };
  const promote = (s: GurukulStudent) => {
    const i = LEVELS.indexOf(s.courseLevel);
    if (i < 0 || i === LEVELS.length - 1) { alert('সর্বোচ্চ স্তরে আছেন'); return; }
    if (window.confirm(`${s.studentName} → ${LEVEL_BN[LEVELS[i + 1]]} (${LEVELS[i + 1]})?`)) updateGurukulStudent(s.id, { courseLevel: LEVELS[i + 1] });
  };

  /* ---------- CSV ---------- */
  const exportCSV = () => {
    const rows = [['AdmissionNo', 'Name', 'RollNo', 'Varga', 'Level', 'Guardian', 'GuardianPhone', 'AdmissionDate', 'AttendancePct']];
    for (const s of gurukulStudents) {
      const m = metaOf(s.id);
      rows.push([m?.admissionNo || '', s.studentName, s.rollNo, vargaName(m?.vargaId), s.courseLevel, s.guardianName, s.guardianPhone, m?.admissionDate || '', String(attPctOf(s))]);
    }
    downloadCSV(`shishya-${todayISO()}.csv`, rows);
  };
  const importCSV = async (f: File) => {
    const rows = parseCSV(await f.text());
    if (!rows.length) return;
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (n: string) => head.findIndex((h) => h.includes(n));
    let added = 0;
    for (const r of rows.slice(1)) {
      const name = r[idx('name')] || ''; if (!name) continue;
      const rollNo = r[idx('roll')] || `GS-${Date.now().toString().slice(-6)}${added}`;
      if (gurukulStudents.some((s) => s.rollNo === rollNo)) continue;
      const lvlRaw = r[idx('level')] || '';
      const courseLevel = LEVELS.find((l) => l.toLowerCase().includes(lvlRaw.toLowerCase())) || LEVELS[0];
      addGurukulStudent({ workspaceId: activeWorkspace.id, studentName: name, rollNo, courseLevel, sandhyaVandanaRegularity: 0, shlokaRecitationScore: 0, guardianName: r[idx('guardian')] || '', guardianPhone: '', attendancePct: Number(r[idx('attendance')]) || 0 });
      added++;
    }
    alert(`${toBnDigits(added)} জন শিষ্য যোগ হয়েছে`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><Bn bn="শিষ্য ব্যবস্থাপনা" en="Shishya management" /></h2>
        <div className="flex gap-2 no-print">
          <Btn variant="ghost" onClick={() => setView('list')} className={view === 'list' ? '!bg-amber-100' : ''}>তালিকা</Btn>
          <Btn variant="ghost" onClick={() => setView('admission')} className={view === 'admission' ? '!bg-amber-100' : ''}>ভর্তি রেজিস্টার</Btn>
          <Btn variant="ghost" onClick={() => setView('stipend')} className={view === 'stipend' ? '!bg-amber-100' : ''}>উপবৃত্তি</Btn>
        </div>
      </div>

      {view === 'list' && (
        <>
          <Card className="no-print">
            <div className="flex flex-wrap gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="নাম / রোল / ভর্তি নং…" className={`${inputCls} !w-52`} />
              <select value={vargaFilter} onChange={(e) => setVargaFilter(e.target.value)} className={`${inputCls} !w-44`}>
                <option value="">সব বর্গ</option>
                {state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <Btn onClick={() => { setEditing(null); setForm({ studentName: '', rollNo: '', courseLevel: LEVELS[0], guardianName: '', guardianPhone: '', vargaId: '', admissionNo: '', admissionDate: todayISO() }); (document.getElementById('shishya-form-anchor') as HTMLElement)?.scrollIntoView?.(); }}><Plus className="w-4 h-4" /> নতুন ভর্তি</Btn>
              <Btn variant="ghost" onClick={exportCSV}><Download className="w-4 h-4" /> CSV</Btn>
              <Btn variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> ইমপোর্ট</Btn>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCSV(f); e.target.value = ''; }} />
            </div>
          </Card>

          {/* admission / edit form */}
          <Card>
            <span id="shishya-form-anchor" />
            <h3 className="font-bold text-stone-800 mb-3">{editing ? <Bn bn="তথ্য সম্পাদনা" en="Edit shishya" /> : <Bn bn="নতুন ভর্তি" en="New admission" />}</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label={<Bn bn="শিষ্যের নাম" en="Name" />}><input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} className={inputCls} /></Field>
              <Field label={<Bn bn="রোল নং" en="Roll no" />}><input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} className={inputCls} /></Field>
              <Field label={<Bn bn="স্তর" en="Level" />}><select value={form.courseLevel} onChange={(e) => setForm({ ...form, courseLevel: e.target.value as GurukulStudent['courseLevel'] })} className={inputCls}>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_BN[l]} — {l}</option>)}</select></Field>
              <Field label={<Bn bn="বর্গ" en="Varga" />}><select value={form.vargaId} onChange={(e) => setForm({ ...form, vargaId: e.target.value })} className={inputCls}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.sanskrit})</option>)}</select></Field>
              <Field label={<Bn bn="অভিভাবক" en="Guardian" />}><input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className={inputCls} /></Field>
              <Field label={<Bn bn="ফোন" en="Phone" />}><input value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} className={inputCls} /></Field>
              <Field label={<Bn bn="ভর্তি নং" en="Admission no" />}><input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} className={inputCls} /></Field>
              <Field label={<Bn bn="ভর্তির তারিখ" en="Admission date" />}><input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="flex gap-2 mt-3">
              <Btn onClick={saveForm}>{editing ? 'সংরক্ষণ (Save)' : 'ভর্তি করুন (Admit)'}</Btn>
              {editing && <Btn variant="ghost" onClick={() => setEditing(null)}>বাতিল</Btn>}
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-stone-500 border-b">{['শিষ্য', 'বর্গ', 'স্তর', 'অভিভাবক', 'উপস্থিতি', ''].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map((s) => { const m = metaOf(s.id); return (
                    <tr key={s.id} className="border-b border-stone-100">
                      <td className="py-2 pr-3"><div className="font-semibold">{s.studentName}</div><div className="text-xs text-stone-500">{s.rollNo}{m?.admissionNo ? ` • ভর্তি ${m.admissionNo}` : ''}</div></td>
                      <td className="py-2 pr-3">{vargaName(m?.vargaId)}</td>
                      <td className="py-2 pr-3 text-xs">{LEVEL_BN[s.courseLevel]}</td>
                      <td className="py-2 pr-3 text-xs">{s.guardianName}<br /><span className="text-stone-500">{s.guardianPhone}</span></td>
                      <td className="py-2 pr-3 font-bold text-emerald-700">{toBnDigits(attPctOf(s))}%</td>
                      <td className="py-2 flex gap-1">
                        <button onClick={() => openEdit(s)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200" title="Edit" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => promote(s)} className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800" title="Promote to next level" aria-label="Promote"><ArrowUpCircle className="w-4 h-4" /></button>
                      </td>
                    </tr>); })}
                </tbody>
              </table>
              {!filtered.length && <Empty text="কোনো শিষ্য পাওয়া যায়নি" />}
            </div>
          </Card>
        </>
      )}

      {view === 'admission' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800"><Bn bn="ভর্তি রেজিস্টার" en="Admission register" /></h3>
            <Btn variant="ghost" onClick={() => setPrintReg('admission')}><Printer className="w-4 h-4" /> প্রিন্ট</Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-stone-500 border-b">{['ক্রম', 'ভর্তি নং', 'নাম', 'বর্গ', 'ভর্তির তারিখ', 'অভিভাবক'].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
              <tbody>{gurukulStudents.map((s, i) => { const m = metaOf(s.id); return (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{toBnDigits(i + 1)}</td><td className="py-2 pr-3 font-mono">{m?.admissionNo || '—'}</td>
                  <td className="py-2 pr-3 font-semibold">{s.studentName}</td><td className="py-2 pr-3">{vargaName(m?.vargaId)}</td>
                  <td className="py-2 pr-3">{m?.admissionDate ? fmtDateEn(m.admissionDate) : '—'}</td><td className="py-2 pr-3">{s.guardianName}</td>
                </tr>); })}</tbody>
            </table>
          </div>
        </Card>
      )}

      {view === 'stipend' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800"><Bn bn={`উপবৃত্তি রেজিস্টার (≥ ${toBnDigits(stipendCutoff)}% উপস্থিতি)`} en="Stipend register" /></h3>
            <Btn variant="ghost" onClick={() => setPrintReg('stipend')}><Printer className="w-4 h-4" /> প্রিন্ট</Btn>
          </div>
          <p className="text-xs text-stone-500 mb-3">শর্ত: উপস্থিতি {toBnDigits(stipendCutoff)}% বা তার বেশি (Eligibility: attendance ≥ {stipendCutoff}%)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-stone-500 border-b">{['ক্রম', 'নাম', 'বর্গ', 'উপস্থিতি', 'যোগ্যতা'].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
              <tbody>{stipendList.map((x, i) => (
                <tr key={x.s.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{toBnDigits(i + 1)}</td><td className="py-2 pr-3 font-semibold">{x.s.studentName}</td>
                  <td className="py-2 pr-3">{vargaName(metaOf(x.s.id)?.vargaId)}</td><td className="py-2 pr-3 font-bold text-emerald-700">{toBnDigits(x.pct)}%</td>
                  <td className="py-2 pr-3"><span className="bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full px-2 py-0.5">যোগ্য</span></td>
                </tr>))}</tbody>
            </table>
            {!stipendList.length && <Empty text="শর্ত পূরণকারী কোনো শিষ্য নেই" />}
          </div>
        </Card>
      )}

      {/* print areas */}
      {printReg && (
        <Modal title={<Bn bn="প্রিন্ট প্রিভিউ" en="Print preview" />} onClose={() => setPrintReg(null)} wide>
          <div className="print-area rounded-xl border p-4">
            <h2 className="text-center font-extrabold text-lg">॥ {printReg === 'admission' ? 'ভর্তি রেজিস্টার' : 'উপবৃত্তি রেজিস্টার'} ॥</h2>
            <p className="text-center text-sm mb-3">{printReg === 'admission' ? 'Admission Register' : `Stipend Register (≥ ${stipendCutoff}% attendance)`}</p>
            <table>
              <thead><tr>{(printReg === 'admission' ? ['ক্রম', 'ভর্তি নং', 'নাম', 'বর্গ', 'তারিখ', 'অভিভাবক'] : ['ক্রম', 'নাম', 'বর্গ', 'উপস্থিতি %']).map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {printReg === 'admission' ? gurukulStudents.map((s, i) => { const m = metaOf(s.id); return (
                  <tr key={s.id}><td>{i + 1}</td><td>{m?.admissionNo || '—'}</td><td>{s.studentName}</td><td>{vargaName(m?.vargaId)}</td><td>{m?.admissionDate || '—'}</td><td>{s.guardianName}</td></tr>); })
                  : stipendList.map((x, i) => (
                    <tr key={x.s.id}><td>{i + 1}</td><td>{x.s.studentName}</td><td>{vargaName(metaOf(x.s.id)?.vargaId)}</td><td>{x.pct}%</td></tr>))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-3 no-print">
            <Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> প্রিন্ট করুন</Btn>
            <Btn variant="ghost" onClick={() => setPrintReg(null)}>বন্ধ</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
