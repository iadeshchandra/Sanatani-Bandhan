import React, { useState } from 'react';
import { useMatha, uid, displayName } from './mathaStore';
import { SevaAssignment } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Seva assignments — rotating duties across the matha. */

const SEVA_SUGGESTIONS = ['Rasoi (kitchen)', 'Dwar (gate)', 'Udyan (garden)', 'Pustakalaya (library)', 'Goshala', 'Office', 'Safai', 'Atithi seva'];
const emptyForm = { seva: '', assigneeId: '', assigneeKind: 'sannyasi' as SevaAssignment['assigneeKind'], frequency: 'Daily', notes: '' };

export const SevaTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<SevaAssignment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditing(null); setForming(true); };
  const openEdit = (a: SevaAssignment) => {
    setForm({ seva: a.seva, assigneeId: a.assigneeId, assigneeKind: a.assigneeKind, frequency: a.frequency, notes: a.notes || '' });
    setEditing(a);
    setForming(true);
  };

  const save = () => {
    if (!form.seva.trim() || !form.assigneeId) { showToast(t('suites.matha.seva.toastNeedSevaAssignee'), 'warning'); return; }
    const payload = {
      seva: form.seva.trim(), assigneeId: form.assigneeId, assigneeKind: form.assigneeKind,
      frequency: form.frequency.trim() || 'Daily', notes: form.notes.trim() || undefined,
    };
    if (editing) { update('seva', editing.id, payload); showToast(t('suites.matha.seva.toastUpdated'), 'success'); }
    else { add('seva', { ...payload, id: uid('sv'), createdAt: Date.now() }); showToast(t('suites.matha.seva.toastAssigned'), 'success'); }
    setForming(false);
    setEditing(null);
  };

  const assigneeName = (a: SevaAssignment) => {
    if (a.assigneeKind === 'sannyasi') {
      const s = state.sannyasis.find((x) => x.id === a.assigneeId);
      return s ? displayName(s) : '—';
    }
    const s = state.students.find((x) => x.id === a.assigneeId);
    return s ? s.name : '—';
  };

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ {t('suites.matha.seva.assign')}</Btn></div>
      {state.seva.length === 0 && <Empty text={t('suites.matha.seva.empty')} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.seva.map((a) => (
          <Card key={a.id}>
            <div className="font-extrabold text-stone-800">🪔 {a.seva}</div>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.seva.assignedTo')}</span><span className="font-semibold text-right">{assigneeName(a)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.seva.frequency')}</span><span className="font-semibold">{a.frequency}</span></div>
              {a.notes && <div className="text-xs text-stone-500 pt-1">{a.notes}</div>}
            </div>
            <div className="flex gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(a)}>{t('suites.matha.common.edit')}</Btn>
              <Btn variant="danger" onClick={() => { remove('seva', a.id); showToast(t('suites.matha.seva.toastRemoved'), 'info'); }}>
                {t('suites.matha.common.remove')}
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? t('suites.matha.seva.modalEdit') : t('suites.matha.seva.modalAdd')} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('suites.matha.seva.sevaLabel')}>
              <input className={inputCls} list="seva-suggestions" value={form.seva} onChange={(e) => setForm({ ...form, seva: e.target.value })} placeholder={t('suites.matha.seva.sevaPlaceholder')} />
              <datalist id="seva-suggestions">
                {SEVA_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </Field>
            <Field label={t('suites.matha.seva.assigneeType')}>
              <select className={inputCls} value={form.assigneeKind} onChange={(e) => setForm({ ...form, assigneeKind: e.target.value as SevaAssignment['assigneeKind'], assigneeId: '' })}>
                <option value="sannyasi">{t('suites.matha.seva.assigneeTypeSannyasi')}</option>
                <option value="student">{t('suites.matha.seva.assigneeTypeStudent')}</option>
              </select>
            </Field>
            <Field label={t('suites.matha.seva.assignee')}>
              <select className={inputCls} value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">—</option>
                {form.assigneeKind === 'sannyasi'
                  ? state.sannyasis.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)
                  : state.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label={t('suites.matha.seva.frequency')}>
              <input className={inputCls} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder={t('suites.matha.seva.frequencyPlaceholder')} />
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
