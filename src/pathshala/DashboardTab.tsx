import React, { useMemo, useRef, useState } from 'react';
import { Users, GraduationCap, Briefcase, School, CalendarDays, Download, Upload, RotateCcw, Plus, X } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, Btn, Empty, useLocaleText } from './ui';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';
import { todayISO, inr, downloadJSON, uid } from './bn';

/* Checklist #1 — dashboard: counts, today's attendance %, today's fees,
   monthly calendar, bhavan list. Checklist #15 — backup/restore (security). */

export const DashboardTab: React.FC = () => {
  const { t } = useLanguage();
  const { digits } = useLocaleText();
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
    if (importJSON(text)) alert(t('suites.pathshala.dashboard.restoreDone'));
    else alert(t('suites.pathshala.dashboard.restoreInvalid'));
  };

  const stats = [
    { icon: Users, k: 'statShishya', v: digits(gurukulStudents.length), c: 'from-amber-500 to-orange-600' },
    { icon: GraduationCap, k: 'statGurus', v: digits(state.gurus.length), c: 'from-orange-600 to-red-700' },
    { icon: Briefcase, k: 'statStaff', v: digits(state.staff.length), c: 'from-yellow-600 to-amber-700' },
    { icon: School, k: 'statVargas', v: digits(state.vargas.length), c: 'from-amber-600 to-yellow-700' },
    { icon: CalendarDays, k: 'statTodayAtt', v: attPct === null ? '—' : `${digits(attPct)}%`, c: 'from-emerald-600 to-teal-700' },
    { icon: Download, k: 'statTodayFees', v: inr(todayFees), c: 'from-indigo-600 to-purple-700' },
  ];

  const dayInitials = [
    t('suites.pathshala.dashboard.dayMon'), t('suites.pathshala.dashboard.dayTue'),
    t('suites.pathshala.dashboard.dayWed'), t('suites.pathshala.dashboard.dayThu'),
    t('suites.pathshala.dashboard.dayFri'), t('suites.pathshala.dashboard.daySat'),
    t('suites.pathshala.dashboard.daySun'),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.pathshala.dashboard.heading')}</h2>
        <LocalOnlyBadge />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.k} className="!p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.c} text-white flex items-center justify-center mb-2`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-extrabold text-stone-800">{s.v}</div>
            <div className="text-xs font-bold">{t(`suites.pathshala.dashboard.${s.k}`)}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly calendar */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800">{t('suites.pathshala.dashboard.calendarTitle')}</h3>
            <div className="flex gap-1">
              <button className="px-2 py-1 rounded-lg bg-stone-100 text-sm" onClick={() => setCalCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))}>‹</button>
              <span className="px-2 py-1 text-sm font-semibold">{digits(calCursor.m + 1)}/{digits(calCursor.y)}</span>
              <button className="px-2 py-1 rounded-lg bg-stone-100 text-sm" onClick={() => setCalCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))}>›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-500 mb-1">
            {dayInitials.map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calCells.map((cell, i) => cell ? (
              <div key={i} className={`aspect-square rounded-lg border text-xs flex flex-col items-center justify-center ${cell.iso === today ? 'border-amber-600 bg-amber-50 font-bold' : 'border-stone-200'}`}>
                <span>{digits(cell.d)}</span>
                <span className="flex gap-0.5 mt-0.5">
                  {marksFor(cell.iso).includes('att') && <i className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={t('suites.pathshala.dashboard.legendPresent')} />}
                  {marksFor(cell.iso).includes('exam') && <i className="w-1.5 h-1.5 rounded-full bg-red-500" title={t('suites.pathshala.dashboard.legendExam')} />}
                  {marksFor(cell.iso).includes('notice') && <i className="w-1.5 h-1.5 rounded-full bg-indigo-500" title={t('suites.pathshala.dashboard.legendNotice')} />}
                </span>
              </div>
            ) : <div key={i} />)}
          </div>
          <div className="flex gap-3 mt-2 text-[11px] text-stone-500">
            <span><i className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />{t('suites.pathshala.dashboard.legendPresent')}</span>
            <span><i className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />{t('suites.pathshala.dashboard.legendExam')}</span>
            <span><i className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1" />{t('suites.pathshala.dashboard.legendNotice')}</span>
          </div>
        </Card>

        {/* Bhavans + backup */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-stone-800 mb-2">{t('suites.pathshala.dashboard.bhavanTitle')}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {state.settings.bhavans.map((b) => (
                <span key={b} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-sm">
                  {b}
                  <button onClick={() => setSettings({ bhavans: state.settings.bhavans.filter((x) => x !== b) })} className="text-stone-400 hover:text-red-600" aria-label={t('suites.pathshala.dashboard.removeBhavan').replace('{name}', b)}><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
              {!state.settings.bhavans.length && <Empty text={t('suites.pathshala.dashboard.noBhavans')} />}
            </div>
            <div className="flex gap-2">
              <input value={bhavanInput} onChange={(e) => setBhavanInput(e.target.value)} placeholder={t('suites.pathshala.dashboard.bhavanPh')} className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm min-h-[40px]" />
              <Btn onClick={() => { if (bhavanInput.trim()) { setSettings({ bhavans: [...state.settings.bhavans, bhavanInput.trim()] }); setBhavanInput(''); } }}><Plus className="w-4 h-4" /> {t('suites.pathshala.dashboard.add')}</Btn>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-stone-800 mb-1">{t('suites.pathshala.dashboard.backupTitle')}</h3>
            <p className="text-xs text-stone-500 mb-3">{t('suites.pathshala.dashboard.backupNote')}</p>
            <div className="flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={() => downloadJSON(`pathshala-backup-${activeWorkspace.id}-${today}.json`, JSON.parse(exportJSON()))}><Download className="w-4 h-4" /> {t('suites.pathshala.dashboard.backup')}</Btn>
              <Btn variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> {t('suites.pathshala.dashboard.restore')}</Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm(t('suites.pathshala.dashboard.eraseConfirm'))) resetAll(); }}><RotateCcw className="w-4 h-4" /> {t('suites.pathshala.dashboard.reset')}</Btn>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
