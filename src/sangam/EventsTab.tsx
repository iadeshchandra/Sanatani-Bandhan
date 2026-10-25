import React, { useMemo, useState } from 'react';
import { useSangam, type AuthorInfo } from './sangamStore';
import { Card, Btn, Field, inputCls, Modal, AuthorLine, EmptyState, VerificationBadge, useLocaleText, T } from './ui';
import { nextOccurrence, localTodayISO, type RecurrenceRule } from '../lib/eventRecurrence';
import { schedulingHintsFor } from '../lib/eventSchedulingHints';
import { buildIcsCalendar, downloadIcs, icsFileName } from '../lib/icsExport';
import type { SangamRsvpState } from './types';

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
  const { events, posts, setRsvpState, myEventState, loadEventRsvps, createEvent } = useSangam();
  const { tr } = useLocaleText();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('utsav');
  const [desc, setDesc] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  // EVENTS P1 — capacity + recurrence on the create form.
  const [capacity, setCapacity] = useState('');
  const [recurFreq, setRecurFreq] = useState<'' | RecurrenceRule['freq']>('');
  // EVENTS P1 — organiser RSVP lists, loaded on demand per event.
  const [openLists, setOpenLists] = useState<Record<string, { uid: string; state: SangamRsvpState; at: number | null }[]>>({});

  const upcoming = useMemo(
    () => events.filter((e) => e.startsAt >= Date.now() - 86400000).sort((a, b) => a.startsAt - b.startsAt),
    [events]
  );

  /** Names the community itself published (posts) — best-effort labels
   *  for the organiser's list; never invented. */
  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    posts.forEach((p) => { if (!map.has(p.authorUid)) map.set(p.authorUid, p.authorName); });
    return (uid: string) => map.get(uid) || tr('A member', 'একজন সদস্য', 'एक सदस्य');
  }, [posts, tr]);

  const toggleList = async (eventId: string) => {
    if (openLists[eventId]) {
      setOpenLists((prev) => { const c = { ...prev }; delete c[eventId]; return c; });
      return;
    }
    const rows = await loadEventRsvps(eventId);
    setOpenLists((prev) => ({ ...prev, [eventId]: rows }));
  };

  const doCreate = async () => {
    if (!title.trim() || !date) return;
    const startsAt = new Date(`${date}T${time}`).getTime();
    const t = title, k = kind, d = desc, v = venue;
    const cap = parseInt(capacity, 10);
    const recurrence: RecurrenceRule | undefined = recurFreq ? { freq: recurFreq } : undefined;
    setTitle(''); setDesc(''); setVenue(''); setDate(''); setCapacity(''); setRecurFreq(''); setCreateOpen(false); // close immediately — sync is best-effort
    await createEvent(author, {
      title: t.trim(), kind: k, description: d.trim(), venue: v.trim() || tr('To be announced', 'ঘোষণা করা হবে', 'घोषणा होगी'),
      startsAt, isOfficial: false,
      ...(Number.isFinite(cap) && cap > 0 ? { capacity: cap } : {}),
      ...(recurrence ? { recurrence } : {}),
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
          const myState = myEventState(e.id);
          const km = KINDS.find((k) => k.id === e.kind);
          const full = !!(e.capacity && e.capacity > 0 && e.rsvpCount >= e.capacity);
          // EVENTS P1 — a recurring series shows its NEXT sitting;
          // the RSVP belongs to the series.
          const startDate = new Date(e.startsAt);
          const startISO = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
          const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
          const occ = e.recurrence ? nextOccurrence(startISO, e.recurrence, localTodayISO(), startTime) : null;
          const displayStart = occ ? occ.startsAt : e.startsAt;
          const isCreator = e.creatorUid === author.uid;
          const list = openLists[e.id];
          return (
            <Card key={e.id}>
              <div className="flex items-start gap-3">
                <div className="w-14 shrink-0 text-center bg-orange-50 border border-orange-100 rounded-2xl py-2">
                  <div className="text-2xl" aria-hidden>{km?.icon || '📅'}</div>
                  <div className="text-[10px] font-black text-orange-800 uppercase">{new Date(displayStart).toLocaleDateString('en-IN', { month: 'short' })}</div>
                  <div className="text-lg font-black text-stone-800 leading-none">{new Date(displayStart).getDate()}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-stone-800">{e.title}</h3>
                    {e.isOfficial && <VerificationBadge official size="sm" />}
                    {e.recurrence && (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        🔁 {e.recurrence.freq === 'weekly' ? tr('Weekly', 'সাপ্তাহিক', 'साप्ताहिक') : e.recurrence.freq === 'monthly' ? tr('Monthly', 'মাসিক', 'मासिक') : tr('Yearly', 'বার্ষিক', 'वार्षिक')}
                      </span>
                    )}
                    {full && (
                      <span className="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                        {tr('Full', 'পূর্ণ', 'पूर्ण')}{e.capacity ? ` · ${e.rsvpCount}/${e.capacity}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 font-semibold mt-0.5">🕐 {fmtDT(displayStart)} · 📍 {e.venue}</div>
                  {e.orgName && <div className="text-xs text-stone-500">🏛️ {e.orgName}</div>}
                  {e.description && <p className="text-sm text-stone-600 mt-1.5">{e.description}</p>}
                  <div className="text-[11px] text-stone-400 mt-1.5">
                    {tr('by', 'দ্বারা', 'द्वारा')} {e.creatorName} · 👥 {e.rsvpCount} {tr('going', 'যাচ্ছেন', 'जा रहे')}
                  </div>

                  {/* EVENTS P1 — my state: Going / Interested /
                      Waitlisted. 'Going' alone moves the count. */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Btn
                      variant={myState === 'going' ? 'ghost' : 'soft'}
                      onClick={() => void setRsvpState(e.id, author.uid, myState === 'going' ? null : 'going')}
                      className="!px-4"
                    >
                      {myState === 'going'
                        ? `✓ ${tr('Going', 'যাচ্ছি', 'जा रहा')}`
                        : full
                          ? tr('Join waitlist', 'অপেক্ষা-তালিকায় যোগ দিন', 'प्रतीक्षा सूची में जुड़ें')
                          : tr('RSVP — I will come', 'আসব', 'आऊंगा')}
                    </Btn>
                    {myState !== 'going' && (
                      <Btn
                        variant={myState === 'interested' ? 'ghost' : 'soft'}
                        onClick={() => void setRsvpState(e.id, author.uid, myState === 'interested' ? null : 'interested')}
                        className="!px-4"
                      >
                        {myState === 'interested' ? `✓ ${tr('Interested', 'আগ্রহী', 'रुचि है')}` : tr('Interested', 'আগ্রহী', 'रुचि है')}
                      </Btn>
                    )}
                    {myState === 'waitlisted' && (
                      <span className="inline-flex items-center text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3">
                        🕯️ {tr('You are on the waitlist — a place is yours the moment one frees, in order.', 'আপনি অপেক্ষা-তালিকায় আছেন — জায়গা খালি হলেই ক্রম অনুযায়ী আপনার।', 'आप प्रतीक्षा सूची में हैं — स्थान खाली होते ही क्रम से आपका।')}
                      </span>
                    )}
                    <Btn
                      variant="ghost"
                      className="!px-3"
                      onClick={() =>
                        downloadIcs(
                          buildIcsCalendar([
                            {
                              uid: `sangam-${e.id}@sanatanibandhan`,
                              title: e.title,
                              description: e.description,
                              location: e.venue,
                              startMs: e.startsAt,
                              endMs: e.endsAt,
                              // The civil date anchors the RRULE line
                              // for recurring series.
                              date: startISO,
                              recurrence: e.recurrence,
                            },
                          ]),
                          icsFileName(e.title)
                        )
                      }
                    >
                      📅 {tr('Add to calendar', 'ক্যালেন্ডারে যোগ করুন', 'कैलेंडर में जोड़ें')}
                    </Btn>
                  </div>

                  {/* EVENTS P1 — the organiser's list (creator only):
                      who is coming, from the real RSVP records. */}
                  {isCreator && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => void toggleList(e.id)}
                        className="text-[11px] font-black text-orange-800 uppercase tracking-widest"
                        aria-expanded={!!list}
                      >
                        👥 {tr("Who's coming", 'কারা আসছেন', 'कौन आ रहा है')} {list ? '▾' : '▸'}
                      </button>
                      {list && (
                        <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                          {(['going', 'interested', 'waitlisted'] as SangamRsvpState[]).map((st) => {
                            const rows = list.filter((r) => r.state === st);
                            if (rows.length === 0) return null;
                            return (
                              <div key={st} className="mb-2 last:mb-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                  {st === 'going' ? tr('Going', 'যাচ্ছেন', 'जा रहे') : st === 'interested' ? tr('Interested', 'আগ্রহী', 'रुचि') : tr('Waitlisted', 'অপেক্ষা-তালিকায়', 'प्रतीक्षा सूची')} · {rows.length}
                                </p>
                                <p className="text-xs font-bold text-stone-700 mt-0.5">
                                  {rows.map((r) => nameOf(r.uid)).join(' · ')}
                                </p>
                              </div>
                            );
                          })}
                          {list.length === 0 && (
                            <p className="text-xs font-bold text-stone-400">{tr('No RSVPs yet.', 'এখনও কোনো RSVP নেই।', 'अभी कोई RSVP नहीं।')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
            {/* EVENTS P2 — Panchang-smart suggestions for the chosen
                day: surfaced, never imposed. */}
            {date && (() => {
              const hints = schedulingHintsFor(date);
              if (!hints) return null;
              return (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <p className="text-[11px] font-black text-stone-600 mb-1.5">
                    🪔 {tr('Auspicious times that day', 'সেদিনের শুভ সময়', 'उस दिन के शुभ समय')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-stone-700">
                      {hints.tithi}
                      {hints.paksha ? ` · ${hints.paksha}` : ''}
                    </span>
                    {hints.abhijit && <span className="muhurat-chip text-[11px]">Abhijit {hints.abhijit}</span>}
                    {hints.festivals.map((f) => (
                      <span key={f.name} className="text-[11px] font-bold bg-amber-100 text-amber-900 rounded-full px-2 py-0.5">{f.name}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1.5">
                    {tr('Suggestions from the Panchang — the choice is always yours.', 'পঞ্জিকা থেকে পরামর্শ — সিদ্ধান্ত সবসময় আপনারই।', 'पंचांग से सुझाव — चुनाव हमेशा आपका है।')}
                  </p>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-2">
              <Field label={<T en="Capacity (optional)" bn="ধারণক্ষমতা (ঐচ্ছিক)" hi="क्षमता (वैकल्पिक)" />}>
                <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} placeholder="∞" />
              </Field>
              <Field label={<T en="Repeats" bn="পুনরাবৃত্তি" hi="पुनरावृत्ति" />}>
                <select value={recurFreq} onChange={(e) => setRecurFreq(e.target.value as typeof recurFreq)} className={inputCls}>
                  <option value="">{tr('Does not repeat', 'পুনরাবৃত্তি হয় না', 'दोहराया नहीं जाता')}</option>
                  <option value="weekly">{tr('Weekly', 'সাপ্তাহিক', 'साप्ताहिक')}</option>
                  <option value="monthly">{tr('Monthly', 'মাসিক', 'मासिक')}</option>
                  <option value="yearly">{tr('Yearly', 'বার্ষিক', 'वार्षिक')}</option>
                </select>
              </Field>
            </div>
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
