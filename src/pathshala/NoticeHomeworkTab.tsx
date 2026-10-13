import React, { useMemo, useState } from 'react';
import { Plus, Printer, Megaphone, BookOpen, Trash2 } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { Card, Bn, Btn, Field, inputCls, Empty, Modal } from './ui';
import { todayISO, toBnDigits, uid, fmtDateEn } from './bn';

/* Checklist #10 — নোটিশ বোর্ড: publish, A4 print with institution logo/name.
   Checklist #11 — বাড়ির কাজ: varga/subject-wise, bulk print. */

export const NoticeHomeworkTab: React.FC = () => {
  const { state, add, remove } = usePathshala();
  const { activeWorkspace } = useAuthWorkspace();
  const [mode, setMode] = useState<'notice' | 'homework'>('notice');
  const [nTitle, setNTitle] = useState('');
  const [nBody, setNBody] = useState('');
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const [hw, setHw] = useState({ date: todayISO(), vargaId: '', subjectId: '', text: '' });
  const [hwDate, setHwDate] = useState(todayISO());
  const [printHw, setPrintHw] = useState(false);

  const orgName = activeWorkspace.name || 'পাঠশালা';

  const publish = () => {
    if (!nTitle.trim()) { alert('শিরোনাম দিন'); return; }
    add('suchanas', { id: uid('n'), title: nTitle, body: nBody, date: todayISO(), publishedBy: 'Karyalaya' });
    setNTitle(''); setNBody('');
  };

  const hwSubjects = useMemo(() => state.subjects.filter((s) => !hw.vargaId || s.vargaId === hw.vargaId), [state.subjects, hw.vargaId]);
  const addHw = () => {
    if (!hw.vargaId || !hw.subjectId || !hw.text.trim()) { alert('বর্গ, বিষয় ও বিবরণ দিন'); return; }
    add('homework', { id: uid('hw'), ...hw });
    setHw({ ...hw, subjectId: '', text: '' });
  };
  const hwForDate = useMemo(() => state.homework.filter((h) => h.date === hwDate), [state.homework, hwDate]);
  const hwByVarga = useMemo(() => {
    const g: Record<string, typeof hwForDate> = {};
    for (const h of hwForDate) { (g[h.vargaId] = g[h.vargaId] || []).push(h); }
    return g;
  }, [hwForDate]);
  const subjName = (id: string) => { const s = state.subjects.find((x) => x.id === id); return s ? `${s.nameBn} (${s.name})` : '—'; };
  const vargaName = (id: string) => state.vargas.find((v) => v.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800"><Bn bn="নোটিশ ও বাড়ির কাজ" en="Notice board & homework" /></h2>
        <div className="flex gap-2 no-print">
          <Btn variant="ghost" onClick={() => setMode('notice')} className={mode === 'notice' ? '!bg-amber-100' : ''}><Megaphone className="w-4 h-4" /> নোটিশ</Btn>
          <Btn variant="ghost" onClick={() => setMode('homework')} className={mode === 'homework' ? '!bg-amber-100' : ''}><BookOpen className="w-4 h-4" /> বাড়ির কাজ</Btn>
        </div>
      </div>

      {mode === 'notice' && (
        <>
          <Card>
            <h3 className="font-bold text-stone-800 mb-3"><Bn bn="নতুন নোটিশ" en="Publish notice" /></h3>
            <div className="grid gap-3">
              <Field label={<Bn bn="শিরোনাম" en="Title" />}><input value={nTitle} onChange={(e) => setNTitle(e.target.value)} className={inputCls} placeholder="যেমন: সরস্বতী পূজা" /></Field>
              <Field label={<Bn bn="বিবরণ" en="Body" />}><textarea value={nBody} onChange={(e) => setNBody(e.target.value)} rows={3} className={`${inputCls} !min-h-[90px]`} /></Field>
            </div>
            <Btn onClick={publish} className="mt-3"><Plus className="w-4 h-4" /> প্রকাশ করুন</Btn>
          </Card>
          <div className="grid sm:grid-cols-2 gap-3">
            {[...state.suchanas].reverse().map((n) => (
              <Card key={n.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-bold">{n.title}</div><div className="text-xs text-stone-500 mb-1">{fmtDateEn(n.date)}{n.publishedBy ? ` • ${n.publishedBy}` : ''}</div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{n.body}</p></div>
                  <div className="flex gap-1 no-print shrink-0">
                    <button onClick={() => setPrintNotice(n.id)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200" aria-label="Print"><Printer className="w-4 h-4" /></button>
                    <button onClick={() => { if (window.confirm('মুছবেন?')) remove('suchanas', n.id); }} className="p-2 rounded-lg bg-red-50 text-red-600" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {!state.suchanas.length && <Empty text="কোনো নোটিশ নেই" />}
        </>
      )}

      {mode === 'homework' && (
        <>
          <Card>
            <h3 className="font-bold text-stone-800 mb-3"><Bn bn="বাড়ির কাজ দিন" en="Assign homework" /></h3>
            <div className="grid sm:grid-cols-4 gap-2">
              <Field label={<Bn bn="তারিখ" en="Date" />}><input type="date" value={hw.date} onChange={(e) => setHw({ ...hw, date: e.target.value })} className={inputCls} /></Field>
              <Field label={<Bn bn="বর্গ" en="Varga" />}><select value={hw.vargaId} onChange={(e) => setHw({ ...hw, vargaId: e.target.value, subjectId: '' })} className={inputCls}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
              <Field label={<Bn bn="বিষয়" en="Subject" />}><select value={hw.subjectId} onChange={(e) => setHw({ ...hw, subjectId: e.target.value })} className={inputCls}><option value="">—</option>{hwSubjects.map((s) => <option key={s.id} value={s.id}>{s.nameBn}</option>)}</select></Field>
              <Field label={<Bn bn="বিবরণ" en="Task" />}><input value={hw.text} onChange={(e) => setHw({ ...hw, text: e.target.value })} className={inputCls} placeholder="পৃষ্ঠা ১২, অনুশীলনী ৩" /></Field>
            </div>
            <Btn onClick={addHw} className="mt-3"><Plus className="w-4 h-4" /> যোগ করুন</Btn>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <Field label={<Bn bn="তারিখ" en="Date" />}><input type="date" value={hwDate} onChange={(e) => setHwDate(e.target.value)} className={`${inputCls} !w-44`} /></Field>
              <Btn variant="ghost" onClick={() => setPrintHw(true)}><Printer className="w-4 h-4" /> সব বর্গের প্রিন্ট</Btn>
            </div>
            <div className="space-y-3">
              {Object.entries(hwByVarga).map(([vid, list]) => (
                <div key={vid}>
                  <div className="font-bold text-amber-800 mb-1">{vargaName(vid)}</div>
                  {list.map((h) => (
                    <div key={h.id} className="flex items-start justify-between border-b border-stone-100 py-1.5 text-sm">
                      <div><b>{subjName(h.subjectId)}</b> — {h.text}</div>
                      <button onClick={() => remove('homework', h.id)} className="text-red-400 text-xs no-print">মুছুন</button>
                    </div>
                  ))}
                </div>
              ))}
              {!hwForDate.length && <Empty text="এই তারিখে কোনো বাড়ির কাজ নেই" />}
            </div>
          </Card>
        </>
      )}

      {printNotice && (() => { const n = state.suchanas.find((x) => x.id === printNotice); return n && (
        <Modal title={<Bn bn="নোটিশ প্রিন্ট" en="Print notice" />} onClose={() => setPrintNotice(null)} wide>
          <div className="print-area rounded-xl border p-8 text-center" style={{ minHeight: 400 }}>
            <h2 className="font-extrabold text-2xl">{orgName}</h2>
            <p className="text-sm mb-4">॥ বিজ্ঞপ্তি (Notice) ॥</p>
            <h3 className="font-bold text-xl underline mb-3">{n.title}</h3>
            <p className="text-base whitespace-pre-wrap text-left leading-relaxed">{n.body}</p>
            <p className="text-sm mt-4 text-left">তারিখ: {fmtDateEn(n.date)}</p>
            <div className="flex justify-between mt-16 text-sm">
              <div><div className="border-t border-black pt-1 px-6">তারিখ</div></div>
              <div className="text-center"><div className="border-t border-black pt-1 px-6">আচার্যের স্বাক্ষর</div><div className="text-xs">(সিলমোহর)</div></div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 no-print"><Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> প্রিন্ট</Btn><Btn variant="ghost" onClick={() => setPrintNotice(null)}>বন্ধ</Btn></div>
        </Modal>); })()}

      {printHw && (
        <Modal title={<Bn bn="বাড়ির কাজ — সব বর্গ" en="Homework — all vargas" />} onClose={() => setPrintHw(false)} wide>
          <div className="print-area rounded-xl border p-5">
            <h2 className="text-center font-extrabold text-xl">{orgName}</h2>
            <p className="text-center text-sm mb-3">॥ বাড়ির কাজ — {fmtDateEn(hwDate)} ॥</p>
            {Object.entries(hwByVarga).map(([vid, list]) => (
              <div key={vid} className="mb-3">
                <h3 className="font-bold">{vargaName(vid)}</h3>
                <table><thead><tr><th>বিষয়</th><th>কাজ</th></tr></thead>
                  <tbody>{list.map((h) => <tr key={h.id}><td>{subjName(h.subjectId)}</td><td>{h.text}</td></tr>)}</tbody></table>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3 no-print"><Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> প্রিন্ট</Btn><Btn variant="ghost" onClick={() => setPrintHw(false)}>বন্ধ</Btn></div>
        </Modal>
      )}
    </div>
  );
};
