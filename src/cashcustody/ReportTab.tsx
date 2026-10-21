import React, { useRef, useState } from 'react';
import { useCashCustody, todayISO } from './cashCustodyStore';
import { DENOMINATIONS, DENOM_LABEL } from './types';
import { T, Card, Btn, Field, inputCls, fmtDateTime } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* ------------------------------------------------------------------ */
/* Reports — printable daily collection report, CSV export, and local  */
/* backup/restore. Restoring refuses a file whose hash chain is        */
/* broken, so a tampered backup can never silently replace the log.    */
/* ------------------------------------------------------------------ */

export const ReportTab: React.FC = () => {
  const inr = useInr();
  const { state, exportJSON, importJSON, resetAll } = useCashCustody();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [printing, setPrinting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const daySessions = state.sessions.filter(
    (s) => s.status === 'closed' && s.closedAt && new Date(s.closedAt).toISOString().slice(0, 10) === date
  );
  const dayTotal = daySessions.reduce((a, s) => a + s.total, 0);

  const printReport = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 150);
  };

  const exportCSV = () => {
    const rows = [
      ['date', 'box_code', 'box_name', 'session_id', 'counted_by', 'verified_by', 'total_inr', 'closed_at', 'deposit_slip', 'treasury_posted'],
      ...state.sessions.filter((s) => s.status === 'closed').map((s) => {
        const box = state.boxes.find((b) => b.id === s.boxId);
        const slip = state.deposits.find((d) => d.id === s.depositId);
        return [
          s.closedAt ? new Date(s.closedAt).toISOString().slice(0, 10) : '',
          box?.boxCode || '', `"${(box?.name || '').replace(/"/g, '""')}"`, s.id,
          `"${s.makerName.replace(/"/g, '""')}"`, `"${(s.checkerName || '').replace(/"/g, '""')}"`,
          String(s.total),
          s.closedAt ? new Date(s.closedAt).toISOString() : '',
          slip?.slipNo || '', s.treasuryTxId ? 'yes' : 'no',
        ];
      }),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cash-custody-${activeWorkspace.id}-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('CSV exported.', 'success');
  };

  const backup = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cash-custody-backup-${activeWorkspace.id}-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Backup downloaded.', 'success');
  };

  const restore = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJSON(String(reader.result || ''));
      showToast(
        ok ? 'Backup restored — chain verified intact.' : 'Restore refused: file is corrupt or its hash chain is broken.',
        ok ? 'success' : 'error'
      );
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 no-print">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Reports & backup" bn="প্রতিবেদন" hi="रिपोर्ट" /></h2>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={exportCSV}>📊 <T en="Export CSV" bn="CSV" hi="CSV" /></Btn>
          <Btn variant="ghost" onClick={backup}>💾 <T en="Backup" bn="ব্যাকআপ" hi="बैकअप" /></Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>📥 <T en="Restore" bn="পুনরুদ্ধার" hi="पुनर्स्थापित करें" /></Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
          <Btn variant="danger" onClick={() => { if (window.confirm('Reset all cash-custody data on this device?')) resetAll(); }}>
            <T en="Reset" bn="রিসেট" hi="रीसेट" />
          </Btn>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3 no-print">
          <Field label={<T en="Report date" bn="তারিখ" hi="तिथि" />}>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
          </Field>
          <Btn onClick={printReport}>🖨️ <T en="Print daily report" bn="দৈনিক প্রতিবেদন প্রিন্ট" hi="दैनिक रिपोर्ट प्रिंट करें" /></Btn>
        </div>

        <div className={printing ? 'print-report' : ''}>
          <div className="text-center mb-4">
            <div className="font-extrabold text-lg text-stone-800">🛕 {activeWorkspace.name}</div>
            <div className="text-sm text-stone-500"><T en="Daily cash collection report" bn="দৈনিক নগদ সংগ্রহ প্রতিবেদন" hi="दैनिक नकद संग्रह रिपोर्ट" /> — {date}</div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500 uppercase border-b border-stone-200">
                <th className="py-2 pr-2"><T en="Box" bn="বাক্স" hi="पेटी" /></th>
                <th className="py-2 pr-2"><T en="Counted by" bn="গণনাকারী" hi="गणनाकर्ता" /></th>
                <th className="py-2 pr-2"><T en="Verified by" bn="যাচাইকারী" hi="सत्यापनकर्ता" /></th>
                <th className="py-2 pr-2"><T en="Denominations" bn="মূল্যমান" hi="मूल्यवर्ग" /></th>
                <th className="py-2 text-right"><T en="Total" bn="মোট" hi="कुल" /></th>
              </tr>
            </thead>
            <tbody>
              {daySessions.map((s) => {
                const box = state.boxes.find((b) => b.id === s.boxId);
                return (
                  <tr key={s.id} className="border-b border-stone-100">
                    <td className="py-2 pr-2 font-bold">{box?.boxCode}<div className="text-[11px] font-normal text-stone-400">{fmtDateTime(s.closedAt || s.createdAt)}</div></td>
                    <td className="py-2 pr-2">{s.makerName}</td>
                    <td className="py-2 pr-2">{s.checkerName}</td>
                    <td className="py-2 pr-2 text-xs text-stone-500">
                      {DENOMINATIONS.filter((k) => (s.makerCounts[k] || 0) > 0).map((k) => `${DENOM_LABEL[k]}×${s.makerCounts[k]}`).join(' ')}
                    </td>
                    <td className="py-2 text-right font-extrabold">{inr(s.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {daySessions.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-6"><T en="No closed sessions on this date." bn="এই তারিখে কোনো সেশন নেই।" hi="इस तिथि को कोई सत्र नहीं।" /></p>
          )}
          <div className="flex justify-end mt-3 pt-3 border-t-2 border-stone-800">
            <div className="text-right">
              <div className="text-xs text-stone-500 uppercase font-bold"><T en="Day total" bn="দিনের মোট" hi="दिन का कुल" /></div>
              <div className="text-2xl font-extrabold text-stone-900">{inr(dayTotal)}</div>
            </div>
          </div>
          <div className="text-[11px] text-stone-400 mt-4">
            <T en="Generated on this device from the tamper-evident custody log. Verify chain integrity in the Custody Log tab before relying on this report."
              bn="ডিভাইসে তৈরি। প্রতিবেদনের আগে শৃঙ্খল যাচাই করুন।"
              hi="इस डिवाइस पर तैयार। रिपोर्ट से पहले श्रृंखला सत्यापित करें।" />
          </div>
        </div>
      </Card>
    </div>
  );
};
