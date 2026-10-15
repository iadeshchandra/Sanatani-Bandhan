import React, { useState } from 'react';
import { useMatha, uid, displayName, nextOccurrence, daysUntil } from './mathaStore';
import { Observance } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty, fmtMonthDay } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Utsav — matha-specific observances: Guru Purnima, diksha anniversaries, festivals. */

const emptyForm = { name: '', monthDay: '', kind: 'festival' as Observance['kind'], relatedId: '', notes: '' };

export const UtsavTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<Observance | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditing(null); setForming(true); };
  const openEdit = (o: Observance) => {
    setForm({ name: o.name, monthDay: o.monthDay, kind: o.kind, relatedId: o.relatedId || '', notes: o.notes || '' });
    setEditing(o);
    setForming(true);
  };

  const save = () => {
    if (!form.name.trim() || !/^\d{2}-\d{2}$/.test(form.monthDay)) {
      showToast(t('suites.matha.utsav.toastNeedNameDate'), 'warning');
      return;
    }
    const payload = {
      name: form.name.trim(), monthDay: form.monthDay, kind: form.kind,
      relatedId: form.relatedId || undefined, notes: form.notes.trim() || undefined,
    };
    if (editing) { update('observances', editing.id, payload); showToast(t('suites.matha.utsav.toastUpdated'), 'success'); }
    else { add('observances', { ...payload, id: uid('ob'), createdAt: Date.now() }); showToast(t('suites.matha.utsav.toastAdded'), 'success'); }
    setForming(false);
    setEditing(null);
  };

  const relatedName = (id?: string) => {
    if (!id) return null;
    const s = state.sannyasis.find((x) => x.id === id);
    return s ? displayName(s) : null;
  };

  const list = [...state.observances].sort((a, b) => daysUntil(nextOccurrence(a.monthDay)) - daysUntil(nextOccurrence(b.monthDay)));

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ {t('suites.matha.utsav.add')}</Btn></div>
      {list.length === 0 && <Empty text={t('suites.matha.utsav.empty')} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((o) => {
          const inDays = daysUntil(nextOccurrence(o.monthDay));
          const rel = relatedName(o.relatedId);
          return (
            <Card key={o.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-extrabold text-stone-800">🪔 {o.name}</div>
                <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1 shrink-0">
                  {inDays === 0 ? t('suites.matha.common.today') : t('suites.matha.common.daysShort').replace('{days}', String(inDays))}
                </span>
              </div>
              <div className="mt-2 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.utsav.yearlyDate')}</span><span className="font-semibold">{fmtMonthDay(o.monthDay)}</span></div>
                {rel && <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.utsav.whose')}</span><span className="font-semibold">{rel}</span></div>}
                {o.notes && <div className="text-xs text-stone-500 pt-1">{o.notes}</div>}
              </div>
              <div className="flex gap-2 mt-3 no-print">
                <Btn variant="ghost" onClick={() => openEdit(o)}>{t('suites.matha.common.edit')}</Btn>
                <Btn variant="danger" onClick={() => { remove('observances', o.id); showToast(t('suites.matha.utsav.toastRemoved'), 'info'); }}>
                  {t('suites.matha.common.remove')}
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {forming && (
        <Modal title={editing ? t('suites.matha.utsav.modalEdit') : t('suites.matha.utsav.modalAdd')} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('suites.matha.common.name')}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('suites.matha.utsav.namePlaceholder')} />
            </Field>
            <Field label={t('suites.matha.utsav.dateLabel')}>
              <input className={inputCls} value={form.monthDay} onChange={(e) => setForm({ ...form, monthDay: e.target.value })} placeholder={t('suites.matha.utsav.datePlaceholder')} />
            </Field>
            <Field label={t('suites.matha.utsav.kind')}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Observance['kind'] })}>
                <option value="guru-purnima">{t('suites.matha.utsav.kindGuruPurnima')}</option>
                <option value="diksha-anniversary">{t('suites.matha.utsav.kindDikshaAnniversary')}</option>
                <option value="festival">{t('suites.matha.utsav.kindFestival')}</option>
                <option value="other">{t('suites.matha.utsav.kindOther')}</option>
              </select>
            </Field>
            <Field label={t('suites.matha.utsav.relatedSannyasi')}>
              <select className={inputCls} value={form.relatedId} onChange={(e) => setForm({ ...form, relatedId: e.target.value })}>
                <option value="">—</option>
                {state.sannyasis.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('suites.matha.common.notes')}>
                <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
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
