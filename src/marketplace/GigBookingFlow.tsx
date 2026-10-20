/**
 * GigBookingFlow.tsx — QUEUED #28: the marketplace gig booking flow as
 * a mountable overlay, so a devotee can book WITHOUT leaving a chat
 * thread (talk → trust → book).
 * ======================================================================
 * This is NOT new order machinery. It is ClientMarketplace's existing
 * `openBooking` glue extracted verbatim: detect the provider's rail
 * (`detectRail`), then render the SAME screens the marketplace renders —
 * `BookGig` (rail 1) or `Rail2PaymentScreen` (rail 2). Order creation,
 * commission snapshot, referral attribution (#25) and the order
 * timeline (#26) all live inside those screens and are inherited whole.
 */
import React, { useEffect, useState } from 'react';
import type { Gig } from '../lib/marketplace';
import { detectRail, type Rail } from '../lib/rail2';
import { BookGig } from './ClientMarketplace';
import { Rail2PaymentScreen } from './Rail2PaymentScreen';
import { T } from '../solo/ui';

export const GigBookingFlow: React.FC<{
  gig: Gig;
  onDone: () => void;
  onBack: () => void;
}> = ({ gig, onDone, onBack }) => {
  const [rail, setRail] = useState<Rail | null>(null);

  /* Same rail detection (and same fail-open to rail 1) as
   * ClientMarketplace.openBooking. */
  useEffect(() => {
    let alive = true;
    detectRail(gig.providerUid)
      .then(({ rail }) => {
        if (alive) setRail(rail);
      })
      .catch(() => {
        if (alive) setRail('rail1');
      });
    return () => {
      alive = false;
    };
  }, [gig.providerUid]);

  return (
    <div
      className="fixed inset-0 z-[125] bg-[#faf7f2] overflow-y-auto"
      role="dialog"
      aria-label={gig.title}
      style={{ colorScheme: 'light' }}
    >
      <div className="max-w-xl mx-auto p-3 pb-10">
        {rail === null ? (
          <div className="text-center py-16">
            <div className="text-4xl animate-pulse" aria-hidden>
              🪔
            </div>
            <p className="text-sm text-stone-500 mt-3">
              <T
                en="Preparing your seva…"
                bn="আপনার সেবা প্রস্তুত হচ্ছে…"
                hi="आपकी सेवा तैयार हो रही है…"
              />
            </p>
          </div>
        ) : rail === 'rail2' ? (
          <Rail2PaymentScreen gig={gig} onBack={onBack} onDone={onDone} />
        ) : (
          <BookGig gig={gig} onBack={onBack} onDone={onDone} />
        )}
      </div>
    </div>
  );
};
