import React, { useState } from 'react';
import { useSabha, uid, todayISO, nextResolutionNo, activeMembers } from './sabhaStore';
import { Meeting } from './types';
import { T, Card, Btn, Field, inputCls, Modal, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Meetings & resolutions — sabha meetings with agenda, minutes and   */
/* auto-numbered resolutions.                                          */
/* ------------------------------------------------------------------ */

const emptyForm = { date: todayISO(), agenda: '', attendeeIds: [] as string[], minutes: '', resolution: '' };

export const MeetingsTab: React.FC = () => {
  const { state, add, update, remove, setSettings } = useSabha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState(emptyForm);
  const members = activeMembers(state);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: todayISO() }); setForming(true); };
  const openEdit = (m: Meeting) => {
    setEditing(m);
    setForm({ date: m.date, agenda: m.agenda, attendeeIds: [...m.attendeeIds], minutes: m.minutes || '', resolution: m.resolution || '' });
    setForming(true);
  };

  const toggleAttendee = (id: string) => {
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(id) ? f.attendeeIds.filter((x) => x !== id) : [...f.attendeeIds, id],
    }));
  };

  const save = () => {
    if (!form.agenda.trim()) { showToast('Please enter the agenda.', 'warning'); return; }
    let resolutionNo: string | undefined;
    let seq = state.settings.resolutionSeq;
    const wantsResolution = form.resolution.trim().length > 0;
    const hadResolution = !!(editing && editing.resolution);
    if (wantsResolution && !hadResolution) {
      const r = nextResolutionNo(state.settings);
      resolutionNo = r.resolutionNo; seq = r.seq;
    } else if (editing?.resolutionNo) {
      resolutionNo = editing.resolutionNo;
    }
    const base = {
      date: form.date, agenda: form.agenda.trim(),
      attendeeIds: form.attendeeIds,
      minutes: form.minutes.trim() || undefined,
      resolution: form.resolution.trim() || undefined,
      resolutionNo,
    };
    if (editing) { update('meetings', editing.id, base); showToast('Meeting updated.', 'success'); }
    else { add('meetings', { id: uid('mt'), ...base, createdAt: Date.now() }); showToast('Meeting recorded.', 'success'); }
    if (seq !== state.settings.resolutionSeq) setSettings({ resolutionSeq: seq });
    setForming(false);
  };

  const list = [...state.meetings].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-stone-700">
            <T en={`${state.meetings.length} meetings`} bn={`${state.meetings.length} সভা`} hi={`${state.meetings.length} बैठकें`} />
          </div>
          <Btn onClick={openNew} className="no-print">＋ <T en="Add meeting" bn="সভা যোগ করুন" hi="बैठक जोड़ें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text="No meetings yet." />}

      <div className="space-y-3">
        {list.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{m.agenda}</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {fmtDate(m.date)} · {m.attendeeIds.length} <T en="attendees" bn="অংশগ্রহণকারী" hi="उपस्थित" />
                  {m.resolutionNo && <span className="font-mono font-bold text-amber-700"> · {m.resolutionNo}</span>}
                </div>
              </div>
            </div>
            {m.minutes && (
              <div className="text-xs text-stone-600 mt-2 whitespace-pre-wrap">
                <span className="font-bold"><T en="Minutes" bn="কার্যবিবরণী" hi="कार्यवृत्त" />: </span>{m.minutes}
              </div>
            )}
            {m.resolution && (
              <div className="text-xs text-stone-700 mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <span className="font-bold">📜 {m.resolutionNo}: </span>{m.resolution}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(m)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm('Remove this meeting?')) { remove('meetings', m.id); showToast('Removed.', 'info'); } }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? <T en="Edit meeting" bn="সভা সম্পাদনা" hi="बैठक संपादित करें" /> : <T en="Add meeting" bn="সভা যোগ করুন" hi="बैठक जोड़ें" />} onClose={() => setForming(false)} wide>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Agenda" bn="আলোচ্যসূচি" hi="कार्यसूची" />} className="sm:col-span-2">
              <input className={inputCls} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} placeholder="e.g. Navratri duty roster + welfare appeal" />
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
            <Field label={<T en="Minutes (optional)" bn="কার্যবিবরণী (ঐচ্ছিক)" hi="कार्यवृत्त (वैकल्पिक)" />} className="sm:col-span-2">
              <textarea className={inputCls} rows={3} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
            </Field>
            <Field label={<T en="Resolution passed (optional)" bn="গৃহীত প্রস্তাব (ঐচ্ছিক)" hi="पारित प्रस्ताव (वैकल्पिक)" />} className="sm:col-span-2">
              <textarea className={inputCls} rows={2} value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="A new resolution gets the next number automatically (RES-0001…)." />
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
