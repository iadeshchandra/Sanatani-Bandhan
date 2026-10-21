import React, { useMemo, useRef, useState } from 'react';
import { useInr } from '../hooks/useWorkspaceInr';
import { useAnnakshetra, lowStockItems, totalMeals, todayISO, daysFrom } from './annakshetraStore';
import { Card, Btn, T, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Annakshetra One — reports: printable kitchen report, CSV exports
 * (meals, purchases, wastage), backup/restore. Device-local; printing
 * uses the suite print.css. */

export const ReportsTab: React.FC = () => {
  const { state, exportJSON, importJSON, resetAll } = useAnnakshetra();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restored, setRestored] = useState('');

  const summary = useMemo(() => {
    const today = todayISO();
    const monthStart = today.slice(0, 7) + '-01';
    return {
      mealsMonth: totalMeals(state, monthStart, today),
      mealsWeek: totalMeals(state, daysFrom(-6), today),
      low: lowStockItems(state),
      bhandarasMonth: state.bhandaras.filter((b) => b.date >= monthStart && b.date <= today && b.status !== 'cancelled'),
      purchaseMonth: state.purchases.filter((p) => p.date >= monthStart && p.date <= today).reduce((s, p) => s + p.amount, 0),
      sponsorMonth: state.bhandaras.filter((b) => b.date >= monthStart && b.date <= today && b.status !== 'cancelled').reduce((s, b) => s + b.donationAmount, 0),
      wasteWeek: state.wastage.filter((w) => w.date >= daysFrom(-6)).length,
    };
  }, [state]);

  const download = (name: string, content: string, mime = 'text/plain') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const csv = (rows: (string | number)[][]) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

  const exportMeals = () => download(`meals-${todayISO()}.csv`, csv([
    ['date', 'breakfast', 'lunch', 'dinner', 'prasad', 'total', 'notes'],
    ...state.meals.map((m) => [m.date, m.breakfast, m.lunch, m.dinner, m.prasad, m.breakfast + m.lunch + m.dinner + m.prasad, m.notes || '']),
  ]), 'text/csv');

  const exportPurchases = () => download(`purchases-${todayISO()}.csv`, csv([
    ['date', 'item', 'qty', 'unit', 'amount_inr', 'vendor', 'receipt', 'treasury'],
    ...state.purchases.map((p) => [p.date, p.itemName, p.qty, p.unit, p.amount, p.vendor || '', p.receiptNo, p.treasuryTxId ? 'posted' : 'local']),
  ]), 'text/csv');

  const exportWastage = () => download(`wastage-${todayISO()}.csv`, csv([
    ['date', 'item', 'qty', 'unit', 'reason'],
    ...state.wastage.map((w) => [w.date, w.itemName, w.qty, w.unit, w.reason]),
  ]), 'text/csv');

  const doRestore = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      const ok = importJSON(String(rd.result || ''));
      setRestored(ok ? tr('anna.rep.restored', 'Backup restored.', 'পুনরুদ্ধার হয়েছে।', 'पुनर्स्थापित।') : tr('anna.rep.badfile', 'Invalid backup file.', 'ভুল ফাইল।', 'अमान्य फ़ाइल।'));
      showToast(ok ? tr('anna.rep.restored', 'Backup restored.', 'পুনরুদ্ধার হয়েছে।', 'पुनर्स्थापित।') : tr('anna.rep.badfile', 'Invalid backup file.', 'ভুল ফাইল।', 'अमान्य फ़ाइल।'), ok ? 'success' : 'error');
    };
    rd.readAsText(file);
  };

  const inr = useInr();

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-stone-800"><T en="Kitchen report" bn="রান্নাঘর প্রতিবেদন" hi="रसोई रिपोर्ट" /></h3>
          <Btn variant="ghost" onClick={() => window.print()} className="no-print">🖨 <T en="Print" bn="প্রিন্ট" hi="प्रिंट" /></Btn>
        </div>
        <div className="print-area rounded-xl border border-stone-200 p-4 text-sm text-stone-700 space-y-2">
          <div className="font-extrabold text-lg text-stone-900">🍲 {tr('anna.rep.title', 'Annakshetra Report', 'অন্নক্ষেত্র প্রতিবেদন', 'अन्नक्षेत्र रिपोर्ट')} — {activeWorkspace.name}</div>
          <div className="text-xs text-stone-400">{tr('anna.rep.asof', 'As of', 'তারিখ', 'दिनांक')}: {todayISO()}</div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div>{tr('anna.rep.mmonth', 'Meals this month', 'এই মাসে থালা', 'इस माह थाली')}: <b>{summary.mealsMonth.toLocaleString('en-IN')}</b></div>
            <div>{tr('anna.rep.mweek', 'Meals last 7 days', '৭ দিনে', '7 दिनों में')}: <b>{summary.mealsWeek.toLocaleString('en-IN')}</b></div>
            <div>{tr('anna.rep.bhmonth', 'Bhandaras this month', 'এই মাসে ভাণ্ডারা', 'इस माह भंडारे')}: <b>{summary.bhandarasMonth.length}</b></div>
            <div>{tr('anna.rep.sponsor', 'Sponsorships this month', 'এই মাসে পৃষ্ঠপোষকতা', 'इस माह प्रायोजन')}: <b>{inr(summary.sponsorMonth)}</b></div>
            <div>{tr('anna.rep.purch', 'Kitchen purchases this month', 'এই মাসে ক্রয়', 'इस माह खरीद')}: <b>{inr(summary.purchaseMonth)}</b></div>
            <div>{tr('anna.rep.waste', 'Wastage entries (7d)', 'অপচয় (৭ দিন)', 'बर्बादी (7 दिन)')}: <b>{summary.wasteWeek}</b></div>
          </div>
          {summary.low.length > 0 && (
            <div className="pt-1"><b>{tr('anna.rep.low', 'Low stock', 'কম মজুত', 'कम स्टॉक')}:</b> {summary.low.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(', ')}</div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="CSV exports" bn="CSV এক্সপোর্ট" hi="CSV निर्यात" /></h3>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={exportMeals}>📥 {tr('anna.rep.meals', 'Meal counts', 'থালা গণনা', 'थाली गणना')}</Btn>
          <Btn variant="ghost" onClick={exportPurchases}>📥 {tr('anna.rep.purch2', 'Purchases', 'ক্রয়', 'खरीद')}</Btn>
          <Btn variant="ghost" onClick={exportWastage}>📥 {tr('anna.rep.waste2', 'Wastage', 'অপচয়', 'बर्बादी')}</Btn>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="Backup & restore" bn="ব্যাকআপ" hi="बैकअप" /></h3>
        <p className="text-xs text-stone-500 mb-3">{tr('anna.rep.bknote', 'Kitchen records live on this device. Download a backup regularly — treasury postings are already safe in the cloud.', 'রেকর্ড এই ডিভাইসে থাকে। নিয়মিত ব্যাকআপ নিন।', 'रिकॉर्ड इस डिवाइस पर हैं। नियमित बैकअप लें।')}</p>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => download(`annakshetra-backup-${todayISO()}.json`, exportJSON(), 'application/json')}>💾 {tr('anna.rep.download', 'Download backup', 'ব্যাকআপ নিন', 'बैकअप लें')}</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>📂 {tr('anna.rep.restore', 'Restore backup', 'পুনরুদ্ধার', 'पुनर्स्थापित करें')}</Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doRestore(f); e.target.value = ''; }} />
          <Btn variant="danger" onClick={() => { if (window.confirm(tr('anna.rep.resetconf', 'Reset all kitchen data to demo seed? This cannot be undone.', 'রিসেট করবেন?', 'रीसेट करें?'))) { resetAll(); showToast(tr('anna.rep.resetdone', 'Kitchen data reset.', 'রিসেট হয়েছে।', 'रीसेट हो गया।'), 'success'); } }}>
            {tr('anna.rep.reset', 'Reset demo data', 'রিসেট', 'रीसेट')}
          </Btn>
        </div>
        {restored && <p className="text-sm text-emerald-700 mt-2">{restored}</p>}
      </Card>
    </div>
  );
};
