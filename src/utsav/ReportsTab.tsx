import React, { useRef, useState } from 'react';
import { useUtsav, budgetTotals, tasksDonePct, vendorPending, safetyDonePct, totalCheckins, nextUCNo } from './utsavStore';
import { T, Card, Btn, Field, Empty, fmtDate, inr } from './ui';
import { useToast } from '../context/ToastContext';

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
  const { state, exportJSON, importJSON, resetAll } = useUtsav();
  const { showToast } = useToast();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [printing, setPrinting] = useState<'uc' | 'summary' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text="Add a festival first, then generate its reports." /></Card>;

  const t = budgetTotals(state, fest.id);
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
    showToast('Budget CSV downloaded.', 'success');
  };

  const exportVendorsCSV = () => {
    const rows = [['Category', 'Vendor', 'Phone', 'Quote (INR)', 'Paid (INR)', 'Balance (INR)', 'Status']];
    for (const v of vendors) {
      rows.push([v.category, v.name, v.phone || '', String(v.quote), String(v.paid), String(Math.max(0, v.quote - v.paid)), v.status]);
    }
    download(`utsav-vendors-${fest.name.replace(/\W+/g, '-').slice(0, 30)}.csv`, csv(rows));
    showToast('Vendors CSV downloaded.', 'success');
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
      <Field label={<T en="Festival" bn="উৎসব" hi="उत्सव" />}>
        <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
          value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
          {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
        </select>
      </Field>

      <div className="flex flex-wrap gap-2 no-print">
        <Btn onClick={() => print('uc')}>🖨️ <T en="Print utilisation certificate" bn="ব্যবহার-শংসাপত্র প্রিন্ট" hi="उपयोग-प्रमाणपत्र प्रिंट करें" /></Btn>
        <Btn variant="ghost" onClick={() => print('summary')}>🖨️ <T en="Print festival summary" bn="উৎসব সারসংক্ষেপ প্রিন্ট" hi="उत्सव सारांश प्रिंट करें" /></Btn>
        <Btn variant="ghost" onClick={exportBudgetCSV}>📥 <T en="Budget CSV" bn="বাজেট CSV" hi="बजट CSV" /></Btn>
        <Btn variant="ghost" onClick={exportVendorsCSV}>📥 <T en="Vendors CSV" bn="বিক্রেতা CSV" hi="विक्रेता CSV" /></Btn>
      </div>

      {/* Utilisation certificate — printable */}
      <Card className={printing === 'uc' ? 'print-uc' : ''}>
        <div className="print-only:block hidden text-center mb-4">
          <div className="font-extrabold text-lg">॥ शुभम् ॥</div>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-extrabold text-stone-800 text-lg">📜 <T en="Utilisation Certificate" bn="ব্যবহার-শংসাপত্র" hi="उपयोग-प्रमाणपत्र" /></div>
            <div className="text-sm text-stone-500 font-mono">{ucNo} · {fest.name}</div>
          </div>
          <span className="text-[11px] font-bold text-stone-400 uppercase no-print"><T en="Preview" bn="প্রিভিউ" hi="पूर्वावलोकन" /></span>
        </div>
        <p className="text-sm text-stone-700 mt-3">
          <T
            en={`This is to certify that the ${state.settings.samitiName || 'samiti'} received ${inr(t.actualIncome)} and utilised ${inr(t.actualExpense)} for ${fest.name} (${fmtDate(fest.startDate)} → ${fmtDate(fest.endDate)}), as per the samiti's own records.`}
            bn={`এতদ্বারা প্রত্যয়ন করা হল যে ${fest.name}-এর জন্য সমিতি ${inr(t.actualIncome)} পেয়েছে ও ${inr(t.actualExpense)} ব্যবহার করেছে (সমিতির নিজস্ব রেকর্ড অনুযায়ী)।`}
            hi={`प्रमाणित किया जाता है कि ${fest.name} हेतु समिति ने ${inr(t.actualIncome)} प्राप्त किए व ${inr(t.actualExpense)} उपयोग किए (समिति के अपने रिकॉर्ड अनुसार)।`}
          />
        </p>
        <div className="mt-3 text-sm space-y-1">
          <div className="flex justify-between border-b border-stone-100 py-1"><span className="text-stone-500"><T en="Total income received" bn="মোট প্রাপ্ত আয়" hi="कुल प्राप्त आय" /></span><span className="font-extrabold text-emerald-700">{inr(t.actualIncome)}</span></div>
          <div className="flex justify-between border-b border-stone-100 py-1"><span className="text-stone-500"><T en="Total utilised" bn="মোট ব্যবহৃত" hi="कुल उपयोग" /></span><span className="font-extrabold text-red-700">{inr(t.actualExpense)}</span></div>
          <div className="flex justify-between py-1"><span className="text-stone-500"><T en="Balance" bn="উদ্বৃত্ত" hi="शेष" /></span><span className="font-extrabold">{inr(t.actualIncome - t.actualExpense)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
          <div><div className="border-t border-stone-300 pt-1 text-stone-500"><T en="Koshadhyaksh (Treasurer)" bn="কোষাধ্যক্ষ" hi="कोषाध्यक्ष" /></div></div>
          <div><div className="border-t border-stone-300 pt-1 text-stone-500"><T en="Adhyaksh (President)" bn="সভাপতি" hi="अध्यक्ष" /></div></div>
        </div>
        <p className="text-[11px] text-stone-400 mt-4">
          <T en="The samiti's own summary for donors/sponsors — confirm final figures with the koshadhyaksh / CA." bn="দাতাদের জন্য সমিতির নিজস্ব সারসংক্ষেপ — চূড়ান্ত অঙ্ক কোষাধ্যক্ষ/সিএ-এর সঙ্গে নিশ্চিত করুন।" hi="दाताओं हेतु समिति का अपना सारांश — अंतिम आंकड़े कोषाध्यक्ष/CA से पुष्टि करें।" />
        </p>
      </Card>

      {/* Festival summary — printable */}
      <Card className={printing === 'summary' ? 'print-summary' : ''}>
        <div className="font-extrabold text-stone-800 text-lg">📊 <T en="Festival summary" bn="উৎসব সারসংক্ষেপ" hi="उत्सव सारांश" /> — {fest.name}</div>
        <div className="mt-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-stone-500"><T en="Dates" bn="তারিখ" hi="तिथियां" /></span><span className="font-semibold">{fmtDate(fest.startDate)} → {fmtDate(fest.endDate)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500"><T en="Venue" bn="স্থান" hi="स्थान" /></span><span className="font-semibold">{fest.venue || '—'}</span></div>
          <div className="flex justify-between"><span className="text-stone-500"><T en="Footfall" bn="ভিড়" hi="भीड़" /></span><span className="font-semibold">{checkins.toLocaleString('en-IN')} / {fest.expectedFootfall.toLocaleString('en-IN')} <T en="expected" bn="প্রত্যাশিত" hi="अपेक्षित" /></span></div>
          <div className="flex justify-between"><span className="text-stone-500"><T en="Budget" bn="বাজেট" hi="बजट" /></span><span className="font-semibold"><T en={`Income ${inr(t.actualIncome)} · Expense ${inr(t.actualExpense)}`} bn={`আয় ${inr(t.actualIncome)} · ব্যয় ${inr(t.actualExpense)}`} hi={`आय ${inr(t.actualIncome)} · व्यय ${inr(t.actualExpense)}`} /></span></div>
          <div className="flex justify-between"><span className="text-stone-500"><T en="Tasks done" bn="কাজ সম্পন্ন" hi="कार्य पूर्ण" /></span><span className="font-semibold">{tasksPct}%</span></div>
          <div className="flex justify-between"><span className="text-stone-500"><T en="Vendor payments pending" bn="বিক্রেতা পাওনা" hi="विक्रेता बकाया" /></span><span className="font-semibold">{inr(pending)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500"><T en="Safety checklist" bn="নিরাপত্তা তালিকা" hi="सुरक्षा सूची" /></span><span className="font-semibold">{safetyPct}%</span></div>
        </div>
      </Card>

      {/* Backup / restore */}
      <Card>
        <h3 className="font-extrabold text-stone-800 mb-3"><T en="Backup & restore" bn="ব্যাকআপ ও পুনরুদ্ধার" hi="बैकअप व पुनर्स्थापना" /></h3>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => { download('utsav-backup.json', exportJSON(), 'application/json'); showToast('Backup downloaded.', 'success'); }}>💾 <T en="Download backup" bn="ব্যাকআপ ডাউনলোড" hi="बैकअप डाउनलोड करें" /></Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>📂 <T en="Restore backup" bn="ব্যাকআপ পুনরুদ্ধার" hi="बैकअप पुनर्स्थापित करें" /></Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm('Reset all Utsav One data on this device?')) { resetAll(); showToast('Data reset.', 'success'); } }}>↺ <T en="Reset data" bn="ডেটা রিসেট" hi="डेटा रीसेट करें" /></Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
        </div>
        <p className="text-[11px] text-stone-400 mt-2">
          <T en="Records live on this device. Back up before switching devices — a restore replaces everything here." bn="রেকর্ড এই ডিভাইসে থাকে। ডিভাইস বদলের আগে ব্যাকআপ নিন।" hi="रिकॉर्ड इस डिवाइस पर रहते हैं। डिवाइस बदलने से पहले बैकअप लें।" />
        </p>
      </Card>
    </div>
  );
};
