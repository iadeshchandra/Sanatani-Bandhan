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
} from '../../lib/festival';
import { useFestivalCloud } from './festivalWarStore';

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
}

export const PublishPanel: React.FC<Props> = ({ wf, plan }) => {
  const { safeTranslate } = useLanguage();
  const { activeWorkspace } = useAuthWorkspace();
  const cloud = useFestivalCloud(activeWorkspace.id, wf.key, { subscribeRsvps: true });

  const [story, setStory] = useState('');
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

  const buildDoc = (pub: boolean): FestivalEventDoc => ({
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
    rsvpEnabled: true,
    darshanSlots: slots,
    published: pub,
    publishedHeadcount: cloud.event?.publishedHeadcount || 0,
    slotBooked: cloud.event?.slotBooked || {},
    rsvpHeadcount: cloud.event?.rsvpHeadcount || 0,
    updatedAt: new Date().toISOString(),
  });

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

export default PublishPanel;
