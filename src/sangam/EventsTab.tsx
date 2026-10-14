import React, { useMemo, useState } from 'react';
import { useSangam, type AuthorInfo } from './sangamStore';
import { Card, Btn, Field, inputCls, Modal, AuthorLine, EmptyState, VerificationBadge, useLocaleText, T } from './ui';

/* Events — utsav, katha, yatra announcements with RSVP.
 * =====================================================================
 * Organisation events posted by trustees carry the OFFICIAL badge.
 * RSVP is one tap and honest — the count is people, not impressions.
 * Ties into the organisation's Utsav desk conceptually (same festival
 * vocabulary); no cross-writes in v1.
 */

const KINDS = [
  { id: 'utsav', en: 'Utsav', icon: '🎪' },
  { id: 'katha', en: 'Katha', icon: '📖' },
  { id: 'satsang', en: 'Satsang', icon: '🪔' },
  { id: 'yatra', en: 'Yatra', icon: '🚩' },
  { id: 'seva', en: 'Seva', icon: '🤲' },
  { id: 'other', en: 'Other', icon: '📅' },
] as const;

const fmtDT = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export const EventsTab: React.FC<{ author: AuthorInfo }> = ({ author }) => {
  const { events, rsvpEvent, createEvent } = useSangam();
  const { tr } = useLocaleText();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('utsav');
  const [desc, setDesc] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');

  const upcoming = useMemo(
    () => events.filter((e) => e.startsAt >= Date.now() - 86400000).sort((a, b) => a.startsAt - b.startsAt),
    [events]
  );

  const doCreate = async () => {
    if (!title.trim() || !date) return;
    const startsAt = new Date(`${date}T${time}`).getTime();
    const t = title, k = kind, d = desc, v = venue;
    setTitle(''); setDesc(''); setVenue(''); setDate(''); setCreateOpen(false); // close immediately — sync is best-effort
    await createEvent(author, {
      title: t.trim(), kind: k, description: d.trim(), venue: v.trim() || tr('To be announced', 'ঘোষণা করা হবে', 'घोषणा होगी'),
      startsAt, isOfficial: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Events" bn="অনুষ্ঠান" hi="आयोजन" /></h2>
        <Btn onClick={() => setCreateOpen(true)} className="!px-3">＋ {tr('Announce', 'ঘোষণা', 'घोषणा')}</Btn>
      </div>

      {upcoming.length === 0 ? (
        <Card><EmptyState icon="📅" title={<T en="No upcoming events" bn="আসন্ন কোনো অনুষ্ঠান নেই" hi="कोई आगामी आयोजन नहीं" />} body={tr('Utsav, katha, yatra — announce yours here.', 'উৎসব, কথা, যাত্রা — এখানে ঘোষণা করুন।', 'उत्सव, कथा, यात्रा — यहाँ घोषणा करें।')} /></Card>
      ) : (
        upcoming.map((e) => {
          const going = (e.rsvps || []).includes(author.uid);
          const km = KINDS.find((k) => k.id === e.kind);
          return (
            <Card key={e.id}>
              <div className="flex items-start gap-3">
                <div className="w-14 shrink-0 text-center bg-orange-50 border border-orange-100 rounded-2xl py-2">
                  <div className="text-2xl" aria-hidden>{km?.icon || '📅'}</div>
                  <div className="text-[10px] font-black text-orange-800 uppercase">{new Date(e.startsAt).toLocaleDateString('en-IN', { month: 'short' })}</div>
                  <div className="text-lg font-black text-stone-800 leading-none">{new Date(e.startsAt).getDate()}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-stone-800">{e.title}</h3>
                    {e.isOfficial && <VerificationBadge official size="sm" />}
                  </div>
                  <div className="text-xs text-stone-500 font-semibold mt-0.5">🕐 {fmtDT(e.startsAt)} · 📍 {e.venue}</div>
                  {e.orgName && <div className="text-xs text-stone-500">🏛️ {e.orgName}</div>}
                  {e.description && <p className="text-sm text-stone-600 mt-1.5">{e.description}</p>}
                  <div className="text-[11px] text-stone-400 mt-1.5">
                    {tr('by', 'দ্বারা', 'द्वारा')} {e.creatorName} · 👥 {e.rsvpCount} {tr('going', 'যাচ্ছেন', 'जा रहे')}
                  </div>
                  <Btn variant={going ? 'ghost' : 'soft'} onClick={() => rsvpEvent(e.id, author.uid)} className="mt-2 !px-4">
                    {going ? `✓ ${tr('Going', 'যাচ্ছি', 'जा रहा')}` : tr('RSVP — I will come', 'আসব', 'आऊंगा')}
                  </Btn>
                </div>
              </div>
            </Card>
          );
        })
      )}

      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title={<T en="Announce an event" bn="অনুষ্ঠান ঘোষণা" hi="आयोजन घोषणा" />}>
          <div className="space-y-3">
            <Field label={<T en="Title" bn="শিরোনাম" hi="शीर्षक" />}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} maxLength={80} />
            </Field>
            <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
              <div className="flex gap-1.5 flex-wrap">
                {KINDS.map((k) => (
                  <button key={k.id} onClick={() => setKind(k.id)} className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] ${kind === k.id ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    {k.icon} {k.en}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
              <Field label={<T en="Time" bn="সময়" hi="समय" />}><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label={<T en="Venue" bn="স্থান" hi="स्थान" />}><input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} maxLength={100} /></Field>
            <Field label={<T en="Details" bn="বিস্তারিত" hi="विवरण" />}>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={400} className={inputCls} />
            </Field>
            <Btn onClick={doCreate} disabled={!title.trim() || !date} className="w-full">📅 {tr('Announce event', 'অনুষ্ঠান ঘোষণা', 'आयोजन घोषित')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
