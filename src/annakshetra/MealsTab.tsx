import React, { useMemo, useState } from 'react';
import { useAnnakshetra, uid, todayISO, daysFrom, totalMeals } from './annakshetraStore';
import { Card, Btn, Field, inputCls, T, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';

/* Annakshetra One — daily meal counts: breakfast / lunch / dinner /
 * prasad. Pairs with Ashram One's BhandaraTab (occupancy-suggested
 * counts flow downstream into kitchen planning); counts here are
 * manually confirmed. */

export const MealsTab: React.FC = () => {
  const { state, add, update, remove } = useAnnakshetra();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const [date, setDate] = useState(todayISO());
  const [f, setF] = useState({ breakfast: 0, lunch: 0, dinner: 0, prasad: 0, notes: '' });

  const existing = state.meals.find((m) => m.date === date);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      breakfast: Math.max(0, Math.floor(f.breakfast)),
      lunch: Math.max(0, Math.floor(f.lunch)),
      dinner: Math.max(0, Math.floor(f.dinner)),
      prasad: Math.max(0, Math.floor(f.prasad)),
      notes: f.notes.trim() || undefined,
    };
    if (existing) update('meals', existing.id, payload);
    else add('meals', { id: uid('ml'), date, ...payload });
    showToast(tr('anna.meals.saved', `Meal count saved for ${date}.`, 'সংরক্ষিত।', 'सहेजा गया।'), 'success');
  };

  const fillExisting = () => {
    if (existing) setF({ breakfast: existing.breakfast, lunch: existing.lunch, dinner: existing.dinner, prasad: existing.prasad, notes: existing.notes || '' });
  };

  const week = useMemo(
    () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((n) => {
      const d = daysFrom(-n);
      const rec = state.meals.find((m) => m.date === d);
      return { d, rec, total: rec ? rec.breakfast + rec.lunch + rec.dinner + rec.prasad : 0 };
    }),
    [state.meals],
  );

  const weekTotal = totalMeals(state, daysFrom(-6), todayISO());

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Field label={tr('anna.meals.date', 'Date', 'তারিখ', 'तिथि')} className="sm:w-48">
            <input type="date" className={inputCls} value={date} onChange={(e) => { setDate(e.target.value); setF({ breakfast: 0, lunch: 0, dinner: 0, prasad: 0, notes: '' }); }} />
          </Field>
          {existing && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900 flex-1">
              🍲 {tr('anna.meals.exists', 'Already recorded', 'আগেই রেকর্ড', 'पहले से दर्ज')}: {existing.breakfast}/{existing.lunch}/{existing.dinner}/{existing.prasad}{' '}
              <button type="button" onClick={fillExisting} className="ml-2 underline font-bold no-print">{tr('anna.meals.edit', 'Edit', 'সম্পাদনা', 'संपादित करें')}</button>
            </div>
          )}
        </div>
        <form onSubmit={save} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Field label={tr('anna.meals.bf', 'Breakfast', 'জলখাবার', 'नाश्ता')}><input type="number" min={0} className={inputCls} value={f.breakfast} onChange={(e) => setF({ ...f, breakfast: Number(e.target.value) })} /></Field>
          <Field label={tr('anna.meals.lunch', 'Lunch', 'দুপুরের খাবার', 'दोपहर का भोजन')}><input type="number" min={0} className={inputCls} value={f.lunch} onChange={(e) => setF({ ...f, lunch: Number(e.target.value) })} /></Field>
          <Field label={tr('anna.meals.dinner', 'Dinner', 'রাতের খাবার', 'रात का भोजन')}><input type="number" min={0} className={inputCls} value={f.dinner} onChange={(e) => setF({ ...f, dinner: Number(e.target.value) })} /></Field>
          <Field label={tr('anna.meals.prasad', 'Prasad', 'প্রসাদ', 'प्रसाद')}><input type="number" min={0} className={inputCls} value={f.prasad} onChange={(e) => setF({ ...f, prasad: Number(e.target.value) })} /></Field>
        </form>
        <Field label={tr('anna.meals.notes', 'Notes (optional)', 'মন্তব্য', 'टिप्पणी')} className="mt-3">
          <input className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={tr('anna.meals.notesph', 'e.g. Festival crowd', 'যেমন উৎসবের ভিড়', 'जैसे उत्सव की भीड़')} />
        </Field>
        <Btn onClick={save} className="mt-3 w-full sm:w-auto"><T en="Save meal count" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-stone-800"><T en="Last 14 days" bn="গত ১৪ দিন" hi="पिछले 14 दिन" /></h3>
          <span className="text-xs text-stone-500">{tr('anna.meals.weektotal', '7-day total', '৭ দিনের মোট', '7-दिन का कुल')}: <b>{weekTotal.toLocaleString('en-IN')}</b></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                <th className="py-2 pr-2">{tr('anna.meals.date', 'Date', 'তারিখ', 'तिथि')}</th>
                <th className="py-2 pr-2">{tr('anna.meals.bf', 'Breakfast', 'জলখাবার', 'नाश्ता')}</th>
                <th className="py-2 pr-2">{tr('anna.meals.lunch', 'Lunch', 'দুপুর', 'दोपहर')}</th>
                <th className="py-2 pr-2">{tr('anna.meals.dinner', 'Dinner', 'রাত', 'रात')}</th>
                <th className="py-2 pr-2">{tr('anna.meals.prasad', 'Prasad', 'প্রসাদ', 'प्रसाद')}</th>
                <th className="py-2 pr-2">{tr('anna.meals.total', 'Total', 'মোট', 'कुल')}</th>
                <th className="py-2 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {week.map(({ d, rec, total }) => (
                <tr key={d} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 pr-2 font-semibold text-stone-700">{d}</td>
                  <td className="py-2 pr-2">{rec?.breakfast ?? '—'}</td>
                  <td className="py-2 pr-2">{rec?.lunch ?? '—'}</td>
                  <td className="py-2 pr-2">{rec?.dinner ?? '—'}</td>
                  <td className="py-2 pr-2">{rec?.prasad ?? '—'}</td>
                  <td className="py-2 pr-2 font-bold">{rec ? total : '—'}</td>
                  <td className="py-2 no-print">{rec && <button onClick={() => remove('meals', rec.id)} className="text-xs text-red-500 hover:underline">🗑</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
