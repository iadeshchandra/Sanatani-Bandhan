/**
 * MyPassesShelf — the Personal home's "My passes" shelf
 * (PILGRIMAGE + MY PASSES batch).
 * =====================================================================
 * Passes finally have a home in Personal: the member's Smart Pass
 * and every live seva pass (event_tickets) they hold, upcoming
 * first. It lives inside the Personal pillar of the Solo home — no
 * new tab, no desk moved.
 *
 * HONESTY LAWS:
 *  - Only LIVE tickets are passes (paid / pay-at-venue / comp);
 *    cancelled and refunded records never appear (lib/yatraFootprint
 *    shapeHeldPasses). Desk-sale records belong to walk-ins and can
 *    never surface here.
 *  - The event pass shown in the sheet is the family's real
 *    EventPassCard, minted from the devotee's own RSVP record —
 *    never a re-drawn copy. When the RSVP or festival doc cannot be
 *    read, the sheet says so plainly and offers the festival page,
 *    where the pass lives.
 *  - The Smart Pass QR is the family's identity token
 *    (utils/qrUtils generateIdentityPassValue over the member's own
 *    Sanatani ID), verifiable by verifyIdentityQRPayload. It carries
 *    no PIN and no secret, and the sheet says exactly that.
 *  - A member with no passes sees the warm empty line — never a
 *    sample pass.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronRight, QrCode, Ticket, X } from 'lucide-react';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useSolo } from './SoloContext';
import { shapeHeldPasses, type HeldPass } from '../lib/yatraFootprint';
import type { EventTicket } from '../lib/eventTickets';
import type { FestivalEventDoc, Lang3, RsvpEntry } from '../lib/festival';
import { generateIdentityPassValue } from '../utils/qrUtils';
import { displaySanataniId } from '../lib/passId';
import { EventPassCard } from '../components/festival/EventPassCard';

type SheetState =
  | { kind: 'smart' }
  | { kind: 'event'; held: HeldPass; rsvp: RsvpEntry | null; rsvpTried: boolean }
  | null;

export const MyPassesShelf: React.FC = () => {
  const { t, currentLang } = useLanguage();
  const { firebaseUser } = useAuthWorkspace();
  const { profile } = useSolo();
  const navigate = useNavigate();
  const uid = firebaseUser?.uid || '';

  const [tickets, setTickets] = useState<EventTicket[] | null>(null);
  const [eventsById, setEventsById] = useState<ReadonlyMap<string, FestivalEventDoc>>(new Map());
  const [sheet, setSheet] = useState<SheetState>(null);

  /* My live tickets — the same buyer query the festival page runs. */
  useEffect(() => {
    if (!uid) { setTickets([]); return; }
    const unsub = onSnapshot(
      query(collection(db, 'event_tickets'), where('buyerUid', '==', uid)),
      (snap) => setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventTicket, 'id'>) }))),
      () => setTickets([]),
    );
    return unsub;
  }, [uid]);

  /* The festival doc behind each held ticket (public, published). */
  useEffect(() => {
    if (!tickets) return;
    const wanted = [...new Set(tickets.map((tk) => tk.festivalId))].filter((id) => !eventsById.has(id));
    if (wanted.length === 0) return;
    let live = true;
    (async () => {
      const fetched = new Map<string, FestivalEventDoc>();
      for (const id of wanted) {
        try {
          const snap = await getDoc(doc(db, 'festival_events', id));
          if (snap.exists()) fetched.set(id, { id: snap.id, ...(snap.data() as Omit<FestivalEventDoc, 'id'>) });
        } catch { /* fail soft — the row falls back to the plain title */ }
      }
      if (live && fetched.size > 0) {
        setEventsById((prev) => new Map([...prev, ...fetched]));
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  const todayStartMs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const held = useMemo(
    () => (tickets ? shapeHeldPasses(tickets, eventsById, todayStartMs) : []),
    [tickets, eventsById, todayStartMs],
  );
  const upcoming = held.filter((h) => h.startMs === null || h.startMs >= todayStartMs);
  const past = held.filter((h) => h.startMs !== null && h.startMs < todayStartMs);

  const pickLang = (l: Lang3): string =>
    currentLang === 'bn' ? l.bn : currentLang === 'hi' ? l.hi : l.en;
  const tr3 = (l: { en: string; bn: string; hi: string }): string => pickLang(l);

  const stateLabel = (tk: EventTicket): string =>
    tk.paymentState === 'paid-wallet'
      ? t('surfaces.events.ticketStateWallet')
      : tk.paymentState === 'pay-at-venue'
        ? tk.venueReceived === true
          ? t('surfaces.events.ticketStateVenuePaid')
          : t('surfaces.events.ticketStateVenue')
        : t('surfaces.events.ticketStateComp');

  const openPass = async (h: HeldPass) => {
    if (!h.ticket.rsvpId) {
      setSheet({ kind: 'event', held: h, rsvp: null, rsvpTried: true });
      return;
    }
    setSheet({ kind: 'event', held: h, rsvp: null, rsvpTried: false });
    try {
      const snap = await getDoc(doc(db, 'festival_rsvps', h.ticket.rsvpId));
      const rsvp: RsvpEntry | null = snap.exists()
        ? { id: snap.id, ...(snap.data() as Omit<RsvpEntry, 'id'>) }
        : null;
      setSheet((s) =>
        s && s.kind === 'event' && s.held.ticket.id === h.ticket.id
          ? { kind: 'event', held: h, rsvp, rsvpTried: true }
          : s,
      );
    } catch {
      setSheet((s) =>
        s && s.kind === 'event' && s.held.ticket.id === h.ticket.id
          ? { kind: 'event', held: h, rsvp: null, rsvpTried: true }
          : s,
      );
    }
  };

  if (!uid) return null;

  const passRow = (h: HeldPass) => {
    const tk = h.ticket;
    const name = h.event ? pickLang(h.event.name) : t('surfaces.passes.festivalFallback');
    return (
      <button
        key={tk.id}
        type="button"
        onClick={() => void openPass(h)}
        className="w-full rounded-2xl bg-white border border-amber-200 p-4 flex items-center gap-3 text-left shadow-sm hover:border-amber-400 hover:shadow-md transition-all min-h-[64px]"
      >
        <div className="text-2xl shrink-0" aria-hidden>🎟️</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold text-stone-800 truncate">{name}</div>
          <div className="text-[11px] text-stone-500 mt-0.5 truncate">
            {[h.event?.dateISO, tk.tierName || tk.tierId, `×${tk.qty}`, stateLabel(tk)]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
          {t('surfaces.passes.viewPass')}
          <ChevronRight className="w-4 h-4" />
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="font-extrabold text-stone-900 flex items-center gap-2 px-1">
        <Ticket className="w-5 h-5 text-amber-700" />
        {t('surfaces.passes.title')}
      </h3>

      {/* Smart Pass entry — the member credential itself lives one
          tap away in the sheet; the shelf row is its honest cover. */}
      {profile && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-700 via-orange-700 to-amber-800 text-amber-50 p-4 shadow-sm flex items-center gap-4">
          <div className="text-3xl shrink-0" aria-hidden>🪪</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold">{t('surfaces.passes.smartPass')}</div>
            <div className="text-[11px] text-amber-200/80 mt-0.5">
              {profile.displayName} ·{' '}
              <span className="font-mono">
                {displaySanataniId(profile.id, t('surfaces.passes.idPending'))}
              </span>
            </div>
            <div className="text-[11px] text-amber-200/80 mt-0.5">{t('surfaces.passes.smartPassLine')}</div>
          </div>
          <button
            type="button"
            onClick={() => setSheet({ kind: 'smart' })}
            className="shrink-0 min-h-[44px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black transition-colors inline-flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            {t('surfaces.passes.showPass')}
          </button>
        </div>
      )}

      {tickets === null ? (
        <p className="text-sm text-stone-400 px-1">{t('surfaces.passes.loading')}</p>
      ) : held.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-amber-300 p-4">
          <p className="text-sm text-stone-500 leading-relaxed">{t('surfaces.passes.empty')}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2">
              {past.length > 0 && (
                <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest px-1">
                  {t('surfaces.passes.upcoming')}
                </p>
              )}
              {upcoming.map(passRow)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest px-1">
                {t('surfaces.passes.past')}
              </p>
              {past.map(passRow)}
            </div>
          )}
        </>
      )}

      {sheet &&
        createPortal(
          <div className="fixed inset-0 z-[9000] bg-temple-50 flex flex-col">
            <header className="bg-white border-b border-temple-200 px-4 py-3 flex items-center justify-between shrink-0">
              <h2 className="text-base font-black text-temple-900 flex items-center gap-2">
                {sheet.kind === 'smart' ? (
                  <>
                    <QrCode className="w-5 h-5 text-amber-700" />
                    {t('surfaces.passes.smartPass')}
                  </>
                ) : (
                  <>
                    <Ticket className="w-5 h-5 text-amber-700" />
                    {sheet.held.event
                      ? pickLang(sheet.held.event.name)
                      : t('surfaces.passes.festivalFallback')}
                  </>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label={t('actions.cancel') || 'Close'}
                className="w-11 h-11 rounded-full bg-temple-50 border border-temple-200 flex items-center justify-center text-temple-600"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 max-w-2xl w-full mx-auto">
              {sheet.kind === 'smart' && profile && (
                <div className="bg-white rounded-3xl border border-temple-200 shadow-xl p-6 text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-temple-950">{profile.displayName}</h3>
                    <p className="text-xs text-amber-700 font-mono mt-0.5">
                      {displaySanataniId(profile.id, t('surfaces.passes.idPending'))}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl shadow-inner border border-temple-100 inline-block">
                    <QRCodeSVG value={generateIdentityPassValue(profile.id)} size={220} level="H" includeMargin={false} />
                  </div>
                  <p className="text-[11px] text-temple-600 max-w-sm mx-auto leading-relaxed">
                    {t('surfaces.passes.tokenNote')}
                  </p>
                </div>
              )}

              {sheet.kind === 'event' && (
                <div className="space-y-3">
                  {!sheet.rsvpTried ? (
                    <p className="text-sm text-stone-400">{t('surfaces.passes.loading')}</p>
                  ) : sheet.held.event && sheet.rsvp ? (
                    <EventPassCard event={sheet.held.event} rsvp={sheet.rsvp} tr={tr3} />
                  ) : (
                    <div className="bg-white rounded-3xl border border-temple-200 p-5 space-y-3">
                      <p className="text-sm font-bold text-stone-800">
                        {sheet.held.event
                          ? pickLang(sheet.held.event.name)
                          : t('surfaces.passes.festivalFallback')}
                      </p>
                      <p className="text-xs text-stone-500">
                        {[sheet.held.event?.dateISO, sheet.held.ticket.tierName || sheet.held.ticket.tierId, `×${sheet.held.ticket.qty}`, stateLabel(sheet.held.ticket)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const tk = sheet.held.ticket;
                          setSheet(null);
                          navigate(`/festival/${tk.workspaceId}/${tk.festivalId}`);
                        }}
                        className="w-full min-h-[44px] rounded-xl bg-cta hover:bg-cta-hover text-white text-sm font-black transition-colors"
                      >
                        {t('surfaces.passes.openFestival')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
