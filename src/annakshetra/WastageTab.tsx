import React, { useMemo, useState } from 'react';
import { useAnnakshetra, uid, todayISO, daysFrom } from './annakshetraStore';
import { Card, Btn, Field, inputCls, T, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';

/* Annakshetra One — honest wastage log: per-day waste entries with
 * reasons, plus a weekly report. Waste visibility is the first step to
 * zero-waste annakshetra — the suite never hides it. */

export const WastageTab: React.FC = () => {
  const { state, add, remove } = useAnnakshetra();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const [f, setF] = useState({ date: todayISO(), itemName: '', qty: 0, unit: 'kg', reason: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.itemName.trim() || !(f.qty > 0)) { showToast(tr('anna.waste.need', 'Item and quantity required', 'আইটেম ও পরিমাণ দিন', 'आइटम और मात्रा दें'), 'warning'); return; }
    add('wastage', {
      id: uid('w'), date: f.date, itemName: f.itemName.trim(),
      qty: Number(f.qty), unit: f.unit, reason: f.reason.trim() || tr('anna.waste.noreason', 'Not specified', 'অজানা', 'अज्ञात'),
    });
    setF({ date: todayISO(), itemName: '', qty: 0, unit: 'kg', reason: '' });
    showToast(tr('anna.waste.added', 'Wastage logged — honesty first', 'অপচয় লগ হয়েছে', 'बर्बादी दर्ज'), 'success');
  };

  const weeks = useMemo(() => {
    // Last 4 weeks, newest first: { label, entries, byReason }
    return [0, 1, 2, 3].map((w) => {
      const end = daysFrom(-w * 7);
      const start = daysFrom(-w * 7 - 6);
      const entries = state.wastage.filter((x) => x.date >= start && x.date <= end).sort((a, b) => b.date.localeCompare(a.date));
      const byReason = new Map<string, number>();
      for (const e of entries) byReason.set(e.reason, (byReason.get(e.reason) || 0) + 1);
      return { start, end, entries, byReason: [...byReason.entries()].sort((a, b) => b[1] - a[1]) };
    });
  }, [state.wastage]);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="Log wastage" bn="অপচয় লগ" hi="बर्बादी दर्ज करें" /></h3>
        <form onSubmit={submit} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <Field label={tr('anna.waste.date', 'Date', 'তারিখ', 'तिथि')}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={tr('anna.waste.item', 'Item / dish', 'আইটেম', 'आइटम')}><input className={inputCls} value={f.itemName} onChange={(e) => setF({ ...f, itemName: e.target.value })} placeholder="e.g. Cooked rice" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={tr('anna.waste.qty', 'Qty', 'পরিমাণ', 'मात्रा')}><input type="number" min={0} step="any" className={inputCls} value={f.qty} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })} /></Field>
            <Field label={tr('anna.waste.unit', 'Unit', 'একক', 'इकाई')}>
              <select className={inputCls} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
                {['kg', 'litre', 'pcs', 'packet', 'plates'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <Field label={tr('anna.waste.reason', 'Reason', 'কারণ', 'कारण')}><input className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder={tr('anna.waste.reasonph', 'e.g. Overcooked, excess', 'যেমন বেশি রান্না', 'जैसे अधिक पकना')} /></Field>
          <Btn type="submit"><T en="Log" bn="লগ" hi="दर्ज करें" /></Btn>
        </form>
      </Card>

      <h3 className="font-bold text-stone-800"><T en="Weekly wastage report" bn="সাপ্তাহিক অপচয় প্রতিবেদন" hi="साप्ताहिक बर्बादी रिपोर्ट" /></h3>
      {weeks.map((w, i) => (
        <Card key={w.start}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-stone-800 text-sm">
              {i === 0 ? tr('anna.waste.thisweek', 'This week', 'এই সপ্তাহ', 'इस सप्ताह') : `${w.start} → ${w.end}`}
            </div>
            <div className={`text-sm font-bold ${w.entries.length ? 'text-red-700' : 'text-emerald-700'}`}>
              {w.entries.length} {tr('anna.waste.entries', 'entries', 'টি', 'प्रविष्टियाँ')}
            </div>
          </div>
          {w.byReason.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {w.byReason.map(([reason, n]) => (
                <span key={reason} className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                  {reason}: {n}
                </span>
              ))}
            </div>
          )}
          {w.entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0 text-sm">
              <span className="text-stone-700">{e.date} · <b>{e.itemName}</b> — {e.qty} {e.unit} <span className="text-stone-400">({e.reason})</span></span>
              <button onClick={() => remove('wastage', e.id)} className="text-xs text-red-500 hover:underline no-print">🗑</button>
            </div>
          ))}
          {w.entries.length === 0 && <p className="text-sm text-emerald-700">✓ {tr('anna.waste.zero', 'Zero waste logged — shuddha annakshetra!', 'শূন্য অপচয়!', 'शून्य बर्बादी!')}</p>}
        </Card>
      ))}
    </div>
  );
};
