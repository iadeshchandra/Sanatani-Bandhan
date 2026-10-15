import React, { useRef, useState } from 'react';
import { useUtsav, budgetTotals, tasksDonePct, vendorPending, safetyDonePct, totalCheckins, nextUCNo } from './utsavStore';
import { T, Card, Btn, Field, Empty, fmtDate, inr } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — reports: utilisation certificate (printable), festival
 * summary, CSV exports, backup/restore.
 *
 * HONESTY: the UC is the samiti's own summary for donors/sponsors —
 * confirm final figures with the koshadhyaksh / CA. */

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
  const { t } = useLanguage();
  const { state, exportJSON, importJSON, resetAll } = useUtsav();
  const { showToast } = useToast();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [printing, setPrinting] = useState<'uc' | 'summary' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text={t('ritual.utsav.reports.empty_add_a_festival_first_then_genera')} /></Card>;

  const totals = budgetTotals(state, fest.id);
  const vendors = state.vendors.filter((v) => v.festivalId === fest.id);
  const tasksPct = tasksDonePct(state, fest.id);
  const pending = vendorPending(state, fest.id);
  const safetyPct = safetyDonePct(state, fest.id);
  const checkins = totalCheckins(state, fest.id);
  const ucNo = nextUCNo(state);

  const print = (kind: 'uc' | 'summary') => {
    setPrinting(kind);
    setTimeout(() => { window.print(); setPrinting(null); }, 150);
  };

  const exportBudgetCSV = () => {
    const rows = [['Type', 'Head', 'Planned (INR)', 'Actual (INR)', 'Treasury posted', 'Notes']];
    for (const l of state.budget.filter((b) => b.festivalId === fest.id)) {
      rows.push([l.kind, l.head, String(l.planned), String(l.actual), l.treasuryTxId ? 'yes' : 'no', l.notes || '']);
    }
    download(`utsav-budget-${fest.name.replace(/\W+/g, '-').slice(0, 30)}.csv`, csv(rows));
    showToast(t('ritual.utsav.reports.toastBudgetCsv'), 'success');
  };

  const exportVendorsCSV = () => {
    const rows = [['Category', 'Vendor', 'Phone', 'Quote (INR)', 'Paid (INR)', 'Balance (INR)', 'Status']];
    for (const v of vendors) {
      rows.push([v.category, v.name, v.phone || '', String(v.quote), String(v.paid), String(Math.max(0, v.quote - v.paid)), v.status]);
    }
    download(`utsav-vendors-${fest.name.replace(/\W+/g, '-').slice(0, 30)}.csv`, csv(rows));
    showToast(t('ritual.utsav.reports.toastVendorsCsv'), 'success');
  };

  const doImport = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      const ok = importJSON(String(rd.result || ''));
      showToast(ok ? 'Backup restored.' : 'Invalid backup file — nothing changed.', ok ? 'success' : 'error');
    };
    rd.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <Field label={t('ritual.common.festival')}>
        <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
          value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
          {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
        </select>
      </Field>

      <div className="flex flex-wrap gap-2 no-print">
        <Btn onClick={() => print('uc')}>🖨️ {t('ritual.utsav.reports.print_utilisation_certificate')}</Btn>
        <Btn variant="ghost" onClick={() => print('summary')}>🖨️ {t('ritual.utsav.reports.print_festival_summary')}</Btn>
        <Btn variant="ghost" onClick={exportBudgetCSV}>📥 {t('ritual.utsav.reports.budget_csv')}</Btn>
        <Btn variant="ghost" onClick={exportVendorsCSV}>📥 {t('ritual.utsav.reports.vendors_csv')}</Btn>
      </div>

      {/* Utilisation certificate — printable */}
      <Card className={printing === 'uc' ? 'print-uc' : ''}>
        <div className="print-only:block hidden text-center mb-4">
          <div className="font-extrabold text-lg">॥ शुभम् ॥</div>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-extrabold text-stone-800 text-lg">📜 {t('ritual.utsav.reports.utilisation_certificate')}</div>
            <div className="text-sm text-stone-500 font-mono">{ucNo} · {fest.name}</div>
          </div>
          <span className="text-[11px] font-bold text-stone-400 uppercase no-print">{t('ritual.utsav.reports.preview')}</span>
        </div>
        <p className="text-sm text-stone-700 mt-3">
          <T
            en={`This is to certify that the ${state.settings.samitiName || 'samiti'} received ${inr(totals.actualIncome)} and utilised ${inr(totals.actualExpense)} for ${fest.name} (${fmtDate(fest.startDate)} → ${fmtDate(fest.endDate)}), as per the samiti's own records.`}
            bn={`এতদ্বারা প্রত্যয়ন করা হল যে ${fest.name}-এর জন্য সমিতি ${inr(totals.actualIncome)} পেয়েছে ও ${inr(totals.actualExpense)} ব্যবহার করেছে (সমিতির নিজস্ব রেকর্ড অনুযায়ী)।`}
            hi={`प्रमाणित किया जाता है कि ${fest.name} हेतु समिति ने ${inr(totals.actualIncome)} प्राप्त किए व ${inr(totals.actualExpense)} उपयोग किए (समिति के अपने रिकॉर्ड अनुसार)।`}
          />
        </p>
        <div className="mt-3 text-sm space-y-1">
          <div className="flex justify-between border-b border-stone-100 py-1"><span className="text-stone-500">{t('ritual.utsav.reports.total_income_received')}</span><span className="font-extrabold text-emerald-700">{inr(totals.actualIncome)}</span></div>
          <div className="flex justify-between border-b border-stone-100 py-1"><span className="text-stone-500">{t('ritual.utsav.reports.total_utilised')}</span><span className="font-extrabold text-red-700">{inr(totals.actualExpense)}</span></div>
          <div className="flex justify-between py-1"><span className="text-stone-500">{t('ritual.utsav.reports.balance')}</span><span className="font-extrabold">{inr(totals.actualIncome - totals.actualExpense)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
          <div><div className="border-t border-stone-300 pt-1 text-stone-500">{t('ritual.utsav.reports.koshadhyaksh_treasurer')}</div></div>
          <div><div className="border-t border-stone-300 pt-1 text-stone-500">{t('ritual.utsav.reports.adhyaksh_president')}</div></div>
        </div>
        <p className="text-[11px] text-stone-400 mt-4">
          {t('ritual.utsav.reports.samitiSummaryNote')}
        </p>
      </Card>

      {/* Festival summary — printable */}
      <Card className={printing === 'summary' ? 'print-summary' : ''}>
        <div className="font-extrabold text-stone-800 text-lg">📊 {t('ritual.utsav.reports.festival_summary')} — {fest.name}</div>
        <div className="mt-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.festivals.dates')}</span><span className="font-semibold">{fmtDate(fest.startDate)} → {fmtDate(fest.endDate)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">{t('ritual.common.venue')}</span><span className="font-semibold">{fest.venue || '—'}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.reports.footfall')}</span><span className="font-semibold">{checkins.toLocaleString('en-IN')} / {fest.expectedFootfall.toLocaleString('en-IN')} {t('ritual.utsav.dashboard.expected')}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.reports.budget')}</span><span className="font-semibold">{t('ritual.utsav.reports.income_expense_line').replace('{income}', inr(totals.actualIncome)).replace('{expense}', inr(totals.actualExpense))}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.tasks_done')}</span><span className="font-semibold">{tasksPct}%</span></div>
          <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.vendor_payments_pending')}</span><span className="font-semibold">{inr(pending)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.safety_checklist')}</span><span className="font-semibold">{safetyPct}%</span></div>
        </div>
      </Card>

      {/* Backup / restore */}
      <Card>
        <h3 className="font-extrabold text-stone-800 mb-3">{t('ritual.utsav.reports.backup_restore')}</h3>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => { download('utsav-backup.json', exportJSON(), 'application/json'); showToast(t('ritual.utsav.reports.toastBackup'), 'success'); }}>💾 {t('ritual.utsav.reports.download_backup')}</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>📂 {t('ritual.utsav.reports.restore_backup')}</Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm(t('ritual.utsav.reports.confirmReset'))) { resetAll(); showToast(t('ritual.utsav.reports.toastReset'), 'success'); } }}>↺ {t('ritual.utsav.reports.reset_data')}</Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
        </div>
        <p className="text-[11px] text-stone-400 mt-2">
          {t('ritual.utsav.reports.records_live_on_this_device_back')}
        </p>
      </Card>
    </div>
  );
};
