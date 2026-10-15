import React, { useState } from 'react';
import { useMatha, uid, displayName } from './mathaStore';
import { BranchMatha } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Branch mathas — sub-centres with in-charge. */

const emptyForm = { name: '', location: '', inChargeId: '', phone: '', establishedYear: '', notes: '' };

export const BranchesTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<BranchMatha | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditing(null); setForming(true); };
  const openEdit = (b: BranchMatha) => {
    setForm({
      name: b.name, location: b.location, inChargeId: b.inChargeId || '',
      phone: b.phone || '', establishedYear: b.establishedYear || '', notes: b.notes || '',
    });
    setEditing(b);
    setForming(true);
  };

  const save = () => {
    if (!form.name.trim()) { showToast(t('suites.matha.branches.toastNeedName'), 'warning'); return; }
    const payload = {
      name: form.name.trim(), location: form.location.trim(),
      inChargeId: form.inChargeId || undefined, phone: form.phone.trim() || undefined,
      establishedYear: form.establishedYear.trim() || undefined, notes: form.notes.trim() || undefined,
    };
    if (editing) { update('branches', editing.id, payload); showToast(t('suites.matha.branches.toastUpdated'), 'success'); }
    else { add('branches', { ...payload, id: uid('br'), createdAt: Date.now() }); showToast(t('suites.matha.branches.toastAdded'), 'success'); }
    setForming(false);
    setEditing(null);
  };

  const inChargeName = (id?: string) => {
    if (!id) return '—';
    const s = state.sannyasis.find((x) => x.id === id);
    return s ? displayName(s) : '—';
  };

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ {t('suites.matha.branches.add')}</Btn></div>
      {state.branches.length === 0 && <Empty text={t('suites.matha.branches.empty')} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.branches.map((b) => (
          <Card key={b.id}>
            <div className="font-extrabold text-stone-800">🏛️ {b.name}</div>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.common.location')}</span><span className="font-semibold text-right">{b.location || '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.branches.inCharge')}</span><span className="font-semibold text-right">{inChargeName(b.inChargeId)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.common.phone')}</span><span className="font-semibold">{b.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.branches.established')}</span><span className="font-semibold">{b.establishedYear || '—'}</span></div>
              {b.notes && <div className="text-xs text-stone-500 pt-1">{b.notes}</div>}
            </div>
            <div className="flex gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(b)}>{t('suites.matha.common.edit')}</Btn>
              <Btn variant="danger" onClick={() => { remove('branches', b.id); showToast(t('suites.matha.branches.toastRemoved'), 'info'); }}>
                {t('suites.matha.common.remove')}
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? t('suites.matha.branches.modalEdit') : t('suites.matha.branches.modalAdd')} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('suites.matha.branches.branchName')}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.common.location')}>
              <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.branches.inCharge')}>
              <select className={inputCls} value={form.inChargeId} onChange={(e) => setForm({ ...form, inChargeId: e.target.value })}>
                <option value="">—</option>
                {state.sannyasis.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)}
              </select>
            </Field>
            <Field label={t('suites.matha.common.phone')}>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.branches.established')}>
              <input className={inputCls} value={form.establishedYear} onChange={(e) => setForm({ ...form, establishedYear: e.target.value })} placeholder={t('suites.matha.branches.establishedPlaceholder')} />
            </Field>
            <Field label={t('suites.matha.common.notes')}>
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
