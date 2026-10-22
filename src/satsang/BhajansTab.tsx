import React, { useState } from 'react';
import { useSatsang, uid, todayISO, bhajansByStaleness } from './satsangStore';
import { T, Card, Btn, Field, inputCls, Modal, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* ------------------------------------------------------------------ */
/* Bhajan / kirtan repertoire — title, deity, language, lyrics note,   */
/* last-sung date and count. Sorted least-recently-sung first so the   */
/* mandali avoids repeats.                                             */
/* ------------------------------------------------------------------ */

const emptyForm = { title: '', deity: '', language: '', lyricsNote: '' };

export const BhajansTab: React.FC = () => {
  const { state, add, update, remove } = useSatsang();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState('');

  const save = () => {
    if (!form.title.trim()) { showToast(t('suites.satsang.bhajans.toastNeedTitle'), 'warning'); return; }
    add('bhajans', {
      id: uid('b'), title: form.title.trim(),
      deity: form.deity.trim() || undefined, language: form.language.trim() || undefined,
      lyricsNote: form.lyricsNote.trim() || undefined, timesSung: 0, createdAt: Date.now(),
    });
    showToast(t('suites.satsang.bhajans.toastAdded'), 'success');
    setForming(false);
    setForm(emptyForm);
  };

  const markSung = (id: string) => {
    const b = state.bhajans.find((x) => x.id === id);
    if (!b) return;
    update('bhajans', id, { lastSungDate: todayISO(), timesSung: b.timesSung + 1 });
    showToast(t('suites.satsang.bhajans.toastSung').replace('{title}', b.title), 'success');
  };

  const list = bhajansByStaleness(state).filter((b) => !q || b.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className={inputCls + ' max-w-xs'}
            placeholder="Search bhajans…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search bhajans"
          />
          <Btn onClick={() => setForming(true)} className="no-print">＋ <T en="Add bhajan" bn="ভজন যোগ করুন" hi="भजन जोड़ें" /></Btn>
        </div>
        <p className="text-[11px] text-stone-500 mt-2">
          <T en="Sorted least-recently-sung first — pick from the top to avoid repeats." bn="সবচেয়ে কম সম্প্রতি গাওয়া প্রথমে সাজানো — পুনরাবৃত্তি এড়াতে উপর থেকে বেছে নিন।" hi="सबसे पुराने गाए हुए पहले — दोहराव से बचने के लिए ऊपर से चुनें।" />
        </p>
      </Card>

      {list.length === 0 && <Empty text={t('suites.satsang.bhajans.empty')} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">🎵 {b.title}</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {b.deity && <>{b.deity} · </>}
                  {b.language && <>{b.language} · </>}
                  <T en="sung" bn="গাওয়া হয়েছে" hi="गाया गया" /> {b.timesSung}×
                  {b.lastSungDate ? <> · <T en="last" bn="শেষ" hi="अंतिम" /> {fmtDate(b.lastSungDate)}</> : <> · <span className="text-rose-600 font-semibold"><T en="never sung yet" bn="এখনও গাওয়া হয়নি" hi="अभी तक नहीं गाया" /></span></>}
                </div>
                {b.lyricsNote && <div className="text-xs text-stone-500 mt-1">📖 {b.lyricsNote}</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              <Btn variant="emerald" onClick={() => markSung(b.id)}>
                ✓ <T en="Sung today" bn="আজ গাওয়া হয়েছে" hi="आज गाया" />
              </Btn>
              <Btn variant="danger" onClick={() => { remove('bhajans', b.id); showToast(t('suites.satsang.bhajans.toastRemoved'), 'info'); }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={<T en="Add bhajan" bn="ভজন যোগ করুন" hi="भजन जोड़ें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Title" bn="শিরোনাম" hi="शीर्षक" />} className="sm:col-span-2">
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label={<T en="Deity (optional)" bn="দেবতা (ঐচ্ছিক)" hi="देवता (वैकल्पिक)" />}>
              <input className={inputCls} value={form.deity} onChange={(e) => setForm({ ...form, deity: e.target.value })} placeholder="Krishna / Devi / Shiva…" />
            </Field>
            <Field label={<T en="Language (optional)" bn="ভাষা (ঐচ্ছিক)" hi="भाषा (वैकल्पिक)" />}>
              <input className={inputCls} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="Hindi / Bengali / Sanskrit…" />
            </Field>
            <Field label={<T en="Lyrics note (optional)" bn="গানের কথা নোট (ঐচ্ছিক)" hi="पद टिप्पणी (वैकल्पिक)" />} className="sm:col-span-2">
              <input className={inputCls} value={form.lyricsNote} onChange={(e) => setForm({ ...form, lyricsNote: e.target.value })} placeholder="Where are the lyrics kept?" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
