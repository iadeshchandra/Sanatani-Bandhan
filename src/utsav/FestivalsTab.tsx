import React, { useState } from 'react';
import { useUtsav, uid, daysUntil, todayISO } from './utsavStore';
import { Festival, FestivalStatus } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';

/* Utsav One — festival registry: name, dates, deity, venue, footfall. */

const blank: Omit<Festival, 'id'> = {
  name: '', deity: '', occasion: '', startDate: todayISO(), endDate: todayISO(),
  venue: '', expectedFootfall: 1000, status: 'planned', notes: '',
};

export const FestivalsTab: React.FC = () => {
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
    if (!form.name.trim()) { showToast('Festival name is required.', 'error'); return; }
    if (form.endDate < form.startDate) { showToast('End date cannot be before start date.', 'error'); return; }
    if (editing && editing.id) {
      update('festivals', editing.id, { ...form });
      showToast('Festival updated.', 'success');
    } else {
      add('festivals', { ...form, id: uid('fv') });
      showToast('Festival added.', 'success');
    }
    setEditing(null);
  };

  const sorted = [...state.festivals].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Festivals" bn="উৎসবসমূহ" hi="उत्सव" /></h2>
        <Btn onClick={openNew}>＋ <T en="Add festival" bn="উৎসব যোগ" hi="उत्सव जोड़ें" /></Btn>
      </div>

      {sorted.length === 0 && <Card><Empty text="No festivals yet. Add your first mahotsav to start planning." /></Card>}

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
                <div className="flex justify-between"><span className="text-stone-500"><T en="Dates" bn="তারিখ" hi="तिथियां" /></span><span className="font-semibold">{fmtDate(f.startDate)} → {fmtDate(f.endDate)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500"><T en="Venue" bn="স্থান" hi="स्थान" /></span><span className="font-semibold">{f.venue || '—'}</span></div>
                <div className="flex justify-between"><span className="text-stone-500"><T en="Expected footfall" bn="প্রত্যাশিত ভিড়" hi="अपेक्षित भीड़" /></span><span className="font-semibold">{f.expectedFootfall.toLocaleString('en-IN')}</span></div>
                {d >= 0 && f.status === 'planned' && (
                  <div className="text-orange-700 text-xs font-bold">🗓️ <T en={`${d} day(s) to go`} bn={`${d} দিন বাকি`} hi={`${d} दिन शेष`} /></div>
                )}
                {f.notes && <div className="text-xs text-stone-500 pt-1">{f.notes}</div>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3 no-print">
                <Btn variant="ghost" onClick={() => openEdit(f)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
                {(['planned', 'ongoing'] as FestivalStatus[]).includes(f.status) && (
                  <Btn variant="ghost" onClick={() => { update('festivals', f.id, { status: f.status === 'planned' ? 'ongoing' : 'completed' }); showToast('Status updated.', 'success'); }}>
                    {f.status === 'planned' ? <T en="Mark live" bn="চলমান চিহ্নিত" hi="लाइव चिह्नित करें" /> : <T en="Mark completed" bn="সমাপ্ত চিহ্নিত" hi="पूर्ण चिह्नित करें" />}
                  </Btn>
                )}
                <Btn variant="danger" onClick={() => { remove('festivals', f.id); showToast('Festival removed.', 'success'); }}><T en="Remove" bn="মুছুন" hi="हटाएं" /></Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal title={<T en={editing.id ? 'Edit festival' : 'Add festival'} bn={editing.id ? 'উৎসব সম্পাদনা' : 'উৎসব যোগ'} hi={editing.id ? 'उत्सव संपादित करें' : 'उत्सव जोड़ें'} />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Festival name *" bn="উৎসবের নাম *" hi="उत्सव का नाम *" />} className="sm:col-span-2">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sharadiya Durga Puja 2026" />
            </Field>
            <Field label={<T en="Deity" bn="দেবতা" hi="देवता" />}>
              <input className={inputCls} value={form.deity} onChange={(e) => setForm({ ...form, deity: e.target.value })} placeholder="Maa Durga" />
            </Field>
            <Field label={<T en="Occasion" bn="উপলক্ষ" hi="अवसर" />}>
              <input className={inputCls} value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} placeholder="Sharadiya Navratri" />
            </Field>
            <Field label={<T en="Start date" bn="শুরুর তারিখ" hi="प्रारंभ तिथि" />}>
              <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label={<T en="End date" bn="শেষের তারিখ" hi="समाप्ति तिथि" />}>
              <input type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
            <Field label={<T en="Venue" bn="স্থান" hi="स्थान" />}>
              <input className={inputCls} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Samiti Maidan" />
            </Field>
            <Field label={<T en="Expected footfall" bn="প্রত্যাশিত ভিড়" hi="अपेक्षित भीड़" />}>
              <input type="number" min={1} className={inputCls} value={form.expectedFootfall} onChange={(e) => setForm({ ...form, expectedFootfall: Math.max(1, Math.floor(Number(e.target.value) || 0)) })} />
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FestivalStatus })}>
                <option value="planned">Planned</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <Field label={<T en="Notes" bn="মন্তব্য" hi="टिप्पणी" />} className="sm:col-span-2">
              <input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
