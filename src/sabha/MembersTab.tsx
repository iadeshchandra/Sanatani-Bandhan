import React, { useState } from 'react';
import { useSabha, uid, todayISO } from './sabhaStore';
import { Member, SPECIALIZATIONS, SPEC_LABEL, TIER_LABEL, VerificationTier } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* ------------------------------------------------------------------ */
/* Member directory — purohit members with specializations, experience */
/* and a display-only verification tier (managed in Purohit One).     */
/* ------------------------------------------------------------------ */

const TIERS: VerificationTier[] = ['unverified', 'bronze', 'silver', 'gold'];

const emptyForm = {
  name: '', phone: '', specializations: [] as Member['specializations'],
  experienceYears: '', verificationTier: 'unverified' as VerificationTier,
  joinDate: todayISO(), active: true, notes: '',
};

export const MembersTab: React.FC = () => {
  const { state, add, update, remove } = useSabha();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, joinDate: todayISO() }); setForming(true); };
  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      name: m.name, phone: m.phone || '', specializations: [...m.specializations],
      experienceYears: m.experienceYears !== undefined ? String(m.experienceYears) : '',
      verificationTier: m.verificationTier, joinDate: m.joinDate,
      active: m.active, notes: m.notes || '',
    });
    setForming(true);
  };

  const toggleSpec = (s: Member['specializations'][number]) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));
  };

  const save = () => {
    if (!form.name.trim()) { showToast(t('suites.sabha.members.toastNeedName'), 'warning'); return; }
    const base = {
      name: form.name.trim(), phone: form.phone.trim() || undefined,
      specializations: form.specializations,
      experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
      verificationTier: form.verificationTier, joinDate: form.joinDate,
      active: form.active, notes: form.notes.trim() || undefined,
    };
    if (editing) {
      update('members', editing.id, base);
      showToast(t('suites.sabha.members.toastUpdated'), 'success');
    } else {
      add('members', { id: uid('m'), ...base, createdAt: Date.now() });
      showToast(t('suites.sabha.members.toastAdded'), 'success');
    }
    setForming(false);
  };

  const q = query.trim().toLowerCase();
  const list = [...state.members]
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.specializations.some((s) => SPEC_LABEL[s].toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-stone-700">
            <T en={`${state.members.length} members`} bn={`${state.members.length} সদস্য`} hi={`${state.members.length} सदस्य`} />
          </div>
          <div className="flex gap-2">
            <input className={inputCls} style={{ maxWidth: 220 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name / specialization" />
            <Btn onClick={openNew} className="no-print">＋ <T en="Add member" bn="সদস্য যোগ করুন" hi="सदस्य जोड़ें" /></Btn>
          </div>
        </div>
      </Card>

      {list.length === 0 && <Empty text={t('suites.sabha.members.empty')} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{m.name}</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {m.phone && <>{m.phone} · </>}
                  {m.experienceYears !== undefined && <>{m.experienceYears} <T en="yrs exp" bn="বছর অভিজ্ঞতা" hi="वर्ष अनुभव" /> · </>}
                  <T en="since" bn="থেকে" hi="से" /> {fmtDate(m.joinDate)}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.specializations.map((s) => (
                    <span key={s} className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-2 py-0.5 font-semibold">{SPEC_LABEL[s]}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusPill status={m.active ? 'active' : 'inactive'} />
                <StatusPill status={m.verificationTier} />
              </div>
            </div>
            {m.notes && <div className="text-xs text-stone-500 mt-2">{m.notes}</div>}
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(m)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
              <Btn variant="ghost" onClick={() => { update('members', m.id, { active: !m.active }); }}>
                {m.active ? <T en="Deactivate" bn="নিষ্ক্রিয়" hi="निष्क्रिय करें" /> : <T en="Activate" bn="সক্রিয়" hi="सक्रिय करें" />}
              </Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm(t('suites.sabha.members.confirmRemove'))) { remove('members', m.id); showToast(t('suites.sabha.members.toastRemoved'), 'info'); } }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
            <div className="text-[11px] text-stone-400 mt-2">
              <T en="Verification tier is display-only — managed in Purohit One." bn="যাচাইকরণ স্তর শুধু প্রদর্শনের জন্য — Purohit One-এ পরিচালিত।" hi="सत्यापन स्तर केवल प्रदर्शन हेतु है — Purohit One में प्रबंधित।" />
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? <T en="Edit member" bn="সদস্য সম্পাদনা" hi="सदस्य संपादित करें" /> : <T en="Add member" bn="সদস্য যোগ করুন" hi="सदस्य जोड़ें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Name" bn="নাম" hi="नाम" />} className="sm:col-span-2">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pt. Ramesh Shastri" />
            </Field>
            <Field label={<T en="Phone (optional)" bn="ফোন (ঐচ্ছিক)" hi="फ़ोन (वैकल्पिक)" />}>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={<T en="Experience (years)" bn="অভিজ্ঞতা (বছর)" hi="अनुभव (वर्ष)" />}>
              <input type="number" min="0" className={inputCls} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
            </Field>
            <Field label={<T en="Join date" bn="যোগদানের তারিখ" hi="जुड़ने की तिथि" />}>
              <input type="date" className={inputCls} value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </Field>
            <Field label={<T en="Verification tier (display-only)" bn="যাচাইকরণ স্তর (শুধু প্রদর্শন)" hi="सत्यापन स्तर (केवल प्रदर्शन)" />}>
              <select className={inputCls} value={form.verificationTier} onChange={(e) => setForm({ ...form, verificationTier: e.target.value as VerificationTier })}>
                {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <span className="block text-xs font-bold text-stone-600 mb-1.5"><T en="Specializations" bn="বিশেষায়ন" hi="विशेषज्ञता" /></span>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALIZATIONS.map((s) => (
                  <button
                    key={s} type="button" onClick={() => toggleSpec(s)}
                    className={`rounded-full px-3 py-2 text-xs font-bold border min-h-[44px] transition ${form.specializations.includes(s) ? 'bg-amber-700 text-amber-50 border-amber-700' : 'bg-white text-stone-600 border-stone-200'}`}
                  >
                    {SPEC_LABEL[s]}
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
