/**
 * EventPassCard — the devotee's SB-EVENT pass (EVENTS E3).
 * =====================================================================
 * Shown on the public festival page where the devotee's confirmed
 * RSVP already lives ("Your place is counted"). The pass is a family
 * dynamic token (lib/eventPass → utils/qrUtils): HMAC-signed, alive
 * for 5 minutes, re-minted as it lapses — the same behaviour as the
 * Standard-B gate pass, so a screenshot stops working on its own.
 * The card says exactly that, in the family's own register: no
 * stronger claim is made anywhere on this surface.
 *
 * One pass per attending day: the card mints for today when the
 * booking covers today, else the next booked day (lib/eventPass
 * pickPassDate). Once the gate has admitted the party for that day,
 * the card shows the admitted stamp instead of a live code.
 *
 * NEXT-LEVEL A2 — persistence: under the code, the booking joins
 * the devotee's own calendar (PassCalendarActions) and the pass
 * can be saved as a keepsake image carrying the real QR and its
 * own honesty line (lib/passPersistence). No wallet button —
 * wallet passes need an issuer account that does not exist yet.
 */
import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useLanguage } from '../../context/LanguageContext';
import {
  festivalDayList, festivalEventUrl, todayISO,
  type FestivalEventDoc, type RsvpEntry,
} from '../../lib/festival';
import {
  mintEventPassToken, pickPassDate, admittedOnDay, EVENT_PASS_VALIDITY_SECONDS,
} from '../../lib/eventPass';
import {
  bookedDaysFor, composePassImageFile, passImageFileName, shareOrDownloadImageFile,
  type BookingCalendarFacts,
} from '../../lib/passPersistence';
import { PassCalendarActions } from './PassCalendarActions';
import { verifyDynamicToken } from '../../utils/qrUtils';

interface Props {
  event: FestivalEventDoc;
  rsvp: RsvpEntry;
  /** The page's Lang3 translator (safeTranslate-bound). */
  tr: (l: { en: string; bn: string; hi: string }) => string;
}

export const EventPassCard: React.FC<Props> = ({ event, rsvp, tr }) => {
  const { t } = useLanguage();
  const days = useMemo(
    () => festivalDayList(event.dateISO, event.endDateISO),
    [event.dateISO, event.endDateISO]
  );
  const passDate = useMemo(
    () => pickPassDate(rsvp, days, todayISO()),
    [rsvp, days]
  );
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(EVENT_PASS_VALIDITY_SECONDS);
  const [mintNonce, setMintNonce] = useState(0);
  // NEXT-LEVEL A2 — pass persistence (calendar + saved image).
  const [imgBusy, setImgBusy] = useState(false);
  const [imgNote, setImgNote] = useState<'saved' | 'failed' | ''>('');

  const admitted = passDate
    ? admittedOnDay(rsvp, passDate, null).used
    : false;

  // Mint a fresh token (and its QR image) whenever the pass day or
  // booking changes, and again each time the old one lapses — the
  // DevoteeGrid gate-pass countdown pattern.
  useEffect(() => {
    if (!passDate || admitted) { setQrDataUrl(''); return; }
    let cancelled = false;
    const token = mintEventPassToken({
      workspaceId: event.workspaceId,
      eventId: event.id,
      date: passDate,
      rsvpId: rsvp.id,
      name: rsvp.name,
      headcount: rsvp.headcount || 1,
    });
    const exp = verifyDynamicToken(token).expiresAt;
    setSecondsLeft(exp ? Math.max(1, Math.round((exp - Date.now()) / 1000)) : EVENT_PASS_VALIDITY_SECONDS);
    QRCode.toDataURL(token, {
      width: 320,
      margin: 2,
      color: { dark: '#ea580c', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(''); });
    return () => { cancelled = true; };
  }, [passDate, admitted, event.workspaceId, event.id, rsvp.id, rsvp.name, rsvp.headcount, mintNonce]);

  // Countdown → re-mint at zero so the pass never shows dead.
  useEffect(() => {
    if (!passDate || admitted) return;
    if (secondsLeft <= 0) { setMintNonce((n) => n + 1); return; }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [passDate, admitted, secondsLeft]);

  if (!passDate) return null;

  const dateLabel = new Date(`${passDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const partyLine = `${rsvp.name} · ${t('surfaces.events.passParty').replace('{count}', String(rsvp.headcount || 1))}`;

  // NEXT-LEVEL A2 — the booking's calendar facts: every booked day
  // (not only the day this pass is minted for), the venue when the
  // record carries one, and the canonical festival page link.
  const calendarFacts: BookingCalendarFacts = {
    eventId: event.id,
    festivalName: tr(event.name),
    orgName: event.orgName,
    ...(event.venue ? { venue: event.venue } : {}),
    link: typeof window !== 'undefined'
      ? festivalEventUrl(window.location.origin, event.workspaceId, event.id)
      : '',
    days: bookedDaysFor(rsvp, days),
    noteLine: partyLine,
  };

  // Save the pass as a keepsake image: the REAL QR drawn onto a
  // warm card (or the admitted stamp, once admitted — there is no
  // live code then), shared or downloaded. Any failure leaves the
  // live pass above untouched and says so gently.
  const doSaveImage = async () => {
    if (imgBusy) return;
    setImgBusy(true);
    setImgNote('');
    try {
      const file = await composePassImageFile(
        {
          passTitle: t('surfaces.events.passTitle'),
          festivalName: tr(event.name),
          orgName: event.orgName,
          dateLabel,
          partyLine,
          noteLine: t('surfaces.events.passImageNote'),
          brandLine: 'Sanatani Bandhan',
          admitted,
          admittedLabel: t('surfaces.events.passAdmittedStamp'),
        },
        admitted ? '' : qrDataUrl,
        passImageFileName(event.name.en, passDate)
      );
      const how = await shareOrDownloadImageFile(file, t('surfaces.events.passTitle'), partyLine);
      if (how === 'downloaded') setImgNote('saved');
      else if (how === 'failed') setImgNote('failed');
    } catch {
      setImgNote('failed');
    } finally {
      setImgBusy(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/70 p-4 text-center">
      <p className="text-[11px] font-black uppercase tracking-widest text-orange-700">
        🎟 {t('surfaces.events.passTitle')}
      </p>
      <h3 className="mt-1 text-base font-black text-stone-800">{tr(event.name)}</h3>
      <p className="text-xs font-bold text-stone-500">
        {event.orgName} · {dateLabel}
      </p>
      <p className="mt-0.5 text-sm font-bold text-stone-700">
        {partyLine}
      </p>

      {admitted ? (
        <div className="mx-auto mt-3 max-w-[240px] rounded-2xl bg-emerald-600 px-4 py-5 text-white shadow">
          <div className="text-3xl mb-1">✓</div>
          <p className="text-sm font-black">{t('surfaces.events.passAdmittedStamp')}</p>
        </div>
      ) : qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={t('surfaces.events.passTitle')}
          className="mx-auto mt-3 h-52 w-52 rounded-2xl bg-white p-2 shadow-sm"
        />
      ) : (
        <div className="mx-auto mt-3 h-52 w-52 rounded-2xl bg-white/70 shadow-sm" aria-hidden="true" />
      )}

      {!admitted && (
        <p className="mt-2 text-[11px] font-semibold text-stone-500">
          {t('surfaces.events.passFreshIn').replace('{seconds}', String(Math.max(0, secondsLeft)))}
        </p>
      )}
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
        {t('surfaces.events.passShowAtGate')} · {t('surfaces.events.passRefreshNote')}
      </p>

      {/* NEXT-LEVEL A2 — persistence: the booking joins the
          devotee's own calendar, and the pass can be kept as an
          image. No wallet button: wallet passes need an issuer
          account that does not exist yet (Wave B). */}
      <div className="mt-4 border-t border-orange-200/70 pt-3">
        <PassCalendarActions facts={calendarFacts} />
        <button
          type="button"
          onClick={doSaveImage}
          disabled={imgBusy || (!admitted && !qrDataUrl)}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-bold min-h-[44px] disabled:opacity-50"
        >
          🖼 {t('surfaces.events.passSaveImage')}
        </button>
        {imgNote === 'saved' && (
          <p className="mt-2 text-[11px] font-bold text-emerald-700">{t('surfaces.events.passImageSaved')}</p>
        )}
        {imgNote === 'failed' && (
          <p className="mt-2 text-[11px] font-semibold text-amber-700">{t('surfaces.events.passImageFailed')}</p>
        )}
      </div>
    </div>
  );
};
