/**
 * PassCalendarActions — NEXT-LEVEL A2: "Add to calendar" for a BOOKING.
 * =====================================================================
 * The booking-scoped calendar action, shared by the three surfaces
 * that confirm a place: the SB-EVENT pass card, the festival page's
 * RSVP-confirmed action row, and the ticket-purchase confirmation.
 * (The festival page also keeps its older, generic whole-festival
 * calendar button for visitors who have not booked — different
 * scope, deliberately untouched.)
 *
 * Two honest artefacts, both built from the booking's real facts by
 * lib/passPersistence on the ONE shared ICS machinery
 * (lib/icsExport — no second ICS implementation):
 *  - a Google Calendar template link (one event: the booking's
 *    first→last day span, all-day — no invented times), and
 *  - an .ics download carrying one all-day event per booked day.
 * There is no wallet button here: wallet passes need an issuer
 * account that does not exist yet (Wave B).
 */
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { buildIcsCalendar, downloadIcs, icsFileName } from '../../lib/icsExport';
import {
  bookingIcsInputs, googleCalendarUrl, type BookingCalendarFacts,
} from '../../lib/passPersistence';

const btnCls =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-stone-700 min-h-[44px]';

export const PassCalendarActions: React.FC<{
  facts: BookingCalendarFacts;
  className?: string;
}> = ({ facts, className }) => {
  const { t } = useLanguage();
  if (facts.days.length === 0) return null;
  const googleUrl = googleCalendarUrl(facts);

  const doIcs = () => {
    downloadIcs(
      buildIcsCalendar(bookingIcsInputs(facts)),
      icsFileName(facts.festivalName)
    );
  };

  return (
    <div className={className ?? 'flex flex-wrap justify-center gap-2'}>
      {googleUrl && (
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          className={btnCls}
        >
          📅 {t('surfaces.events.passCalGoogle')}
        </a>
      )}
      <button type="button" onClick={doIcs} className={btnCls}>
        📥 {t('surfaces.events.passCalIcs')}
      </button>
    </div>
  );
};
