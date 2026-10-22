import React, { useState } from 'react';
import { useSabha, uid, todayISO, activeMembers } from './sabhaStore';
import { Training } from './types';
import { T, Card, Btn, Field, inputCls, Modal, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* ------------------------------------------------------------------ */
/* Training & certification — workshops like Veda path and karmakanda */
/* refreshers, with attendance and certificates issued.               */
/* ------------------------------------------------------------------ */

const emptyForm = { title: '', date: todayISO(), venue: '', trainer: '', attendeeIds: [] as string[], notes: '' };

export const TrainingTab: React.FC = () => {
  const { state, add, update, remove } = useSabha();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const certMsg = t('suites.sabha.training.toastCertificate');
  const confirmRemoveMsg = t('suites.sabha.training.confirmRemove');
  const removedMsg = t('suites.sabha.common.toastRemoved');
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const [form, setForm] = useState(emptyForm);
  const members = activeMembers(state);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: todayISO() }); setForming(true); };
  const openEdit = (t: Training) => {
    setEditing(t);
    setForm({ title: t.title, date: t.date, venue: t.venue || '', trainer: t.trainer || '', attendeeIds: [...t.attendeeIds], notes: t.notes || '' });
    setForming(true);
  };

  const toggleAttendee = (id: string) => {
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(id) ? f.attendeeIds.filter((x) => x !== id) : [...f.attendeeIds, id],
    }));
  };

  const save = () => {
    if (!form.title.trim()) { showToast(t('suites.sabha.common.toastNeedTitle'), 'warning'); return; }
    const base = {
      title: form.title.trim(), date: form.date,
      venue: form.venue.trim() || undefined, trainer: form.trainer.trim() || undefined,
      attendeeIds: form.attendeeIds, notes: form.notes.trim() || undefined,
    };
    if (editing) { update('trainings', editing.id, base); showToast(t('suites.sabha.training.toastUpdated'), 'success'); }
    else { add('trainings', { id: uid('tr'), ...base, certificatesIssued: [], createdAt: Date.now() }); showToast(t('suites.sabha.training.toastAdded'), 'success'); }
    setForming(false);
  };

  const issueCert = (t: Training, memberId: string) => {
    if (t.certificatesIssued.includes(memberId)) return;
    update('trainings', t.id, { certificatesIssued: [...t.certificatesIssued, memberId] });
    showToast(certMsg, 'success');
  };

  const list = [...state.trainings].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-stone-700">
            <T en={`${state.trainings.length} trainings`} bn={`${state.trainings.length} প্রশিক্ষণ`} hi={`${state.trainings.length} प्रशिक्षण`} />
          </div>
          <Btn onClick={openNew} className="no-print">＋ <T en="Add training" bn="প্রশিক্ষণ যোগ করুন" hi="प्रशिक्षण जोड़ें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text={t('suites.sabha.training.empty')} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((t) => (
          <Card key={t.id}>
            <div className="font-extrabold text-stone-800">{t.title}</div>
            <div className="text-xs text-stone-500 mt-0.5">
              {fmtDate(t.date)}{t.venue && <> · {t.venue}</>}{t.trainer && <> · <T en="by" bn="দ্বারা" hi="द्वारा" /> {t.trainer}</>}
            </div>
            {t.notes && <div className="text-xs text-stone-500 mt-1">{t.notes}</div>}
            <div className="mt-3 text-xs">
              <div className="font-bold text-stone-600 mb-1.5">
                <T en={`Attendees (${t.attendeeIds.length})`} bn={`অংশগ্রহণকারী (${t.attendeeIds.length})`} hi={`उपस्थित (${t.attendeeIds.length})`} />
              </div>
              {t.attendeeIds.length === 0 && <div className="text-stone-400">—</div>}
              <div className="flex flex-wrap gap-1.5">
                {t.attendeeIds.map((id) => {
                  const m = state.members.find((x) => x.id === id);
                  const cert = t.certificatesIssued.includes(id);
                  return (
                    <span key={id} className={`rounded-full px-2.5 py-1 text-[11px] font-bold border ${cert ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                      {m?.name || '—'}{cert ? ' ✓' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              {t.attendeeIds.filter((id) => !t.certificatesIssued.includes(id)).map((id) => {
                const m = state.members.find((x) => x.id === id);
                return (
                  <Btn key={id} variant="emerald" onClick={() => issueCert(t, id)}>
                    🎓 <T en={`Certificate — ${m?.name || ''}`} bn={`শংসাপত্র — ${m?.name || ''}`} hi={`प्रमाणपत्र — ${m?.name || ''}`} />
                  </Btn>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 no-print">
              <Btn variant="ghost" onClick={() => openEdit(t)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm(confirmRemoveMsg)) { remove('trainings', t.id); showToast(removedMsg, 'info'); } }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? <T en="Edit training" bn="প্রশিক্ষণ সম্পাদনা" hi="प्रशिक्षण संपादित करें" /> : <T en="Add training" bn="প্রশিক্ষণ যোগ করুন" hi="प्रशिक्षण जोड़ें" />} onClose={() => setForming(false)} wide>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Title" bn="শিরোনাম" hi="शीर्षक" />} className="sm:col-span-2">
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Karmakanda refresher — Vivah paddhati" />
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Venue (optional)" bn="স্থান (ঐচ্ছিক)" hi="स्थान (वैकल्पिक)" />}>
              <input className={inputCls} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </Field>
            <Field label={<T en="Trainer (optional)" bn="প্রশিক্ষক (ঐচ্ছিক)" hi="प्रशिक्षक (वैकल्पिक)" />} className="sm:col-span-2">
              <input className={inputCls} value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <span className="block text-xs font-bold text-stone-600 mb-1.5"><T en="Attendees" bn="অংশগ্রহণকারী" hi="उपस्थित" /></span>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.id} type="button" onClick={() => toggleAttendee(m.id)}
                    className={`rounded-full px-3 py-2 text-xs font-bold border min-h-[44px] transition ${form.attendeeIds.includes(m.id) ? 'bg-amber-700 text-amber-50 border-amber-700' : 'bg-white text-stone-600 border-stone-200'}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <Field label={<T en="Notes (optional)" bn="নোট (ঐচ্ছিক)" hi="टिप्पणी (वैकल्पिक)" />} className="sm:col-span-2">
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
