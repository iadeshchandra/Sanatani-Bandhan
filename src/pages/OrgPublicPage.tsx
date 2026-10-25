/**
 * Sanatani Bandhan — Public org page (Pillar 3: inbound funnel)
 * ==========================================================================
 * Route: /org/:orgId  (the param may also be the org's publicSlug)
 *
 * This page represents the temple to the world — warm, dignified,
 * unhurried. It reads ONLY from the public `orgPages/{id}` projection
 * (Firestore `allow read: if true`); it NEVER touches `workspaces/{id}`,
 * treasury, member lists or any private collection. See src/lib/orgPublic.ts
 * for the public/private boundary.
 *
 * The page is the canonical home for an org on the web: brochure content,
 * darshan timings, gallery, upcoming events, visit/contact, donate CTA —
 * plus the social layer's Follow / Request-to-Join actions (supersedes the
 * old social-only OrgPage).
 *
 * Structure: `OrgPublicPageView` is the pure presentational component (props
 * in, no Firestore) — previewable with mock data; `OrgPublicPage` is the
 * data wrapper that resolves the org and wires the actions.
 */
import React, { useEffect, useState } from 'react';
import { appLocale } from '../lib/format';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { safeExternalUrl } from '../lib/safeUrl';
import {
  BadgeCheck, MapPin, Users, UserPlus, Bell, BellOff, ArrowLeft,
  Loader2, Landmark, CalendarDays, Clock, Phone, Globe, Navigation,
  Share2, Link2, Check, Heart, Images, X, ChevronLeft, ChevronRight,
  ShieldCheck, Receipt,
} from 'lucide-react';
import { SevaCardsSection } from '../components/org/SevaCards';
import { TransparencyBoard } from '../components/audit/TransparencyBoard';
import { DecisionCards } from '../components/audit/DecisionCards';
import { nextOccurrence, localTodayISO } from '../lib/eventRecurrence';
import { buildIcsCalendar, downloadIcs, icsFileName } from '../lib/icsExport';
import { OrgEventManager } from '../org/OrgEventManager';
import { OrgAnnouncementsSection } from '../org/OrgBroadcastManager';
import type { OrgEventItem } from '../org/eventBridge';
import { buildPinnedAarti } from '../sangam/liveAarti';
import { OrgLiveWatchDoor } from '../darshan';
import { AartiScheduleCard, AartiScheduleManager } from '../darshan';
import type { AartiSlot } from '../darshan';
import { useLanguage } from '../context/LanguageContext';
import { useMembership } from '../context/MembershipContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { orgTypeLabel, OrgPage as OrgPageType } from '../types/membership';
import { OrgLogo } from '../components/common/OrgLogo';
import { PublicLanguageButton } from '../components/public/PublicLanguageButton';
import { JoinRequestModal } from '../components/org/JoinRequestModal';
import {
  applyPageMeta,
  resetPageMeta,
  orgPageMeta,
  orgPublicPath,
  absoluteUrl,
  formatAddressLine,
  mapsSearchUrl,
  whatsappShareUrl,
  copyTextToClipboard,
} from '../lib/orgPublic';

/* ------------------------------------------------------------------ */
/* Presentational view — no data fetching, previewable with mock data  */
/* ------------------------------------------------------------------ */

export interface OrgPublicPageViewProps {
  page: OrgPageType;
  followers: number;
  following: boolean;
  busy: boolean;
  isMember: boolean;
  isTrustee: boolean;
  onFollow: () => void;
  onJoinClick: () => void;
  /** Live-aarti pin state (trustee-only feature). */
  aartiPinned: boolean;
  aartiPinBusy: boolean;
  onToggleAartiPin: () => void;
  /** Trustee event bridge: persist org events + auto-share setting. */
  onSaveEvents: (events: OrgEventItem[], autoShare: boolean) => Promise<void>;
  onSaveAartiSchedules: (schedules: AartiSlot[]) => Promise<void>;
}

export const OrgPublicPageView: React.FC<OrgPublicPageViewProps> = ({
  page,
  followers,
  following,
  busy,
  isMember,
  isTrustee,
  onFollow,
  onJoinClick,
  aartiPinned,
  aartiPinBusy,
  onToggleAartiPin,
  onSaveEvents,
  onSaveAartiSchedules,
}) => {
  const navigate = useNavigate();
  const { safeTranslate, rt, t } = useLanguage();
  // Trilingual UI chrome — org's own content stays exactly as the org wrote it.
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);
  // Regional word for "temple" (kovil in Tamil Nadu, devasthana in
  // Karnataka…) — the English chrome speaks the region's word (B3 rt()).
  const templeWord = rt('temple');
  const templeWordCap = templeWord.charAt(0).toUpperCase() + templeWord.slice(1);

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const addressLine = formatAddressLine(page);
  const timings = page.darshanTimings || [];
  const gallery = page.galleryUrls || [];
  const events = (page.upcomingEvents || []).slice(0, 10);
  const about = page.tagline || page.about || '';
  const pageUrl = absoluteUrl(orgPublicPath(page));
  const shareWa = whatsappShareUrl(pageUrl, page.name);

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(pageUrl);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2200);
  };

  const badges: { icon: React.ReactNode; label: string; cls: string }[] = [];
  if (page.verified) {
    badges.push({
      icon: <BadgeCheck size={14} />,
      label: T('orgpublic_verified', 'Verified Institution', 'যাচাইকৃত প্রতিষ্ঠান', 'सत्यापित संस्थान'),
      cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    });
  }
  if (page.eightyGRegistered) {
    badges.push({
      icon: <Receipt size={14} />,
      label: T('orgpublic_80g', '80G Registered', '80G নিবন্ধিত', '80G पंजीकृत'),
      cls: 'text-amber-800 bg-amber-50 border-amber-200',
    });
  }
  if (page.twelveARegistered) {
    badges.push({
      icon: <ShieldCheck size={14} />,
      label: T('orgpublic_12a', '12A Registered', '12A নিবন্ধিত', '12A पंजीकृत'),
      cls: 'text-sky-800 bg-sky-50 border-sky-200',
    });
  }

  return (
    <div className="min-h-screen bg-amber-50/60 pb-20">
      {/* ------------------------------ HERO ------------------------------ */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#431407] via-[#7c2d12] to-[#92400e]">
        {/* sacred glow texture */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, #fbbf24 0, transparent 34%), radial-gradient(circle at 85% 80%, #f97316 0, transparent 38%), radial-gradient(circle at 60% 40%, #f59e0b22 0, transparent 45%)',
          }}
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full backdrop-blur min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={T('orgpublic_back', 'Back', 'পেছনে', 'वापस')}
        >
          <ArrowLeft size={18} />
        </button>
        {/* WORLD-READY (Axis B): a public visitor reads this page in
            THEIR language — the switcher sits in the hero band,
            pre-login, canonical registry. */}
        <div className="absolute top-4 right-4 z-10">
          <PublicLanguageButton tone="dark" />
        </div>

        <div className="relative max-w-3xl mx-auto px-5 pt-14 pb-10 text-center">
          <div className="flex justify-center mb-5">
            <OrgLogo name={page.name} logoUrl={page.logoUrl} size={120} withRing />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-amber-50 tracking-tight leading-tight">
            {page.name}
          </h1>
          {about && (
            <p className="mt-3 text-amber-100/90 italic font-serif text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              {about}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-200 bg-white/10 border border-amber-200/30 rounded-full px-3 py-1">
              {orgTypeLabel(page.type)}
            </span>
            {(page.city || page.state) && (
              <span className="text-xs text-amber-100/80 flex items-center gap-1">
                <MapPin size={12} /> {[page.city, page.state].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
          {badges.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex items-center gap-1.5 text-xs font-black rounded-full px-3 py-1.5 border ${b.cls}`}
                >
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          )}

          {/* share row */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <a
              href={shareWa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-full bg-[#25D366] text-white text-sm font-black shadow-lg hover:brightness-95"
            >
              <Share2 size={16} />
              {T('orgpublic_share_wa', 'WhatsApp', 'হোয়াটসঅ্যাপ', 'व्हाट्सऐप')}
            </a>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-full bg-white/15 text-amber-50 text-sm font-black border border-amber-100/30 backdrop-blur hover:bg-white/25"
            >
              {copied ? <Check size={16} /> : <Link2 size={16} />}
              {copied
                ? T('orgpublic_copied', 'Copied!', 'কপি হয়েছে!', 'कॉपी हो गया!')
                : T('orgpublic_copy_link', 'Copy Link', 'লিঙ্ক কপি', 'लिंक कॉपी')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-2">
        {/* ------------------------- QUICK ACTIONS ------------------------- */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <button
            onClick={() => navigate('/signup')}
            className="flex flex-col items-center justify-center gap-1.5 min-h-[64px] bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md hover:brightness-105"
          >
            <Heart size={20} />
            {T('orgpublic_donate', 'Donate', 'দান করুন', 'दान करें')}
          </button>
          {page.phone ? (
            <a
              href={`tel:${page.phone.replace(/\s/g, '')}`}
              className="flex flex-col items-center justify-center gap-1.5 min-h-[64px] bg-white border border-stone-200 text-stone-800 rounded-2xl font-black text-xs sm:text-sm shadow-sm hover:bg-stone-50"
            >
              <Phone size={20} className="text-amber-700" />
              {T('orgpublic_call', 'Call', 'কল করুন', 'कॉल करें')}
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 min-h-[64px] bg-white/60 border border-stone-200 text-stone-400 rounded-2xl font-black text-xs sm:text-sm">
              <Phone size={20} />
              {T('orgpublic_call', 'Call', 'কল করুন', 'कॉल करें')}
            </div>
          )}
          {addressLine ? (
            <a
              href={mapsSearchUrl(addressLine, page.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 min-h-[64px] bg-white border border-stone-200 text-stone-800 rounded-2xl font-black text-xs sm:text-sm shadow-sm hover:bg-stone-50"
            >
              <Navigation size={20} className="text-amber-700" />
              {T('orgpublic_directions', 'Directions', 'পথ নির্দেশ', 'मार्ग')}
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 min-h-[64px] bg-white/60 border border-stone-200 text-stone-400 rounded-2xl font-black text-xs sm:text-sm">
              <Navigation size={20} />
              {T('orgpublic_directions', 'Directions', 'পথ নির্দেশ', 'मार्ग')}
            </div>
          )}
        </div>

        {/* ------------------------- SEVA CARDS ------------------------- */}
        {/* Tangible giving: fixed-amount cards with goal trackers (Phase 2). */}
        <SevaCardsSection orgId={page.orgId} orgName={page.name} />

        {/* ------------------------- CAMPUS MAP ------------------------- */}
        {/* Entry point to the per-org campus map: devotees explore, trustees draw.
            Routes: /org/:orgId/campus (visitor) and /org/:orgId/campus/manage. */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-amber-700" />
            {T('orgpublic_campus_title', 'Explore the Campus Map 🗺️', 'ক্যাম্পাস মানচিত্র ঘুরে দেখুন 🗺️', 'परिसर का नक्शा देखें 🗺️')}
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            {T('orgpublic_campus_sub',
              'Walk the sacred grounds before you arrive — prayer halls, prasad counters and quiet corners, all on one map.',
              'আসার আগেই পবিত্র প্রাঙ্গণ ঘুরে দেখুন — প্রার্থনা হল, প্রসাদ কাউন্টার ও নির্জন কোণ, সব এক মানচিত্রে।',
              'पहुंचने से पहले पवित्र परिसर घूमें — प्रार्थना हॉल, प्रसाद काउंटर और शांत कोने, सब एक नक्शे में।')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              type="button"
              onClick={() => navigate(`/org/${page.publicSlug || page.orgId}/campus`)}
              className="min-h-[48px] px-6 rounded-2xl bg-amber-700 text-white font-black text-sm shadow-sm hover:bg-amber-800 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <MapPin size={18} />
              {T('orgpublic_campus_open', 'Open the Map', 'মানচিত্র খুলুন', 'नक्शा खोलें')}
            </button>
            {isTrustee && (
              <button
                type="button"
                onClick={() => navigate(`/org/${page.publicSlug || page.orgId}/campus/manage`)}
                className="min-h-[48px] px-6 rounded-2xl bg-white border border-stone-300 text-stone-800 font-black text-sm shadow-sm hover:bg-stone-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                {T('orgpublic_campus_manage', `🗺️ Map Your ${templeWordCap}`, '🗺️ মন্দিরের মানচিত্র', '🗺️ अपना मंदिर मैप करें')}
              </button>
            )}
            {isTrustee && (
              <button
                type="button"
                onClick={onToggleAartiPin}
                disabled={aartiPinBusy}
                className="min-h-[48px] px-6 rounded-2xl bg-white border border-red-200 text-red-800 font-black text-sm shadow-sm hover:bg-red-50 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
                title={T('orgpublic_aarti_pin_hint', `When your ${templeWord} goes live, a pinned card appears at the top of the Sangam feed.`, 'আপনার মন্দির লাইভ হলে সংগম ফিডের শীর্ষে একটি পিন করা কার্ড দেখা যাবে।', 'जब आपका मंदिर लाइव होगा, तो संगम फ़ीड के शीर्ष पर एक पिन किया कार्ड दिखेगा।')}
              >
                {aartiPinned
                  ? T('orgpublic_aarti_unpin', '📌 Unpin live aarti', '📌 লাইভ আরতি আনপিন করুন', '📌 लाइव आरती अनपिन करें')
                  : T('orgpublic_aarti_pin', '📌 Pin live aarti', '📌 লাইভ আরতি পিন করুন', '📌 लाइव आरती पिन करें')}
              </button>
            )}
          </div>
        </section>

        {/* ------------------------- DARSHAN TIMINGS ------------------------- */}
        {timings.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-4">
              <Clock size={16} className="text-amber-700" />
              {T('orgpublic_timings', 'Darshan Timings', 'দর্শনের সময়', 'दर्शन समय')}
            </h2>
            <dl className="divide-y divide-stone-100">
              {timings.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm font-bold text-stone-700">{row.label}</dt>
                  <dd className="text-sm font-black text-amber-800 whitespace-nowrap">{row.time}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* ------------------------- DAILY AARTI + REMIND ME ------------------------- */}
        {/* Devotees see the published schedule with one-tap gentle reminders;
            trustees manage it inline (same pattern as OrgEventManager). */}
        <AartiScheduleCard
          orgId={page.orgId}
          orgName={page.name}
          schedules={page.aartiSchedules || []}
        />
        {isTrustee && (
          <AartiScheduleManager
            schedules={page.aartiSchedules || []}
            onSave={onSaveAartiSchedules}
          />
        )}

        {/* ------------------------------ GALLERY ------------------------------ */}
        {gallery.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-4">
              <Images size={16} className="text-amber-700" />
              {T('orgpublic_gallery', 'Photo Gallery', 'ছবির গ্যালারি', 'फोटो गैलरी')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {gallery.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(i)}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 group min-h-[44px]"
                  aria-label={T('orgpublic_view_photo', 'View photo', 'ছবি দেখুন', 'फोटो देखें')}
                >
                  {/* intentional placeholder behind the photo while it loads */}
                  <Images size={30} className="absolute inset-0 m-auto text-amber-200/70" />
                  <img
                    src={url}
                    alt={`${page.name} — ${T('orgpublic_photo', 'photo', 'ছবি', 'फोटो')} ${i + 1}`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ------------------------------ EVENTS ------------------------------ */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-amber-700" />
            {T('orgpublic_events', 'Upcoming Events', 'আসন্ন অনুষ্ঠান', 'आगामी कार्यक्रम')}
          </h2>
          {events.length === 0 ? (
            <p className="text-xs text-stone-400 leading-relaxed">
              {T(
                'orgpublic_no_events',
                `${page.name} hasn’t published upcoming events yet. Follow the page to be notified.`,
                `${page.name} এখনও কোনো আসন্ন অনুষ্ঠান প্রকাশ করেনি। জানতে পেজটি অনুসরণ করুন।`,
                `${page.name} ने अभी कोई आगामी कार्यक्रम प्रकाशित नहीं किया है। सूचना के लिए पेज को फॉलो करें।`
              )}
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((ev, i) => {
                // EVENTS P1 — a recurring event shows its NEXT
                // occurrence (derived from the one definition, never a
                // stored copy) + its rhythm, and offers the .ics with
                // the RRULE so devotees' calendars repeat it too.
                const occ = ev.recurrence ? nextOccurrence(ev.date, ev.recurrence, localTodayISO(), ev.time) : null;
                const shownDate = occ ? occ.date : ev.date;
                const recurLabel = ev.recurrence
                  ? ev.recurrence.freq === 'weekly'
                    ? t('surfaces.events.repeatWeekly')
                    : ev.recurrence.freq === 'monthly'
                      ? t('surfaces.events.repeatMonthly')
                      : t('surfaces.events.repeatYearly')
                  : '';
                return (
                <li key={i} className="flex gap-4 items-start bg-amber-50/60 border border-amber-100 rounded-2xl p-4">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-orange-800 text-white flex flex-col items-center justify-center">
                    <span className="text-lg font-black leading-none">{eventDay(shownDate)}</span>
                    <span className="text-[10px] font-black uppercase">{eventMonth(shownDate)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-stone-900">{ev.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {[shownDate, ev.time].filter(Boolean).join(' · ')}
                      {ev.recurrence && occ ? ` · ${t('surfaces.events.nextLabel')}` : ''}
                    </p>
                    {ev.recurrence && (
                      <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                        🔁 {recurLabel}
                        {(ev.recurrence.interval || 1) > 1
                          ? ` · ${t('surfaces.events.intervalLabel')} ${ev.recurrence.interval} ${
                              ev.recurrence.freq === 'weekly'
                                ? t('surfaces.events.unitWeek')
                                : ev.recurrence.freq === 'monthly'
                                  ? t('surfaces.events.unitMonth')
                                  : t('surfaces.events.unitYear')}`
                          : ''}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{ev.description}</p>
                    )}
                    {/^\d{4}-\d{2}-\d{2}$/.test(ev.date) && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadIcs(
                            buildIcsCalendar([
                              {
                                uid: `orgpage-${page.orgId}-${i}@sanatanibandhan`,
                                title: ev.title,
                                description: ev.description,
                                location: page.name,
                                date: ev.date,
                                time: ev.time,
                                recurrence: ev.recurrence,
                              },
                            ]),
                            icsFileName(ev.title)
                          )
                        }
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 min-h-[36px] hover:bg-amber-100 transition"
                      >
                        📅 {t('surfaces.events.addToCalendar')}
                      </button>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
          {/* Trustee event bridge: manage org events + share to Sangam. */}
          {isTrustee && (
            <OrgEventManager
              orgId={page.orgId}
              orgName={page.name}
              events={(page.upcomingEvents || []) as OrgEventItem[]}
              autoShare={!!page.autoShareEvents}
              onSave={onSaveEvents}
            />
          )}
        </section>

        {/* --------------------------- ANNOUNCEMENTS --------------------------- */}
        {/* QUEUED #14: trustees publish → followers' devices self-listen and
            ring their own Suchana bell. Public list shows the latest few;
            the component hides itself for visitors until the org announces. */}
        <OrgAnnouncementsSection orgId={page.orgId} orgName={page.name} isTrustee={isTrustee} />

        {/* ------------------------------ VISIT ------------------------------ */}
        {(addressLine || page.phone || page.website) && (
          <section className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-amber-700" />
              {T('orgpublic_visit', 'Visit Us', 'আমাদের দেখুন', 'पधारें')}
            </h2>
            <div className="space-y-3 text-sm">
              {addressLine && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-stone-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-stone-700 font-bold leading-relaxed">{addressLine}</p>
                    <a
                      href={mapsSearchUrl(addressLine, page.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 font-black text-xs underline underline-offset-2 inline-block mt-1 min-h-[44px] py-2"
                    >
                      {T('orgpublic_open_maps', 'Open in Maps', 'ম্যাপে খুলুন', 'मैप में खोलें')}
                    </a>
                  </div>
                </div>
              )}
              {page.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-stone-400 shrink-0" />
                  <a href={`tel:${page.phone.replace(/\s/g, '')}`} className="text-stone-700 font-bold min-h-[44px] flex items-center">
                    {page.phone}
                  </a>
                </div>
              )}
              {safeExternalUrl(page.website) && (
                <div className="flex items-center gap-3">
                  <Globe size={16} className="text-stone-400 shrink-0" />
                  <a
                    href={safeExternalUrl(page.website)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-700 font-bold break-all min-h-[44px] flex items-center"
                  >
                    {page.website}
                  </a>
                </div>
              )}
              {page.registrationNo && (
                <p className="text-[11px] text-stone-400 font-bold pt-1">
                  {T('orgpublic_reg_no', 'Reg. No.', 'নিবন্ধন নং', 'पंजीकरण सं.')} {page.registrationNo}
                  {page.eightyGURN ? ` · 80G URN ${page.eightyGURN}` : ''}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ------------------------- COMMUNITY ACTIONS ------------------------- */}
        <section className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
          <div className="flex items-center gap-5 text-xs font-bold text-stone-500 mb-4">
            <span className="flex items-center gap-1.5"><Bell size={14} /> {followers.toLocaleString(appLocale())} {T('orgpublic_followers', 'followers', 'অনুসারী', 'अनुयायी')}</span>
            <span className="flex items-center gap-1.5"><Users size={14} /> {(page.memberCount || 0).toLocaleString(appLocale())} {T('orgpublic_members', 'members', 'সদস্য', 'सदस्य')}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onFollow}
              disabled={busy}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all min-h-[44px] ${
                following
                  ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  : 'bg-amber-700 hover:bg-amber-600 text-white shadow-md'
              }`}
            >
              {following ? <BellOff size={16} /> : <Bell size={16} />}
              {following
                ? T('orgpublic_following', 'Following', 'অনুসরণ করছেন', 'फॉलो कर रहे हैं')
                : T('orgpublic_follow', 'Follow', 'অনুসরণ করুন', 'फॉलो करें')}
            </button>
            {!isMember ? (
              <button
                onClick={onJoinClick}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm bg-white border-2 border-amber-700 text-amber-800 hover:bg-amber-50 transition-all min-h-[44px]"
              >
                <UserPlus size={16} />
                {T('orgpublic_join', 'Request to Join', 'যোগদানের অনুরোধ', 'जुड़ने का अनुरोध')}
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 min-h-[44px]">
                <BadgeCheck size={16} />
                {T('orgpublic_member', 'You are a member', 'আপনি সদস্য', 'आप सदस्य हैं')}
              </div>
            )}
          </div>
          {following && (
            <p className="text-[11px] text-stone-400 mt-2 text-center">
              {T('orgpublic_follow_note', `You’ll see ${page.name}’s announcements in your feed.`, `আপনার ফিডে ${page.name}-এর ঘোষণা দেখতে পাবেন।`, `आप अपने फ़ीड में ${page.name} की घोषणाएँ देखेंगे।`)}
            </p>
          )}
        </section>

        {/* ------------------------------ FOOTER ------------------------------ */}
        <footer className="text-center mt-8 mb-4">
          <p className="text-[11px] text-stone-400 font-bold">
            {T('orgpublic_powered', 'Powered by', 'পরিচালনায়', 'द्वारा संचालित')}{' '}
            <span className="text-amber-700">Sanatani Bandhan</span>
          </p>
        </footer>
      </main>

      {/* --------------------------- LIGHTBOX --------------------------- */}
      {lightbox !== null && gallery[lightbox] && (
        <div
          className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={T('orgpublic_gallery', 'Photo Gallery', 'ছবির গ্যালারি', 'फोटो गैलरी')}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-white/15 rounded-full p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={T('orgpublic_close', 'Close', 'বন্ধ করুন', 'बंद करें')}
          >
            <X size={20} />
          </button>
          {gallery.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length); }}
                className="absolute left-3 text-white bg-white/15 rounded-full p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={T('orgpublic_prev', 'Previous photo', 'আগের ছবি', 'पिछली फोटो')}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length); }}
                className="absolute right-3 text-white bg-white/15 rounded-full p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={T('orgpublic_next', 'Next photo', 'পরের ছবি', 'अगली फोटो')}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <img
            src={gallery[lightbox]}
            alt={`${page.name} — ${T('orgpublic_photo', 'photo', 'ছবি', 'फोटो')} ${lightbox + 1}`}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Data wrapper — resolves the org, SEO head, and wires the actions    */
/* ------------------------------------------------------------------ */

export const OrgPublicPage: React.FC = () => {
  const { orgId: param } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { safeTranslate, currentLang } = useLanguage();
  const darshanLang = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as 'en' | 'hi' | 'bn';
  const { isFollowing, toggleFollow, followerCount, myMemberships } = useMembership();
  const { firebaseUser } = useAuthWorkspace();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);

  const [page, setPage] = useState<OrgPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [aartiPinBusy, setAartiPinBusy] = useState(false);

  useEffect(() => {
    if (!param) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      let p: OrgPageType | null = null;
      try {
        // 1) direct doc id, 2) public slug lookup.
        const snap = await getDoc(doc(db, 'orgPages', param));
        if (snap.exists()) {
          p = snap.data() as OrgPageType;
        } else {
          const qs = await getDocs(
            query(collection(db, 'orgPages'), where('publicSlug', '==', param), limit(1))
          );
          if (!qs.empty) p = qs.docs[0].data() as OrgPageType;
        }
      } catch {
        p = null;
      }
      if (cancelled) return;
      setPage(p);
      setLoading(false);
      if (p) {
        // Canonical URL: prefer the slug once the org sets one.
        const canonical = p.publicSlug || p.orgId;
        if (canonical !== param) navigate(`/org/${canonical}`, { replace: true });
        applyPageMeta(orgPageMeta(p));
        try {
          setFollowers(await followerCount(p.orgId));
        } catch {
          /* counts are best-effort */
        }
      }
    })();
    return () => {
      cancelled = true;
      resetPageMeta();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param]);

  const isMember = page ? myMemberships.some((m) => m.workspaceId === page.orgId) : false;
  const isTrustee = page
    ? myMemberships.some((m) => m.workspaceId === page.orgId && m.role === 'Trustee')
    : false;
  const following = page ? isFollowing(page.orgId) : false;

  const handleFollow = async () => {
    if (!page || busy) return;
    if (!firebaseUser) {
      alert(T('orgpublic_signin_follow', 'Please sign in to follow organisations.', 'অনুগ্রহ করে সংস্থাগুলোকে অনুসরণ করতে সাইন ইন করুন।', 'कृपया संस्थाओं को फॉलो करने के लिए साइन इन करें।'));
      return;
    }
    setBusy(true);
    try {
      await toggleFollow(page);
      setFollowers(await followerCount(page.orgId));
    } catch {
      /* toast already shown */
    } finally {
      setBusy(false);
    }
  };

  const handleJoinClick = () => {
    if (!firebaseUser) {
      alert(T('orgpublic_signin_join', 'Please sign in to request membership.', 'সদস্যপদের জন্য অনুরোধ করতে সাইন ইন করুন।', 'सदस्यता का अनुरोध करने के लिए साइन इन करें।'));
      return;
    }
    setShowJoinModal(true);
  };

  const aartiPinned = !!(page?.pinnedAarti && page.pinnedAarti.enabled);

  /** Trustee event bridge: persist org events + auto-share setting to orgPages. */
  const handleSaveEvents = async (events: OrgEventItem[], autoShare: boolean) => {
    if (!page || !isTrustee || !firebaseUser) return;
    const ref = doc(db, 'orgPages', page.orgId);
    await updateDoc(ref, {
      upcomingEvents: events.slice(0, 10),
      autoShareEvents: autoShare,
      updatedAt: Date.now(),
    });
    const snap = await getDoc(ref);
    if (snap.exists()) setPage(snap.data() as OrgPageType);
  };

  /** Trustee-published aarti schedules → orgPages (rules: trustee whitelist). */
  const handleSaveAartiSchedules = async (schedules: AartiSlot[]) => {
    if (!page || !isTrustee || !firebaseUser) return;
    const ref = doc(db, 'orgPages', page.orgId);
    await updateDoc(ref, {
      aartiSchedules: schedules.slice(0, 8),
      updatedAt: Date.now(),
    });
    const snap = await getDoc(ref);
    if (snap.exists()) setPage(snap.data() as OrgPageType);
  };

  const handleToggleAartiPin = async () => {
    if (!page || !isTrustee || aartiPinBusy || !firebaseUser) return;
    setAartiPinBusy(true);
    try {
      const ref = doc(db, 'orgPages', page.orgId);
      if (aartiPinned) {
        await updateDoc(ref, {
          pinnedAarti: { ...(page.pinnedAarti as object), enabled: false },
        });
      } else {
        await updateDoc(ref, {
          pinnedAarti: buildPinnedAarti({
            orgId: page.orgId,
            orgName: page.name,
            pinnedBy: firebaseUser.uid,
          }),
        });
      }
      const snap = await getDoc(ref);
      if (snap.exists()) setPage(snap.data() as OrgPageType);
    } catch {
      alert(
        T(
          'orgpublic_aarti_pin_error',
          'Could not update the aarti pin. Please try again.',
          'আরতির পিন আপডেট করা যায়নি। আবার চেষ্টা করুন।',
          'आरती पिन अपडेट नहीं हो सका। कृपया पुनः प्रयास करें।'
        )
      );
    } finally {
      setAartiPinBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <Loader2 className="animate-spin text-amber-700" size={36} aria-label="Loading" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 p-6 text-center">
        <Landmark size={52} className="text-amber-200 mb-4" />
        <h1 className="text-2xl font-black text-stone-900">
          {T('orgpublic_notfound', 'This page is not published yet', 'এই পৃষ্ঠাটি এখনও প্রকাশিত হয়নি', 'यह पृष्ठ अभी प्रकाशित नहीं हुआ है')}
        </h1>
        <p className="text-sm text-stone-500 mt-2 max-w-sm">
          {T('orgpublic_notfound_sub', 'The organisation may not have set up its public profile, or the link is incorrect.', 'সংস্থাটি হয়তো এখনও তার পাবলিক প্রোফাইল তৈরি করেনি, অথবা লিঙ্কটি ভুল।', 'संस्था ने शायद अभी अपना सार्वजनिक प्रोफ़ाइल नहीं बनाया है, या लिंक गलत है।')}
        </p>
        <button
          onClick={() => navigate('/orgs')}
          className="mt-6 px-6 py-3 bg-amber-700 text-white rounded-xl font-bold text-sm min-h-[44px] hover:bg-amber-600"
        >
          {T('orgpublic_browse', 'Browse organisations', 'সংস্থাগুলো দেখুন', 'संस्थाएँ देखें')}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Live watch door (replaces the null-render poller — audit 2026-10-20):
          same detection loop (leader election, gentle go-live notify) plus a
          visible "🔴 Watch live" banner when the org is definitively live. */}
      {page.youtubeChannelId && (
        <OrgLiveWatchDoor
          orgId={page.orgId}
          channelId={page.youtubeChannelId}
          templeName={page.name}
          schedules={page.aartiSchedules || []}
          lang={darshanLang}
        />
      )}
      <OrgPublicPageView
        page={page}
        followers={followers}
        following={following}
        busy={busy}
        isMember={isMember}
        isTrustee={isTrustee}
        onFollow={handleFollow}
        onJoinClick={handleJoinClick}
        aartiPinned={aartiPinned}
        aartiPinBusy={aartiPinBusy}
        onToggleAartiPin={handleToggleAartiPin}
        onSaveEvents={handleSaveEvents}
        onSaveAartiSchedules={handleSaveAartiSchedules}
      />
      {/* Transparency Board (Blueprint A): trustee-published monthly
          accounts. Renders only when the org has published at least
          one month — nothing is public until published. */}
      <TransparencyBoard workspaceId={page.orgId} orgName={page.name} />
      {/* EVENTS P2 — concluded decisions, beneath the accounts: the
          house's polls + resolutions in plain language (a poll whose
          creator chose committee-only results shows only to them). */}
      <DecisionCards workspaceId={page.orgId} isCommittee={isTrustee} />
      {showJoinModal && (
        <JoinRequestModal page={page} onClose={() => setShowJoinModal(false)} />
      )}
    </>
  );
};

/** Day number from an ISO date; 'ॐ' when the date is free text. */
function eventDay(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  return m ? String(parseInt(m[3], 10)) : 'ॐ';
}

/** Short month from an ISO date; '' when the date is free text. */
function eventMonth(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  if (!m) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[parseInt(m[2], 10) - 1] || '';
}

export default OrgPublicPage;
