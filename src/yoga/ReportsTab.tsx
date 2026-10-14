import React, { useState } from 'react';
import { useYoga, monthISO, batchStudents, feesOverdue, attendancePct } from './yogaStore';
import { T, Card, Btn, Field, inputCls, inr, fmtDate, fmtPeriod } from './ui';
import { useToast } from '../context/ToastContext';

/* Yoga One — reports: printable registers, CSV exports, backup/restore. */

const csv = (rows: string[][]) =>
  rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

const download = (name: string, text: string, type = 'text/csv') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

export const ReportsTab: React.FC = () => {
  const { state, exportJSON, importJSON, resetAll } = useYoga();
  const { showToast } = useToast();
  const [period, setPeriod] = useState(monthISO());
  const [restoring, setRestoring] = useState(false);
  const [restoreText, setRestoreText] = useState('');

  const doPrint = () => setTimeout(() => window.print(), 150);

  const exportStudents = () => {
    const rows = [['Name', 'Phone', 'Batch', 'Join date', 'Fee cycle', 'Status', 'Attendance %']];
    for (const s of state.students) {
      const b = state.batches.find((x) => x.id === s.batchId);
      const pct = attendancePct(state, s.id, s.batchId);
      rows.push([s.name, s.phone || '', b?.name || '', s.joinDate, s.feeCycle, s.status, pct === null ? '—' : `${pct}%`]);
    }
    download(`yoga-students-${period}.csv`, csv(rows));
    showToast('Students CSV exported.', 'success');
  };

  const exportFees = () => {
    const rows = [['Receipt', 'Date', 'Student', 'Batch', 'Period', 'Amount', 'Mode', 'Treasury']];
    for (const f of state.fees.filter((x) => x.period === period)) {
      const s = state.students.find((x) => x.id === f.studentId);
      const b = state.batches.find((x) => x.id === f.batchId);
      rows.push([f.receiptNo, f.paidDate, s?.name || '', b?.name || '', f.period, String(f.amount), f.paymentMode, f.treasuryTxId ? 'posted' : 'pending']);
    }
    download(`yoga-fees-${period}.csv`, csv(rows));
    showToast('Fees CSV exported.', 'success');
  };

  const exportAttendance = () => {
    const rows = [['Date', 'Batch', 'Student', 'Present']];
    const sorted = [...state.attendance].sort((a, b) => a.date.localeCompare(b.date));
    for (const r of sorted) {
      const s = state.students.find((x) => x.id === r.studentId);
      const b = state.batches.find((x) => x.id === r.batchId);
      rows.push([r.date, b?.name || '', s?.name || '', r.present ? 'yes' : 'no']);
    }
    download('yoga-attendance.csv', csv(rows));
    showToast('Attendance CSV exported.', 'success');
  };

  const doRestore = () => {
    if (importJSON(restoreText)) { showToast('Backup restored.', 'success'); setRestoring(false); setRestoreText(''); }
    else showToast('Invalid backup file — nothing changed.', 'error');
  };

  const overdue = feesOverdue(state, period);

  return (
    <div className="space-y-4 print-area">
      <div className="flex items-center justify-between flex-wrap gap-2 no-print">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Reports" bn="প্রতিবেদন" hi="रिपोर्ट" /></h2>
        <Field label={<T en="Period" bn="সময়কাল" hi="अवधि" />}>
          <input type="month" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
      </div>

      <Card className="print-report">
        <h3 className="font-extrabold text-stone-800 text-lg">🧘 Yoga One — <T en="Shala report" bn="শালা প্রতিবেদন" hi="शाला रिपोर्ट" /></h3>
        <p className="text-xs text-stone-500">{fmtPeriod(period)} · <T en="generated" bn="তৈরি" hi="निर्मित" /> {fmtDate(new Date().toISOString().slice(0, 10))}</p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-stone-50 border p-3"><div className="text-xl font-extrabold">{state.batches.filter((b) => b.active).length}</div><div className="text-xs text-stone-500"><T en="batches" bn="ব্যাচ" hi="बैच" /></div></div>
          <div className="rounded-xl bg-stone-50 border p-3"><div className="text-xl font-extrabold">{state.students.filter((s) => s.status === 'active').length}</div><div className="text-xs text-stone-500"><T en="students" bn="শিক্ষার্থী" hi="छात्र" /></div></div>
          <div className="rounded-xl bg-stone-50 border p-3"><div className="text-xl font-extrabold">{state.instructors.filter((i) => i.active).length}</div><div className="text-xs text-stone-500"><T en="instructors" bn="প্রশিক্ষক" hi="प्रशिक्षक" /></div></div>
          <div className="rounded-xl bg-stone-50 border p-3"><div className="text-xl font-extrabold text-red-700">{overdue.length}</div><div className="text-xs text-stone-500"><T en="fees overdue" bn="ফি বকেয়া" hi="शुल्क बकाया" /></div></div>
        </div>
        <div className="mt-3">
          <h4 className="font-bold text-stone-700 text-sm mb-1"><T en="Batch register" bn="ব্যাচ রেজিস্টার" hi="बैच रजिस्टर" /></h4>
          {state.batches.map((b) => {
            const n = batchStudents(state, b.id).length;
            return (
              <div key={b.id} className="flex justify-between text-sm py-1 border-b border-stone-100 last:border-0">
                <span className="font-semibold">{b.name} <span className="text-stone-400 font-normal">· {b.level}</span></span>
                <span>{n}/{b.capacity} · {inr(b.feeMonthly)}/mo</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 no-print">
        <Btn variant="ghost" onClick={doPrint}>🖨️ <T en="Print report" bn="প্রতিবেদন প্রিন্ট" hi="रिपोर्ट प्रिंट करें" /></Btn>
        <Btn variant="ghost" onClick={exportStudents}>📥 <T en="Students CSV" bn="শিক্ষার্থী CSV" hi="छात्र CSV" /></Btn>
        <Btn variant="ghost" onClick={exportFees}>📥 <T en="Fees CSV" bn="ফি CSV" hi="शुल्क CSV" /></Btn>
        <Btn variant="ghost" onClick={exportAttendance}>📥 <T en="Attendance CSV" bn="উপস্থিতি CSV" hi="उपस्थिति CSV" /></Btn>
      </div>

      <Card>
        <h3 className="font-extrabold text-stone-800 mb-2"><T en="Backup & restore" bn="ব্যাকআপ ও পুনরুদ্ধার" hi="बैकअप व पुनर्स्थापना" /></h3>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => { download(`yoga-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(), 'application/json'); showToast('Backup downloaded.', 'success'); }}>
            💾 <T en="Download backup" bn="ব্যাকআপ ডাউনলোড" hi="बैकअप डाउनलोड करें" />
          </Btn>
          <Btn variant="ghost" onClick={() => setRestoring(true)}><T en="Restore…" bn="পুনরুদ্ধার…" hi="पुनर्स्थापित करें…" /></Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm('Reset all Yoga One data to the example seed?')) { resetAll(); showToast('Reset to seed.', 'success'); } }}>
            <T en="Reset" bn="রিসেট" hi="रीसेट" />
          </Btn>
        </div>
        {restoring && (
          <div className="mt-3">
            <textarea className={inputCls} rows={5} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} placeholder="Paste backup JSON…" />
            <div className="flex gap-2 mt-2">
              <Btn onClick={doRestore}><T en="Restore now" bn="এখনই পুনরুদ্ধার" hi="अभी पुनर्स्थापित करें" /></Btn>
              <Btn variant="ghost" onClick={() => { setRestoring(false); setRestoreText(''); }}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
            </div>
          </div>
        )}
        <p className="text-[11px] text-stone-400 mt-3">🔒 <T en="Backups stay on your device — nothing is uploaded anywhere." bn="ব্যাকআপ আপনার ডিভাইসেই থাকে।" hi="बैकअप आपके डिवाइस पर ही रहता है।" /></p>
      </Card>
    </div>
  );
};
