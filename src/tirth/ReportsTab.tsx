import React, { useRef, useState } from 'react';
import { useInr } from '../hooks/useWorkspaceInr';
import { useTirth, todayISO, tokensFor, slotUtilPct, noShowPct, peakCrowd, sevaIncome } from './tirthStore';
import { T, Card, Btn, Field, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Tirth One — reports: daily darshan report (printable), CSV exports,
 * backup/restore. */

const csv = (rows: string[][]) =>
  rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

const download = (name: string, text: string, mime = 'text/csv') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

export const ReportsTab: React.FC = () => {
  const inr = useInr();
  const { state, exportJSON, importJSON, resetAll } = useTirth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [date, setDate] = useState(todayISO());
  const [printing, setPrinting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tokens = tokensFor(state, date);
  const served = tokens.filter((t) => t.status === 'served').length;
  const waiting = tokens.filter((t) => t.status === 'waiting').length;
  const noShows = tokens.filter((t) => t.status === 'no-show').length;
  const peak = peakCrowd(state, date);
  const seva = sevaIncome(state, date);
  const ns = noShowPct(state, date);

  const print = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 150);
  };

  const exportTokensCSV = () => {
    const rows = [['Token', 'Date', 'Slot', 'Name', 'Phone', 'Kind', 'Status', 'Issued at']];
    for (const t of tokens) {
      const s = state.slots.find((x) => x.id === t.slotId);
      rows.push([t.no, t.date, s?.name || '', t.name || '', t.phone || '', t.kind, t.status, t.issuedAt]);
    }
    download(`tirth-tokens-${date}.csv`, csv(rows));
    showToast(t('suites.tirth.reports.toastTokensCsv'), 'success');
  };

  const exportSevaCSV = () => {
    const rows = [['Date', 'Pass type', 'Name', 'Phone', 'Persons', 'Amount (INR)', 'Treasury posted']];
    for (const s of state.seva.filter((x) => x.date === date)) {
      rows.push([s.date, s.passType, s.name, s.phone || '', String(s.persons), String(s.amount), s.treasuryTxId ? 'yes' : 'no']);
    }
    download(`tirth-seva-${date}.csv`, csv(rows));
    showToast(t('suites.tirth.reports.toastSevaCsv'), 'success');
  };

  const doBackup = () => {
    download(`tirth-backup-${date}.json`, exportJSON(), 'application/json');
    showToast(t('suites.tirth.reports.toastBackup'), 'success');
  };

  const doImport = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      const ok = importJSON(String(rd.result || ''));
      showToast(ok ? t('suites.tirth.reports.toastRestored') : t('suites.tirth.reports.toastInvalidBackup'), ok ? 'success' : 'error');
    };
    rd.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Reports" bn="প্রতিবেদন" hi="रिपोर्ट" /></h2>
        <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
          <input type="date" className="w-full sm:w-auto rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Card className={printing ? 'print-report' : ''}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-stone-800"><T en="Daily darshan report" bn="দৈনিক দর্শন প্রতিবেদন" hi="दैनिक दर्शन रिपोर्ट" /> — {date}</h3>
          <Btn variant="ghost" onClick={print} className="no-print">🖨️ <T en="Print" bn="প্রিন্ট" hi="प्रिंट" /></Btn>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-stone-100"><td className="py-2 text-stone-500">Tokens issued</td><td className="py-2 font-bold text-right">{tokens.length}</td></tr>
            <tr className="border-b border-stone-100"><td className="py-2 text-stone-500">Served</td><td className="py-2 font-bold text-right text-emerald-700">{served}</td></tr>
            <tr className="border-b border-stone-100"><td className="py-2 text-stone-500">Still waiting</td><td className="py-2 font-bold text-right text-amber-700">{waiting}</td></tr>
            <tr className="border-b border-stone-100"><td className="py-2 text-stone-500">No-shows</td><td className="py-2 font-bold text-right text-red-700">{noShows} ({ns}%)</td></tr>
            <tr className="border-b border-stone-100"><td className="py-2 text-stone-500">Peak crowd</td><td className="py-2 font-bold text-right">{peak ? `${peak.count} at ${peak.hour}` : '—'}</td></tr>
            <tr><td className="py-2 text-stone-500">Seva-darshan income</td><td className="py-2 font-bold text-right text-emerald-700">{inr(seva)}</td></tr>
          </tbody>
        </table>
        <div className="mt-3 text-xs text-stone-500">Slot utilisation</div>
        <div className="mt-1 space-y-1">
          {state.slots.filter((s) => s.active).map((s) => (
            <div key={s.id} className="flex justify-between text-sm">
              <span className="text-stone-600">{s.name}</span>
              <span className="font-bold">{slotUtilPct(state, s, date)}%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-extrabold text-stone-800 mb-3"><T en="Exports & backup" bn="এক্সপোর্ট ও ব্যাকআপ" hi="एक्सपोर्ट व बैकअप" /></h3>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={exportTokensCSV}>📥 <T en="Tokens CSV" bn="টোকেন CSV" hi="टोकन CSV" /></Btn>
          <Btn variant="ghost" onClick={exportSevaCSV}>📥 <T en="Seva CSV" bn="সেবা CSV" hi="सेवा CSV" /></Btn>
          <Btn variant="ghost" onClick={doBackup}>💾 <T en="Backup JSON" bn="ব্যাকআপ" hi="बैकअप" /></Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>📤 <T en="Restore" bn="পুনরুদ্ধার" hi="पुनर्स्थापित करें" /></Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm(t('suites.tirth.reports.confirmReset'))) { resetAll(); showToast(t('suites.tirth.reports.toastReset'), 'success'); } }}>
            <T en="Reset" bn="রিসেট" hi="रीसेट" />
          </Btn>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
        </div>
        {state.slots.length === 0 && <div className="mt-3"><Empty text={t('suites.tirth.reports.empty')} /></div>}
      </Card>
    </div>
  );
};
