import React, { useMemo, useState } from 'react';
import { useAshram, uid, todayISO, daysFrom, roomLoadOn } from './ashramStore';
import { Card, Btn, Field, inputCls, T, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';

/* Ashram One — Bhandara / kitchen link: daily meal counts derived from
 * occupancy (auto-suggested, confirmable) with manual override. Feeds
 * Annakshetra planning downstream. */

export const BhandaraTab: React.FC = () => {
  const { state, add, update, remove } = useAshram();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [f, setF] = useState({ breakfast: 0, lunch: 0, dinner: 0, notes: '' });

  const suggestion = useMemo(() => {
    const guests = state.rooms
      .filter((r) => r.status !== 'maintenance')
      .reduce((s, r) => s + roomLoadOn(r, date, state).used, 0);
    const per = state.settings.mealsPerGuest;
    const each = Math.ceil((guests * per) / 3);
    return { guests, breakfast: each, lunch: each, dinner: each };
  }, [state, date]);

  const existing = state.meals.find((m) => m.date === date);

  const useSuggestion = () => {
    setF({ breakfast: suggestion.breakfast, lunch: suggestion.lunch, dinner: suggestion.dinner, notes: '' });
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      breakfast: Math.max(0, Math.floor(f.breakfast)),
      lunch: Math.max(0, Math.floor(f.lunch)),
      dinner: Math.max(0, Math.floor(f.dinner)),
      notes: f.notes.trim() || undefined,
      autoSuggested: false as boolean,
    };
    if (existing) {
      update('meals', existing.id, payload);
    } else {
      add('meals', { id: uid('m'), date, ...payload });
    }
    showToast(tr('ashram.bh.saved', `Meal count saved for ${date}.`, 'সংরক্ষিত।', 'सहेजा गया।'), 'success');
  };

  const week = useMemo(
    () => [0, 1, 2, 3, 4, 5, 6].map((n) => {
      const d = daysFrom(n - 3);
      const rec = state.meals.find((m) => m.date === d);
      const g = state.rooms.filter((r) => r.status !== 'maintenance')
        .reduce((s, r) => s + roomLoadOn(r, d, state).used, 0);
      return { d, rec, guests: g };
    }),
    [state],
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Field label={tr('ashram.bh.date', 'Date', 'তারিখ', 'तिथि')} className="sm:w-48">
            <input type="date" className={inputCls} value={date} onChange={(e) => { setDate(e.target.value); setF({ breakfast: 0, lunch: 0, dinner: 0, notes: '' }); }} />
          </Field>
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900 flex-1">
            🍲 {tr('ashram.bh.suggest', 'Auto-suggestion from occupancy', 'দখল থেকে পরামর্শ', 'अधिभोग से सुझाव')}:{' '}
            <b>{suggestion.guests} {tr('ashram.bh.guests', 'guests', 'অতিথি', 'अतिथि')}</b> →{' '}
            {suggestion.breakfast}/{suggestion.lunch}/{suggestion.dinner}{' '}
            <span className="text-amber-700">({tr('ashram.bh.bld', 'breakfast/lunch/dinner', 'জলখাবার/দুপুর/রাত', 'नाश्ता/दोपहर/रात')})</span>
            <button type="button" onClick={useSuggestion} className="ml-2 underline font-bold no-print">
              {tr('ashram.bh.use', 'Use suggestion', 'ব্যবহার', 'उपयोग करें')}
            </button>
          </div>
        </div>

        <form onSubmit={save} className="grid grid-cols-3 gap-3 mt-4">
          <Field label={tr('ashram.bh.bf', 'Breakfast', 'জলখাবার', 'नाश्ता')}>
            <input type="number" min={0} className={inputCls} value={f.breakfast} onChange={(e) => setF({ ...f, breakfast: Number(e.target.value) })} />
          </Field>
          <Field label={tr('ashram.bh.ln', 'Lunch', 'দুপুরের খাবার', 'दोपहर का भोजन')}>
            <input type="number" min={0} className={inputCls} value={f.lunch} onChange={(e) => setF({ ...f, lunch: Number(e.target.value) })} />
          </Field>
          <Field label={tr('ashram.bh.dn', 'Dinner', 'রাতের খাবার', 'रात का भोजन')}>
            <input type="number" min={0} className={inputCls} value={f.dinner} onChange={(e) => setF({ ...f, dinner: Number(e.target.value) })} />
          </Field>
          <Field label={tr('ashram.bh.notes', 'Notes (optional)', 'মন্তব্য', 'टिप्पणी')} className="col-span-3">
            <input className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={tr('ashram.bh.notesPh', 'Special bhandara, festival…', 'বিশেষ ভাণ্ডারা…', 'विशेष भंडारा…')} />
          </Field>
          <div className="col-span-3 flex gap-2 no-print">
            <Btn type="submit" className="flex-1">
              {existing ? tr('ashram.bh.update', 'Update meal count', 'হালনাগাদ', 'अद्यतन') : tr('ashram.bh.save', 'Save meal count', 'সংরক্ষণ', 'सहेजें')}
            </Btn>
            {existing && (
              <Btn variant="danger" type="button" onClick={() => { if (window.confirm(tr('ashram.bh.delQ', 'Delete this meal count?', 'মুছবেন?', 'हटाएं?'))) remove('meals', existing.id); }}>
                {tr('ashram.common.delete', 'Delete', 'মুছুন', 'हटाएं')}
              </Btn>
            )}
          </div>
        </form>
        {existing?.autoSuggested && (
          <p className="text-xs text-stone-500 mt-2">🤖 {tr('ashram.bh.autoNote', 'This entry was auto-suggested — confirm or edit the counts.', 'স্বয়ংক্রিয় পরামর্শ।', 'स्वतः सुझाव।')}</p>
        )}
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">
          <T en="7-day meal plan" bn="৭ দিনের খাবার" hi="7-दिन भोजन योजना" />
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                <th className="py-2 pr-3">{tr('ashram.bh.date', 'Date', 'তারিখ', 'तिथि')}</th>
                <th className="py-2 pr-3">{tr('ashram.bh.guests', 'Guests', 'অতিথি', 'अतिथि')}</th>
                <th className="py-2 pr-3">{tr('ashram.bh.bf', 'Breakfast', 'জলখাবার', 'नाश्ता')}</th>
                <th className="py-2 pr-3">{tr('ashram.bh.ln', 'Lunch', 'দুপুরের খাবার', 'दोपहर का भोजन')}</th>
                <th className="py-2 pr-3">{tr('ashram.bh.dn', 'Dinner', 'রাতের খাবার', 'रात का भोजन')}</th>
                <th className="py-2">{tr('ashram.bh.status', 'Status', 'অবস্থা', 'स्थिति')}</th>
              </tr>
            </thead>
            <tbody>
              {week.map(({ d, rec, guests }) => (
                <tr key={d} className={`border-b border-stone-100 ${d === todayISO() ? 'bg-amber-50/60 font-semibold' : ''}`}>
                  <td className="py-2 pr-3">{d}</td>
                  <td className="py-2 pr-3">{guests}</td>
                  <td className="py-2 pr-3">{rec ? rec.breakfast : '—'}</td>
                  <td className="py-2 pr-3">{rec ? rec.lunch : '—'}</td>
                  <td className="py-2 pr-3">{rec ? rec.dinner : '—'}</td>
                  <td className="py-2 text-xs">{rec ? (rec.autoSuggested ? '🤖 auto' : '✓ confirmed') : <span className="text-stone-400">pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-500 mt-3">
          📦 {tr('ashram.bh.annakshetra', 'These counts feed Annakshetra kitchen planning downstream.', 'অন্নক্ষেত্র পরিকল্পনায় কাজে লাগে।', 'अन्नक्षेत्र योजना में काम आता है।')}
        </p>
      </Card>
    </div>
  );
};
