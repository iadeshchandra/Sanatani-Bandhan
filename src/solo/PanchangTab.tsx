import React, { useMemo, useState } from 'react';
import { useSoloStore, uid, todayISO } from './soloStore';
import { Card, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { calculatePanchang } from '../utils/panchang';
import type { ReminderKind } from './types';

/* PanchangTab — today's panchang + personal reminders.
 * =====================================================================
 * Ekadashi / Purnima / Amavasya quick-add, plus personal dates
 * (shraddha anniversaries, family vrats). Reminders are device-local.
 */

const QUICK_VRATAS = [
  { en: 'Ekadashi', bn: 'একাদশী', hi: 'एकादशी' },
  { en: 'Purnima', bn: 'পূর্ণিমা', hi: 'पूर्णिमा' },
  { en: 'Amavasya', bn: 'অমাবস্যা', hi: 'अमावस्या' },
  { en: 'Pradosh', bn: 'প্রদোষ', hi: 'प्रदोष' },
  { en: 'Sankashti', bn: 'সংকষ্টী', hi: 'संकष्टी' },
];

export const PanchangTab: React.FC = () => {
  const { state, add, remove } = useSoloStore();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [form, setForm] = useState({ title: '', date: todayISO(), kind: 'vrata' as ReminderKind, notes: '' });

  const panchang = useMemo(() => {
    try {
      return calculatePanchang(new Date());
    } catch {
      return null;
    }
  }, []);

  const today = todayISO();
  const upcoming = [...state.reminders].sort((a, b) => a.date.localeCompare(b.date));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast(tr('solo.panchang.need', 'Enter a title', 'শিরোনাম দিন', 'शीर्षक दें'), 'warning');
      return;
    }
    add('reminders', {
      id: uid('r'),
      title: form.title.trim(),
      date: form.date,
      kind: form.kind,
      notes: form.notes.trim() || undefined,
      createdAt: Date.now(),
    });
    setForm({ title: '', date: todayISO(), kind: 'vrata', notes: '' });
    showToast(tr('solo.panchang.added', 'Reminder added', 'রিমাইন্ডার যোগ হয়েছে', 'रिमाइंडर जुड़ा'), 'success');
  };

  const quickAdd = (name: { en: string; bn: string; hi: string }) => {
    add('reminders', {
      id: uid('r'),
      title: tr('solo.panchang.q', name.en, name.bn, name.hi),
      date: today,
      kind: 'vrata',
      createdAt: Date.now(),
    });
    showToast(tr('solo.panchang.added', 'Reminder added', 'রিমাইন্ডার যোগ হয়েছে', 'रिमाइंडर जुड़ा'), 'success');
  };

  return (
    <div className="space-y-4">
      {/* Today's panchang */}
      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="Today's panchang" bn="আজকের পঞ্জিকা" hi="आज का पञ्चाङ्ग" />
        </h2>
        {panchang ? (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {(
              [
                ['Tithi', 'তিথি', 'तिथि', panchang.tithi],
                ['Nakshatra', 'নক্ষত্র', 'नक्षत्र', panchang.nakshatra],
                ['Yoga', 'যোগ', 'योग', panchang.yoga],
                ['Karana', 'করণ', 'करण', panchang.karana],
                ['Vara', 'বার', 'वार', panchang.vaara],
                ['Lunar month', 'চান্দ্র মাস', 'चांद्र मास', panchang.lunarMonth],
              ] as const
            ).map(([en, bn, hi, val]) => (
              <div key={en} className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                <dt className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                  <T en={en} bn={bn} hi={hi} />
                </dt>
                <dd className="font-bold text-stone-800 mt-0.5">{String(val || '—')}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Empty text={tr('solo.panchang.unavailable', 'Panchang unavailable right now.', 'পঞ্জিকা এখন পাওয়া যাচ্ছে না।', 'पञ्चाङ्ग अभी उपलब्ध नहीं।')} />
        )}
        <div className="mt-4">
          <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">
            <T en="Quick-add vrata" bn="দ্রুত ব্রত যোগ" hi="त्वरित व्रत जोड़ें" />
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_VRATAS.map((q) => (
              <Btn key={q.en} variant="ghost" onClick={() => quickAdd(q)}>
                <T en={q.en} bn={q.bn} hi={q.hi} />
              </Btn>
            ))}
          </div>
        </div>
      </Card>

      {/* Personal reminders */}
      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="My reminders" bn="আমার রিমাইন্ডার" hi="मेरे रिमाइंडर" />
        </h2>
        <form onSubmit={submit} className="grid sm:grid-cols-4 gap-3 mb-4">
          <Field label={<T en="Title" bn="শিরোনাম" hi="शीर्षक" />}>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Pitru shraddha" />
          </Field>
          <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
            <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ReminderKind })}>
              <option value="vrata">{tr('solo.panchang.vrata', 'Vrata', 'ব্রত', 'व्रत')}</option>
              <option value="shraddha">{tr('solo.panchang.shraddha', 'Shraddha', 'শ্রাদ্ধ', 'श्राद्ध')}</option>
              <option value="personal">{tr('solo.panchang.personal', 'Personal', 'ব্যক্তিগত', 'व्यक्तिगत')}</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Btn type="submit"><T en="Add" bn="যোগ" hi="जोड़ें" /></Btn>
          </div>
        </form>
        {upcoming.length === 0 ? (
          <Empty text={tr('solo.panchang.none', 'No reminders yet.', 'এখনও কোনো রিমাইন্ডার নেই।', 'अभी कोई रिमाइंडर नहीं।')} />
        ) : (
          <ul className="space-y-1">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-50">
                <span>
                  <b className="text-stone-800">{r.title}</b>{' '}
                  <span className="text-xs text-stone-400">· {r.kind}</span>
                  <span className={`ml-2 text-xs font-bold ${r.date < today ? 'text-stone-400' : r.date === today ? 'text-amber-700' : 'text-emerald-600'}`}>
                    {r.date}
                  </span>
                </span>
                <button onClick={() => remove('reminders', r.id)} className="text-xs text-red-500 hover:underline px-2 py-1">✕</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
