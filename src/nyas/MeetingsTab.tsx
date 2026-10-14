import React, { useState } from 'react';
import { useNyas, uid, nextResolutionNo, todayISO } from './nyasStore';
import { Meeting, Resolution } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';

/* Nyas One — trustee meetings: agenda, attendance, minutes, resolution register. */

const blankMeeting: Omit<Meeting, 'id'> = {
  date: todayISO(), title: '', agenda: [], attendees: [], minutes: '',
  status: 'scheduled', resolutions: [],
};

export const MeetingsTab: React.FC = () => {
  const { state, add, update, remove } = useNyas();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState(blankMeeting);
  const [agendaText, setAgendaText] = useState('');
  const [attendeeText, setAttendeeText] = useState('');
  const [resText, setResText] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const openNew = () => {
    setForm(blankMeeting); setAgendaText(''); setAttendeeText(''); setResText('');
    setEditing({ ...blankMeeting, id: '' } as Meeting);
  };
  const openEdit = (m: Meeting) => {
    setForm({ date: m.date, title: m.title, agenda: m.agenda, attendees: m.attendees, minutes: m.minutes || '', status: m.status, resolutions: m.resolutions });
    setAgendaText(''); setAttendeeText(''); setResText('');
    setEditing(m);
  };

  const save = () => {
    if (!form.title.trim()) { showToast('Meeting title is required.', 'error'); return; }
    if (editing && editing.id) {
      update('meetings', editing.id, { ...form });
      showToast('Meeting updated.', 'success');
    } else {
      add('meetings', { ...form, id: uid('mt') });
      showToast('Meeting scheduled.', 'success');
    }
    setEditing(null);
  };

  const addResolution = () => {
    if (!resText.trim()) return;
    const r: Resolution = { id: uid('rs'), no: nextResolutionNo(state), text: resText.trim(), passed: true };
    setForm({ ...form, resolutions: [...form.resolutions, r] });
    setResText('');
  };

  const sorted = [...state.meetings].sort((a, b) => b.date.localeCompare(a.date));
  const allResolutions = state.meetings.flatMap((m) => m.resolutions.map((r) => ({ ...r, meetingTitle: m.title, meetingDate: m.date })));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Trustee meetings" bn="ট্রাস্টি সভা" hi="ट्रस्टी बैठकें" /></h2>
        <Btn onClick={openNew}>＋ <T en="Schedule meeting" bn="সভা নির্ধারণ" hi="बैठक निर्धारित करें" /></Btn>
      </div>

      {sorted.length === 0 && <Card><Empty text="No meetings recorded yet. Schedule the next trustee meeting." /></Card>}

      {sorted.map((m) => {
        const open = openId === m.id;
        return (
          <Card key={m.id}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button onClick={() => setOpenId(open ? null : m.id)} className="text-left min-w-0 flex-1">
                <div className="font-bold text-stone-800 text-sm">{m.title}</div>
                <div className="text-xs text-stone-500">{fmtDate(m.date)} · {m.agenda.length} agenda · {m.resolutions.length} resolutions</div>
              </button>
              <div className="flex items-center gap-2 no-print">
                <StatusPill status={m.status} />
                <Btn variant="ghost" onClick={() => openEdit(m)}><T en="Edit" bn="সম্পাদনা" hi="संपादित" /></Btn>
                <button onClick={() => { remove('meetings', m.id); showToast('Meeting removed.', 'success'); }} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 font-bold min-w-[44px] min-h-[44px]" aria-label="Delete">✕</button>
              </div>
            </div>
            {open && (
              <div className="mt-3 pt-3 border-t border-stone-100 text-sm space-y-2">
                {m.agenda.length > 0 && (
                  <div><div className="text-xs font-bold text-stone-500 mb-1"><T en="AGENDA" bn="আলোচ্যসূচি" hi="कार्यसूची" /></div>
                    <ol className="list-decimal ml-5 text-stone-700">{m.agenda.map((a, i) => <li key={i}>{a}</li>)}</ol></div>
                )}
                {m.attendees.length > 0 && (
                  <div><div className="text-xs font-bold text-stone-500 mb-1"><T en="ATTENDEES" bn="উপস্থিতি" hi="उपस्थित" /></div>
                    <div className="text-stone-700">{m.attendees.join(', ')}</div></div>
                )}
                {m.minutes && (
                  <div><div className="text-xs font-bold text-stone-500 mb-1"><T en="MINUTES" bn="কার্যবিবরণী" hi="कार्यवृत्त" /></div>
                    <div className="text-stone-700 whitespace-pre-wrap">{m.minutes}</div></div>
                )}
                {m.resolutions.length > 0 && (
                  <div><div className="text-xs font-bold text-stone-500 mb-1"><T en="RESOLUTIONS" bn="প্রস্তাব" hi="प्रस्ताव" /></div>
                    {m.resolutions.map((r) => (
                      <div key={r.id} className="flex gap-2 py-1">
                        <span className="font-mono text-xs font-bold text-indigo-700 shrink-0">{r.no}</span>
                        <span className="text-stone-700">{r.text}</span>
                        <span className="text-xs">{r.passed ? '✅' : '⏳'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {/* Resolution register */}
      {allResolutions.length > 0 && (
        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><T en="Resolution register" bn="প্রস্তাব নিবন্ধন" hi="प्रस्ताव पंजी" /></h3>
          {allResolutions.map((r) => (
            <div key={r.id} className="flex gap-2 py-1.5 border-b border-stone-100 last:border-0 text-sm">
              <span className="font-mono text-xs font-bold text-indigo-700 shrink-0 pt-0.5">{r.no}</span>
              <div className="min-w-0">
                <div className="text-stone-700">{r.text}</div>
                <div className="text-xs text-stone-400">{r.meetingTitle} · {fmtDate(r.meetingDate)} {r.passed ? '· passed ✅' : ''}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <Modal wide title={<T en={editing.id ? 'Edit meeting' : 'Schedule meeting'} bn="সভা" hi="बैठक" />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Title *" bn="শিরোনাম *" hi="शीर्षक *" />} className="sm:col-span-2">
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Quarterly trustee meeting" />
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Meeting['status'] })}>
                <option value="scheduled">Scheduled</option>
                <option value="held">Held</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <Field label={<T en="Agenda (one per line — add)" bn="আলোচ্যসূচি" hi="कार्यसूची" />} className="sm:col-span-2">
              <div className="flex gap-2">
                <input className={inputCls} value={agendaText} onChange={(e) => setAgendaText(e.target.value)} placeholder="Approve Q2 accounts" onKeyDown={(e) => { if (e.key === 'Enter' && agendaText.trim()) { setForm({ ...form, agenda: [...form.agenda, agendaText.trim()] }); setAgendaText(''); } }} />
                <Btn variant="ghost" onClick={() => { if (agendaText.trim()) { setForm({ ...form, agenda: [...form.agenda, agendaText.trim()] }); setAgendaText(''); } }}>＋</Btn>
              </div>
              {form.agenda.length > 0 && <ol className="list-decimal ml-5 mt-2 text-sm text-stone-700">{form.agenda.map((a, i) => <li key={i}>{a} <button className="text-red-500 ml-1" onClick={() => setForm({ ...form, agenda: form.agenda.filter((_, j) => j !== i) })}>✕</button></li>)}</ol>}
            </Field>
            <Field label={<T en="Attendees (add names)" bn="উপস্থিত (নাম যোগ)" hi="उपस्थित (नाम जोड़ें)" />} className="sm:col-span-2">
              <div className="flex gap-2">
                <input className={inputCls} value={attendeeText} onChange={(e) => setAttendeeText(e.target.value)} placeholder="Trustee name" onKeyDown={(e) => { if (e.key === 'Enter' && attendeeText.trim()) { setForm({ ...form, attendees: [...form.attendees, attendeeText.trim()] }); setAttendeeText(''); } }} />
                <Btn variant="ghost" onClick={() => { if (attendeeText.trim()) { setForm({ ...form, attendees: [...form.attendees, attendeeText.trim()] }); setAttendeeText(''); } }}>＋</Btn>
              </div>
              {form.attendees.length > 0 && <div className="text-sm text-stone-700 mt-2">{form.attendees.join(', ')}</div>}
            </Field>
            <Field label={<T en="Resolutions passed (add)" bn="গৃহীত প্রস্তাব" hi="पारित प्रस्ताव" />} className="sm:col-span-2">
              <div className="flex gap-2">
                <input className={inputCls} value={resText} onChange={(e) => setResText(e.target.value)} placeholder="Resolved to appoint auditor for FY…" onKeyDown={(e) => { if (e.key === 'Enter') addResolution(); }} />
                <Btn variant="ghost" onClick={addResolution}>＋</Btn>
              </div>
              {form.resolutions.map((r) => (
                <div key={r.id} className="flex gap-2 mt-1 text-sm">
                  <span className="font-mono text-xs font-bold text-indigo-700">{r.no}</span>
                  <span className="flex-1">{r.text}</span>
                  <button className="text-red-500" onClick={() => setForm({ ...form, resolutions: form.resolutions.filter((x) => x.id !== r.id) })}>✕</button>
                </div>
              ))}
            </Field>
            <Field label={<T en="Minutes" bn="কার্যবিবরণী" hi="कार्यवृत्त" />} className="sm:col-span-2">
              <textarea className={inputCls} rows={4} value={form.minutes || ''} onChange={(e) => setForm({ ...form, minutes: e.target.value })} placeholder="What was discussed and decided…" />
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
