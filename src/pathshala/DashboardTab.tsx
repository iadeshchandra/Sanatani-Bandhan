import React, { useMemo, useRef, useState } from 'react';
import { Users, GraduationCap, Briefcase, School, CalendarDays, Download, Upload, RotateCcw, Plus, X } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { Card, T, Btn, Empty, useLocaleText } from './ui';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';
import { todayISO, inr, downloadJSON, uid } from './bn';

/* Checklist #1 — ড্যাশবোর্ড: counts, today's attendance %, today's fees,
   monthly calendar, bhavan list. Checklist #15 — backup/restore (security). */

export const DashboardTab: React.FC = () => {
  const { digits, lang, tr } = useLocaleText();
  const { state, setSettings, exportJSON, importJSON, resetAll } = usePathshala();
  const { gurukulStudents } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [bhavanInput, setBhavanInput] = useState('');
  const [calCursor, setCalCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const fileRef = useRef<HTMLInputElement>(null);

  const today = todayISO();
  const todayAtt = useMemo(() => state.upasthiti.filter((u) => u.date === today), [state.upasthiti, today]);
  const attPct = todayAtt.length
    ? Math.round((todayAtt.filter((u) => u.status === 'present').length / todayAtt.length) * 100)
    : null;
  const todayFees = useMemo(
    () => state.receipts.filter((r) => r.date === today).reduce((s, r) => s + r.total, 0),
    [state.receipts, today],
  );

  const calCells = useMemo(() => {
    const { y, m } = calCursor;
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday-first
    const days = new Date(y, m + 1, 0).getDate();
    const cells: Array<{ d: number; iso: string } | null> = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) {
      cells.push({ d, iso: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    return cells;
  }, [calCursor]);

  const marksFor = (iso: string) => {
    const m: string[] = [];
    if (state.upasthiti.some((u) => u.date === iso)) m.push('att');
    if (state.parikshas.some((p) => p.startDate === iso)) m.push('exam');
    if (state.suchanas.some((n) => n.date === iso)) m.push('notice');
    return m;
  };

  const doImport = async (f: File) => {
    const text = await f.text();
    if (importJSON(text)) alert(tr('pathshala.dashboard.restore_done', 'Restore complete', 'পুনরুদ্ধার সম্পন্ন (Restore complete)'));
    else alert(tr('pathshala.dashboard.restore_invalid', 'Invalid backup file', 'ফাইলটি সঠিক নয় (Invalid backup file)'));
  };

  const stats = [
    { icon: Users, bn: 'শিষ্য', en: 'Shishya', v: digits(gurukulStudents.length), c: 'from-amber-500 to-orange-600' },
    { icon: GraduationCap, bn: 'গুরু', en: 'Gurus', v: digits(state.gurus.length), c: 'from-orange-600 to-red-700' },
    { icon: Briefcase, bn: 'কর্মচারী', en: 'Staff', v: digits(state.staff.length), c: 'from-yellow-600 to-amber-700' },
    { icon: School, bn: 'বর্গ', en: 'Vargas', v: digits(state.vargas.length), c: 'from-amber-600 to-yellow-700' },
    { icon: CalendarDays, bn: 'আজকের উপস্থিতি', en: "Today's attendance", v: attPct === null ? '—' : `${digits(attPct)}%`, c: 'from-emerald-600 to-teal-700' },
    { icon: Download, bn: 'আজকের ফি আদায়', en: "Today's fee collection", v: inr(todayFees), c: 'from-indigo-600 to-purple-700' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><T bn="ড্যাশবোর্ড" en="Dashboard" /></h2>
        <LocalOnlyBadge />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.en} className="!p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.c} text-white flex items-center justify-center mb-2`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-extrabold text-stone-800">{s.v}</div>
            <div className="text-xs"><T bn={s.bn} en={s.en} /></div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly calendar */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800"><T bn="মাসিক ক্যালেন্ডার" en="Monthly calendar" /></h3>
            <div className="flex gap-1">
              <button className="px-2 py-1 rounded-lg bg-stone-100 text-sm" onClick={() => setCalCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))}>‹</button>
              <span className="px-2 py-1 text-sm font-semibold">{digits(calCursor.m + 1)}/{digits(calCursor.y)}</span>
              <button className="px-2 py-1 rounded-lg bg-stone-100 text-sm" onClick={() => setCalCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))}>›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-500 mb-1">
            {(lang === 'bn' ? ['সো', 'ম', 'বু', 'বৃ', 'শু', 'শ', 'র'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calCells.map((cell, i) => cell ? (
              <div key={i} className={`aspect-square rounded-lg border text-xs flex flex-col items-center justify-center ${cell.iso === today ? 'border-amber-600 bg-amber-50 font-bold' : 'border-stone-200'}`}>
                <span>{digits(cell.d)}</span>
                <span className="flex gap-0.5 mt-0.5">
                  {marksFor(cell.iso).includes('att') && <i className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Attendance" />}
                  {marksFor(cell.iso).includes('exam') && <i className="w-1.5 h-1.5 rounded-full bg-red-500" title="Exam" />}
                  {marksFor(cell.iso).includes('notice') && <i className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Notice" />}
                </span>
              </div>
            ) : <div key={i} />)}
          </div>
          <div className="flex gap-3 mt-2 text-[11px] text-stone-500">
            <span><i className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />{tr('pathshala.dashboard.present_legend', 'Present', 'উপস্থিতি', 'उपस्थिति')}</span>
            <span><i className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />{tr('pathshala.dashboard.exam', 'Exam', 'পরীক্ষা', 'परीक्षा')}</span>
            <span><i className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1" />{tr('pathshala.dashboard.notice2', 'Notice', 'নোটিশ', 'सूचना')}</span>
          </div>
        </Card>

        {/* Bhavans + backup */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-stone-800 mb-2"><T bn="ভবন" en="Campus buildings" /></h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {state.settings.bhavans.map((b) => (
                <span key={b} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-sm">
                  {b}
                  <button onClick={() => setSettings({ bhavans: state.settings.bhavans.filter((x) => x !== b) })} className="text-stone-400 hover:text-red-600" aria-label={`Remove ${b}`}><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
              {!state.settings.bhavans.length && <Empty text={tr('pathshala.dashboard.no_bhavans', 'No buildings added', 'কোনো ভবন যোগ করা হয়নি', 'कोई भवन नहीं जोड़ा गया')} />}
            </div>
            <div className="flex gap-2">
              <input value={bhavanInput} onChange={(e) => setBhavanInput(e.target.value)} placeholder={tr('pathshala.dashboard.bhavan_ph', 'Building name…', 'ভবনের নাম…', 'भवन का नाम…')} className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm min-h-[40px]" />
              <Btn onClick={() => { if (bhavanInput.trim()) { setSettings({ bhavans: [...state.settings.bhavans, bhavanInput.trim()] }); setBhavanInput(''); } }}><Plus className="w-4 h-4" /> {tr('pathshala.dashboard.add', 'Add', 'যোগ', 'जोड़ें')}</Btn>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-stone-800 mb-1"><T bn="নিরাপত্তা — ব্যাকআপ" en="Security — backup & restore" /></h3>
            <p className="text-xs text-stone-500 mb-3">{tr('pathshala.dashboard.backup_note', 'All Pathshala data is secured on this device. One-click backup.', 'সমস্ত পাঠশালা তথ্য এই ডিভাইসে সুরক্ষিত। এক ক্লিকে ব্যাকআপ নিন।')}</p>
            <div className="flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={() => downloadJSON(`pathshala-backup-${activeWorkspace.id}-${today}.json`, JSON.parse(exportJSON()))}><Download className="w-4 h-4" /> {tr('pathshala.dashboard.backup', 'Backup', 'ব্যাকআপ', 'बैकअप')}</Btn>
              <Btn variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> {tr('pathshala.dashboard.restore', 'Restore', 'পুনরুদ্ধার', 'पुनर्स्थापित करें')}</Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm(tr('pathshala.dashboard.erase_confirm', 'Erase ALL Pathshala data? This cannot be undone.', 'সমস্ত তথ্য মুছে যাবে। নিশ্চিত? (Erase ALL Pathshala data?)'))) resetAll(); }}><RotateCcw className="w-4 h-4" /> {tr('pathshala.dashboard.reset', 'Reset', 'রিসেট', 'रीसेट')}</Btn>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
