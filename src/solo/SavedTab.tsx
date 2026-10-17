import React, { useState } from 'react';
import { useSoloStore, uid } from './soloStore';
import { Card, T, Btn, Field, inputCls, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import type { SavedItemKind } from './types';

/* SavedTab — shlokas, stotras, discourses, bookmarked posts.
 * ============================================================
 * A personal treasury of texts. Device-local; travels with the
 * Sanatani ID across every future upgrade.
 */

const KINDS: SavedItemKind[] = ['shloka', 'stotram', 'discourse', 'post', 'other'];

export const SavedTab: React.FC = () => {
  const { state, add, remove } = useSoloStore();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [form, setForm] = useState({ kind: 'shloka' as SavedItemKind, title: '', text: '', source: '' });
  const [filter, setFilter] = useState<SavedItemKind | ''>('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast(tr('solo.saved.need', 'Enter a title', 'শিরোনাম দিন', 'शीर्षक दें'), 'warning');
      return;
    }
    add('saved', {
      id: uid('sv'),
      kind: form.kind,
      title: form.title.trim(),
      text: form.text.trim() || undefined,
      source: form.source.trim() || undefined,
      createdAt: Date.now(),
    });
    setForm({ kind: 'shloka', title: '', text: '', source: '' });
    showToast(tr('solo.saved.added', 'Saved', 'সংরক্ষিত', 'संग्रहीत'), 'success');
  };

  const filtered = filter ? state.saved.filter((s) => s.kind === filter) : state.saved;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="Save a text" bn="পাঠ সংরক্ষণ" hi="पाठ संग्रहीत करें" />
        </h2>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
          <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
            <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as SavedItemKind })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label={<T en="Title" bn="শিরোনাম" hi="शीर्षक" />}>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Gayatri Mantra" />
          </Field>
          <div className="sm:col-span-2">
            <Field label={<T en="Text" bn="পাঠ" hi="पाठ" />}>
              <textarea className={`${inputCls} min-h-[90px]`} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="ॐ भूर्भुवः स्वः …" />
            </Field>
          </div>
          <Field label={<T en="Source" bn="উৎস" hi="स्रोत" />}>
            <input className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Rig Veda 3.62.10" />
          </Field>
          <div className="flex items-end">
            <Btn type="submit"><T en="Save" bn="সংরক্ষণ" hi="संग्रहीत करें" /></Btn>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-extrabold text-stone-900">
            <T en="My sacred shelf" bn="আমার পবিত্র তাক" hi="मेरी पवित्र ताक" /> ({filtered.length})
          </h2>
          <select className={`${inputCls} !w-40`} value={filter} onChange={(e) => setFilter(e.target.value as SavedItemKind | '')}>
            <option value="">{tr('solo.saved.all', 'All', 'সব', 'सभी')}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3" aria-hidden>🪔</div>
            <p className="text-sm font-bold text-stone-700">
              <T en="Your sacred shelf is waiting for its first treasure." bn="আপনার পবিত্র তাকে প্রথম রত্নের অপেক্ষা।" hi="आपकी पवित्र ताक अपने पहले रत्न की प्रतीक्षा में है।" />
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
              <T en="Save the shlokas and stotras you love — they stay with you, on this device and beyond." bn="প্রিয় শ্লোক ও স্তোত্র সংরক্ষণ করুন — এই ডিভাইসে এবং তার বাইরেও আপনার সঙ্গে থাকবে।" hi="अपने प्रिय श्लोक और स्तोत्र संग्रहीत करें — इस डिवाइस पर और उसके पार भी आपके साथ रहेंगे।" />
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-black shadow-sm"
            >
              <T en="Save your first text" bn="প্রথম পাঠ সংরক্ষণ করুন" hi="अपना पहला पाठ संग्रहीत करें" />
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => (
              <li key={s.id} className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">{s.kind}</span>
                    <div className="font-bold text-stone-900">{s.title}</div>
                    {s.source && <div className="text-xs text-stone-500">{s.source}</div>}
                  </div>
                  <button onClick={() => remove('saved', s.id)} className="text-xs text-red-500 hover:underline px-2 py-1 shrink-0">✕</button>
                </div>
                {s.text && <p className="text-sm text-stone-700 mt-2 whitespace-pre-wrap leading-relaxed">{s.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
