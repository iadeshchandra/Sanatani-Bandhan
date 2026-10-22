import React, { useState } from 'react';
import { useNyas, currentFY, fyRange, todayISO, attentionRegs, overdueItems, healthScore, regStatus } from './nyasStore';
import { REG_KINDS } from './types';
import { T, Card, Btn, Empty } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

/* Nyas One — reports: printable CA status report, 10BE donor CSV,
 * registrations/compliance CSVs, backup/restore. */

export const ReportsTab: React.FC = () => {
  const inr = useInr();
  const { state, exportJSON, importJSON, resetAll } = useNyas();
  const { treasury } = useData();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [fy, setFy] = useState(currentFY());
  const [printing, setPrinting] = useState(false);

  const download = (name: string, content: string, mime = 'text/plain') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const csv = (rows: (string | number)[][]) =>
    rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

  /* ---- 10BE donor data: FY 80G-eligible income grouped by donor ---- */
  const [fyStart, fyEnd] = fyRange(fy);
  const donorRows = (() => {
    const map = new Map<string, { name: string; pan: string; amount: number; count: number; lastDate: string }>();
    for (const t of treasury || []) {
      if (t.type !== 'Income') continue;
      if (t.date < fyStart || t.date.slice(0, 10) > fyEnd) continue;
      if (!t.is80GEligible) continue;
      const name = (t.devoteeName || 'Anonymous').trim();
      const pan = (t.devoteePan || '').trim();
      const key = `${name}||${pan}`;
      const cur = map.get(key) || { name, pan, amount: 0, count: 0, lastDate: '' };
      cur.amount += t.amount || 0;
      cur.count += 1;
      if (t.date > cur.lastDate) cur.lastDate = t.date;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  })();

  const export10BE = () => {
    if (donorRows.length === 0) { showToast(t('suites.nyas.reports.toastNo80G'), 'warning'); return; }
    download(
      `10BE-donors-FY${fy}.csv`,
      csv([
        ['donor_name', 'pan', 'total_amount_inr', 'donation_count', 'last_donation_date', 'fy'],
        ...donorRows.map((d) => [d.name, d.pan, d.amount, d.count, d.lastDate.slice(0, 10), fy]),
      ]),
      'text/csv'
    );
    showToast(t('suites.nyas.reports.toastExported').replace('{count}', String(donorRows.length)), 'success');
  };

  const exportRegistrations = () =>
    download(
      `nyas-registrations-${todayISO()}.csv`,
      csv([
        ['kind', 'name', 'reg_no', 'valid_from', 'valid_to', 'status', 'authority', 'doc_ref'],
        ...state.registrations.map((r) => {
          const kind = REG_KINDS.find((k) => k.id === r.kind);
          return [r.kind, r.customName || kind?.en || '', r.regNo, r.validFrom, r.validTo || 'lifetime', regStatus(r), r.issuingAuthority || '', r.docRef || ''];
        }),
      ]),
      'text/csv'
    );

  const exportCompliance = () =>
    download(
      `nyas-compliance-${todayISO()}.csv`,
      csv([
        ['kind', 'name', 'fy', 'due_date', 'owner', 'status', 'completed_at', 'notes'],
        ...state.compliance.map((c) => [c.kind, c.customName || '', c.fy, c.dueDate, c.owner || '', c.status, c.completedAt || '', c.notes || '']),
      ]),
      'text/csv'
    );

  const backup = () => download(`nyas-backup-${todayISO()}.json`, exportJSON(), 'application/json');

  const restore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const ok = importJSON(String(rd.result || ''));
        showToast(ok ? t('suites.nyas.reports.toastRestored') : t('suites.nyas.reports.toastInvalidBackup'), ok ? 'success' : 'error');
      };
      rd.readAsText(f);
    };
    input.click();
  };

  const printReport = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 150);
  };

  const { score, detail } = healthScore(state);
  const regs = attentionRegs(state);
  const overdue = overdueItems(state);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-stone-800"><T en="Reports & exports" bn="প্রতিবেদন ও এক্সপোর্ট" hi="रिपोर्ट व निर्यात" /></h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
        <Card>
          <h3 className="font-bold text-stone-800 mb-2"><T en="10BE donor data" bn="১০বিই দাতার তথ্য" hi="10BE दाता डेटा" /></h3>
          <p className="text-xs text-stone-500 mb-3">
            <T
              en="80G-eligible treasury donations grouped by donor for the FY — hand this CSV to your CA for 10BE filing. This is data export, not filing."
              bn="অর্থবছরের ৮০জি-যোগ্য অনুদান দাতা অনুযায়ী — ১০বিই ফাইলিংয়ের জন্য সিএ-কে দিন। এটি ডেটা এক্সপোর্ট, ফাইলিং নয়।"
              hi="वि.व. के 80G-पात्र दान दातावार — 10BE फाइलिंग हेतु CA को दें। यह डेटा निर्यात है, फाइलिंग नहीं।"
            />
          </p>
          <div className="flex gap-2 items-center flex-wrap">
            <select className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm min-h-[44px]" value={fy} onChange={(e) => setFy(e.target.value)}>
              {[...new Set([currentFY(), ...state.compliance.map((c) => c.fy)])].sort().reverse().map((f) => <option key={f} value={f}>FY {f}</option>)}
            </select>
            <Btn onClick={export10BE}>⬇️ CSV ({donorRows.length})</Btn>
          </div>
          {donorRows.length > 0 && (
            <div className="mt-3 text-sm max-h-48 overflow-y-auto">
              {donorRows.slice(0, 10).map((d, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-stone-100 text-xs">
                  <span className="font-semibold truncate">{d.name}{d.pan ? ` · ${d.pan}` : ''}</span>
                  <span className="font-bold">{inr(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-2"><T en="Compliance status report" bn="অনুপালন স্থিতি প্রতিবেদন" hi="अनुपालन स्थिति रिपोर्ट" /></h3>
          <p className="text-xs text-stone-500 mb-3">
            <T en="Printable one-page summary for your CA / board — health score, expiring registrations, overdue filings." bn="সিএ / বোর্ডের জন্য মুদ্রণযোগ্য সারসংক্ষেপ।" hi="CA / बोर्ड हेतु मुद्रणयोग्य सारांश।" />
          </p>
          <Btn onClick={printReport}>🖨️ <T en="Print report" bn="প্রতিবেদন মুদ্রণ" hi="रिपोर्ट प्रिंट करें" /></Btn>
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-2"><T en="CSV exports" bn="সিএসভি এক্সপোর্ট" hi="CSV निर्यात" /></h3>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={exportRegistrations}><T en="Registrations" bn="নিবন্ধন" hi="पंजीकरण" /></Btn>
            <Btn variant="ghost" onClick={exportCompliance}><T en="Compliance" bn="অনুপালন" hi="अनुपालन" /></Btn>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-2"><T en="Backup & restore" bn="ব্যাকআপ ও পুনরুদ্ধার" hi="बैकअप व पुनर्स्थापना" /></h3>
          <p className="text-xs text-stone-500 mb-3"><T en="Records live on this device. Back up regularly." bn="রেকর্ড এই ডিভাইসে থাকে। নিয়মিত ব্যাকআপ নিন।" hi="रिकॉर्ड इसी डिवाइस पर रहते हैं। नियमित बैकअप लें।" /></p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={backup}>💾 <T en="Backup" bn="ব্যাকআপ" hi="बैकअप" /></Btn>
            <Btn variant="ghost" onClick={restore}>📂 <T en="Restore" bn="পুনরুদ্ধার" hi="पुनर्स्थापना" /></Btn>
            <Btn variant="danger" onClick={() => { if (window.confirm(t('suites.nyas.reports.confirmReset'))) { resetAll(); showToast(t('suites.nyas.reports.toastReset'), 'success'); } }}>
              <T en="Reset" bn="রিসেট" hi="रीसेट" />
            </Btn>
          </div>
        </Card>
      </div>

      {/* Printable CA report */}
      <div className={printing ? 'print-area' : 'hidden print-area'}>
        <div className="p-6 text-stone-900">
          <h1 className="text-xl font-extrabold">Nyas One — Compliance Status Report</h1>
          <p className="text-sm text-stone-500">Generated {todayISO()} · {state.settings.trustName || 'Trust workspace'}</p>
          <div className="mt-4">
            <h2 className="font-bold">Health score: {score}/100</h2>
            <p className="text-sm">{detail}</p>
          </div>
          <div className="mt-4">
            <h2 className="font-bold">Registrations needing attention ({regs.length})</h2>
            {regs.length === 0 ? <p className="text-sm">None.</p> : regs.map((r) => (
              <div key={r.id} className="text-sm py-1 border-b">{r.customName || r.kind} — {r.regNo} — {regStatus(r)}{r.validTo ? ` (valid to ${r.validTo})` : ''}</div>
            ))}
          </div>
          <div className="mt-4">
            <h2 className="font-bold">Overdue filings ({overdue.length})</h2>
            {overdue.length === 0 ? <p className="text-sm">None.</p> : overdue.map((c) => (
              <div key={c.id} className="text-sm py-1 border-b">{c.customName || c.kind} — FY {c.fy} — was due {c.dueDate}</div>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-6">Nyas One tracks and reminds. It does not file with any government authority and does not give legal or tax advice — confirm every filing with your CA / legal counsel.</p>
        </div>
      </div>

      {state.registrations.length === 0 && state.compliance.length === 0 && <Empty text="" />}
    </div>
  );
};
