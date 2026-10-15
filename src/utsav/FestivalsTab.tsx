import React, { useState } from 'react';
import { useUtsav, uid, daysUntil, todayISO } from './utsavStore';
import { Festival, FestivalStatus } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — festival registry: name, dates, deity, venue, footfall. */

const blank: Omit<Festival, 'id'> = {
  name: '', deity: '', occasion: '', startDate: todayISO(), endDate: todayISO(),
  venue: '', expectedFootfall: 1000, status: 'planned', notes: '',
};

export const FestivalsTab: React.FC = () => {
  const { t } = useLanguage();
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Festival | null>(null);
  const [form, setForm] = useState(blank);

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '' } as Festival); };
  const openEdit = (f: Festival) => {
    setForm({ name: f.name, deity: f.deity, occasion: f.occasion, startDate: f.startDate, endDate: f.endDate, venue: f.venue, expectedFootfall: f.expectedFootfall, status: f.status, notes: f.notes || '' });
    setEditing(f);
  };

  const save = () => {
    if (!form.name.trim()) { showToast(t('ritual.utsav.festivals.toastNameRequired'), 'error'); return; }
    if (form.endDate < form.startDate) { showToast(t('ritual.utsav.festivals.toastDateOrder'), 'error'); return; }
    if (editing && editing.id) {
      update('festivals', editing.id, { ...form });
      showToast(t('ritual.utsav.festivals.toastUpdated'), 'success');
    } else {
      add('festivals', { ...form, id: uid('fv') });
      showToast(t('ritual.utsav.festivals.toastAdded'), 'success');
    }
    setEditing(null);
  };

  const sorted = [...state.festivals].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-stone-800">{t('ritual.utsav.festivals.festivals')}</h2>
        <Btn onClick={openNew}>＋ {t('ritual.utsav.festivals.add_festival')}</Btn>
      </div>

      {sorted.length === 0 && <Card><Empty text={t('ritual.utsav.festivals.empty_no_festivals_yet_add_your_first')} /></Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((f) => {
          const d = daysUntil(f.startDate);
          return (
            <Card key={f.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800 text-lg">{f.name}</div>
                  <div className="text-sm text-stone-500">{f.deity}{f.occasion ? ` · ${f.occasion}` : ''}</div>
                </div>
                <StatusPill status={f.status} />
              </div>
              <div className="mt-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.festivals.dates')}</span><span className="font-semibold">{fmtDate(f.startDate)} → {fmtDate(f.endDate)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{t('ritual.common.venue')}</span><span className="font-semibold">{f.venue || '—'}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.festivals.expected_footfall')}</span><span className="font-semibold">{f.expectedFootfall.toLocaleString('en-IN')}</span></div>
                {d >= 0 && f.status === 'planned' && (
                  <div className="text-orange-700 text-xs font-bold">🗓️ {t('ritual.utsav.festivals.daysToGo').replace('{n}', String(d))}</div>
                )}
                {f.notes && <div className="text-xs text-stone-500 pt-1">{f.notes}</div>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3 no-print">
                <Btn variant="ghost" onClick={() => openEdit(f)}>{t('ritual.common.edit')}</Btn>
                {(['planned', 'ongoing'] as FestivalStatus[]).includes(f.status) && (
                  <Btn variant="ghost" onClick={() => { update('festivals', f.id, { status: f.status === 'planned' ? 'ongoing' : 'completed' }); showToast(t('ritual.utsav.festivals.toastStatusUpdated'), 'success'); }}>
                    {f.status === 'planned' ? t('ritual.utsav.festivals.mark_live') : t('ritual.utsav.festivals.mark_completed')}
                  </Btn>
                )}
                <Btn variant="danger" onClick={() => { remove('festivals', f.id); showToast(t('ritual.utsav.festivals.toastRemoved'), 'success'); }}>{t('ritual.common.remove')}</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal title={editing.id ? t('ritual.utsav.festivals.editFestival') : t('ritual.utsav.festivals.add_festival')} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('ritual.utsav.festivals.festival_name')} className="sm:col-span-2">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sharadiya Durga Puja 2026" />
            </Field>
            <Field label={t('ritual.utsav.festivals.deity')}>
              <input className={inputCls} value={form.deity} onChange={(e) => setForm({ ...form, deity: e.target.value })} placeholder="Maa Durga" />
            </Field>
            <Field label={t('ritual.utsav.festivals.occasion')}>
              <input className={inputCls} value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} placeholder="Sharadiya Navratri" />
            </Field>
            <Field label={t('ritual.utsav.festivals.start_date')}>
              <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label={t('ritual.utsav.festivals.end_date')}>
              <input type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
            <Field label={t('ritual.common.venue')}>
              <input className={inputCls} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Samiti Maidan" />
            </Field>
            <Field label={t('ritual.utsav.festivals.expected_footfall')}>
              <input type="number" min={1} className={inputCls} value={form.expectedFootfall} onChange={(e) => setForm({ ...form, expectedFootfall: Math.max(1, Math.floor(Number(e.target.value) || 0)) })} />
            </Field>
            <Field label={t('ritual.common.status')}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FestivalStatus })}>
                <option value="planned">{t('ritual.utsav.festivals.statusPlanned')}</option>
                <option value="ongoing">{t('ritual.utsav.festivals.statusOngoing')}</option>
                <option value="completed">{t('ritual.utsav.festivals.statusCompleted')}</option>
                <option value="cancelled">{t('ritual.utsav.festivals.statusCancelled')}</option>
              </select>
            </Field>
            <Field label={t('ritual.common.notes')} className="sm:col-span-2">
              <input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}>{t('ritual.common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}>{t('ritual.common.cancel')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
