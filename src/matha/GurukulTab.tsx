import React, { useState } from 'react';
import { useMatha, uid, todayISO, displayName } from './mathaStore';
import { GurukulStudent } from './types';
import { Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Gurukul — brahmachari students under training. */

const emptyForm = { name: '', age: '', guruId: '', subjects: '', progressNotes: '', joinDate: todayISO(), status: 'studying' as GurukulStudent['status'] };

export const GurukulTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<GurukulStudent | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm({ ...emptyForm, joinDate: todayISO() }); setEditing(null); setForming(true); };
  const openEdit = (s: GurukulStudent) => {
    setForm({
      name: s.name, age: s.age || '', guruId: s.guruId || '', subjects: s.subjects,
      progressNotes: s.progressNotes || '', joinDate: s.joinDate, status: s.status,
    });
    setEditing(s);
    setForming(true);
  };

  const save = () => {
    if (!form.name.trim()) { showToast(t('suites.matha.gurukul.toastNeedName'), 'warning'); return; }
    const payload = {
      name: form.name.trim(), age: form.age.trim() || undefined,
      guruId: form.guruId || undefined, subjects: form.subjects.trim(),
      progressNotes: form.progressNotes.trim() || undefined,
      joinDate: form.joinDate, status: form.status,
    };
    if (editing) { update('students', editing.id, payload); showToast(t('suites.matha.gurukul.toastUpdated'), 'success'); }
    else { add('students', { ...payload, id: uid('gs'), createdAt: Date.now() }); showToast(t('suites.matha.gurukul.toastAdmitted'), 'success'); }
    setForming(false);
    setEditing(null);
  };

  const guruName = (id?: string) => {
    if (!id) return '—';
    const g = state.sannyasis.find((s) => s.id === id);
    return g ? displayName(g) : '—';
  };

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ {t('suites.matha.gurukul.admit')}</Btn></div>
      {state.students.length === 0 && <Empty text={t('suites.matha.gurukul.empty')} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.students.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-extrabold text-stone-800">📿 {s.name}</div>
              <StatusPill status={s.status} />
            </div>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.common.guru')}</span><span className="font-semibold">{guruName(s.guruId)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.gurukul.since')}</span><span className="font-semibold">{fmtDate(s.joinDate)}</span></div>
              {s.age && <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.gurukul.age')}</span><span className="font-semibold">{s.age}</span></div>}
              {s.subjects && <div className="text-xs text-stone-600 pt-1"><span className="font-bold">{t('suites.matha.gurukul.subjects')}: </span>{s.subjects}</div>}
              {s.progressNotes && <div className="text-xs text-stone-500 pt-1">{s.progressNotes}</div>}
            </div>
            <div className="flex gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(s)}>{t('suites.matha.common.edit')}</Btn>
              <Btn variant="danger" onClick={() => { remove('students', s.id); showToast(t('suites.matha.common.recordRemoved'), 'info'); }}>
                {t('suites.matha.common.remove')}
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? t('suites.matha.gurukul.modalEdit') : t('suites.matha.gurukul.modalAdd')} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('suites.matha.common.name')}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.gurukul.age')}>
              <input className={inputCls} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder={t('suites.matha.gurukul.agePlaceholder')} />
            </Field>
            <Field label={t('suites.matha.common.guru')}>
              <select className={inputCls} value={form.guruId} onChange={(e) => setForm({ ...form, guruId: e.target.value })}>
                <option value="">—</option>
                {state.sannyasis.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)}
              </select>
            </Field>
            <Field label={t('suites.matha.gurukul.joinDate')}>
              <input type="date" className={inputCls} value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('suites.matha.gurukul.subjects')}>
                <input className={inputCls} value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} placeholder={t('suites.matha.gurukul.subjectsPlaceholder')} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t('suites.matha.gurukul.progressNotes')}>
                <textarea className={inputCls} rows={2} value={form.progressNotes} onChange={(e) => setForm({ ...form, progressNotes: e.target.value })} />
              </Field>
            </div>
            <Field label={t('suites.matha.common.statusLabel')}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GurukulStudent['status'] })}>
                <option value="studying">{t('suites.matha.common.status.studying')}</option>
                <option value="completed">{t('suites.matha.common.status.completed')}</option>
                <option value="left">{t('suites.matha.common.status.left')}</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}>{t('suites.matha.common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}>{t('suites.matha.common.cancel')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
