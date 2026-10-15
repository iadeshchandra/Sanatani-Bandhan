import React, { useState } from 'react';
import { useMatha, uid, todayISO, displayName } from './mathaStore';
import { Sannyasi, SANNYASI_ROLES, SannyasiRole, SannyasiStatus } from './types';
import { Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Sannyasi registry — CRUD for the monastic roll. */

const emptyForm = {
  poorvashramName: '', sannyasName: '', dikshaDate: '', dikshaGuruId: '',
  parampara: '', role: 'sadhak' as SannyasiRole, status: 'resident' as SannyasiStatus,
  contactNote: '', notes: '',
};

export const SannyasiTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<Sannyasi | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState('');

  const openNew = () => {
    setForm({ ...emptyForm, parampara: state.settings.paramparaName });
    setEditing(null);
    setForming(true);
  };
  const openEdit = (s: Sannyasi) => {
    setForm({
      poorvashramName: s.poorvashramName, sannyasName: s.sannyasName,
      dikshaDate: s.dikshaDate || '', dikshaGuruId: s.dikshaGuruId || '',
      parampara: s.parampara, role: s.role, status: s.status,
      contactNote: s.contactNote || '', notes: s.notes || '',
    });
    setEditing(s);
    setForming(true);
  };

  const save = () => {
    if (!form.sannyasName.trim() && !form.poorvashramName.trim()) {
      showToast(t('suites.matha.sannyasi.toastNeedName'), 'warning');
      return;
    }
    const payload = {
      poorvashramName: form.poorvashramName.trim(),
      sannyasName: form.sannyasName.trim(),
      dikshaDate: form.dikshaDate || undefined,
      dikshaGuruId: form.dikshaGuruId || undefined,
      parampara: form.parampara.trim(),
      role: form.role, status: form.status,
      contactNote: form.contactNote.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editing) {
      update('sannyasis', editing.id, payload);
      showToast(t('suites.matha.sannyasi.toastUpdated'), 'success');
    } else {
      add('sannyasis', { ...payload, id: uid('sn'), createdAt: Date.now() });
      showToast(t('suites.matha.sannyasi.toastAdded'), 'success');
    }
    setForming(false);
    setEditing(null);
  };

  const guruName = (id?: string) => {
    if (!id) return '—';
    const g = state.sannyasis.find((s) => s.id === id);
    return g ? displayName(g) : '—';
  };

  const list = state.sannyasis
    .filter((s) => {
      const hay = `${s.sannyasName} ${s.poorvashramName} ${s.parampara}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    })
    .sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 no-print">
        <Btn onClick={openNew}>＋ {t('suites.matha.sannyasi.add')}</Btn>
        <input className={inputCls} style={{ maxWidth: 260 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('suites.matha.sannyasi.searchPlaceholder')} />
      </div>

      {list.length === 0 && <Empty text={t('suites.matha.sannyasi.registryEmpty')} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{displayName(s)}</div>
                {s.sannyasName && s.poorvashramName && (
                  <div className="text-xs text-stone-500">{t('suites.matha.sannyasi.poorvashram')}: {s.poorvashramName}</div>
                )}
              </div>
              <StatusPill status={s.status} />
            </div>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.common.role')}</span><span className="font-semibold">{t(`suites.matha.common.roles.${s.role}`)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.sannyasi.parampara')}</span><span className="font-semibold">{s.parampara || '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.sannyasi.dikshaGuru')}</span><span className="font-semibold">{guruName(s.dikshaGuruId)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('suites.matha.sannyasi.dikshaDate')}</span><span className="font-semibold">{fmtDate(s.dikshaDate || '')}</span></div>
              {s.notes && <div className="text-xs text-stone-500 pt-1">{s.notes}</div>}
            </div>
            <div className="flex gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(s)}>{t('suites.matha.common.edit')}</Btn>
              <Btn variant="danger" onClick={() => { remove('sannyasis', s.id); showToast(t('suites.matha.common.recordRemoved'), 'info'); }}>
                {t('suites.matha.common.remove')}
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? t('suites.matha.sannyasi.modalEdit') : t('suites.matha.sannyasi.modalAdd')} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('suites.matha.sannyasi.sannyasName')}>
              <input className={inputCls} value={form.sannyasName} onChange={(e) => setForm({ ...form, sannyasName: e.target.value })} placeholder={t('suites.matha.sannyasi.sannyasNamePlaceholder')} />
            </Field>
            <Field label={t('suites.matha.sannyasi.poorvashramName')}>
              <input className={inputCls} value={form.poorvashramName} onChange={(e) => setForm({ ...form, poorvashramName: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.sannyasi.dikshaDate')}>
              <input type="date" className={inputCls} value={form.dikshaDate} onChange={(e) => setForm({ ...form, dikshaDate: e.target.value })} />
            </Field>
            <Field label={t('suites.matha.sannyasi.dikshaGuru')}>
              <select className={inputCls} value={form.dikshaGuruId} onChange={(e) => setForm({ ...form, dikshaGuruId: e.target.value })}>
                <option value="">—</option>
                {state.sannyasis.filter((s) => !editing || s.id !== editing.id).map((s) => (
                  <option key={s.id} value={s.id}>{displayName(s)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('suites.matha.sannyasi.parampara')}>
              <input className={inputCls} value={form.parampara} onChange={(e) => setForm({ ...form, parampara: e.target.value })} placeholder={t('suites.matha.sannyasi.paramparaPlaceholder')} />
            </Field>
            <Field label={t('suites.matha.common.role')}>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as SannyasiRole })}>
                {SANNYASI_ROLES.map((r) => <option key={r} value={r}>{t(`suites.matha.common.roles.${r}`)}</option>)}
              </select>
            </Field>
            <Field label={t('suites.matha.common.statusLabel')}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SannyasiStatus })}>
                <option value="resident">{t('suites.matha.common.status.resident')}</option>
                <option value="itinerant">{t('suites.matha.common.status.itinerant')}</option>
                <option value="mahasamadhi">{t('suites.matha.common.status.mahasamadhi')}</option>
              </select>
            </Field>
            <Field label={t('suites.matha.sannyasi.contactNote')}>
              <input className={inputCls} value={form.contactNote} onChange={(e) => setForm({ ...form, contactNote: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('suites.matha.common.notes')}>
                <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
