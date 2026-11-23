/**
 * PublishPanel — publish the devotee festival page (Pillar 2).
 * =====================================================================
 * Trustee composes the public festival event page (story, special
 * timings, darshan slots) and publishes it to Firestore. The page is
 * shareable (`/festival/:orgId/:eventId`); RSVPs flow back here live and
 * feed the footfall planner. Unpublish any time.
 */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { T, Card, Btn, Field, inputCls, fmtDate } from '../../utsav/ui';
import {
  festivalEventUrl, slotRemaining,
  type WarFestival, type WarRoomPlan, type FestivalEventDoc, type FestivalTiming, type DarshanSlot,
  type TicketTier, type TicketDiscountCode, type RefundTier,
} from '../../lib/festival';
import { useFestivalCloud } from './festivalWarStore';
import {
  deriveTicketingConfig, publicTicketStamps, validateTicketing, normalizeDiscountCode,
} from '../../lib/eventTickets';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { safeExternalUrl } from '../../lib/safeUrl';

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

/* EVENTS E8 — the release moment is edited as a local
 * datetime-local value and stored as an ISO timestamp. */
const isoToLocalInput = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const localInputToIso = (v: string): string => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : '';
};

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
  /** E2: persist the ticketing config through the War Room plan patch. */
  patchPlan?: (p: Partial<WarRoomPlan>) => void;
}

export const PublishPanel: React.FC<Props> = ({ wf, plan, patchPlan }) => {
  const { safeTranslate } = useLanguage();
  const { activeWorkspace } = useAuthWorkspace();
  const cloud = useFestivalCloud(activeWorkspace.id, wf.key, { subscribeRsvps: true });

  const [story, setStory] = useState('');
  // REAL-WORLD PACK — venue + map link live on the plan; the
  // publish stamps them onto the public doc (buildDoc below).
  const [venue, setVenue] = useState(plan.venue || '');
  const [mapUrl, setMapUrl] = useState(plan.mapUrl || '');
  useEffect(() => {
    setVenue(plan.venue || '');
    setMapUrl(plan.mapUrl || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id]);
  const [timings, setTimings] = useState<FestivalTiming[]>([]);
  const [slots, setSlots] = useState<DarshanSlot[]>([]);
  const [newTiming, setNewTiming] = useState({ label: '', time: '' });
  const [newSlot, setNewSlot] = useState({ label: '', capacity: '50' });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Prefill from the published doc (or the Panjika significance on first run).
  useEffect(() => {
    if (cloud.loading) return;
    if (cloud.event) {
      setStory(cloud.event.story.en);
      setTimings(cloud.event.timings);
      setSlots(cloud.event.darshanSlots);
    } else if (!story) {
      setStory(wf.significance.en);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud.loading, cloud.event?.id]);

  const published = cloud.event?.published === true;
  const shareUrl = festivalEventUrl(window.location.origin, activeWorkspace.id, plan.id);

  const buildDoc = (pub: boolean): FestivalEventDoc => {
    // E2: ticketing stamps ride the publish. tierSold is NEVER written
    // here — it moves only through the anchored counter in the rules.
    const base: FestivalEventDoc = {
      id: plan.id,
      workspaceId: activeWorkspace.id,
      festivalKey: wf.key,
      orgName: activeWorkspace.name || '',
      name: wf.name,
      significance: wf.significance,
      dateISO: wf.dateISO,
      endDateISO: wf.endDateISO,
      tithiLine: wf.tithiLine,
      timings,
      story: { en: story.trim(), bn: story.trim(), hi: story.trim() },
      // REAL-WORLD PACK — venue stamps ride EVERY publish (even
      // ''), so clearing the venue here clears the public page on
      // the next publish — a merge can never leave a stale venue
      // standing. The map link is stamped only in the form
      // lib/safeUrl accepts (the stored-URL XSS gate), and the
      // page re-checks it at render.
      venue: venue.trim(),
      mapUrl: safeExternalUrl(mapUrl) || '',
      rsvpEnabled: true,
      darshanSlots: slots,
      published: pub,
      publishedHeadcount: cloud.event?.publishedHeadcount || 0,
      slotBooked: cloud.event?.slotBooked || {},
      rsvpHeadcount: cloud.event?.rsvpHeadcount || 0,
      updatedAt: new Date().toISOString(),
    };
    if (plan.ticketing && plan.ticketing.tiers.length > 0) {
      Object.assign(base, publicTicketStamps(plan.ticketing));
      base.festivalCancelled = plan.ticketing.festivalCancelled === true;
    } else if (plan.ticketing) {
      // Ticketing was configured then emptied — clear the stamps
      // explicitly (a merge publish would otherwise leave them live).
      base.ticketTiers = [];
      base.tierCaps = {};
      base.discountTerms = {};
      base.refundPolicy = [];
      base.ticketReleaseAtMs = 0;
      // NEXT-LEVEL B1b — the dip windows clear with the rest.
      base.dipOpensAtMs = {};
      base.dipClosesAtMs = {};
      base.festivalCancelled = plan.ticketing.festivalCancelled === true;
    }
    return base;
  };

  const doPublish = async (pub: boolean) => {
    setBusy(true);
    try {
      if (pub) await cloud.publishEvent(buildDoc(true));
      else await cloud.unpublish();
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: wf.name.en, text: story.slice(0, 120), url: shareUrl });
      } catch { /* dismissed */ }
    } else {
      copyLink();
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-extrabold text-stone-800">
          <T en="Devotee page & RSVP" bn="ভক্ত পৃষ্ঠা ও RSVP" hi="भक्त पृष्ठ व RSVP" />
        </h3>
        {published && (
          <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <T en="● Published" bn="● প্রকাশিত" hi="● प्रकाशित" />
          </span>
        )}
      </div>
      <p className="text-xs text-stone-500 mb-3">
        <T en="Publish a beautiful page for devotees — story, special timings, darshan slots. Share the link; RSVPs flow back into your footfall plan."
          bn="ভক্তদের জন্য সুন্দর পৃষ্ঠা প্রকাশ করুন — কাহিনি, বিশেষ সময়, দর্শন স্লট। লিংক শেয়ার করুন; RSVP আপনার ভিড় পরিকল্পনায় ফিরে আসবে।"
          hi="भक्तों हेतु सुंदर पृष्ठ प्रकाशित करें — कथा, विशेष समय, दर्शन स्लॉट। लिंक साझा करें; RSVP आपकी भीड़ योजना में वापस आएंगे।" />
      </p>

      <Field label={<T en="Festival story (1–2 lines, reverent)" bn="উৎসব কাহিনি (১–২ লাইন)" hi="उत्सव कथा (१–२ पंक्तियां)" />}>
        <textarea className={`${inputCls} min-h-[88px]`} rows={3} value={story}
          onChange={(e) => setStory(e.target.value)} maxLength={400} />
      </Field>

      {/* REAL-WORLD PACK — venue + map link: where devotees should
          come. Saved onto the plan as you leave each field; the
          publish above stamps them onto the public page and the
          /events list. */}
      <div className="mt-3">
        <Field label={<T en="Venue — where devotees should come" bn="স্থান — ভক্তরা যেখানে আসবেন" hi="स्थान — भक्त जहाँ आएं" />}>
          <input className={inputCls} value={venue} maxLength={160}
            placeholder={safeTranslate('festival.pub.venue', 'e.g. Community hall, Temple Road', 'যেমন কমিউনিটি হল, মন্দির রোড', 'जैसे सामुदायिक भवन, मंदिर मार्ग')}
            onChange={(e) => setVenue(e.target.value)}
            onBlur={() => patchPlan?.({ venue: venue.trim() })} />
        </Field>
        <div className="mt-2">
          <Field label={<T en="Map link (optional)" bn="মানচিত্রের লিংক (ঐচ্ছিক)" hi="मानचित्र लिंक (वैकल्पिक)" />}>
            <input className={inputCls} value={mapUrl} maxLength={500} inputMode="url"
              placeholder="https://maps.google.com/…"
              onChange={(e) => setMapUrl(e.target.value)}
              onBlur={() => patchPlan?.({ mapUrl: safeExternalUrl(mapUrl) || '' })} />
          </Field>
        </div>
        <p className="text-[11px] text-stone-400 mt-1">
          <T en="Shown on the public festival page and the events list, so families know where to come."
            bn="পাবলিক উৎসব পৃষ্ঠা ও ইভেন্ট তালিকায় দেখানো হয়, যাতে পরিবার জানে কোথায় আসতে হবে।"
            hi="सार्वजनिक उत्सव पृष्ठ और इवेंट सूची में दिखता है, ताकि परिवार जान सके कहाँ आना है।" />
        </p>
      </div>

      {/* Special timings */}
      <div className="mt-3">
        <div className="text-xs font-bold text-stone-600 mb-1.5">
          <T en="Special aarti / darshan timings" bn="বিশেষ আরতি / দর্শন সময়" hi="विशेष आरती / दर्शन समय" />
        </div>
        <div className="space-y-1.5 mb-2">
          {timings.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm bg-stone-50 rounded-xl px-3 py-2">
              <span className="flex-1 font-semibold text-stone-700">{t.label.en}</span>
              <span className="text-stone-500">{t.time}</span>
              <button className="w-11 h-11 -m-1 text-stone-300 hover:text-red-600 font-bold" aria-label="Remove timing"
                onClick={() => setTimings(timings.filter((x) => x.id !== t.id))}>✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input className={inputCls} placeholder={safeTranslate('festival.pub.timing', 'e.g. Sandhya aarti', 'যেমন সন্ধ্যা আরতি', 'जैसे संध्या आरती')}
            value={newTiming.label} onChange={(e) => setNewTiming({ ...newTiming, label: e.target.value })} />
          <input className={`${inputCls} !w-28`} placeholder="6:30 PM"
            value={newTiming.time} onChange={(e) => setNewTiming({ ...newTiming, time: e.target.value })} />
          <Btn className="!px-3" disabled={!newTiming.label.trim()}
            onClick={() => {
              setTimings([...timings, { id: uid('tm'), label: { en: newTiming.label.trim(), bn: newTiming.label.trim(), hi: newTiming.label.trim() }, time: newTiming.time.trim() || '—' }]);
              setNewTiming({ label: '', time: '' });
            }}>
            <T en="Add" bn="যোগ" hi="जोड़ें" />
          </Btn>
        </div>
      </div>

      {/* Darshan slots */}
      <div className="mt-3">
        <div className="text-xs font-bold text-stone-600 mb-1.5">
          <T en="Special darshan slots (optional)" bn="বিশেষ দর্শন স্লট (ঐচ্ছিক)" hi="विशेष दर्शन स्लॉट (वैकल्पिक)" />
        </div>
        <div className="space-y-1.5 mb-2">
          {slots.map((s) => {
            const booked = cloud.event?.slotBooked?.[s.id] || 0;
            return (
              <div key={s.id} className="flex items-center gap-2 text-sm bg-stone-50 rounded-xl px-3 py-2">
                <span className="flex-1 font-semibold text-stone-700">{s.label.en}</span>
                <span className="text-stone-500 text-xs">{booked}/{s.capacity} <T en="booked" bn="বুকড" hi="बुक" /></span>
                <button className="w-11 h-11 -m-1 text-stone-300 hover:text-red-600 font-bold" aria-label="Remove slot"
                  onClick={() => setSlots(slots.filter((x) => x.id !== s.id))}>✕</button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <input className={inputCls} placeholder={safeTranslate('festival.pub.slot', 'e.g. Morning darshan', 'যেমন সকালের দর্শন', 'जैसे सुबह दर्शन')}
            value={newSlot.label} onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })} />
          <input type="number" min={1} className={`${inputCls} !w-24`} placeholder="Cap."
            value={newSlot.capacity} onChange={(e) => setNewSlot({ ...newSlot, capacity: e.target.value })} />
          <Btn className="!px-3" disabled={!newSlot.label.trim()}
            onClick={() => {
              setSlots([...slots, { id: uid('sl'), label: { en: newSlot.label.trim(), bn: newSlot.label.trim(), hi: newSlot.label.trim() }, capacity: Math.max(1, parseInt(newSlot.capacity || '50', 10)) }]);
              setNewSlot({ label: '', capacity: '50' });
            }}>
            <T en="Add" bn="যোগ" hi="जोड़ें" />
          </Btn>
        </div>
      </div>

      {/* E2 — seva passes & booking (ticketing) */}
      <TicketingEditor wf={wf} plan={plan} patchPlan={patchPlan} published={published} />

      {/* Publish actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {!published ? (
          <Btn disabled={busy || !story.trim()} onClick={() => doPublish(true)}>
            <T en={busy ? 'Publishing…' : '🪔 Publish devotee page'} bn={busy ? 'প্রকাশ হচ্ছে…' : '🪔 ভক্ত পৃষ্ঠা প্রকাশ'} hi={busy ? 'प्रकाशित हो रहा…' : '🪔 भक्त पृष्ठ प्रकाशित करें'} />
          </Btn>
        ) : (
          <>
            <Btn disabled={busy} onClick={() => doPublish(true)}>
              <T en={busy ? 'Updating…' : 'Update page'} bn={busy ? 'হালনাগাদ…' : 'পৃষ্ঠা হালনাগাদ'} hi={busy ? 'अद्यतन…' : 'पृष्ठ अद्यतन'} />
            </Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => doPublish(false)}>
              <T en="Unpublish" bn="অপ্রকাশ" hi="अप्रकाशित" />
            </Btn>
            <Btn variant="ghost" onClick={copyLink}>
              <T en={copied ? '✓ Copied!' : 'Copy link'} bn={copied ? '✓ কপি হয়েছে!' : 'লিংক কপি'} hi={copied ? '✓ कॉपी हुआ!' : 'लिंक कॉपी'} />
            </Btn>
            <Btn variant="ghost" onClick={nativeShare}>
              <T en="Share" bn="শেয়ার" hi="साझा करें" />
            </Btn>
          </>
        )}
      </div>
      {published && (
        <div className="mt-2 text-xs text-stone-500 break-all">
          <a href={shareUrl} target="_blank" rel="noreferrer" className="text-orange-700 underline">{shareUrl}</a>
        </div>
      )}

      {/* Live RSVP feed */}
      {cloud.rsvps.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <div className="text-xs font-bold text-stone-600 mb-2">
            <T en={`RSVPs so far — ${cloud.rsvpHeadcount} devotees`} bn={`এ পর্যন্ত RSVP — ${cloud.rsvpHeadcount} জন ভক্ত`} hi={`अब तक RSVP — ${cloud.rsvpHeadcount} भक्त`} />
          </div>
          <ul className="max-h-40 overflow-y-auto space-y-1">
            {cloud.rsvps.slice(0, 50).map((r) => (
              <li key={r.id} className="flex justify-between text-xs bg-stone-50 rounded-lg px-2.5 py-1.5">
                <span className="font-semibold text-stone-700 truncate">{r.name}</span>
                <span className="text-stone-500 shrink-0 ml-2">
                  {r.headcount} <T en="coming" bn="আসছেন" hi="आ रहे" />
                  {r.slotId && slots.find((s) => s.id === r.slotId) ? ` · ${slots.find((s) => s.id === r.slotId)!.label.en}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

/* ─────────────────────────────────────────────────────────────────
 * TicketingEditor (E2) — tiers, discount codes, refund ladder and
 * the fee-bearer choice for this festival's seva passes. Saving
 * derives the validation maps firestore.rules checks every purchase
 * against (see lib/eventTickets.deriveTicketingConfig) and persists
 * through the War Room plan patch, which writes festival_plans.
 * Codes themselves never reach the public page — only their terms,
 * keyed by a hash, ride the publish stamps.
 * ─────────────────────────────────────────────────────────────── */
const TicketingEditor: React.FC<{ wf: WarFestival; plan: WarRoomPlan; patchPlan?: Props['patchPlan']; published: boolean }> = ({ wf, plan, patchPlan, published }) => {
  const existing = plan.ticketing;
  const [tiers, setTiers] = useState<TicketTier[]>(existing?.tiers ?? []);
  const [codes, setCodes] = useState<TicketDiscountCode[]>(existing?.discountCodes ?? []);
  const [ladder, setLadder] = useState<RefundTier[]>(
    existing?.refundPolicy ?? [
      { minDaysBefore: 7, percent: 100 },
      { minDaysBefore: 3, percent: 50 },
      { minDaysBefore: 0, percent: 0 },
    ]
  );
  const [feeBearer, setFeeBearer] = useState<'organiser' | 'buyer'>(existing?.feeBearer ?? 'organiser');
  const [releaseLocal, setReleaseLocal] = useState<string>(isoToLocalInput(existing?.releaseAt));
  // NEXT-LEVEL B1b — per-tier e-dip windows, edited as local
  // datetime strings keyed by tier id (the releaseLocal pattern,
  // per tier) and folded into the tiers only at save, so a
  // half-typed moment never reaches the stored config.
  const [dipLocal, setDipLocal] = useState<Record<string, { opens: string; closes: string }>>(() => {
    const m: Record<string, { opens: string; closes: string }> = {};
    for (const t of existing?.tiers ?? []) {
      if (t.dipOpensAt || t.dipClosesAt) {
        m[t.id] = { opens: isoToLocalInput(t.dipOpensAt), closes: isoToLocalInput(t.dipClosesAt) };
      }
    }
    return m;
  });
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelled = existing?.festivalCancelled === true;

  const foldDip = (list: TicketTier[]): TicketTier[] =>
    list.map((t) => {
      const d = dipLocal[t.id];
      const next = { ...t };
      const o = d ? localInputToIso(d.opens) : '';
      const c = d ? localInputToIso(d.closes) : '';
      if (o) next.dipOpensAt = o;
      else delete next.dipOpensAt;
      if (c) next.dipClosesAt = c;
      else delete next.dipClosesAt;
      return next;
    });

  const save = () => {
    const releaseIso = localInputToIso(releaseLocal);
    const draft = {
      tiers: foldDip(tiers), discountCodes: codes, refundPolicy: ladder, feeBearer,
      ...(releaseIso ? { releaseAt: releaseIso } : {}),
    };
    const bad = validateTicketing(draft);
    if (bad) {
      setErr(bad);
      return;
    }
    setErr('');
    const cfg = deriveTicketingConfig(draft, existing?.discountUses ?? {}, wf.dateISO, wf.endDateISO);
    if (cancelled) cfg.festivalCancelled = true;
    patchPlan?.({ ticketing: cfg });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setCancelled = async (on: boolean) => {
    const releaseIso = localInputToIso(releaseLocal);
    const base = existing ?? deriveTicketingConfig(
      { tiers: foldDip(tiers), discountCodes: codes, refundPolicy: ladder, feeBearer, ...(releaseIso ? { releaseAt: releaseIso } : {}) },
      {}, wf.dateISO, wf.endDateISO
    );
    const cfg = { ...base };
    if (on) cfg.festivalCancelled = true;
    else delete cfg.festivalCancelled;
    patchPlan?.({ ticketing: cfg });
    setConfirmCancel(false);
    // The public flag rides the next publish too; stamp it now when
    // the page is already live so refunds open at 100% immediately.
    if (published) {
      try {
        await setDoc(doc(db, 'festival_events', plan.id), { festivalCancelled: on }, { merge: true });
      } catch { /* the publish stamp will carry it */ }
    }
  };

  const errText: Record<string, string> = {
    'no-tiers': 'Add at least one pass, or leave passes off entirely.',
    'tier-name': 'Every pass needs a name.',
    'tier-id': 'Two passes share an id — remove one.',
    'tier-price': 'Paid passes need a price above zero; free passes must be zero.',
    'tier-cap': 'Per-booking limit must be between 1 and 20.',
    'code-shape': 'Codes are 3–24 letters, numbers, - or _ (e.g. DIWALI10).',
    'code-value': 'Check the code values — percent is 1–100, flat is above zero.',
    'ladder-shape': 'Refund rows need days 0–365 and percent 0–100.',
    'release-date': 'Check the passes-open moment — it does not read as a valid date and time.',
    'dip-window': 'Check the e-dip window — a dip needs both an opening and a closing moment, the closing after the opening, on a pass (never an add-on).',
  };
  const num = (v: string) => Math.max(0, parseInt(v || '0', 10) || 0);
  const rowCls = 'flex flex-wrap items-center gap-1.5 text-sm bg-stone-50 rounded-xl px-3 py-2';
  const mini = `${inputCls} !w-24`;
  const name3 = (t: TicketTier, v: string): TicketTier => ({ ...t, name: { en: v, bn: t.name.bn || v, hi: t.name.hi || v } });

  return (
    <div className="mt-4 border-t border-stone-100 pt-3">
      <div className="text-xs font-bold text-stone-600 mb-1">
        <T en="Seva passes & booking (optional)" bn="সেবা পাস ও বুকিং (ঐচ্ছিক)" hi="सेवा पास व बुकिंग (वैकल्पिक)" />
      </div>
      <p className="text-[11px] text-stone-500 mb-2">
        <T en="Paid tiers are cultural programmes, yatras and workshops — darshan itself is never sold. Devotees see every charge itemised before they confirm. Discount codes are never shown on the public page; a devotee types the code you share with them."
          bn="পেইড স্তর মানে সাংস্কৃতিক অনুষ্ঠান, যাত্রা ও ওয়ার্কশপ — দর্শন কখনো বিক্রি হয় না। নিশ্চিত করার আগে ভক্ত প্রতিটি খরচ আলাদা দেখেন। ছাড়ের কোড পাবলিক পৃষ্ঠায় দেখানো হয় না; আপনি যাঁদের দেবেন তাঁরাই লিখবেন।"
          hi="शुल्क स्तर सांस्कृतिक कार्यक्रम, यात्रा व कार्यशाला हेतु हैं — दर्शन कभी नहीं बिकता। पुष्टि से पहले भक्त हर शुल्क अलग-अलग देखते हैं। छूट कोड सार्वजनिक पृष्ठ पर नहीं दिखता; जिन्हें आप देंगे वही लिखेंगे।" />
      </p>

      {/* Tiers */}
      <div className="space-y-1.5 mb-2">
        {tiers.map((t, i) => (
          <React.Fragment key={t.id}>
          <div className={rowCls}>
            <input className={`${inputCls} flex-1 min-w-[140px]`} value={t.name.en} aria-label="Pass name"
              placeholder="e.g. Cultural evening pass"
              onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? name3(x, e.target.value) : x)))} />
            <select className={`${inputCls} !w-28`} value={t.kind} aria-label="Kind"
              onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, kind: e.target.value as TicketTier['kind'] } : x)))}>
              <option value="paid">Paid pass</option>
              <option value="free">Free pass</option>
              <option value="addon">Add-on</option>
            </select>
            <input type="number" min={0} className={mini} value={t.price} aria-label="Price" placeholder="Price"
              onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)))} />
            <input type="number" min={0} className={mini} value={t.capacity ?? ''} aria-label="Capacity (blank = no limit)" placeholder="Capacity"
              onChange={(e) => setTiers(tiers.map((x, j) => {
                if (j !== i) return x;
                const next = { ...x };
                if (e.target.value === '') delete next.capacity;
                else next.capacity = num(e.target.value);
                return next;
              }))} />
            <input type="number" min={1} max={20} className={mini} value={t.maxPerBooking ?? 6} aria-label="Max per booking" placeholder="Per booking"
              onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, maxPerBooking: num(e.target.value) } : x)))} />
            <input type="number" min={0} className={mini} value={t.earlyBird?.price ?? ''} aria-label="Early price" placeholder="Early ₹"
              onChange={(e) => setTiers(tiers.map((x, j) => {
                if (j !== i) return x;
                const next = { ...x };
                if (e.target.value === '') delete next.earlyBird;
                else next.earlyBird = { price: num(e.target.value), untilDate: next.earlyBird?.untilDate || wf.dateISO };
                return next;
              }))} />
            {t.earlyBird && (
              <input type="date" className={`${inputCls} !w-40`} value={t.earlyBird.untilDate} aria-label="Early price until"
                onChange={(e) => setTiers(tiers.map((x, j) => (j === i && x.earlyBird ? { ...x, earlyBird: { ...x.earlyBird, untilDate: e.target.value } } : x)))} />
            )}
            <button className="w-11 h-11 -m-1 text-stone-300 hover:text-red-600 font-bold" aria-label="Remove pass"
              onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>✕</button>
          </div>
          {/* NEXT-LEVEL B1b — the tier's e-dip window (optional):
              when both moments are set, this pass's places are
              allotted by a registered draw instead of a first-come
              rush — devotees enter during the window, the
              committee freezes and publishes the pool, draws
              openly in the War Room's dip panel, and only the
              selected may then book. Add-ons hold no places, so
              they never carry a dip. */}
          {t.kind !== 'addon' && (
            <div className="rounded-xl bg-orange-50/70 border border-orange-100 px-3 py-2 ml-1">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-[11px] font-bold text-orange-900">
                  <T en="E-dip window (optional)" bn="ই-ডিপ উইন্ডো (ঐচ্ছিক)" hi="ई-डिप विंडो (वैकल्पिक)" />
                </span>
                <input type="datetime-local" className={`${inputCls} !w-56`} aria-label="Dip entries open"
                  value={dipLocal[t.id]?.opens ?? ''}
                  onChange={(e) => setDipLocal({ ...dipLocal, [t.id]: { opens: e.target.value, closes: dipLocal[t.id]?.closes ?? '' } })} />
                <span className="text-stone-400 text-xs">→</span>
                <input type="datetime-local" className={`${inputCls} !w-56`} aria-label="Dip entries close"
                  value={dipLocal[t.id]?.closes ?? ''}
                  onChange={(e) => setDipLocal({ ...dipLocal, [t.id]: { opens: dipLocal[t.id]?.opens ?? '', closes: e.target.value } })} />
                {(dipLocal[t.id]?.opens || dipLocal[t.id]?.closes) && (
                  <button className="text-[11px] font-bold text-stone-500 min-h-[44px] px-2"
                    onClick={() => setDipLocal({ ...dipLocal, [t.id]: { opens: '', closes: '' } })}>
                    <T en="Clear" bn="মুছুন" hi="हटाएं" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                <T en="For a pass whose demand far outruns its places: between these moments devotees enter the dip (one entry per family party); direct booking of this pass closes, and after the draw only the selected parties book — at the same announced price."
                  bn="যে পাসের চাহিদা আসনের চেয়ে অনেক বেশি, তার জন্য: এই সময়ের মধ্যে ভক্তরা ডিপে নাম লেখান (পরিবার-পার্টি প্রতি একটি এন্ট্রি); এই পাসের সরাসরি বুকিং বন্ধ থাকে, আর ড্রয়ের পর শুধু নির্বাচিত পার্টিরাই বুক করেন — একই ঘোষিত মূল্যে।"
                  hi="जिस पास की मांग स्थानों से कहीं अधिक हो, उसके लिए: इन क्षणों के बीच भक्त डिप में नाम लिखते हैं (प्रति परिवार-पार्टी एक प्रविष्टि); इस पास की सीधी बुकिंग बंद रहती है, और ड्रॉ के बाद केवल चुनी पार्टियाँ ही बुक करती हैं — उसी घोषित मूल्य पर।" />
              </p>
            </div>
          )}
          </React.Fragment>
        ))}
      </div>
      <Btn variant="ghost" className="!px-3 mb-3"
        onClick={() => setTiers([...tiers, { id: uid('tier'), name: { en: '', bn: '', hi: '' }, kind: 'paid', price: 0 }])}>
        <T en="+ Add a pass" bn="+ পাস যোগ" hi="+ पास जोड़ें" />
      </Btn>

      {/* Discount codes */}
      <div className="text-[11px] font-bold text-stone-500 mb-1">
        <T en="Discount codes" bn="ছাড়ের কোড" hi="छूट कोड" />
      </div>
      <div className="space-y-1.5 mb-2">
        {codes.map((c, i) => (
          <div key={i} className={rowCls}>
            <input className={`${inputCls} !w-36 uppercase`} value={c.code} aria-label="Code" placeholder="DIWALI10"
              onChange={(e) => setCodes(codes.map((x, j) => (j === i ? { ...x, code: normalizeDiscountCode(e.target.value) } : x)))} />
            <select className={`${inputCls} !w-28`} value={c.kind} aria-label="Kind"
              onChange={(e) => setCodes(codes.map((x, j) => (j === i ? { ...x, kind: e.target.value as TicketDiscountCode['kind'] } : x)))}>
              <option value="percent">% off</option>
              <option value="flat">Flat off</option>
              <option value="full">Full (free)</option>
            </select>
            <input type="number" min={0} className={mini} value={c.value} aria-label="Value" placeholder="Value"
              onChange={(e) => setCodes(codes.map((x, j) => (j === i ? { ...x, value: num(e.target.value) } : x)))} />
            <input type="number" min={0} className={mini} value={c.maxUses ?? ''} aria-label="Max uses (blank = unlimited)" placeholder="Max uses"
              onChange={(e) => setCodes(codes.map((x, j) => {
                if (j !== i) return x;
                const next = { ...x };
                if (e.target.value === '') delete next.maxUses;
                else next.maxUses = num(e.target.value);
                return next;
              }))} />
            <span className="text-[11px] text-stone-400">
              <T en={`used ${existing?.discountUses?.[c.code] ?? 0}`} bn={`ব্যবহৃত ${existing?.discountUses?.[c.code] ?? 0}`} hi={`उपयोग ${existing?.discountUses?.[c.code] ?? 0}`} />
            </span>
            <button className="w-11 h-11 -m-1 text-stone-300 hover:text-red-600 font-bold" aria-label="Remove code"
              onClick={() => setCodes(codes.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
      <Btn variant="ghost" className="!px-3 mb-3"
        onClick={() => setCodes([...codes, { code: '', kind: 'percent', value: 10 }])}>
        <T en="+ Add a code" bn="+ কোড যোগ" hi="+ कोड जोड़ें" />
      </Btn>

      {/* Refund ladder + fee bearer */}
      <div className="text-[11px] font-bold text-stone-500 mb-1">
        <T en="Refund promise (by days before the festival)" bn="ফেরতের প্রতিশ্রুতি (উৎসবের কত দিন আগে)" hi="वापसी वादा (उत्सव से कितने दिन पहले)" />
      </div>
      <div className="space-y-1.5 mb-2">
        {ladder.map((r, i) => (
          <div key={i} className={rowCls}>
            <span className="text-xs text-stone-500"><T en="Cancel" bn="বাতিল" hi="रद्द" /></span>
            <input type="number" min={0} max={365} className={mini} value={r.minDaysBefore} aria-label="Days before"
              onChange={(e) => setLadder(ladder.map((x, j) => (j === i ? { ...x, minDaysBefore: num(e.target.value) } : x)))} />
            <span className="text-xs text-stone-500"><T en="days before → refund" bn="দিন আগে → ফেরত" hi="दिन पहले → वापसी" /></span>
            <input type="number" min={0} max={100} className={mini} value={r.percent} aria-label="Refund percent"
              onChange={(e) => setLadder(ladder.map((x, j) => (j === i ? { ...x, percent: num(e.target.value) } : x)))} />
            <span className="text-xs text-stone-500">%</span>
            <button className="w-11 h-11 -m-1 text-stone-300 hover:text-red-600 font-bold" aria-label="Remove refund row"
              onClick={() => setLadder(ladder.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Btn variant="ghost" className="!px-3"
          onClick={() => setLadder([...ladder, { minDaysBefore: 0, percent: 0 }])}>
          <T en="+ Add a row" bn="+ সারি যোগ" hi="+ पंक्ति जोड़ें" />
        </Btn>
        <label className="text-xs text-stone-600 flex items-center gap-2">
          <T en="Platform fee (5%) is borne by" bn="প্ল্যাটফর্ম ফি (৫%) বহন করবেন" hi="प्लेटफ़ॉर्म शुल्क (5%) वहन करेंगे" />
          <select className={`${inputCls} !w-36`} value={feeBearer}
            onChange={(e) => setFeeBearer(e.target.value as 'organiser' | 'buyer')}>
            <option value="organiser">Organiser</option>
            <option value="buyer">Devotee</option>
          </select>
        </label>
      </div>

      {/* EVENTS E8 — the optional pass-release moment (the TTD
          pattern): announce the festival now, open passes at a
          known time. The public page shows the moment, and the
          rules refuse any purchase committed before it. */}
      <div className="mb-3 rounded-xl bg-stone-50 px-3 py-2.5">
        <label className="text-xs font-bold text-stone-600 block mb-1">
          <T en="Passes open on (optional)" bn="পাস খুলবে (ঐচ্ছিক)" hi="पास खुलेंगे (वैकल्पिक)" />
        </label>
        <p className="text-[11px] text-stone-500 mb-2">
          <T en="Announce the festival now, and let passes open at a known moment — families can plan, and the first rush stays gentle. Leave blank to keep passes open as they are."
            bn="এখনই উৎসব ঘোষণা করুন, পাস খুলুক একটি নির্দিষ্ট মুহূর্তে — পরিবার পরিকল্পনা করতে পারবে, প্রথম ভিড়ও থাকবে শান্ত। খালি রাখলে পাস যেমন আছে তেমনই খোলা থাকবে।"
            hi="उत्सव अभी घोषित करें, पास एक निश्चित क्षण पर खुलें — परिवार योजना बना सकेंगे, पहली भीड़ भी शांत रहेगी। खाली छोड़ने पर पास जैसे हैं वैसे खुले रहेंगे।" />
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="datetime-local" className={`${inputCls} !w-60`} value={releaseLocal}
            aria-label="Passes open on"
            onChange={(e) => setReleaseLocal(e.target.value)} />
          {releaseLocal && (
            <Btn variant="ghost" className="!px-3" onClick={() => setReleaseLocal('')}>
              <T en="Clear" bn="মুছুন" hi="हटाएं" />
            </Btn>
          )}
        </div>
      </div>

      {err && <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-2">{errText[err] || err}</div>}
      <div className="flex flex-wrap gap-2 items-center">
        <Btn onClick={save}>
          <T en={saved ? '✓ Passes saved' : 'Save passes & codes'} bn={saved ? '✓ পাস সংরক্ষিত' : 'পাস ও কোড সংরক্ষণ'} hi={saved ? '✓ पास सहेजे गए' : 'पास व कोड सहेजें'} />
        </Btn>
        <span className="text-[11px] text-stone-400">
          <T en="Then press Update page above so devotees see the passes." bn="তারপর উপরে ‘পৃষ্ঠা হালনাগাদ’ চাপুন, যাতে ভক্তরা পাস দেখেন।" hi="फिर ऊपर ‘पृष्ठ अद्यतन’ दबाएं ताकि भक्त पास देखें।" />
        </span>
      </div>

      {/* Organiser-cancel — the 100% promise */}
      <div className="mt-4 rounded-xl border border-red-100 bg-red-50/50 px-3 py-2.5">
        {cancelled ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-red-700 flex-1">
              <T en="This festival is marked cancelled. Every pass refunds 100%, fee included."
                bn="এই উৎসব বাতিল হিসেবে চিহ্নিত। প্রতিটি পাস ১০০% ফেরত পাবে, ফি-সহ।"
                hi="यह उत्सव रद्द चिह्नित है। हर पास की 100% वापसी होगी, शुल्क सहित।" />
            </span>
            <Btn variant="ghost" onClick={() => setCancelled(false)}>
              <T en="Undo cancellation" bn="বাতিল ফিরিয়ে নিন" hi="रद्दीकरण वापस लें" />
            </Btn>
          </div>
        ) : confirmCancel ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-red-700 flex-1">
              <T en="Cancel the whole festival? Every devotee's pass then refunds 100%, fee included."
                bn="পুরো উৎসব বাতিল করবেন? তাহলে প্রতিটি ভক্তের পাস ১০০% ফেরত পাবে, ফি-সহ।"
                hi="पूरा उत्सव रद्द करें? तब हर भक्त के पास की 100% वापसी होगी, शुल्क सहित।" />
            </span>
            <Btn onClick={() => setCancelled(true)}>
              <T en="Yes, cancel festival" bn="হ্যাঁ, উৎসব বাতিল" hi="हाँ, उत्सव रद्द करें" />
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirmCancel(false)}>
              <T en="Keep festival" bn="উৎসব থাকুক" hi="उत्सव रहने दें" />
            </Btn>
          </div>
        ) : (
          <button className="text-xs font-bold text-red-700 min-h-[44px]" onClick={() => setConfirmCancel(true)}>
            <T en="Cancel this festival (100% refunds)" bn="এই উৎসব বাতিল করুন (১০০% ফেরত)" hi="यह उत्सव रद्द करें (100% वापसी)" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PublishPanel;
