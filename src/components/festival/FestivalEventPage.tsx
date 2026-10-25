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
  festivalEventUrl, slotRemaining, validateRsvp,
  type FestivalEventDoc,
} from '../../lib/festival';
import { applyFestivalRsvp } from '../../lib/festivalRsvp';

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
    setSubmitting(true);
    try {
      // One transaction: the RSVP record and the public counters move
      // together (rules anchor the counters to this very record), and
      // a darshan slot can never be booked past its capacity.
      const uid = (firebaseUser as { uid?: string }).uid || 'anon';
      await applyFestivalRsvp({
        eventId: event!.id,
        workspaceId: orgId || '',
        uid,
        name,
        headcount,
        ...(slotId ? { slotId } : {}),
      });
      setDone(true);
    } catch (e) {
      const code = (e as { message?: string })?.message || '';
      setError(code === 'slot-full'
        ? safeTranslate('festival.page.slotfull', 'That darshan slot has just filled — please choose another time, or join the general darshan.', 'এই দর্শন স্লটটি এইমাত্র পূর্ণ হয়েছে — অন্য সময় বেছে নিন, অথবা সাধারণ দর্শনে যোগ দিন।', 'यह दर्शन स्लॉट अभी-अभी भर गया है — कृपया दूसरा समय चुनें, या सामान्य दर्शन में पधारें।')
        : safeTranslate('festival.page.err', 'Something did not go through — please try again.', 'কিছু একটা হয়নি — আবার চেষ্টা করুন।', 'कुछ ठीक नहीं हुआ — पुनः प्रयास करें।'));
    } finally {
      setSubmitting(false);
    }
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
                return (
                  <button key={s.id} disabled={left <= 0}
                    onClick={() => setSlotId(selected ? '' : s.id)}
                    className={`rounded-2xl border-2 px-4 py-3.5 text-left min-h-[44px] transition ${
                      selected ? 'border-orange-600 bg-orange-50' : left <= 0 ? 'border-stone-100 bg-stone-50 opacity-50' : 'border-stone-200 bg-white hover:border-orange-300'
                    }`}>
                    <div className="font-bold text-stone-800 text-sm">{tr(s.label)}</div>
                    <div className={`text-xs font-semibold ${left <= 0 ? 'text-stone-400' : left < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {left <= 0
                        ? tr({ en: 'Full — join the general darshan', bn: 'পূর্ণ — সাধারণ দর্শনে যোগ দিন', hi: 'पूर्ण — सामान्य दर्शन में पधारें' })
                        : tr({ en: `${left} places left`, bn: `${left}টি স্থান বাকি`, hi: `${left} स्थान शेष` })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* RSVP */}
        <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
          {done ? (
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
              {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
              <button
                disabled={submitting}
                onClick={doRsvp}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-700 to-red-800 text-orange-50 font-bold py-3.5 text-sm min-h-[44px] shadow disabled:opacity-50">
                {submitting
                  ? tr({ en: 'Saving…', bn: 'সংরক্ষণ…', hi: 'सहेज रहे…' })
                  : firebaseUser
                    ? `🙏 ${tr({ en: 'Count me in', bn: 'আমাকে গুনুন', hi: 'मुझे गिनें' })}`
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

        {/* Share */}
        <button onClick={doShare}
          className="w-full rounded-2xl border border-orange-200 bg-white/70 py-3.5 text-sm font-bold text-orange-800 min-h-[44px]">
          {copied
            ? `✓ ${tr({ en: 'Link copied — invite your family', bn: 'লিংক কপি — পরিবারকে আমন্ত্রণ', hi: 'लिंक कॉपी — परिवार को आमंत्रित करें' })}`
            : `📤 ${tr({ en: 'Share this celebration', bn: 'এই উৎসব শেয়ার করুন', hi: 'यह उत्सव साझा करें' })}`}
          </button>
        <p className="text-center text-[11px] text-stone-400 pb-4">
          {tr({ en: 'With the blessings of', bn: 'আশীর্বাদে', hi: 'आशीर्वाद सहित' })} · {event.orgName}
        </p>
      </div>
    </div>
  );
};

export default FestivalEventPage;
