import React, { useMemo, useState } from 'react';
import { Check, X, CalendarOff, Printer } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { Card, Bn, Btn, Field, inputCls, Empty, Modal } from './ui';
import { todayISO, toBnDigits, uid, fmtDateEn } from './bn';
import { UpasthitiStatus, LeaveType } from './types';

/* Checklist #3 — উপস্থিতি: shishya daily/monthly/term/annual reports;
   guru/staff daily/monthly/annual with leave types (chhuti/noimittik/chikitsa). */

const LEAVE_BN: Record<LeaveType, string> = { chhuti: 'ছুটি (earned)', noimittik: 'নৈমিত্তিক (casual)', chikitsa: 'চিকিৎসা (medical)' };

export const UpasthitiTab: React.FC = () => {
  const { state, add, update } = usePathshala();
  const { gurukulStudents } = useData();
  const [mode, setMode] = useState<'shishya' | 'staff'>('shishya');
  const [date, setDate] = useState(todayISO());
  const [vargaId, setVargaId] = useState('');
  const [report, setReport] = useState<'daily' | 'monthly' | 'term' | 'annual'>('daily');
  const [repMonth, setRepMonth] = useState(() => todayISO().slice(0, 7));
  const [printMonthly, setPrintMonthly] = useState(false);

  const vargaOf = (sid: string) => state.shishyaMeta.find((m) => m.studentId === sid)?.vargaId || '';
  const activeVarga = vargaId || state.vargas[0]?.id || '';
  const vargaShishya = useMemo(
    () => gurukulStudents.filter((s) => !activeVarga || vargaOf(s.id) === activeVarga || (!vargaOf(s.id) && !vargaId)),
    [gurukulStudents, activeVarga, vargaId, state.shishyaMeta],
  );
  const recOf = (sid: string) => state.upasthiti.find((u) => u.date === date && u.studentId === sid);

  const setStatus = (sid: string, status: UpasthitiStatus) => {
    const ex = recOf(sid);
    if (ex) update('upasthiti', ex.id, { status });
    else add('upasthiti', { id: uid('att'), date, vargaId: activeVarga, studentId: sid, status });
  };
  const markAll = (status: UpasthitiStatus) => vargaShishya.forEach((s) => setStatus(s.id, status));

  /* staff attendance */
  const people = useMemo(() => [
    ...state.gurus.map((g) => ({ id: g.id, name: g.name, kind: 'guru' as const, sub: g.designation })),
    ...state.staff.map((s) => ({ id: s.id, name: s.name, kind: 'staff' as const, sub: s.role })),
  ], [state.gurus, state.staff]);
  const srecOf = (pid: string) => state.staffUpasthiti.find((r) => r.date === date && r.personId === pid);
  const setStaff = (pid: string, kind: 'guru' | 'staff', status: 'present' | 'absent' | 'leave', leaveType?: LeaveType) => {
    const ex = srecOf(pid);
    if (ex) update('staffUpasthiti', ex.id, { status, leaveType });
    else add('staffUpasthiti', { id: uid('satt'), date, personId: pid, personKind: kind, status, leaveType });
  };

  /* monthly matrix for shishya */
  const monthDays = useMemo(() => {
    const [y, m] = repMonth.split('-').map(Number);
    const n = new Date(y, m, 0).getDate();
    return Array.from({ length: n }, (_, i) => `${repMonth}-${String(i + 1).padStart(2, '0')}`);
  }, [repMonth]);

  const statusMark = (st?: UpasthitiStatus) =>
    st === 'present' ? <span className="text-emerald-600 font-bold">P</span>
    : st === 'absent' ? <span className="text-red-600 font-bold">A</span>
    : st === 'leave' ? <span className="text-amber-600 font-bold">L</span>
    : <span className="text-stone-300">–</span>;

  const pct = (present: number, total: number) => (total ? Math.round((present / total) * 100) : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><Bn bn="উপস্থিতি" en="Upasthiti — attendance" /></h2>
        <div className="flex gap-2 no-print">
          <Btn variant="ghost" onClick={() => setMode('shishya')} className={mode === 'shishya' ? '!bg-amber-100' : ''}>শিষ্য</Btn>
          <Btn variant="ghost" onClick={() => setMode('staff')} className={mode === 'staff' ? '!bg-amber-100' : ''}>গুরু ও কর্মচারী</Btn>
        </div>
      </div>

      {mode === 'shishya' && (
        <>
          <Card className="no-print">
            <div className="flex flex-wrap gap-2 items-end">
              <Field label={<Bn bn="তারিখ" en="Date" />}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
              <Field label={<Bn bn="বর্গ" en="Varga" />}>
                <select value={vargaId} onChange={(e) => setVargaId(e.target.value)} className={inputCls}>
                  <option value="">সব বর্গ</option>
                  {state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.sanskrit})</option>)}
                </select>
              </Field>
              <Btn variant="ghost" onClick={() => markAll('present')}><Check className="w-4 h-4" /> সবাই উপস্থিত</Btn>
              <div className="flex gap-1 ml-auto">
                {(['daily', 'monthly', 'term', 'annual'] as const).map((r) => (
                  <button key={r} onClick={() => setReport(r)} className={`px-3 py-2 rounded-xl text-xs font-bold border min-h-[40px] ${report === r ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-200'}`}>
                    {r === 'daily' ? 'দৈনিক' : r === 'monthly' ? 'মাসিক' : r === 'term' ? 'প্রান্তিক' : 'বাৎসরিক'}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {report === 'daily' && (
            <Card>
              <div className="space-y-2">
                {vargaShishya.map((s) => {
                  const st = recOf(s.id)?.status || 'present';
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2 border-b border-stone-100 py-2">
                      <div><div className="font-semibold text-sm">{s.studentName}</div><div className="text-xs text-stone-500">{s.rollNo}</div></div>
                      <div className="flex gap-1">
                        {(['present', 'absent', 'leave'] as UpasthitiStatus[]).map((k) => (
                          <button key={k} onClick={() => setStatus(s.id, k)}
                            className={`w-11 h-11 rounded-xl font-bold text-sm border ${st === k ? (k === 'present' ? 'bg-emerald-600 text-white border-emerald-600' : k === 'absent' ? 'bg-red-600 text-white border-red-600' : 'bg-amber-500 text-white border-amber-500') : 'bg-white text-stone-500 border-stone-200'}`}
                            title={k}>{k === 'present' ? <Check className="w-5 h-5 mx-auto" /> : k === 'absent' ? <X className="w-5 h-5 mx-auto" /> : <CalendarOff className="w-5 h-5 mx-auto" />}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {!vargaShishya.length && <Empty text="এই বর্গে কোনো শিষ্য নেই" />}
              </div>
            </Card>
          )}

          {report === 'monthly' && (
            <Card>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <Field label={<Bn bn="মাস" en="Month" />}><input type="month" value={repMonth} onChange={(e) => setRepMonth(e.target.value)} className={inputCls} /></Field>
                <Btn variant="ghost" onClick={() => setPrintMonthly(true)}><Printer className="w-4 h-4" /> প্রিন্ট</Btn>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead><tr><th className="sticky left-0 bg-white border p-1 text-left min-w-[120px]">শিষ্য</th>
                    {monthDays.map((d) => <th key={d} className="border p-1 w-7">{toBnDigits(Number(d.slice(8)))}</th>)}
                    <th className="border p-1">%</th></tr></thead>
                  <tbody>
                    {vargaShishya.map((s) => {
                      const recs = monthDays.map((d) => state.upasthiti.find((u) => u.studentId === s.id && u.date === d)?.status);
                      const valid = recs.filter((r) => r && r !== 'holiday');
                      const pres = valid.filter((r) => r === 'present').length;
                      return (
                        <tr key={s.id}>
                          <td className="sticky left-0 bg-white border p-1 font-semibold whitespace-nowrap">{s.studentName}</td>
                          {recs.map((r, i) => <td key={i} className="border p-1 text-center">{statusMark(r)}</td>)}
                          <td className="border p-1 text-center font-bold text-emerald-700">{toBnDigits(pct(pres, valid.length))}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {(report === 'term' || report === 'annual') && (
            <Card>
              <h3 className="font-bold text-stone-800 mb-3">{report === 'term' ? <Bn bn="প্রান্তিক সারসংক্ষেপ" en="Term summary" /> : <Bn bn="বাৎসরিক সারসংক্ষেপ" en="Annual summary" />}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-stone-500 border-b">{['শিষ্য', 'মোট দিন', 'উপস্থিত', 'অনুপস্থিত', 'ছুটি', '%'].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
                  <tbody>
                    {vargaShishya.map((s) => {
                      const recs = state.upasthiti.filter((u) => u.studentId === s.id && u.status !== 'holiday' && (report === 'annual' || u.date.startsWith(repMonth.slice(0, 4))));
                      const p = recs.filter((u) => u.status === 'present').length;
                      const a = recs.filter((u) => u.status === 'absent').length;
                      const l = recs.filter((u) => u.status === 'leave').length;
                      return (
                        <tr key={s.id} className="border-b border-stone-100">
                          <td className="py-2 pr-3 font-semibold">{s.studentName}</td>
                          <td className="py-2 pr-3">{toBnDigits(recs.length)}</td>
                          <td className="py-2 pr-3 text-emerald-700 font-bold">{toBnDigits(p)}</td>
                          <td className="py-2 pr-3 text-red-600">{toBnDigits(a)}</td>
                          <td className="py-2 pr-3 text-amber-600">{toBnDigits(l)}</td>
                          <td className="py-2 pr-3 font-bold">{toBnDigits(pct(p, recs.length))}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {mode === 'staff' && (
        <Card>
          <div className="flex flex-wrap gap-2 items-end mb-4 no-print">
            <Field label={<Bn bn="তারিখ" en="Date" />}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="space-y-2">
            {people.map((p) => {
              const r = srecOf(p.id);
              const st = r?.status || 'present';
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 border-b border-stone-100 py-2 flex-wrap">
                  <div><div className="font-semibold text-sm">{p.name}</div><div className="text-xs text-stone-500">{p.kind === 'guru' ? 'গুরু' : 'কর্মচারী'} • {p.sub}</div></div>
                  <div className="flex gap-1 items-center">
                    {(['present', 'absent', 'leave'] as const).map((k) => (
                      <button key={k} onClick={() => setStaff(p.id, p.kind, k, k === 'leave' ? (r?.leaveType || 'noimittik') : undefined)}
                        className={`px-3 h-10 rounded-xl text-xs font-bold border ${st === k ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-500 border-stone-200'}`}>
                        {k === 'present' ? 'উপস্থিত' : k === 'absent' ? 'অনুপস্থিত' : 'ছুটি'}
                      </button>
                    ))}
                    {st === 'leave' && (
                      <select value={r?.leaveType || 'noimittik'} onChange={(e) => setStaff(p.id, p.kind, 'leave', e.target.value as LeaveType)} className={`${inputCls} !w-40`}>
                        {(Object.keys(LEAVE_BN) as LeaveType[]).map((lt) => <option key={lt} value={lt}>{LEAVE_BN[lt]}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
            {!people.length && <Empty text="কোনো গুরু/কর্মচারী নেই — বর্গ ট্যাবে যোগ করুন" />}
          </div>
          <h4 className="font-bold text-stone-700 mt-6 mb-2"><Bn bn="মাসিক সারসংক্ষেপ" en="Monthly summary" /></h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-stone-500 border-b">{['নাম', 'উপস্থিত', 'অনুপস্থিত', 'ছুটি', 'ছুটির ধরন'].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
              <tbody>
                {people.map((p) => {
                  const recs = state.staffUpasthiti.filter((r) => r.personId === p.id && r.date.startsWith(repMonth));
                  const leaves = recs.filter((r) => r.status === 'leave');
                  return (
                    <tr key={p.id} className="border-b border-stone-100">
                      <td className="py-2 pr-3 font-semibold">{p.name}</td>
                      <td className="py-2 pr-3 text-emerald-700 font-bold">{toBnDigits(recs.filter((r) => r.status === 'present').length)}</td>
                      <td className="py-2 pr-3 text-red-600">{toBnDigits(recs.filter((r) => r.status === 'absent').length)}</td>
                      <td className="py-2 pr-3 text-amber-600">{toBnDigits(leaves.length)}</td>
                      <td className="py-2 pr-3 text-xs">{[...new Set(leaves.map((l) => l.leaveType).filter(Boolean))].map((lt) => LEAVE_BN[lt as LeaveType]).join(', ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {printMonthly && (
        <Modal title={<Bn bn="মাসিক হাজিরা" en="Monthly attendance" />} onClose={() => setPrintMonthly(false)} wide>
          <div className="print-area rounded-xl border p-4 overflow-x-auto">
            <h2 className="text-center font-extrabold text-lg">॥ মাসিক উপস্থিতি — {repMonth} ॥</h2>
            <table className="mt-2 text-xs">
              <thead><tr><th>শিষ্য</th>{monthDays.map((d) => <th key={d}>{d.slice(8)}</th>)}<th>%</th></tr></thead>
              <tbody>
                {vargaShishya.map((s) => {
                  const recs = monthDays.map((d) => state.upasthiti.find((u) => u.studentId === s.id && u.date === d)?.status);
                  const valid = recs.filter((r) => r && r !== 'holiday');
                  const pres = valid.filter((r) => r === 'present').length;
                  return (<tr key={s.id}><td>{s.studentName}</td>{recs.map((r, i) => <td key={i}>{r === 'present' ? 'P' : r === 'absent' ? 'A' : r === 'leave' ? 'L' : '–'}</td>)}<td>{pct(pres, valid.length)}%</td></tr>);
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-3 no-print">
            <Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> প্রিন্ট</Btn>
            <Btn variant="ghost" onClick={() => setPrintMonthly(false)}>বন্ধ</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
