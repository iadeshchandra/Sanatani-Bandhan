import React, { useState } from 'react';
import { useSatsang, uid, activeMembers, presentCount } from './satsangStore';
import { Gathering } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, fmtTime, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Gathering scheduler — date, time, venue, rotating host, theme,      */
/* status. Mark completed to unlock attendance.                       */
/* ------------------------------------------------------------------ */

export const GatheringsTab: React.FC = () => {
  const { state, add, update, remove } = useSatsang();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState({
    date: '', time: state.settings.defaultTime || '18:00',
    venue: state.settings.defaultVenue || '', hostId: '', theme: '', notes: '',
  });
  const members = activeMembers(state);

  const save = () => {
    if (!form.date) { showToast('Please pick a date.', 'warning'); return; }
    add('gatherings', {
      id: uid('g'), date: form.date, time: form.time, venue: form.venue.trim(),
      hostId: form.hostId || undefined, theme: form.theme.trim() || undefined,
      status: 'scheduled', notes: form.notes.trim() || undefined, createdAt: Date.now(),
    });
    showToast('Gathering scheduled.', 'success');
    setForming(false);
    setForm({ date: '', time: state.settings.defaultTime || '18:00', venue: state.settings.defaultVenue || '', hostId: '', theme: '', notes: '' });
  };

  const list = [...state.gatherings].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const hostName = (g: Gathering) => g.hostId ? (state.members.find((m) => m.id === g.hostId)?.name || '—') : '—';

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-stone-700">
            <T en="Schedule the next satsang" bn="পরবর্তী সৎসঙ্গ নির্ধারণ করুন" hi="अगली सत्संग निर्धारित करें" />
          </div>
          <Btn onClick={() => setForming(true)} className="no-print">＋ <T en="Schedule gathering" bn="সমাবেশ নির্ধারণ" hi="सभा निर्धारित करें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text="No gatherings yet. Schedule the first one." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((g) => (
          <Card key={g.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{fmtDate(g.date)} · {fmtTime(g.time)}</div>
                <div className="text-xs text-stone-500">
                  📍 {g.venue || '—'} · <T en="Host" bn="আয়োজক" hi="मेज़बान" />: {hostName(g)}
                  {g.theme && <> · 🎵 {g.theme}</>}
                </div>
                {g.status === 'completed' && (
                  <div className="text-xs text-emerald-700 font-semibold mt-1">
                    ✓ {presentCount(state, g.id)} <T en="attended" bn="উপস্থিত ছিলেন" hi="उपस्थित थे" />
                  </div>
                )}
              </div>
              <StatusPill status={g.status} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              {g.status === 'scheduled' && (
                <>
                  <Btn variant="emerald" onClick={() => { update('gatherings', g.id, { status: 'completed' }); showToast('Gathering marked completed — mark attendance now.', 'success'); }}>
                    <T en="Mark completed" bn="সম্পন্ন চিহ্নিত" hi="पूर्ण चिह्नित करें" />
                  </Btn>
                  <Btn variant="ghost" onClick={() => update('gatherings', g.id, { status: 'cancelled' })}>
                    <T en="Cancel" bn="বাতিল" hi="रद्द करें" />
                  </Btn>
                </>
              )}
              <Btn variant="danger" onClick={() => { remove('gatherings', g.id); showToast('Gathering removed.', 'info'); }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={<T en="Schedule gathering" bn="সমাবেশ নির্ধারণ" hi="सभा निर्धारित करें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Time" bn="সময়" hi="समय" />}>
              <input type="time" className={inputCls} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
            <Field label={<T en="Venue" bn="স্থান" hi="स्थान" />}>
              <input className={inputCls} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Whose home / hall" />
            </Field>
            <Field label={<T en="Host (rotating)" bn="আয়োজক (ঘূর্ণায়মান)" hi="मेज़बान (बारी-बारी)" />}>
              <select className={inputCls} value={form.hostId} onChange={(e) => setForm({ ...form, hostId: e.target.value })}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={<T en="Theme (optional)" bn="থিম (ঐচ্ছিক)" hi="विषय (वैकल्पिक)" />} className="sm:col-span-2">
              <input className={inputCls} value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} placeholder="e.g. Ekadashi kirtan" />
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
