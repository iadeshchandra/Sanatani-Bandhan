/* Seva Bazar — service_card feed integration.
 * =====================================================================
 * Wraps ServiceCardPost with the feed behaviors from the structure doc:
 * - "🙏 Ask Panditji" → provider chat thread with a warm pre-filled
 *   opener (the card travels as context in the opener text).
 * - Card tap → ServiceCardSheet detail view.
 * - First card per session carries the "🪔 From your community" frame.
 * - Density (≤15%) is applied upstream in FeedTab via
 *   applyServiceCardDensity — this component only renders.
 */

import React, { useRef, useState } from 'react';
import type { SangamPost } from './types';
import type { AuthorInfo } from './sangamStore';
import { ServiceCardPost } from './ServiceCardPost';
import { ServiceCardSheet } from './ServiceCardSheet';
import { SevaBookingSheet } from './SevaBookingSheet';
import { ShareButton } from './ShareButton';
import { isFirstServiceCardThisSession } from './serviceCard';
import { useServiceCardAsk } from './useServiceCardAsk';
import { useSevaBooking } from './useSevaBooking';

import type { ChatParticipant } from '../chat/types';
import { Chat } from '../chat/Chat';
import { useLanguage } from '../context/LanguageContext';

import { T } from '../solo/ui';

interface Props {
  post: SangamPost;
  author: AuthorInfo; // the viewing devotee
}

/** Module-level session set — first card per session gets the frame. */
const sessionSeenCards = { current: new Set<string>() };

export const ServiceCardFeedItem: React.FC<Props> = ({ post, author }) => {
  const { currentLang } = useLanguage();
  const lang = currentLang === 'hi' ? 'hi' : currentLang === 'bn' ? 'bn' : 'en';
  const [sheetOpen, setSheetOpen] = useState(false);
  const framed = useRef(isFirstServiceCardThisSession(post.id, sessionSeenCards)).current;

  const card = post.serviceCard;
  if (!card) return null;

  const tierLang = lang;

  const { ask, asking, chatId, chatOpen, closeChat } = useServiceCardAsk();
  // Seva Bazar Phase 2 — booking journey (sheet → thread → receipt).
  const booking = useSevaBooking({ uid: author.uid, name: author.name }, tierLang);

  const handleAsk = () => {
    if (!card) return;
    ask(card, { uid: author.uid, name: author.name }, tierLang);
  };

  const handleRequest = () => {
    // "Request this seva" → the Phase 2 booking sheet (mode → muhurat →
    // sankalpa → dakshina → token advance). No in-card checkout — ever.
    if (!card) return;
    setSheetOpen(false);
    booking.openBooking(post);
  };

  return (
    <div data-guide-anchor="sevabazar-card">
      {framed && (
        <div className="text-[11px] font-bold text-amber-700 mb-1.5 flex items-center gap-1.5">
          <span aria-hidden>🪔</span>
          <T
            en="From your community — a seva notice, never an ad"
            bn="আপনার সম্প্রদায় থেকে — একটি সেবা বিজ্ঞপ্তি, কখনও বিজ্ঞাপন নয়"
            hi="आपके समुदाय से — एक सेवा सूचना, कभी विज्ञापन नहीं"
          />
        </div>
      )}
      <ServiceCardPost post={post} onAsk={handleAsk} onOpen={() => setSheetOpen(true)} />
      {/* Share with referral attribution — Seva Bazar Phase 4 */}
      <div className="mt-2 flex justify-end">
        <ShareButton path={`/seva/card/${post.id}`} sharerSanId={author.sanId} />
      </div>
      {sheetOpen && (
        <ServiceCardSheet
          post={post}
          onClose={() => setSheetOpen(false)}
          onAsk={() => {
            setSheetOpen(false);
            handleAsk();
          }}
          onRequest={handleRequest}
        />
      )}
      {chatOpen && chatId && (
        <Chat
          uid={author.uid}
          selfInfo={{ uid: author.uid, displayName: author.name || 'Sanatani' }}
          initialChatId={chatId}
          onClose={closeChat}
        />
      )}
      {booking.bookingPost && (
        <SevaBookingSheet
          post={booking.bookingPost}
          viewer={{ uid: author.uid, name: author.name }}
          onClose={booking.closeBooking}
          onBooked={booking.handleBooked}
        />
      )}
      {booking.chatOpen && booking.chatId && (
        <Chat
          uid={author.uid}
          selfInfo={{ uid: author.uid, displayName: author.name || 'Sanatani' }}
          initialChatId={booking.chatId}
          onClose={booking.closeChat}
          onReceiptConfirm={(receipt) =>
            booking.confirmReceipt(receipt, booking.chatId as string, author.uid)
          }
        />
      )}
    </div>
  );
};
