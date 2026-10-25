/**
 * FestivalEventPage — public devotee festival page (Pillar 2).
 * =====================================================================
 * Shareable route: /festival/:orgId/:eventId. Anyone with the link sees
 * the festival story (reverent, 1–2 lines), special aarti/darshan
 * timings, darshan slot booking and RSVP — which flows back into the
 * trustee's footfall plan. Reads the published `festival_events` doc
 * (public); RSVP writes require sign-in (spam guard).
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { PublicLanguageButton } from '../public/PublicLanguageButton';
import {
  festivalDayList, festivalEventUrl, slotRemaining, validateRsvp,
  type FestivalEventDoc, type RsvpEntry,
} from '../../lib/festival';
import {
  applyFestivalRsvp, claimFestivalWaitlist, removeFestivalRsvp, waitlistPosition,
} from '../../lib/festivalRsvp';
import { festivalConcluded } from '../../lib/festivalMemory';
import { buildIcsCalendar, downloadIcs, icsFileName } from '../../lib/icsExport';
import { FestivalMemoryCard } from './FestivalMemoryCard';

const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 min-h-[44px]';

export const FestivalEventPage: React.FC<{ previewEvent?: FestivalEventDoc }> = ({ previewEvent }) => {
  const { orgId, eventId } = useParams<{ orgId: string; eventId: string }>();
  const navigate = useNavigate();
  const { safeTranslate } = useLanguage();
  const { firebaseUser } = useAuthWorkspace();

  const [event, setEvent] = useState<FestivalEventDoc | null>(previewEvent || null);
  const [loading, setLoading] = useState(!previewEvent);
  const [name, setName] = useState('');
  const [headcount, setHeadcount] = useState(2);
  const [slotId, setSlotId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // EVENTS P1 — my own RSVP record (readable only by me, per the
  // rules), the days I chose on a multi-day festival, and the form's
  // edit mode when I already hold a place.
  const [myRsvp, setMyRsvp] = useState<RsvpEntry | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [claimNote, setClaimNote] = useState<string | null>(null);
  const prefilledFor = React.useRef<string>('');

  const uid = (firebaseUser as { uid?: string } | null)?.uid || '';

  // My RSVP, live: the page now remembers me — my place, my days,
  // my waitlist position — instead of asking me to RSVP twice.
  useEffect(() => {
    if (previewEvent || !eventId || !uid) { setMyRsvp(null); return; }
    const unsub = onSnapshot(
      doc(db, 'festival_rsvps', `${eventId}__${uid}`),
      (snap) => {
        const r = snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<RsvpEntry, 'id'>) }) : null;
        setMyRsvp(r);
        if (r && prefilledFor.current !== r.id) {
          prefilledFor.current = r.id;
          setName(r.name || '');
          setHeadcount(r.headcount || 1);
          setSlotId(r.slotId || '');
          setSelectedDays(r.days || []);
        }
      },
      () => setMyRsvp(null)
    );
    return unsub;
  }, [eventId, uid, previewEvent]);

  const tr = (l: { en: string; bn: string; hi: string }) => safeTranslate('festival.page', l.en, l.bn, l.hi);

  useEffect(() => {
    if (previewEvent) return; // dev-preview / screenshot mode — no Firestore
    if (!eventId) { setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, 'festival_events', eventId),
      (snap) => {
        if (snap.exists()) {
          const d = { id: snap.id, ...(snap.data() as Omit<FestivalEventDoc, 'id'>) };
          // Only serve the page when it belongs to this org AND is published.
          setEvent(d.workspaceId === orgId && d.published ? d : null);
        } else {
          setEvent(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [eventId, orgId]);

  // Default day choice on a multi-day festival: every day (the
  // devotee then un-ticks the days they cannot come).
  useEffect(() => {
    if (!event || prefilledFor.current) return;
    const days = festivalDayList(event.dateISO, event.endDateISO);
    if (days.length > 1) setSelectedDays((prev) => (prev.length ? prev : days));
  }, [event]);

  const shareUrl = event ? festivalEventUrl(window.location.origin, orgId || '', event.id) : '';

  const doRsvp = async () => {
    setError(null);
    const err = validateRsvp({ name, headcount });
    if (err) {
      setError(err === 'name'
        ? safeTranslate('festival.page.nameerr', 'Please tell us your name.', 'আপনার নাম লিখুন।', 'कृपया अपना नाम लिखें।')
        : safeTranslate('festival.page.hcerr', 'Headcount must be 1–20.', 'সংখ্যা ১–২০ হতে হবে।', 'संख्या १–२० होनी चाहिए।'));
      return;
    }
    if (!firebaseUser) {
      navigate(`/login?next=${encodeURIComponent(`/festival/${orgId}/${eventId}`)}`);
      return;
    }
    const days = festivalDayList(event!.dateISO, event!.endDateISO);
    if (days.length > 1 && selectedDays.length === 0) {
      setError(safeTranslate('festival.page.dayerr', 'Please choose at least one day.', 'অন্তত একটি দিন বেছে নিন।', 'कृपया कम से कम एक दिन चुनें।'));
      return;
    }
    setSubmitting(true);
    try {
      // One transaction: the RSVP record and the public counters move
      // together (rules anchor the counters to this very record), and
      // a darshan slot can never be booked past its capacity. A full
      // slot I deliberately chose joins its waitlist instead.
      const slot = slotId ? event!.darshanSlots.find((s) => s.id === slotId) : undefined;
      const slotFull = slot ? slotRemaining(slot, event!.slotBooked || {}) < headcount : false;
      const outcome = await applyFestivalRsvp(db, {
        eventId: event!.id,
        workspaceId: orgId || '',
        uid,
        name,
        headcount,
        ...(slotId ? { slotId } : {}),
        ...(days.length > 1 ? { days: selectedDays } : {}),
        joinWaitlistIfFull: slotFull,
      });
      setEditing(false);
      setDone(true);
      if (outcome === 'waitlisted') setClaimNote('waitlisted');
    } catch (e) {
      const code = (e as { message?: string })?.message || '';
      setError(code === 'slot-full'
        ? safeTranslate('festival.page.slotfull', 'That darshan slot has just filled — please choose another time, or join the general darshan.', 'এই দর্শন স্লটটি এইমাত্র পূর্ণ হয়েছে — অন্য সময় বেছে নিন, অথবা সাধারণ দর্শনে যোগ দিন।', 'यह दर्शन स्लॉट अभी-अभी भर गया है — कृपया दूसरा समय चुनें, या सामान्य दर्शन में पधारें।')
        : safeTranslate('festival.page.err', 'Something did not go through — please try again.', 'কিছু একটা হয়নি — আবার চেষ্টা করুন।', 'कुछ ठीक नहीं हुआ — पुनः प्रयास करें।'));
    } finally {
      setSubmitting(false);
    }
  };

  const doCancel = async () => {
    if (!event || !uid) return;
    setSubmitting(true);
    try {
      await removeFestivalRsvp(db, { eventId: event.id, uid });
      setDone(false);
      setEditing(false);
      setClaimNote(null);
    } catch {
      setError(safeTranslate('festival.page.err', 'Something did not go through — please try again.', 'কিছু একটা হয়নি — আবার চেষ্টা করুন।', 'कुछ ठीक नहीं हुआ — पुनः प्रयास करें।'));
    } finally {
      setSubmitting(false);
    }
  };

  const doClaim = async () => {
    if (!event || !uid) return;
    setSubmitting(true);
    setClaimNote(null);
    try {
      const claimed = await claimFestivalWaitlist(db, { eventId: event.id, uid });
      setClaimNote(claimed ? 'claimed' : 'notyet');
    } catch {
      setClaimNote('notyet');
    } finally {
      setSubmitting(false);
    }
  };

  const doIcs = () => {
    if (!event) return;
    downloadIcs(
      buildIcsCalendar([
        {
          uid: `festival-${event.id}@sanatanibandhan`,
          title: tr(event.name),
          description: tr(event.story),
          location: event.orgName,
          date: event.dateISO,
          endDate: event.endDateISO,
        },
      ]),
      icsFileName(event.name.en)
    );
  };

  const doShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: event?.name.en, text: event?.story.en.slice(0, 120), url: shareUrl }); return; } catch { /* dismissed */ }
    }
    try { await navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-stone-100">
        <div className="text-4xl animate-pulse">🪔</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-stone-100 p-6 text-center">
        <div className="text-5xl mb-4">🪔</div>
        <h1 className="text-xl font-black text-stone-800">{tr({ en: 'This celebration page is not available', bn: 'এই উৎসব পৃষ্ঠা উপলব্ধ নয়', hi: 'यह उत्सव पृष्ठ उपलब्ध नहीं है' })}</h1>
        <p className="text-sm text-stone-500 mt-2">{tr({ en: 'It may have ended, or the link may be incomplete.', bn: 'এটি শেষ হয়ে থাকতে পারে, বা লিংক অসম্পূর্ণ।', hi: 'यह समाप्त हो गया हो, या लिंक अधूरा हो।' })}</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 bg-orange-700 text-white rounded-xl font-bold text-sm min-h-[44px]">
          {tr({ en: 'Back home', bn: 'হোমে ফিরুন', hi: 'होम वापस' })}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-stone-50 to-stone-100 pb-16">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-orange-800 via-red-900 to-stone-900 text-orange-50 px-4 pt-10 pb-16 overflow-hidden">
        {/* World-Readiness B4 (G-L3): the canonical language door. */}
        <div className="absolute top-3 right-3 z-10">
          <PublicLanguageButton tone="dark" />
        </div>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #fbbf24 0, transparent 40%), radial-gradient(circle at 70% 80%, #f97316 0, transparent 40%)' }} />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-3">🪔</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-orange-300/80">{event.orgName}</div>
          <h1 className="text-3xl font-black mt-1">{tr(event.name)}</h1>
          <div className="text-sm text-orange-200/90 mt-1">{event.tithiLine}</div>
          <div className="text-xs text-orange-200/70 mt-0.5">
            {event.dateISO}{event.endDateISO !== event.dateISO ? ` → ${event.endDateISO}` : ''}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10 relative space-y-4">
        {/* Story */}
        <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
          <p className="text-[15px] leading-relaxed text-stone-700 text-center italic">“{tr(event.story)}”</p>
        </div>

        {/* Special timings */}
        {event.timings.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
            <h2 className="font-extrabold text-stone-800 mb-3 text-center">
              {tr({ en: 'Special timings', bn: 'বিশেষ সময়সূচি', hi: 'विशेष समय' })}
            </h2>
            <ul className="space-y-2">
              {event.timings.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl bg-orange-50/60 border border-orange-100 px-4 py-3">
                  <span className="font-bold text-stone-700 text-sm">{tr(t.label)}</span>
                  <span className="text-orange-800 font-black text-sm">🪔 {t.time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Darshan slots */}
        {event.darshanSlots.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
            <h2 className="font-extrabold text-stone-800 mb-3 text-center">
              {tr({ en: 'Special darshan slots', bn: 'বিশেষ দর্শন স্লট', hi: 'विशेष दर्शन स्लॉट' })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {event.darshanSlots.map((s) => {
                const left = slotRemaining(s, event.slotBooked);
                const selected = slotId === s.id;
                const full = left <= 0;
                return (
                  <button key={s.id}
                    onClick={() => setSlotId(selected ? '' : s.id)}
                    aria-pressed={selected}
                    className={`rounded-2xl border-2 px-4 py-3.5 text-left min-h-[44px] transition ${
                      selected ? 'border-orange-600 bg-orange-50' : full ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400' : 'border-stone-200 bg-white hover:border-orange-300'
                    }`}>
                    <div className="font-bold text-stone-800 text-sm">{tr(s.label)}</div>
                    <div className={`text-xs font-semibold ${full ? 'text-amber-700' : left < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {full
                        ? tr({ en: 'Full — tap to join the waitlist', bn: 'পূর্ণ — অপেক্ষা-তালিকায় যোগ দিতে ট্যাপ করুন', hi: 'पूर्ण — प्रतीक्षा सूची में जुड़ने हेतु टैप करें' })
                        : tr({ en: `${left} places left`, bn: `${left}টি স্থান বাকি`, hi: `${left} स्थान शेष` })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* EVENTS P2 — once the festival has concluded, its memory
            card takes the invitation's place. */}
        {festivalConcluded(event, Date.now()) && (
          <FestivalMemoryCard event={event} rsvps={null} tr={tr} />
        )}

        {/* RSVP */}
        {!festivalConcluded(event, Date.now()) && (
        <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
          {myRsvp && !editing ? (
            <div className="text-center py-2">
              <div className="text-5xl mb-3">{(myRsvp.status || 'confirmed') === 'waitlisted' ? '🕯️' : '🙏'}</div>
              <h2 className="text-lg font-black text-stone-800">
                {(myRsvp.status || 'confirmed') === 'waitlisted'
                  ? tr({ en: 'You are on the waitlist', bn: 'আপনি অপেক্ষা-তালিকায় আছেন', hi: 'आप प्रतीक्षा सूची में हैं' })
                  : tr({ en: 'Your place is counted', bn: 'আপনার স্থান গোনা হয়েছে', hi: 'आपका स्थान गिना गया है' })}
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                {myRsvp.name} · {myRsvp.headcount}{' '}
                {tr({ en: 'people', bn: 'জন', hi: 'लोग' })}
                {myRsvp.slotId && event.darshanSlots.find((s) => s.id === myRsvp.slotId)
                  ? ` · ${tr(event.darshanSlots.find((s) => s.id === myRsvp.slotId)!.label)}`
                  : ''}
                {myRsvp.days && myRsvp.days.length > 0
                  ? ` · ${myRsvp.days.map((d) => d.slice(5)).join(', ')}`
                  : ''}
              </p>
              {(myRsvp.status || 'confirmed') === 'waitlisted' && myRsvp.slotId && (
                <>
                  <p className="text-sm font-bold text-amber-700 mt-2">
                    {tr({ en: 'Your place in line', bn: 'লাইনে আপনার স্থান', hi: 'पंक्ति में आपका स्थान' })}:{' '}
                    {waitlistPosition(event, myRsvp.slotId, uid) || '—'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    {tr({
                      en: 'If a place frees, the first in line is confirmed first. This page and your Suchana will tell you the moment it happens.',
                      bn: 'জায়গা খালি হলে লাইনের প্রথম জনই প্রথমে নিশ্চিত হবেন। এই পৃষ্ঠা ও আপনার সূচনা তা হলেই জানিয়ে দেবে।',
                      hi: 'स्थान खाली होने पर पंक्ति में पहला व्यक्ति ही पहले पक्का होगा। यह पृष्ठ और आपकी सूचना उसी क्षण बता देगी।',
                    })}
                  </p>
                  <button
                    disabled={submitting}
                    onClick={doClaim}
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 text-white font-bold py-3 text-sm min-h-[44px] shadow disabled:opacity-50">
                    {tr({ en: 'Check if my place is ready', bn: 'আমার স্থান তৈরি কিনা দেখুন', hi: 'देखें मेरा स्थान तैयार है या नहीं' })}
                  </button>
                  {claimNote === 'notyet' && (
                    <p className="text-xs font-semibold text-amber-700 mt-2">
                      {tr({ en: 'Not yet — your place in line is safe.', bn: 'এখনও নয় — লাইনে আপনার স্থান নিরাপদ।', hi: 'अभी नहीं — पंक्ति में आपका स्थान सुरक्षित है।' })}
                    </p>
                  )}
                  {claimNote === 'claimed' && (
                    <p className="text-xs font-semibold text-emerald-700 mt-2">
                      {tr({ en: 'Your place is confirmed — see you at darshan.', bn: 'আপনার স্থান নিশ্চিত — দর্শনে দেখা হবে।', hi: 'आपका स्थान पक्का है — दर्शन में भेंट होगी।' })}
                    </p>
                  )}
                </>
              )}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <button onClick={() => setEditing(true)} className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 min-h-[44px]">
                  {tr({ en: 'Change', bn: 'বদলান', hi: 'बदलें' })}
                </button>
                <button onClick={doIcs} className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 min-h-[44px]">
                  📅 {tr({ en: 'Add to calendar', bn: 'ক্যালেন্ডারে যোগ করুন', hi: 'कैलेंडर में जोड़ें' })}
                </button>
                <button disabled={submitting} onClick={doCancel} className="px-4 py-2.5 rounded-xl border border-red-200 text-sm font-bold text-red-600 min-h-[44px] disabled:opacity-50">
                  {tr({ en: 'Cancel my RSVP', bn: 'আমার RSVP বাতিল', hi: 'मेरा RSVP रद्द करें' })}
                </button>
              </div>
            </div>
          ) : done && !myRsvp ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🙏</div>
              <h2 className="text-lg font-black text-stone-800">
                {tr({ en: 'We look forward to seeing you', bn: 'আপনার দর্শনের অপেক্ষায়', hi: 'आपके दर्शन की प्रतीक्षा रहेगी' })}
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                {tr({ en: `${name.trim()}, your place for ${headcount} is counted with joy.`, bn: `${name.trim()}, ${headcount} জনের স্থান আনন্দের সঙ্গে গোনা হলো।`, hi: `${name.trim()}, ${headcount} जनों का स्थान आनंद सहित गिना गया।` })}
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-extrabold text-stone-800 mb-1 text-center">
                {tr({ en: 'Will you join us?', bn: 'আপনি কি যোগ দেবেন?', hi: 'क्या आप पधारेंगे?' })}
              </h2>
              <p className="text-xs text-stone-500 text-center mb-4">
                {tr({ en: 'Your RSVP helps the temple prepare prasad and sevadars — a small seva in itself.', bn: 'আপনার RSVP মন্দিরকে প্রসাদ ও সেবাদার প্রস্তুতিতে সাহায্য করে — নিজেই একটি ছোট সেবা।', hi: 'आपका RSVP मंदिर को प्रसाद व सेवादार तैयार करने में सहायता करता है — स्वयं एक छोटी सेवा।' })}
              </p>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">
                {tr({ en: 'Your name', bn: 'আপনার নাম', hi: 'आपका नाम' })}
              </label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                placeholder={safeTranslate('festival.page.nameph', 'e.g. Ananda Sharma', 'যেমন আনন্দ শর্মা', 'जैसे आनंद शर्मा')} />
              <label className="block text-xs font-bold text-stone-600 mb-1.5 mt-3">
                {tr({ en: 'How many are coming?', bn: 'কজন আসছেন?', hi: 'कितने लोग आ रहे हैं?' })}
              </label>
              <div className="flex items-center gap-3">
                <button className="w-11 h-11 rounded-xl border border-stone-200 text-xl font-black text-stone-600"
                  aria-label="Fewer" onClick={() => setHeadcount((h) => Math.max(1, h - 1))}>−</button>
                <span className="text-2xl font-black text-stone-800 w-10 text-center">{headcount}</span>
                <button className="w-11 h-11 rounded-xl border border-stone-200 text-xl font-black text-stone-600"
                  aria-label="More" onClick={() => setHeadcount((h) => Math.min(20, h + 1))}>+</button>
                <span className="text-xs text-stone-400">{tr({ en: 'including you', bn: 'আপনিসহ', hi: 'आप सहित' })}</span>
              </div>
              {/* EVENTS P1 — day-wise RSVP on multi-day festivals:
                  come for the days you can, not all-or-nothing. */}
              {festivalDayList(event.dateISO, event.endDateISO).length > 1 && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-stone-600 mb-1.5">
                    {tr({ en: 'Which days will you come?', bn: 'কোন কোন দিন আসবেন?', hi: 'किन दिनों में पधारेंगे?' })}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {festivalDayList(event.dateISO, event.endDateISO).map((d) => {
                      const on = selectedDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setSelectedDays((prev) =>
                              prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
                            )
                          }
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-bold min-h-[44px] transition ${
                            on ? 'border-orange-600 bg-orange-50 text-orange-900' : 'border-stone-200 bg-white text-stone-500'
                          }`}
                        >
                          {new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
              <button
                disabled={submitting}
                onClick={doRsvp}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-700 to-red-800 text-orange-50 font-bold py-3.5 text-sm min-h-[44px] shadow disabled:opacity-50">
                {submitting
                  ? tr({ en: 'Saving…', bn: 'সংরক্ষণ…', hi: 'सहेज रहे…' })
                  : firebaseUser
                    ? editing
                      ? tr({ en: 'Save my changes', bn: 'আমার বদল সংরক্ষণ', hi: 'मेरे बदलाव सहेजें' })
                      : `🙏 ${tr({ en: 'Count me in', bn: 'আমাকে গুনুন', hi: 'मुझे गिनें' })}`
                    : tr({ en: 'Sign in to RSVP', bn: 'RSVP করতে সাইন ইন', hi: 'RSVP हेतु साइन इन' })}
              </button>
              {!firebaseUser && (
                <p className="text-[11px] text-stone-400 text-center mt-2">
                  {tr({ en: 'One tap sign-in keeps the list genuine.', bn: 'এক ট্যাপ সাইন-ইন তালিকাটি খাঁটি রাখে।', hi: 'एक टैप साइन-इन सूची को सच्चा रखता है।' })}
                </p>
              )}
            </>
          )}
        </div>
        )}

        {/* Share */}
        <button onClick={doShare}
          className="w-full rounded-2xl border border-orange-200 bg-white/70 py-3.5 text-sm font-bold text-orange-800 min-h-[44px]">
          {copied
            ? `✓ ${tr({ en: 'Link copied — invite your family', bn: 'লিংক কপি — পরিবারকে আমন্ত্রণ', hi: 'लिंक कॉपी — परिवार को आमंत्रित करें' })}`
            : `📤 ${tr({ en: 'Share this celebration', bn: 'এই উৎসব শেয়ার করুন', hi: 'यह उत्सव साझा करें' })}`}
          </button>
        {!festivalConcluded(event, Date.now()) && (
          <button onClick={doIcs}
            className="w-full rounded-2xl border border-orange-200 bg-white/70 py-3.5 text-sm font-bold text-orange-800 min-h-[44px]">
            📅 {tr({ en: 'Add to calendar', bn: 'ক্যালেন্ডারে যোগ করুন', hi: 'कैलेंडर में जोड़ें' })}
          </button>
        )}
        <p className="text-center text-[11px] text-stone-400 pb-4">
          {tr({ en: 'With the blessings of', bn: 'আশীর্বাদে', hi: 'आशीর্বাদ सहित' })} · {event.orgName}
        </p>
      </div>
    </div>
  );
};

export default FestivalEventPage;
