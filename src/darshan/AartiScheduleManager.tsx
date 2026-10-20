/**
 * darshan/AartiScheduleManager.tsx — trustee editor for aartiSchedules.
 * ============================================================================
 * Trustees manage their temple's published daily aarti schedule here:
 * add, edit, delete (max 8). Devotees see the schedule on the org page and
 * can subscribe to gentle reminders. Parent (OrgPublicPage) owns the write
 * to `orgPages/{orgId}` (updateDoc pattern, same as OrgEventManager).
 */
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { validateAartiSlot, type AartiSlot } from './aartiSchedule';

export const MAX_AARTI_SCHEDULES = 8;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  schedules: AartiSlot[];
  /** Persist the full schedule list to orgPages (parent owns the write). */
  onSave: (schedules: AartiSlot[]) => Promise<void>;
}

interface FormState {
  name: string;
  time: string;
  days: number[]; // empty = daily
}

const EMPTY_FORM: FormState = { name: '', time: '06:00', days: [] };

export const AartiScheduleManager: React.FC<Props> = ({ schedules, onSave }) => {
  const { safeTranslate } = useLanguage();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);

  const [items, setItems] = useState<AartiSlot[]>(schedules || []);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = async (next: AartiSlot[]) => {
    setSaving(true);
    try {
      await onSave(next);
      setItems(next);
      setEditing(null);
      setForm(EMPTY_FORM);
      setFormError(null);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (idx: number) => {
    const s = items[idx];
    setForm({ name: s.name, time: s.time, days: s.days ? [...s.days] : [] });
    setEditing(idx);
    setFormError(null);
  };

  const submitForm = async () => {
    const slot: AartiSlot = {
      name: form.name.trim(),
      time: form.time.trim(),
      ...(form.days.length > 0 ? { days: [...form.days].sort((a, b) => a - b) } : {}),
    };
    const err = validateAartiSlot(slot);
    if (err) {
      setFormError(
        err === 'name-required'
          ? T('aarti_mgr_err_name', 'Please give the aarti a name.', 'আরতির একটি নাম দিন।', 'आरती का नाम दें।')
          : T('aarti_mgr_err_time', 'Please pick a valid time.', 'একটি সঠিক সময় বেছে নিন।', 'सही समय चुनें।'),
      );
      return;
    }
    const next = editing === 'new' ? [...items, slot] : items.map((s, i) => (i === editing ? slot : s));
    if (next.length > MAX_AARTI_SCHEDULES) {
      setFormError(T('aarti_mgr_err_max', `At most ${MAX_AARTI_SCHEDULES} aartis can be published.`, `সর্বোচ্চ ${MAX_AARTI_SCHEDULES}টি আরতি প্রকাশ করা যায়।`, `अधिकतम ${MAX_AARTI_SCHEDULES} आरतियाँ प्रकाशित हो सकती हैं।`));
      return;
    }
    await persist(next.slice(0, MAX_AARTI_SCHEDULES));
  };

  const remove = async (idx: number) => {
    await persist(items.filter((_, i) => i !== idx));
  };

  const toggleDay = (d: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d],
    }));
  };

  const inputCls =
    'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-800 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <section className="bg-amber-50/70 rounded-3xl border border-amber-200 p-6 mt-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-1">
        {T('aarti_mgr_title', '🪔 Manage aarti schedule', '🪔 আরতির সময়সূচি পরিচালনা করুন', '🪔 आरती समय प्रबंधित करें')}
      </h3>
      <p className="text-xs text-stone-500 mb-4">
        {T(
          'aarti_mgr_hint',
          'Devotees see this schedule on your page and can ask for a gentle reminder before each aarti.',
          'ভক্তরা এই সময়সূচি আপনার পৃষ্ঠায় দেখবেন এবং প্রতিটি আরতির আগে মৃদু রিমাইন্ডার চাইতে পারবেন।',
          'भक्त यह समय-सारिणी आपके पेज पर देखेंगे और हर आरती से पहले सौम्य रिमाइंडर मांग सकेंगे।',
        )}
      </p>

      {items.length === 0 && editing === null && (
        <p className="text-sm text-stone-500 italic mb-3">
          {T('aarti_mgr_empty', 'No aartis published yet.', 'এখনও কোনো আরতি প্রকাশিত হয়নি।', 'अभी कोई आरती प्रकाशित नहीं हुई।')}
        </p>
      )}

      <ul className="space-y-2 mb-4">
        {items.map((s, i) => (
          <li key={`${s.name}:${s.time}:${i}`} className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-stone-200 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-800 truncate">{s.name}</p>
              <p className="text-xs text-amber-800 font-semibold">
                {s.time}
                {s.days?.length ? ` · ${s.days.map((d) => DAY_LABELS[d]).join(' ')}` : ` · ${T('aarti_mgr_daily', 'Daily', 'প্রতিদিন', 'रोज़ाना')}`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="min-h-[44px] px-3 rounded-full text-xs font-bold bg-stone-100 text-stone-700 hover:bg-stone-200"
              >
                {T('aarti_mgr_edit', 'Edit', 'সম্পাদনা', 'बदलें')}
              </button>
              <button
                type="button"
                onClick={() => void remove(i)}
                disabled={saving}
                className="min-h-[44px] px-3 rounded-full text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {T('aarti_mgr_delete', 'Delete', 'মুছুন', 'हटाएँ')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing === null ? (
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setFormError(null);
            setEditing('new');
          }}
          disabled={items.length >= MAX_AARTI_SCHEDULES}
          className="min-h-[44px] px-4 rounded-full text-sm font-extrabold bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {T('aarti_mgr_add', '+ Add aarti', '+ আরতি যোগ করুন', '+ आरती जोड़ें')}
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-amber-300 p-4 space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-stone-600">
              {T('aarti_mgr_name', 'Aarti name', 'আরতির নাম', 'आरती का नाम')}
            </span>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Morning Aarti"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-stone-600">
              {T('aarti_mgr_time', 'Time', 'সময়', 'समय')}
            </span>
            <input
              type="time"
              className={inputCls}
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </label>
          <div>
            <span className="text-xs font-bold text-stone-600">
              {T('aarti_mgr_days', 'Days (none selected = daily)', 'দিন (কিছু বেছে না নিলে প্রতিদিন)', 'दिन (कुछ न चुनें तो रोज़ाना)')}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {DAY_LABELS.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={form.days.includes(d)}
                  className={`min-h-[44px] px-3 rounded-full text-xs font-bold border ${
                    form.days.includes(d)
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-white text-stone-600 border-stone-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {formError && <p className="text-xs font-bold text-red-700">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submitForm()}
              disabled={saving}
              className="min-h-[44px] px-4 rounded-full text-sm font-extrabold bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {saving
                ? T('aarti_mgr_saving', 'Saving…', 'সংরক্ষণ হচ্ছে…', 'सहेज रहे हैं…')
                : T('aarti_mgr_save', 'Save aarti', 'আরতি সংরক্ষণ করুন', 'आरती सहेजें')}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="min-h-[44px] px-4 rounded-full text-sm font-bold bg-stone-100 text-stone-700 hover:bg-stone-200"
            >
              {T('aarti_mgr_cancel', 'Cancel', 'বাতিল', 'रद्द करें')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
